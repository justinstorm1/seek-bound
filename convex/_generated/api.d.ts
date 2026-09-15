/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as account from "../account.js";
import type * as achievements from "../achievements.js";
import type * as auth from "../auth.js";
import type * as chat from "../chat.js";
import type * as config from "../config.js";
import type * as gameEngine from "../gameEngine.js";
import type * as games from "../games.js";
import type * as http from "../http.js";
import type * as leaderboard from "../leaderboard.js";
import type * as lib from "../lib.js";
import type * as profiles from "../profiles.js";
import type * as push from "../push.js";
import type * as social from "../social.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  account: typeof account;
  achievements: typeof achievements;
  auth: typeof auth;
  chat: typeof chat;
  config: typeof config;
  gameEngine: typeof gameEngine;
  games: typeof games;
  http: typeof http;
  leaderboard: typeof leaderboard;
  lib: typeof lib;
  profiles: typeof profiles;
  push: typeof push;
  social: typeof social;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
