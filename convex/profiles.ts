import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { levelForXp, requireUserId } from './lib';

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .unique();
    if (!profile) return null;
    const avatarUrl = profile.avatarStorageId
      ? await ctx.storage.getUrl(profile.avatarStorageId)
      : null;
    const xp = profile.xp ?? 0;
    const { level, xpIntoLevel, xpForNextLevel } = levelForXp(xp);
    return {
      userId,
      displayName: profile.displayName,
      avatarUrl,
      gamesPlayed: profile.gamesPlayed,
      gamesWon: profile.gamesWon,
      xp,
      level,
      xpIntoLevel,
      xpForNextLevel,
      gamesAsHider: profile.gamesAsHider ?? 0,
      gamesAsSeeker: profile.gamesAsSeeker ?? 0,
      hiderWins: profile.hiderWins ?? 0,
      seekerWins: profile.seekerWins ?? 0,
      totalCatches: profile.totalCatches ?? 0,
      roundsSurvived: profile.roundsSurvived ?? 0,
    };
  },
});

export const upsertProfile = mutation({
  args: {
    displayName: v.string(),
    avatarStorageId: v.optional(v.id('_storage')),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const displayName = args.displayName.trim().slice(0, 40);
    if (displayName.length < 2) throw new Error('Display name is too short');

    const existing = await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .unique();

    if (existing) {
      if (
        args.avatarStorageId &&
        existing.avatarStorageId &&
        existing.avatarStorageId !== args.avatarStorageId
      ) {
        // Drop the previous photo so storage doesn't accumulate orphans.
        await ctx.storage.delete(existing.avatarStorageId);
      }
      await ctx.db.patch('profiles', existing._id, {
        displayName,
        ...(args.avatarStorageId ? { avatarStorageId: args.avatarStorageId } : {}),
      });
      return null;
    }

    await ctx.db.insert('profiles', {
      userId,
      displayName,
      avatarStorageId: args.avatarStorageId,
      gamesPlayed: 0,
      gamesWon: 0,
    });
    return null;
  },
});

export const generateAvatarUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    return ctx.storage.generateUploadUrl();
  },
});
