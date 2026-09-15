import { getAuthUserId } from '@convex-dev/auth/server';
import { Doc, Id } from './_generated/dataModel';
import { MutationCtx, QueryCtx } from './_generated/server';

export const STARTING_DELAY_MS = 6000;
export const OUT_OF_BOUNDS_GRACE_MS = 15000;
/** GPS slop allowed past the circle edge before a hider counts as "outside". */
export const BOUNDARY_BUFFER_METERS = 10;
/** Games are auto-deleted this long after they start (or, if never started, after creation). */
export const GAME_TTL_MS = 5 * 60 * 60 * 1000;
export const MAX_PLAYERS = 64;
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/** A player counts as "away" once their location has been silent this long. */
export const AWAY_AFTER_MS = 25_000;

/** Level curve: each level needs 100·level² total XP (lvl 2 at 100, lvl 3 at 400…). */
export function levelForXp(xp: number): {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
} {
  const safe = Math.max(0, Math.floor(xp));
  const level = Math.floor(Math.sqrt(safe / 100)) + 1;
  const floor = 100 * (level - 1) * (level - 1);
  const ceil = 100 * level * level;
  return { level, xpIntoLevel: safe - floor, xpForNextLevel: ceil - floor };
}

/** Resolves the signed-in user id or throws. Never trust a client-supplied id. */
export async function requireUserId(ctx: QueryCtx | MutationCtx): Promise<Id<'users'>> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

/** Great-circle distance between two lat/lng points, in meters. */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function randomFrom(alphabet: string, length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/** Human-friendly, ambiguity-free join code. */
export function randomCode(): string {
  return randomFrom(CODE_ALPHABET, 6);
}

/** Opaque token for a player's QR code. Matches the client `parseQrToken` regex. */
export function randomToken(): string {
  return randomFrom('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 24);
}

/** Fisher–Yates shuffle, returns a new array. */
export function shuffle<T>(input: readonly T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** The caller's player row for a game, or null if they never joined. */
export async function getMembership(
  ctx: QueryCtx | MutationCtx,
  gameId: Id<'games'>,
  userId: Id<'users'>,
): Promise<Doc<'gamePlayers'> | null> {
  return ctx.db
    .query('gamePlayers')
    .withIndex('by_game_and_user', (q) => q.eq('gameId', gameId).eq('userId', userId))
    .unique();
}

export async function logEvent(
  ctx: MutationCtx,
  gameId: Id<'games'>,
  type: string,
  message: string,
  actorUserId?: Id<'users'>,
): Promise<void> {
  await ctx.db.insert('gameEvents', { gameId, type, message, actorUserId });
}

/** Maps user ids to a display name + avatar URL for rendering rosters. */
export async function loadProfiles(
  ctx: QueryCtx,
  userIds: Id<'users'>[],
): Promise<Record<Id<'users'>, { displayName: string; avatarUrl: string | null }>> {
  const out: Record<Id<'users'>, { displayName: string; avatarUrl: string | null }> = {};
  const unique = [...new Set(userIds)];
  for (const userId of unique) {
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .unique();
    const user = await ctx.db.get('users', userId);
    const avatarUrl = profile?.avatarStorageId
      ? await ctx.storage.getUrl(profile.avatarStorageId)
      : null;
    out[userId] = {
      displayName: profile?.displayName ?? user?.name ?? 'Player',
      avatarUrl,
    };
  }
  return out;
}
