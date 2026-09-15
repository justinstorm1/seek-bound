import { v } from 'convex/values';
import { Doc, Id } from './_generated/dataModel';
import { query, QueryCtx } from './_generated/server';
import { levelForXp, requireUserId } from './lib';

async function toRows(ctx: QueryCtx, profiles: Doc<'profiles'>[]) {
  const out = [];
  for (const p of profiles) {
    const avatarUrl = p.avatarStorageId ? await ctx.storage.getUrl(p.avatarStorageId) : null;
    const xp = p.xp ?? 0;
    out.push({
      userId: p.userId,
      displayName: p.displayName,
      avatarUrl,
      xp,
      level: levelForXp(xp).level,
      gamesWon: p.gamesWon,
    });
  }
  return out;
}

/** Top players by XP, across everyone. */
export const global = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 100);
    const profiles = await ctx.db
      .query('profiles')
      .withIndex('by_xp')
      .order('desc')
      .take(limit);
    return toRows(ctx, profiles);
  },
});

/** Me + everyone I follow, ranked by XP. */
export const following = query({
  args: {},
  handler: async (ctx) => {
    const meId = await requireUserId(ctx);
    const follows = await ctx.db
      .query('follows')
      .withIndex('by_follower', (q) => q.eq('followerId', meId))
      .take(500);
    const ids = new Set<Id<'users'>>([meId, ...follows.map((f) => f.followingId)]);

    const profiles = [];
    for (const id of ids) {
      const p = await ctx.db
        .query('profiles')
        .withIndex('by_userId', (q) => q.eq('userId', id))
        .unique();
      if (p) profiles.push(p);
    }
    profiles.sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0));
    return toRows(ctx, profiles);
  },
});
