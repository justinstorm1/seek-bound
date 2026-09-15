import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { getMembership, loadProfiles, requireUserId } from './lib';

export const listMessages = query({
  args: { gameId: v.id('games') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const membership = await getMembership(ctx, args.gameId, userId);
    if (!membership) return [];

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
      .order('desc')
      .take(100);
    const profiles = await loadProfiles(ctx, messages.map((m) => m.userId));

    return messages
      .slice()
      .reverse()
      .map((m) => ({
        id: m._id,
        body: m.body,
        at: m._creationTime,
        userId: m.userId,
        isMe: m.userId === userId,
        displayName: profiles[m.userId]?.displayName ?? 'Player',
        avatarUrl: profiles[m.userId]?.avatarUrl ?? null,
      }));
  },
});

export const sendMessage = mutation({
  args: { gameId: v.id('games'), body: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const membership = await getMembership(ctx, args.gameId, userId);
    if (!membership) throw new Error('You are not in this game');

    const body = args.body.trim().slice(0, 500);
    if (!body) return null;

    await ctx.db.insert('messages', { gameId: args.gameId, userId, body });
    return null;
  },
});

/** Number of other players' messages sent since this player last opened chat.
 * Scoped to the same recent window `listMessages` shows, so it never reports
 * unread messages the chat screen itself wouldn't scroll back far enough to show. */
export const unreadCount = query({
  args: { gameId: v.id('games') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const membership = await getMembership(ctx, args.gameId, userId);
    if (!membership) return 0;

    const since = membership.lastReadAt ?? 0;
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
      .order('desc')
      .take(100);
    return messages.filter((m) => m.userId !== userId && m._creationTime > since).length;
  },
});

/** Marks chat as read up to now for the caller. Call on entering and leaving
 * the chat screen so messages that arrive while it's open don't stay "unread". */
export const markRead = mutation({
  args: { gameId: v.id('games') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const membership = await getMembership(ctx, args.gameId, userId);
    if (!membership) return null;
    await ctx.db.patch('gamePlayers', membership._id, { lastReadAt: Date.now() });
    return null;
  },
});
