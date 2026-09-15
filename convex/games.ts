import { paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import { Doc, Id } from './_generated/dataModel';
import { internalMutation, mutation, MutationCtx, query, QueryCtx } from './_generated/server';
import { concludeIfHidersGone, purgeGameStep } from './gameEngine';
import {
  AWAY_AFTER_MS,
  BOUNDARY_BUFFER_METERS,
  distanceMeters,
  GAME_TTL_MS,
  getMembership,
  loadProfiles,
  logEvent,
  OUT_OF_BOUNDS_GRACE_MS,
  randomCode,
  randomToken,
  requireUserId,
  shuffle,
  STARTING_DELAY_MS,
} from './lib';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 64;
const PING_STALE_WINDOW_MS = 15 * 60 * 1000;

async function requireProfileName(ctx: QueryCtx, userId: Id<'users'>): Promise<void> {
  const profile = await ctx.db
    .query('profiles')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .unique();
  if (!profile) throw new Error('Set up your profile first');
}

/**
 * Deletes a game and its child rows. Removes the `games` row (and a first batch
 * of children) in this transaction, then hands any remainder to the scheduled
 * `purgeGame` so a huge game never blows a transaction limit.
 */
async function cascadeDeleteGame(
  ctx: MutationCtx,
  gameId: Id<'games'>,
): Promise<void> {
  const done = await purgeGameStep(ctx, gameId);
  if (!done) {
    await ctx.scheduler.runAfter(0, internal.gameEngine.purgeGame, { gameId });
  }
}

async function activePlayers(
  ctx: QueryCtx,
  gameId: Id<'games'>,
): Promise<Doc<'gamePlayers'>[]> {
  const players = await ctx.db
    .query('gamePlayers')
    .withIndex('by_game', (q) => q.eq('gameId', gameId))
    .take(MAX_PLAYERS);
  return players.filter((p) => p.status !== 'left');
}

export const createGame = mutation({
  args: {
    center: v.object({ lat: v.number(), lng: v.number() }),
    radiusMeters: v.number(),
    durationSeconds: v.number(),
    pingIntervalSeconds: v.number(),
    startingSeekers: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await requireProfileName(ctx, userId);

    let code = randomCode();
    for (let i = 0; i < 5; i++) {
      const clash = await ctx.db
        .query('games')
        .withIndex('by_code', (q) => q.eq('code', code))
        .unique();
      if (!clash) break;
      code = randomCode();
    }

    const gameId = await ctx.db.insert('games', {
      code,
      hostUserId: userId,
      status: 'lobby',
      center: args.center,
      radiusMeters: Math.round(args.radiusMeters),
      durationSeconds: Math.round(args.durationSeconds),
      pingIntervalSeconds: Math.round(args.pingIntervalSeconds),
      startingSeekers: Math.max(1, Math.round(args.startingSeekers)),
    });

    await ctx.db.insert('gamePlayers', {
      gameId,
      userId,
      role: 'unassigned',
      status: 'alive',
      token: randomToken(),
    });
    await logEvent(ctx, gameId, 'created', 'Game created', userId);

    // Clean up the game if it's never started. `startGame` schedules its own,
    // later purge; this one no-ops once `startsAt` is set.
    await ctx.scheduler.runAfter(GAME_TTL_MS, internal.gameEngine.purgeAbandonedLobby, {
      gameId,
    });

    return { gameId, code };
  },
});

export const joinByCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await requireProfileName(ctx, userId);

    const code = args.code.trim().toUpperCase();
    const game = await ctx.db
      .query('games')
      .withIndex('by_code', (q) => q.eq('code', code))
      .unique();
    if (!game) throw new Error('No game with that code');
    if (game.status !== 'lobby') throw new Error('That game has already started');

    const existing = await getMembership(ctx, game._id, userId);
    if (existing) {
      if (existing.status === 'left') {
        await ctx.db.patch('gamePlayers', existing._id, {
          status: 'alive',
          role: 'unassigned',
        });
        await logEvent(ctx, game._id, 'joined', 'A player rejoined', userId);
      }
      return { gameId: game._id };
    }

    await ctx.db.insert('gamePlayers', {
      gameId: game._id,
      userId,
      role: 'unassigned',
      status: 'alive',
      token: randomToken(),
    });
    await logEvent(ctx, game._id, 'joined', 'A player joined', userId);
    return { gameId: game._id };
  },
});

export const leaveGame = mutation({
  args: { gameId: v.id('games') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const game = await ctx.db.get('games', args.gameId);
    if (!game) return null;
    const membership = await getMembership(ctx, args.gameId, userId);
    if (!membership) return null;

    // Host leaving an un-started game tears the whole thing down.
    if (game.hostUserId === userId && game.status === 'lobby') {
      await cascadeDeleteGame(ctx, args.gameId);
      return null;
    }

    await ctx.db.patch('gamePlayers', membership._id, { status: 'left' });
    await logEvent(ctx, args.gameId, 'left', 'A player left', userId);
    // If a hider quit mid-game and none remain, the seekers win now.
    if (game.status === 'active') await concludeIfHidersGone(ctx, args.gameId);
    return null;
  },
});

export const reportPresence = mutation({
  args: { gameId: v.id('games'), away: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const membership = await getMembership(ctx, args.gameId, userId);
    if (!membership || membership.status === 'left') return null;
    const awaySince = args.away ? (membership.awaySince ?? Date.now()) : undefined;
    if (awaySince !== membership.awaySince) {
      await ctx.db.patch('gamePlayers', membership._id, { awaySince });
    }
    return null;
  },
});

export const rematch = mutation({
  args: { gameId: v.id('games') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const game = await ctx.db.get('games', args.gameId);
    if (!game) throw new Error('Game not found');
    if (game.hostUserId !== userId) throw new Error('Only the host can start a rematch');

    // Reuse an existing rematch lobby if one is still around.
    if (game.rematchGameId) {
      const existing = await ctx.db.get('games', game.rematchGameId);
      if (existing && existing.status === 'lobby') return { gameId: existing._id };
    }

    let code = randomCode();
    for (let i = 0; i < 5; i++) {
      const clash = await ctx.db
        .query('games')
        .withIndex('by_code', (q) => q.eq('code', code))
        .unique();
      if (!clash) break;
      code = randomCode();
    }

    const newGameId = await ctx.db.insert('games', {
      code,
      hostUserId: userId,
      status: 'lobby',
      center: game.center,
      radiusMeters: game.radiusMeters,
      durationSeconds: game.durationSeconds,
      pingIntervalSeconds: game.pingIntervalSeconds,
      startingSeekers: game.startingSeekers,
    });

    const previous = await ctx.db
      .query('gamePlayers')
      .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
      .take(MAX_PLAYERS);
    for (const p of previous) {
      if (p.status === 'left') continue;
      await ctx.db.insert('gamePlayers', {
        gameId: newGameId,
        userId: p.userId,
        role: 'unassigned',
        status: 'alive',
        token: randomToken(),
      });
    }

    await ctx.db.patch('games', args.gameId, { rematchGameId: newGameId });
    await logEvent(ctx, newGameId, 'created', 'Rematch created', userId);
    await ctx.scheduler.runAfter(GAME_TTL_MS, internal.gameEngine.purgeAbandonedLobby, {
      gameId: newGameId,
    });
    return { gameId: newGameId };
  },
});

export const deleteGame = mutation({
  args: { gameId: v.id('games') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const game = await ctx.db.get('games', args.gameId);
    if (!game) return null;
    if (game.hostUserId !== userId) throw new Error('Only the host can delete this game');
    // Scheduled activateGame / runPing / endGameByTimer all no-op once the
    // game row is gone, so there is nothing to cancel here.
    await cascadeDeleteGame(ctx, args.gameId);
    return null;
  },
});

export const startGame = mutation({
  args: { gameId: v.id('games') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const game = await ctx.db.get('games', args.gameId);
    if (!game) throw new Error('Game not found');
    if (game.hostUserId !== userId) throw new Error('Only the host can start');
    if (game.status !== 'lobby') throw new Error('Game already started');

    const players = await activePlayers(ctx, args.gameId);
    if (players.length < MIN_PLAYERS) throw new Error('Need at least 2 players');

    const seekerCount = Math.min(
      Math.max(1, game.startingSeekers),
      players.length - 1,
    );
    const shuffled = shuffle(players);
    const now = Date.now();
    const startsAt = now + STARTING_DELAY_MS;
    const endsAt = startsAt + game.durationSeconds * 1000;

    for (let i = 0; i < shuffled.length; i++) {
      await ctx.db.patch('gamePlayers', shuffled[i]._id, {
        role: i < seekerCount ? 'seeker' : 'hider',
        status: 'alive',
        foundAt: undefined,
        foundByUserId: undefined,
        foundReason: undefined,
        outOfBoundsSince: undefined,
      });
    }

    await ctx.db.patch('games', args.gameId, { status: 'starting', startsAt, endsAt });
    await logEvent(ctx, args.gameId, 'starting', `${seekerCount} seeker(s), ${players.length - seekerCount} hider(s)`, userId);

    await ctx.scheduler.runAt(startsAt, internal.gameEngine.activateGame, { gameId: args.gameId });
    await ctx.scheduler.runAt(endsAt, internal.gameEngine.endGameByTimer, {
      gameId: args.gameId,
      winner: 'hiders',
    });
    // Auto-delete the whole game GAME_TTL_MS after it starts.
    await ctx.scheduler.runAt(startsAt + GAME_TTL_MS, internal.gameEngine.purgeGame, {
      gameId: args.gameId,
    });
    return null;
  },
});

/**
 * Records one location fix for a player and runs the hider boundary check.
 * Callers must have already confirmed the game is running and the player is
 * alive. Shared by `submitLocation` (foreground) and `reportLocationByToken`
 * (background task over HTTP).
 */
async function recordLocation(
  ctx: MutationCtx,
  game: Doc<'games'>,
  membership: Doc<'gamePlayers'>,
  lat: number,
  lng: number,
): Promise<void> {
  const existing = await ctx.db
    .query('playerLocations')
    .withIndex('by_game_and_user', (q) =>
      q.eq('gameId', game._id).eq('userId', membership.userId),
    )
    .unique();

  const row = { gameId: game._id, userId: membership.userId, lat, lng, updatedAt: Date.now() };
  if (existing) {
    await ctx.db.replace('playerLocations', existing._id, row);
  } else {
    await ctx.db.insert('playerLocations', row);
  }

  // Hiders must stay inside the play area. Leaving starts a grace timer; the
  // scheduled `enforceBoundary` eliminates them if they don't come back.
  if (game.status === 'active' && membership.role === 'hider') {
    const outside =
      distanceMeters({ lat, lng }, game.center) > game.radiusMeters + BOUNDARY_BUFFER_METERS;
    if (outside && membership.outOfBoundsSince == null) {
      await ctx.db.patch('gamePlayers', membership._id, { outOfBoundsSince: Date.now() });
      await logEvent(ctx, game._id, 'boundary', 'A hider left the play area', membership.userId);
      await ctx.scheduler.runAfter(OUT_OF_BOUNDS_GRACE_MS, internal.gameEngine.enforceBoundary, {
        gameId: game._id,
        userId: membership.userId,
      });
    } else if (!outside && membership.outOfBoundsSince != null) {
      await ctx.db.patch('gamePlayers', membership._id, { outOfBoundsSince: undefined });
      await logEvent(ctx, game._id, 'boundary', 'A hider returned to the play area', membership.userId);
    }
  }
}

export const submitLocation = mutation({
  args: { gameId: v.id('games'), lat: v.number(), lng: v.number() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const game = await ctx.db.get('games', args.gameId);
    if (!game || (game.status !== 'active' && game.status !== 'starting')) return null;

    const membership = await getMembership(ctx, args.gameId, userId);
    if (!membership || membership.status !== 'alive') return null;

    await recordLocation(ctx, game, membership, args.lat, args.lng);
    return null;
  },
});

/**
 * Location report from the background task, authenticated by the player's
 * per-game token. Returns `stop: true` when the client should shut the
 * background task down — game over, player out, or the feature switched off.
 */
export const reportLocationByToken = internalMutation({
  args: { token: v.string(), lat: v.number(), lng: v.number() },
  handler: async (ctx, args): Promise<{ stop: boolean }> => {
    if (process.env.BACKGROUND_LOCATION_ENABLED !== 'true') return { stop: true };

    const membership = await ctx.db
      .query('gamePlayers')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .unique();
    if (!membership || membership.status !== 'alive') return { stop: true };

    const game = await ctx.db.get('games', membership.gameId);
    if (!game || game.status !== 'active') return { stop: true };

    await recordLocation(ctx, game, membership, args.lat, args.lng);
    return { stop: false };
  },
});

export const catchHider = mutation({
  args: { gameId: v.id('games'), token: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const game = await ctx.db.get('games', args.gameId);
    if (!game) throw new Error('Game not found');
    if (game.status !== 'active') throw new Error('The game is not running');

    const me = await getMembership(ctx, args.gameId, userId);
    if (!me || me.role !== 'seeker' || me.status !== 'alive') {
      throw new Error('Only active seekers can tag hiders');
    }

    const target = await ctx.db
      .query('gamePlayers')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .unique();
    if (!target || target.gameId !== args.gameId || target.role !== 'hider') {
      throw new Error('That QR code is not a hider in this game');
    }
    if (target.status !== 'alive') {
      return { hiderName: null, allFound: false, alreadyFound: true };
    }

    await ctx.db.patch('gamePlayers', target._id, {
      status: 'found',
      foundAt: Date.now(),
      foundByUserId: userId,
      foundReason: 'tagged',
      outOfBoundsSince: undefined,
    });
    await logEvent(ctx, args.gameId, 'caught', 'A hider was tagged', userId);

    const profiles = await loadProfiles(ctx, [target.userId]);
    const allFound = await concludeIfHidersGone(ctx, args.gameId);
    return {
      hiderName: profiles[target.userId]?.displayName ?? 'A hider',
      allFound,
      alreadyFound: false,
    };
  },
});

export const getLobby = query({
  args: { gameId: v.id('games') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const game = await ctx.db.get('games', args.gameId);
    if (!game) return null;
    const membership = await getMembership(ctx, args.gameId, userId);
    if (!membership) return null;

    const players = await activePlayers(ctx, args.gameId);
    const profiles = await loadProfiles(ctx, players.map((p) => p.userId));

    return {
      gameId: game._id,
      code: game.code,
      status: game.status,
      startsAt: game.startsAt ?? null,
      isHost: game.hostUserId === userId,
      settings: {
        radiusMeters: game.radiusMeters,
        durationSeconds: game.durationSeconds,
        pingIntervalSeconds: game.pingIntervalSeconds,
        startingSeekers: game.startingSeekers,
      },
      canStart: game.hostUserId === userId && game.status === 'lobby' && players.length >= MIN_PLAYERS,
      players: players.map((p) => ({
        userId: p.userId,
        displayName: profiles[p.userId]?.displayName ?? 'Player',
        avatarUrl: profiles[p.userId]?.avatarUrl ?? null,
        isHost: p.userId === game.hostUserId,
        isMe: p.userId === userId,
      })),
    };
  },
});

export const getMyActiveGames = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const memberships = await ctx.db
      .query('gamePlayers')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .take(200);

    const out: {
      gameId: Id<'games'>;
      code: string;
      status: string;
      role: string;
      playerCount: number;
    }[] = [];
    for (const m of memberships) {
      if (m.status === 'left') continue;
      const game = await ctx.db.get('games', m.gameId);
      if (!game || game.status === 'finished') continue;
      const players = await activePlayers(ctx, game._id);
      out.push({
        gameId: game._id,
        code: game.code,
        status: game.status,
        role: m.role,
        playerCount: players.length,
      });
    }
    return out;
  },
});

export const myHistory = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const page = await ctx.db
      .query('gamePlayers')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .paginate(args.paginationOpts);

    const results = [];
    for (const m of page.page) {
      const game = await ctx.db.get('games', m.gameId);
      if (!game || game.status !== 'finished') continue;
      results.push({
        gameId: game._id,
        code: game.code,
        endedAt: game.endedAt ?? game._creationTime,
        role: m.role,
        won:
          game.winner === 'hiders' ? m.role === 'hider' : m.role === 'seeker',
        winner: game.winner ?? null,
      });
    }
    return { ...page, page: results };
  },
});

export const myToken = query({
  args: { gameId: v.id('games') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const membership = await getMembership(ctx, args.gameId, userId);
    return membership?.token ?? null;
  },
});

export const getGameState = query({
  args: { gameId: v.id('games') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const game = await ctx.db.get('games', args.gameId);
    if (!game) return null;
    const me = await getMembership(ctx, args.gameId, userId);
    if (!me || me.status === 'left') return null;

    const players = await activePlayers(ctx, args.gameId);
    const hiders = players.filter((p) => p.role === 'hider');
    const seekers = players.filter((p) => p.role === 'seeker');

    return {
      status: game.status,
      center: game.center,
      radiusMeters: game.radiusMeters,
      startsAt: game.startsAt ?? null,
      endsAt: game.endsAt ?? null,
      winner: game.winner ?? null,
      pingIntervalSeconds: game.pingIntervalSeconds,
      lastPingAt: game.lastPingAt ?? null,
      outOfBoundsGraceMs: OUT_OF_BOUNDS_GRACE_MS,
      isHost: game.hostUserId === userId,
      me: {
        role: me.role,
        status: me.status,
        outOfBoundsSince: me.outOfBoundsSince ?? null,
        foundReason: me.foundReason ?? null,
      },
      hidersAlive: hiders.filter((p) => p.status === 'alive').length,
      hidersTotal: hiders.length,
      seekersTotal: seekers.length,
    };
  },
});

export const revealedLocations = query({
  args: { gameId: v.id('games'), now: v.number() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const game = await ctx.db.get('games', args.gameId);
    if (!game || game.status !== 'active') return { teammates: [], pings: [] };
    const me = await getMembership(ctx, args.gameId, userId);
    if (!me || me.role === 'unassigned') return { teammates: [], pings: [] };

    const players = await activePlayers(ctx, args.gameId);
    const teammateIds = players
      .filter((p) => p.role === me.role && p.userId !== userId && p.status === 'alive')
      .map((p) => p.userId);
    const opponentRole = me.role === 'seeker' ? 'hider' : 'seeker';

    const profiles = await loadProfiles(ctx, [
      ...teammateIds,
      ...players.filter((p) => p.role === opponentRole).map((p) => p.userId),
    ]);

    const playerById = new Map(players.map((p) => [p.userId, p]));
    const teammates = [];
    for (const id of teammateIds) {
      const loc = await ctx.db
        .query('playerLocations')
        .withIndex('by_game_and_user', (q) => q.eq('gameId', args.gameId).eq('userId', id))
        .unique();
      if (!loc) continue;
      const away =
        playerById.get(id)?.awaySince != null || args.now - loc.updatedAt > AWAY_AFTER_MS;
      teammates.push({
        userId: id,
        displayName: profiles[id]?.displayName ?? 'Teammate',
        lat: loc.lat,
        lng: loc.lng,
        updatedAt: loc.updatedAt,
        away,
      });
    }

    // Opponents: only their most recent ping snapshot, and only if fresh.
    const allPings = await ctx.db
      .query('locationPings')
      .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
      .order('desc')
      .take(400);
    const latestByUser = new Map<Id<'users'>, (typeof allPings)[number]>();
    for (const ping of allPings) {
      if (ping.role !== opponentRole) continue;
      const prev = latestByUser.get(ping.userId);
      if (!prev || ping.pingAt > prev.pingAt) latestByUser.set(ping.userId, ping);
    }

    const pings = [];
    for (const [id, ping] of latestByUser) {
      if (args.now - ping.pingAt > PING_STALE_WINDOW_MS) continue;
      const player = playerById.get(id);
      if (player && player.status !== 'alive') continue;
      pings.push({
        userId: id,
        displayName: profiles[id]?.displayName ?? 'Opponent',
        role: ping.role,
        lat: ping.lat,
        lng: ping.lng,
        pingAt: ping.pingAt,
        away: player?.awaySince != null,
      });
    }

    return { teammates, pings };
  },
});

export const getResults = query({
  args: { gameId: v.id('games') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const game = await ctx.db.get('games', args.gameId);
    if (!game) return null;
    const me = await getMembership(ctx, args.gameId, userId);
    if (!me) return null;
    // Roles/outcomes stay secret until the game is over.
    if (game.status !== 'finished') return null;

    const players = await ctx.db
      .query('gamePlayers')
      .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
      .take(MAX_PLAYERS);
    const events = await ctx.db
      .query('gameEvents')
      .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
      .order('desc')
      .take(100);

    const profiles = await loadProfiles(ctx, [
      ...players.map((p) => p.userId),
      ...events.flatMap((e) => (e.actorUserId ? [e.actorUserId] : [])),
    ]);

    return {
      status: game.status,
      winner: game.winner ?? null,
      endedAt: game.endedAt ?? null,
      durationSeconds: game.durationSeconds,
      isHost: game.hostUserId === userId,
      rematchGameId: game.rematchGameId ?? null,
      me: {
        role: me.role,
        won:
          game.winner === 'hiders'
            ? me.role === 'hider'
            : game.winner === 'seekers'
              ? me.role === 'seeker'
              : false,
      },
      players: players
        .filter((p) => p.role !== 'unassigned')
        .map((p) => ({
          userId: p.userId,
          displayName: profiles[p.userId]?.displayName ?? 'Player',
          avatarUrl: profiles[p.userId]?.avatarUrl ?? null,
          role: p.role,
          status: p.status,
          foundReason: p.foundReason ?? null,
          foundByName: p.foundByUserId ? profiles[p.foundByUserId]?.displayName ?? null : null,
        })),
      timeline: events
        .slice()
        .reverse()
        .map((e) => ({
          id: e._id,
          type: e.type,
          message: e.message,
          at: e._creationTime,
          actorName: e.actorUserId ? profiles[e.actorUserId]?.displayName ?? null : null,
        })),
    };
  },
});

/** Soft proximity check used by the client to enable the "tag" affordance. */
export const nearestHiderDistance = query({
  args: { gameId: v.id('games') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const me = await getMembership(ctx, args.gameId, userId);
    if (!me || me.role !== 'seeker') return null;
    const myLoc = await ctx.db
      .query('playerLocations')
      .withIndex('by_game_and_user', (q) => q.eq('gameId', args.gameId).eq('userId', userId))
      .unique();
    if (!myLoc) return null;

    const hiders = await ctx.db
      .query('gamePlayers')
      .withIndex("by_game_and_role", (q) => q.eq("gameId", args.gameId).eq("role", "hider"))
      .take(MAX_PLAYERS);
    let nearest: number | null = null;
    for (const hider of hiders) {
      if (hider.status !== 'alive') continue;
      const loc = await ctx.db
        .query('playerLocations')
        .withIndex('by_game_and_user', (q) =>
          q.eq('gameId', args.gameId).eq('userId', hider.userId),
        )
        .unique();
      if (!loc) continue;
      const d = distanceMeters(myLoc, loc);
      if (nearest === null || d < nearest) nearest = d;
    }
    return nearest;
  },
});
