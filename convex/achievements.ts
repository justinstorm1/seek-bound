import { v } from 'convex/values';
import { Id } from './_generated/dataModel';
import { MutationCtx, query, QueryCtx } from './_generated/server';
import { requireUserId } from './lib';

/** The full achievement catalogue. Client mirrors the keys/titles for display. */
export const CATALOG = [
  { key: 'first_game', title: 'Getting Started', description: 'Play your first game' },
  { key: 'first_win', title: 'Winner', description: 'Win your first game' },
  { key: 'escape_artist', title: 'Escape Artist', description: 'Win a round as a hider' },
  { key: 'relentless', title: 'Relentless', description: 'Win a round as a seeker' },
  { key: 'hat_trick', title: 'Hat Trick', description: 'Catch 3 hiders in one game' },
  { key: 'untouchable', title: 'Untouchable', description: 'Survive a full round as a hider' },
  { key: 'veteran', title: 'Veteran', description: 'Play 10 games' },
  { key: 'champion', title: 'Champion', description: 'Win 10 games' },
  { key: 'squad', title: 'Squad', description: 'Follow 3 players' },
] as const;

export type AchievementKey = (typeof CATALOG)[number]['key'];

/** Inserts any of `keys` the user doesn't already have. */
export async function grantAchievements(
  ctx: MutationCtx,
  userId: Id<'users'>,
  keys: string[],
): Promise<void> {
  for (const key of keys) {
    const existing = await ctx.db
      .query('achievements')
      .withIndex('by_user_key', (q) => q.eq('userId', userId).eq('key', key))
      .unique();
    if (!existing) {
      await ctx.db.insert('achievements', { userId, key, at: Date.now() });
    }
  }
}

async function unlockedKeys(ctx: QueryCtx, userId: Id<'users'>) {
  const rows = await ctx.db
    .query('achievements')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .take(100);
  return rows.map((r) => ({ key: r.key, at: r.at }));
}

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return unlockedKeys(ctx, userId);
  },
});

export const forUser = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    return unlockedKeys(ctx, args.userId);
  },
});
