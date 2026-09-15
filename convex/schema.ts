import { authTables } from '@convex-dev/auth/server';
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const gameStatus = v.union(
  v.literal('lobby'),
  v.literal('starting'),
  v.literal('active'),
  v.literal('finished'),
);

export const playerRole = v.union(
  v.literal('unassigned'),
  v.literal('hider'),
  v.literal('seeker'),
);

export const playerStatus = v.union(
  v.literal('alive'),
  v.literal('found'),
  v.literal('left'),
);

export const foundReason = v.union(
  v.literal('tagged'),
  v.literal('out_of_bounds'),
);

export const gameWinner = v.union(v.literal('hiders'), v.literal('seekers'));

const point = v.object({ lat: v.number(), lng: v.number() });

export default defineSchema({
  ...authTables,

  // Stable per-user profile data. Kept separate from the high-churn game tables.
  profiles: defineTable({
    userId: v.id('users'),
    displayName: v.string(),
    avatarStorageId: v.optional(v.id('_storage')),
    gamesPlayed: v.number(),
    gamesWon: v.number(),
    // Progression + lifetime stats. Optional so existing rows validate; treated
    // as 0 when absent and backfilled on the next `finishGame`.
    xp: v.optional(v.number()),
    gamesAsHider: v.optional(v.number()),
    gamesAsSeeker: v.optional(v.number()),
    hiderWins: v.optional(v.number()),
    seekerWins: v.optional(v.number()),
    totalCatches: v.optional(v.number()),
    roundsSurvived: v.optional(v.number()),
  })
    .index('by_userId', ['userId'])
    .index('by_xp', ['xp']),

  follows: defineTable({
    followerId: v.id('users'),
    followingId: v.id('users'),
    at: v.number(),
  })
    .index('by_follower', ['followerId'])
    .index('by_following', ['followingId'])
    .index('by_pair', ['followerId', 'followingId']),

  achievements: defineTable({
    userId: v.id('users'),
    key: v.string(),
    at: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_key', ['userId', 'key']),

  games: defineTable({
    code: v.string(),
    hostUserId: v.id('users'),
    status: gameStatus,
    center: point,
    radiusMeters: v.number(),
    durationSeconds: v.number(),
    pingIntervalSeconds: v.number(),
    startingSeekers: v.number(),
    // Set once the host starts the game.
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    // When the location-ping cycle last ran (drives the "next ping" countdown).
    lastPingAt: v.optional(v.number()),
    winner: v.optional(gameWinner),
    // Set once the host starts a rematch — points at the fresh lobby.
    rematchGameId: v.optional(v.id('games')),
  })
    .index('by_code', ['code'])
    .index('by_host', ['hostUserId']),

  gamePlayers: defineTable({
    gameId: v.id('games'),
    userId: v.id('users'),
    role: playerRole,
    status: playerStatus,
    // Opaque token encoded in the player's QR code. Scanning it proves proximity.
    token: v.string(),
    foundAt: v.optional(v.number()),
    foundByUserId: v.optional(v.id('users')),
    foundReason: v.optional(foundReason),
    // When this hider was first detected outside the play area (null once back inside).
    outOfBoundsSince: v.optional(v.number()),
    // When this player's app went to the background (null while foregrounded).
    awaySince: v.optional(v.number()),
    // When this player last had the chat screen open — messages newer than
    // this from other players count as unread.
    lastReadAt: v.optional(v.number()),
  })
    .index('by_game', ['gameId'])
    .index('by_game_and_user', ['gameId', 'userId'])
    .index('by_game_and_role', ['gameId', 'role'])
    .index('by_user', ['userId'])
    .index('by_token', ['token']),

  // High-churn: one row per player, replaced on every location report.
  playerLocations: defineTable({
    gameId: v.id('games'),
    userId: v.id('users'),
    lat: v.number(),
    lng: v.number(),
    updatedAt: v.number(),
  }).index('by_game_and_user', ['gameId', 'userId']),

  // Immutable position snapshots. Opponents only ever see these, never live GPS.
  locationPings: defineTable({
    gameId: v.id('games'),
    userId: v.id('users'),
    role: playerRole,
    lat: v.number(),
    lng: v.number(),
    pingAt: v.number(),
  }).index('by_game', ['gameId']),

  gameEvents: defineTable({
    gameId: v.id('games'),
    type: v.string(),
    message: v.string(),
    actorUserId: v.optional(v.id('users')),
  }).index('by_game', ['gameId']),

  messages: defineTable({
    gameId: v.id('games'),
    userId: v.id('users'),
    body: v.string(),
  })
    .index('by_game', ['gameId'])
    .index('by_user', ['userId']),

  // One row per device. Keyed by token (not user) so a token always belongs
  // to whichever account most recently registered it — important on shared
  // devices and after sign-out/sign-in as a different user.
  pushTokens: defineTable({
    userId: v.id('users'),
    token: v.string(),
    platform: v.union(v.literal('ios'), v.literal('android')),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_token', ['token']),
});
