import { v } from 'convex/values';
import { internal } from './_generated/api';
import { Id } from './_generated/dataModel';
import { internalMutation, mutation, MutationCtx } from './_generated/server';
import { requireUserId } from './lib';

/** Game-data rows are cleared this many per scheduled step. */
const BATCH = 25;

/** Removes every `@convex-dev/auth` row tied to a user (sessions, tokens, accounts). */
async function deleteAuthRecords(ctx: MutationCtx, userId: Id<'users'>): Promise<void> {
  const sessions = await ctx.db
    .query('authSessions')
    .withIndex('userId', (q) => q.eq('userId', userId))
    .collect();
  for (const session of sessions) {
    const tokens = await ctx.db
      .query('authRefreshTokens')
      .withIndex('sessionId', (q) => q.eq('sessionId', session._id))
      .collect();
    for (const token of tokens) await ctx.db.delete('authRefreshTokens', token._id);
    await ctx.db.delete('authSessions', session._id);
  }

  const accounts = await ctx.db
    .query('authAccounts')
    .withIndex('userIdAndProvider', (q) => q.eq('userId', userId))
    .collect();
  for (const account of accounts) {
    const codes = await ctx.db
      .query('authVerificationCodes')
      .withIndex('accountId', (q) => q.eq('accountId', account._id))
      .collect();
    for (const code of codes) await ctx.db.delete('authVerificationCodes', code._id);
    await ctx.db.delete('authAccounts', account._id);
  }
}

/**
 * Permanently deletes the signed-in user: profile + avatar, all auth records,
 * and the user row. Game-history rows (memberships, chat, location fixes) are
 * cleared by a scheduled job so a heavy account can't exceed a transaction's
 * limits. Irreversible.
 */
export const deleteMyAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const user = await ctx.db.get('users', userId);
    if (!user) return null;

    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .unique();
    if (profile) {
      if (profile.avatarStorageId) {
        try {
          await ctx.storage.delete(profile.avatarStorageId);
        } catch {
          // Storage object may already be gone — nothing to do.
        }
      }
      await ctx.db.delete('profiles', profile._id);
    }

    await deleteAuthRecords(ctx, userId);
    // After this the caller's access token no longer resolves to a user.
    await ctx.db.delete('users', userId);

    await ctx.scheduler.runAfter(0, internal.account.purgeUserGameData, { userId });
    return null;
  },
});

export const purgeUserGameData = internalMutation({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    let more = false;

    const memberships = await ctx.db
      .query('gamePlayers')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .take(BATCH);
    for (const m of memberships) {
      const game = await ctx.db.get('games', m.gameId);
      if (game && game.hostUserId === userId) {
        // Their hosted game goes with them; purgeGame reschedules itself until done.
        await ctx.scheduler.runAfter(0, internal.gameEngine.purgeGame, { gameId: m.gameId });
      } else {
        const loc = await ctx.db
          .query('playerLocations')
          .withIndex('by_game_and_user', (q) =>
            q.eq('gameId', m.gameId).eq('userId', userId),
          )
          .unique();
        if (loc) await ctx.db.delete('playerLocations', loc._id);
      }
      await ctx.db.delete('gamePlayers', m._id);
    }
    if (memberships.length === BATCH) more = true;

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .take(BATCH);
    for (const message of messages) await ctx.db.delete('messages', message._id);
    if (messages.length === BATCH) more = true;

    if (more) {
      await ctx.scheduler.runAfter(0, internal.account.purgeUserGameData, { userId });
    }
    return null;
  },
});
