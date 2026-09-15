import { query } from './_generated/server';

/**
 * Remote feature flags the client reads at runtime. Flip with
 * `npx convex env set <NAME> true|false` — no deploy needed, so they double as
 * kill switches.
 */
export const flags = query({
  args: {},
  handler: async () => {
    return {
      // Background location tracking during an active game. Off unless explicitly enabled.
      backgroundLocation: process.env.BACKGROUND_LOCATION_ENABLED === 'true',
    };
  },
});
