import { httpRouter } from 'convex/server';
import { internal } from './_generated/api';
import { httpAction } from './_generated/server';
import { auth } from './auth';

const http = httpRouter();

auth.addHttpRoutes(http);

/**
 * Background-task location reports. The device posts its position here while the
 * app is backgrounded; it's authenticated by the player's per-game token (the
 * same secret behind their tag QR).
 * Body:  { token: string, lat: number, lng: number }
 * Reply: { stop: boolean } — when true, the client stops the background task.
 */
http.route({
  path: '/reportLocation',
  method: 'POST',
  handler: httpAction(async (ctx, req) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: 'bad json' }, { status: 400 });
    }
    const b = body as Record<string, unknown>;
    if (
      typeof b.token !== 'string' ||
      typeof b.lat !== 'number' ||
      typeof b.lng !== 'number' ||
      !Number.isFinite(b.lat) ||
      !Number.isFinite(b.lng)
    ) {
      return Response.json({ error: 'bad body' }, { status: 400 });
    }

    const result = await ctx.runMutation(internal.games.reportLocationByToken, {
      token: b.token,
      lat: b.lat,
      lng: b.lng,
    });
    return Response.json(result, { status: 200 });
  }),
});

export default http;
