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
      // Email/password "App Reviewer" sign-in button on the login screen. Off
      // unless explicitly enabled — only needed while a store review is pending.
      showingEmailLogin: process.env.SHOWING_EMAIL_LOGIN === 'true',
    };
  },
});
