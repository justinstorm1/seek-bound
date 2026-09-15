import { v } from 'convex/values';
import { internal } from './_generated/api';
import { Id } from './_generated/dataModel';
import { internalMutation, MutationCtx } from './_generated/server';
import { grantAchievements } from './achievements';
import { gameWinner } from './schema';
import {
  BOUNDARY_BUFFER_METERS,
  distanceMeters,
  logEvent,
  MAX_PLAYERS,
  OUT_OF_BOUNDS_GRACE_MS,
} from './lib';

/** Rows deleted per transaction while purging a game. */
export const DELETE_BATCH = 2000;

/**
 * One transaction's worth of game deletion. Removes the `games` row on the
 * first call (so the game vanishes from clients immediately), then clears a
 * single batch of child rows. Returns `true` once nothing is left to delete.
 * Long games can hold thousands of ping/event rows — more than one transaction
 * can handle — so callers reschedule until this returns `true`.
 */
export async function purgeGameStep(
  ctx: MutationCtx,
  gameId: Id<'games'>,
): Promise<boolean> {
  const game = await ctx.db.get('games', gameId);
  if (game) await ctx.db.delete('games', gameId);

  for (const table of ['locationPings', 'gameEvents', 'messages', 'gamePlayers'] as const) {
    const rows = await ctx.db
      .query(table)
      .withIndex('by_game', (q) => q.eq('gameId', gameId))
      .take(DELETE_BATCH);
    if (rows.length > 0) {
      for (const row of rows) await ctx.db.delete(table, row._id);
      return false;
    }
  }

  const locs = await ctx.db
    .query('playerLocations')
    .withIndex('by_game_and_user', (q) => q.eq('gameId', gameId))
    .take(DELETE_BATCH);
  if (locs.length > 0) {
    for (const row of locs) await ctx.db.delete('playerLocations', row._id);
    return false;
  }

  return true;
}

/** Runs `purgeGameStep` and reschedules itself until the game is fully gone. */
export const purgeGame = internalMutation({
  args: { gameId: v.id('games') },
  handler: async (ctx, args) => {
    const done = await purgeGameStep(ctx, args.gameId);
    if (!done) {
      await ctx.scheduler.runAfter(0, internal.gameEngine.purgeGame, {
        gameId: args.gameId,
      });
    }
    return null;
  },
});

/**
 * Scheduled `GAME_TTL_MS` after a game is created. Deletes it only if it was
 * never started — a started game is owned by its own `purgeGame` schedule.
 */
export const purgeAbandonedLobby = internalMutation({
  args: { gameId: v.id('games') },
  handler: async (ctx, args) => {
    const game = await ctx.db.get('games', args.gameId);
    if (!game || game.startsAt != null) return null;
    const done = await purgeGameStep(ctx, args.gameId);
    if (!done) {
      await ctx.scheduler.runAfter(0, internal.gameEngine.purgeGame, {
        gameId: args.gameId,
      });
    }
    return null;
  },
});

/**
 * Ends a game: records the winner, updates profile stats, and logs it.
 * Stale scheduled calls are guarded by the `status` check in each caller.
 */
export async function finishGame(
  ctx: MutationCtx,
  gameId: Id<'games'>,
  winner: 'hiders' | 'seekers',
  reason: string,
): Promise<void> {
  const game = await ctx.db.get('games', gameId);
  if (!game || game.status === 'finished') return;

  await ctx.db.patch('games', gameId, {
    status: 'finished',
    winner,
    endedAt: Date.now(),
  });
  await logEvent(ctx, gameId, 'finished', reason);

  const players = await ctx.db
    .query('gamePlayers')
    .withIndex('by_game', (q) => q.eq('gameId', gameId))
    .take(MAX_PLAYERS);

  for (const player of players) {
    if (player.role === 'unassigned' || player.status === 'left') continue;
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', player.userId))
      .unique();
    if (!profile) continue;

    const isHider = player.role === 'hider';
    const won = winner === 'hiders' ? isHider : player.role === 'seeker';
    const catches = players.filter((p) => p.foundByUserId === player.userId).length;
    const survived = isHider && player.status === 'alive';

    const xpGain = 10 + (won ? 25 : 0) + catches * 15 + (survived ? 20 : 0);
    const newPlayed = profile.gamesPlayed + 1;
    const newWon = profile.gamesWon + (won ? 1 : 0);

    await ctx.db.patch('profiles', profile._id, {
      gamesPlayed: newPlayed,
      gamesWon: newWon,
      xp: (profile.xp ?? 0) + xpGain,
      gamesAsHider: (profile.gamesAsHider ?? 0) + (isHider ? 1 : 0),
      gamesAsSeeker: (profile.gamesAsSeeker ?? 0) + (isHider ? 0 : 1),
      hiderWins: (profile.hiderWins ?? 0) + (won && isHider ? 1 : 0),
      seekerWins: (profile.seekerWins ?? 0) + (won && !isHider ? 1 : 0),
      totalCatches: (profile.totalCatches ?? 0) + catches,
      roundsSurvived: (profile.roundsSurvived ?? 0) + (survived ? 1 : 0),
    });

    const unlocked: string[] = ['first_game'];
    if (newWon >= 1) unlocked.push('first_win');
    if (won && isHider) unlocked.push('escape_artist');
    if (won && !isHider) unlocked.push('relentless');
    if (catches >= 3) unlocked.push('hat_trick');
    if (survived) unlocked.push('untouchable');
    if (newPlayed >= 10) unlocked.push('veteran');
    if (newWon >= 10) unlocked.push('champion');
    await grantAchievements(ctx, player.userId, unlocked);
  }
}

/** If every hider is out (tagged or eliminated), the seekers win. */
export async function concludeIfHidersGone(
  ctx: MutationCtx,
  gameId: Id<'games'>,
): Promise<boolean> {
  const game = await ctx.db.get('games', gameId);
  if (!game || game.status !== 'active') return false;
  const hiders = await ctx.db
    .query('gamePlayers')
    .withIndex('by_game_and_role', (q) => q.eq('gameId', gameId).eq('role', 'hider'))
    .take(MAX_PLAYERS);
  const aliveHiders = hiders.filter((p) => p.status === 'alive').length;
  if (aliveHiders > 0) return false;
  await finishGame(ctx, gameId, 'seekers', 'Every hider is out.');
  return true;
}

/**
 * Scheduled `OUT_OF_BOUNDS_GRACE_MS` after a hider was first seen outside the
 * play area. Eliminates them if they are still outside and never returned.
 */
export const enforceBoundary = internalMutation({
  args: { gameId: v.id('games'), userId: v.id('users') },
  handler: async (ctx, args) => {
    const game = await ctx.db.get('games', args.gameId);
    if (!game || game.status !== 'active') return null;

    const player = await ctx.db
      .query('gamePlayers')
      .withIndex('by_game_and_user', (q) =>
        q.eq('gameId', args.gameId).eq('userId', args.userId),
      )
      .unique();
    if (!player || player.role !== 'hider' || player.status !== 'alive') return null;
    if (player.outOfBoundsSince == null) return null;
    // A later re-entry/exit reschedules its own check; ignore this stale one.
    if (Date.now() - player.outOfBoundsSince < OUT_OF_BOUNDS_GRACE_MS - 1000) return null;

    const loc = await ctx.db
      .query('playerLocations')
      .withIndex('by_game_and_user', (q) =>
        q.eq('gameId', args.gameId).eq('userId', args.userId),
      )
      .unique();
    const stillOutside =
      !loc ||
      distanceMeters(loc, game.center) > game.radiusMeters + BOUNDARY_BUFFER_METERS;
    if (!stillOutside) {
      await ctx.db.patch('gamePlayers', player._id, { outOfBoundsSince: undefined });
      return null;
    }

    await ctx.db.patch('gamePlayers', player._id, {
      status: 'found',
      foundAt: Date.now(),
      foundReason: 'out_of_bounds',
      outOfBoundsSince: undefined,
    });
    await logEvent(ctx, args.gameId, 'eliminated', 'A hider was eliminated — left the play area');
    await concludeIfHidersGone(ctx, args.gameId);
    return null;
  },
});

export const activateGame = internalMutation({
  args: { gameId: v.id('games') },
  handler: async (ctx, args) => {
    const game = await ctx.db.get('games', args.gameId);
    if (!game || game.status !== 'starting') return null;
    await ctx.db.patch('games', args.gameId, { status: 'active' });
    await logEvent(ctx, args.gameId, 'active', 'The hunt is on!');
    await ctx.scheduler.runAfter(0, internal.gameEngine.runPing, { gameId: args.gameId });
    return null;
  },
});

export const runPing = internalMutation({
  args: { gameId: v.id('games') },
  handler: async (ctx, args) => {
    const game = await ctx.db.get('games', args.gameId);
    if (!game || game.status !== 'active') return null;

    const players = await ctx.db
      .query('gamePlayers')
      .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
      .take(MAX_PLAYERS);

    const now = Date.now();
    for (const player of players) {
      if (player.status !== 'alive' || player.role === 'unassigned') continue;
      const loc = await ctx.db
        .query('playerLocations')
        .withIndex('by_game_and_user', (q) =>
          q.eq('gameId', args.gameId).eq('userId', player.userId),
        )
        .unique();
      if (!loc) continue;
      await ctx.db.insert('locationPings', {
        gameId: args.gameId,
        userId: player.userId,
        role: player.role,
        lat: loc.lat,
        lng: loc.lng,
        pingAt: now,
      });
    }

    await ctx.db.patch('games', args.gameId, { lastPingAt: now });
    await logEvent(ctx, args.gameId, 'ping', 'Positions pinged');
    await ctx.scheduler.runAfter(
      game.pingIntervalSeconds * 1000,
      internal.gameEngine.runPing,
      { gameId: args.gameId },
    );
    return null;
  },
});

export const endGameByTimer = internalMutation({
  args: { gameId: v.id('games'), winner: gameWinner },
  handler: async (ctx, args) => {
    const game = await ctx.db.get('games', args.gameId);
    if (!game || game.status !== 'active') return null;
    await finishGame(ctx, args.gameId, args.winner, "Time's up — the hiders survived.");
    return null;
  },
});
