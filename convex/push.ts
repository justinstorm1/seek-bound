import { v } from 'convex/values';
import { api, internal } from './_generated/api';
import { action, internalMutation, internalQuery, mutation, query } from './_generated/server';
import { requireUserId } from './lib';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
/** Expo recommends batches of at most 100 messages per request. */
const BATCH_SIZE = 100;

/** Expo push tokens always look like `ExponentPushToken[...]` (or the newer
 * `ExpoPushToken[...]`). A raw native APNs/FCM token is never a valid `to`
 * value for Expo's push API, so reject it before it ever reaches the table —
 * this is the shape a simulator's fake device token comes back as, which
 * `expo-notifications` can occasionally surface instead of failing outright. */
function isValidExpoPushToken(token: string): boolean {
  return /^Expo(nent)?PushToken\[.+\]$/.test(token);
}

/** Only the account whose email matches this env var may broadcast. */
function isAdminEmail(email: string | null | undefined): boolean {
  const admin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return !!admin && !!email && email.trim().toLowerCase() === admin;
}

/** Registers (or re-owns) this device's Expo push token for the signed-in user. */
export const registerToken = mutation({
  args: {
    token: v.string(),
    platform: v.union(v.literal('ios'), v.literal('android')),
  },
  handler: async (ctx, args) => {
    if (!isValidExpoPushToken(args.token)) return null;
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query('pushTokens')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .unique();
    if (existing) {
      await ctx.db.patch('pushTokens', existing._id, {
        userId,
        platform: args.platform,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert('pushTokens', {
        userId,
        token: args.token,
        platform: args.platform,
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

/** Drops a device's token, e.g. on sign-out, so a stale account stops getting it. */
export const unregisterToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const existing = await ctx.db
      .query('pushTokens')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .unique();
    if (existing) await ctx.db.delete('pushTokens', existing._id);
    return null;
  },
});

/** Whether the signed-in user may send a broadcast notification. */
export const amIAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const user = await ctx.db.get('users', userId);
    return isAdminEmail(user?.email);
  },
});

/** Every registered device token. Table is small (one row per device); a
 * deliberate full read for a deliberate "send to everyone" broadcast. */
export const listTokens = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query('pushTokens').collect();
    return rows.map((r) => r.token);
  },
});

/** Removes tokens Expo reported as permanently dead (uninstalled app, or
 * never a valid token to begin with), so a broadcast doesn't keep retrying them. */
export const pruneTokens = internalMutation({
  args: { tokens: v.array(v.string()) },
  handler: async (ctx, args) => {
    for (const token of args.tokens) {
      const existing = await ctx.db
        .query('pushTokens')
        .withIndex('by_token', (q) => q.eq('token', token))
        .unique();
      if (existing) await ctx.db.delete('pushTokens', existing._id);
    }
    return null;
  },
});

type PushTicket = {
  status?: string;
  message?: string;
  details?: { error?: string };
};

/** Sends a push notification to every registered device. Admin-only. */
export const broadcastToAll = action({
  args: { title: v.string(), body: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<{ sent: number; failed: number; errors: string[] }> => {
    const admin = await ctx.runQuery(api.push.amIAdmin, {});
    if (!admin) throw new Error('Not authorized');

    const title = args.title.trim().slice(0, 120);
    const body = args.body.trim().slice(0, 500);
    if (!title || !body) throw new Error('Title and body are required');

    const tokens: string[] = await ctx.runQuery(internal.push.listTokens, {});

    let sent = 0;
    let failed = 0;
    const errorMessages = new Set<string>();
    const deadTokens: string[] = [];

    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      const chunk = tokens.slice(i, i + BATCH_SIZE);
      try {
        const res = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify(
            chunk.map((to) => ({ to, title, body, sound: 'default', priority: 'high' })),
          ),
        });
        const json: unknown = await res.json().catch(() => null);
        const tickets: PushTicket[] =
          json && typeof json === 'object' && 'data' in json && Array.isArray((json as { data: unknown }).data)
            ? (json as { data: PushTicket[] }).data
            : [];

        if (tickets.length === 0) {
          // Expo didn't return per-ticket data — report the raw response.
          failed += chunk.length;
          const bodyText =
            json && typeof json === 'object' && 'errors' in json
              ? JSON.stringify((json as { errors: unknown }).errors)
              : `HTTP ${res.status}`;
          errorMessages.add(bodyText);
          continue;
        }

        tickets.forEach((ticket, idx) => {
          if (ticket.status === 'ok') {
            sent++;
            return;
          }
          failed++;
          if (ticket.message) errorMessages.add(ticket.message);
          if (ticket.details?.error === 'DeviceNotRegistered') {
            deadTokens.push(chunk[idx]);
          }
        });
      } catch (error) {
        failed += chunk.length;
        errorMessages.add(error instanceof Error ? error.message : 'Network error');
      }
    }

    if (deadTokens.length > 0) {
      await ctx.runMutation(internal.push.pruneTokens, { tokens: deadTokens });
    }

    return { sent, failed, errors: [...errorMessages] };
  },
});
