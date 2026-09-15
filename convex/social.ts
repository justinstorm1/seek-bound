import { v } from 'convex/values';
import { Id } from './_generated/dataModel';
import { mutation, query, QueryCtx } from './_generated/server';
import { grantAchievements } from './achievements';
import { levelForXp, requireUserId } from './lib';

async function profileFor(ctx: QueryCtx, userId: Id<'users'>) {
  return ctx.db
    .query('profiles')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .unique();
}

async function isFollowing(ctx: QueryCtx, followerId: Id<'users'>, followingId: Id<'users'>) {
  const row = await ctx.db
    .query('follows')
    .withIndex('by_pair', (q) => q.eq('followerId', followerId).eq('followingId', followingId))
    .unique();
  return row !== null;
}

async function counts(ctx: QueryCtx, userId: Id<'users'>) {
  const followers = await ctx.db
    .query('follows')
    .withIndex('by_following', (q) => q.eq('followingId', userId))
    .take(1000);
  const following = await ctx.db
    .query('follows')
    .withIndex('by_follower', (q) => q.eq('followerId', userId))
    .take(1000);
  return { followers: followers.length, following: following.length };
}

/** Public profile card for any user. */
export const getPublicProfile = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const meId = await requireUserId(ctx);
    const profile = await profileFor(ctx, args.userId);
    if (!profile) return null;

    const avatarUrl = profile.avatarStorageId
      ? await ctx.storage.getUrl(profile.avatarStorageId)
      : null;
    const xp = profile.xp ?? 0;
    const { level, xpIntoLevel, xpForNextLevel } = levelForXp(xp);
    const { followers, following } = await counts(ctx, args.userId);

    return {
      userId: args.userId,
      isMe: args.userId === meId,
      isFollowing: args.userId === meId ? false : await isFollowing(ctx, meId, args.userId),
      displayName: profile.displayName,
      avatarUrl,
      xp,
      level,
      xpIntoLevel,
      xpForNextLevel,
      followers,
      following,
      stats: {
        gamesPlayed: profile.gamesPlayed,
        gamesWon: profile.gamesWon,
        gamesAsHider: profile.gamesAsHider ?? 0,
        gamesAsSeeker: profile.gamesAsSeeker ?? 0,
        hiderWins: profile.hiderWins ?? 0,
        seekerWins: profile.seekerWins ?? 0,
        totalCatches: profile.totalCatches ?? 0,
        roundsSurvived: profile.roundsSurvived ?? 0,
      },
    };
  },
});

export const follow = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const meId = await requireUserId(ctx);
    if (args.userId === meId) throw new Error("You can't follow yourself");
    if (await isFollowing(ctx, meId, args.userId)) return null;

    await ctx.db.insert('follows', {
      followerId: meId,
      followingId: args.userId,
      at: Date.now(),
    });

    const following = await ctx.db
      .query('follows')
      .withIndex('by_follower', (q) => q.eq('followerId', meId))
      .take(10);
    if (following.length >= 3) await grantAchievements(ctx, meId, ['squad']);
    return null;
  },
});

export const unfollow = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const meId = await requireUserId(ctx);
    const row = await ctx.db
      .query('follows')
      .withIndex('by_pair', (q) => q.eq('followerId', meId).eq('followingId', args.userId))
      .unique();
    if (row) await ctx.db.delete('follows', row._id);
    return null;
  },
});

async function summarize(ctx: QueryCtx, userIds: Id<'users'>[]) {
  const out = [];
  for (const id of userIds) {
    const profile = await profileFor(ctx, id);
    if (!profile) continue;
    const avatarUrl = profile.avatarStorageId
      ? await ctx.storage.getUrl(profile.avatarStorageId)
      : null;
    const { level } = levelForXp(profile.xp ?? 0);
    out.push({
      userId: id,
      displayName: profile.displayName,
      avatarUrl,
      xp: profile.xp ?? 0,
      level,
      gamesWon: profile.gamesWon,
    });
  }
  return out;
}

export const myFollowing = query({
  args: {},
  handler: async (ctx) => {
    const meId = await requireUserId(ctx);
    const rows = await ctx.db
      .query('follows')
      .withIndex('by_follower', (q) => q.eq('followerId', meId))
      .take(500);
    return summarize(ctx, rows.map((r) => r.followingId));
  },
});

export const myFollowers = query({
  args: {},
  handler: async (ctx) => {
    const meId = await requireUserId(ctx);
    const rows = await ctx.db
      .query('follows')
      .withIndex('by_following', (q) => q.eq('followingId', meId))
      .take(500);
    return summarize(ctx, rows.map((r) => r.followerId));
  },
});
