/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounts from "../accounts.js";
import type * as auth from "../auth.js";
import type * as authEmails from "../authEmails.js";
import type * as authUser from "../authUser.js";
import type * as challenges from "../challenges.js";
import type * as email from "../email.js";
import type * as emailSubscriptions from "../emailSubscriptions.js";
import type * as emails from "../emails.js";
import type * as gameLogic from "../gameLogic.js";
import type * as http from "../http.js";
import type * as publicPlayers from "../publicPlayers.js";
import type * as router from "../router.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accounts: typeof accounts;
  auth: typeof auth;
  authEmails: typeof authEmails;
  authUser: typeof authUser;
  challenges: typeof challenges;
  email: typeof email;
  emailSubscriptions: typeof emailSubscriptions;
  emails: typeof emails;
  gameLogic: typeof gameLogic;
  http: typeof http;
  publicPlayers: typeof publicPlayers;
  router: typeof router;
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

export declare const components: {
  hosting: import("@samebase/convex-hosting/_generated/component.js").ComponentApi<"hosting">;
};
