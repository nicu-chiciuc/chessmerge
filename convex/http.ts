import { httpRouter } from "convex/server";
import { routeAll } from "@samebase/convex-hosting";
import { components } from "./_generated/api";
import { auth } from "./auth";
import { versionId } from "../.convex-hosting/version.js";
// Type only, nothing is bundled: the type of the server build imported below,
// so this file typechecks before the first build.
import type {} from "@samebase/convex-hosting-tanstack-start/server-build";
import server from "../dist/server/server.js";

const http = httpRouter();

auth.addHttpRoutes(http);

// Every method, every path, as a Cloudflare Worker with static assets: the
// uploaded file for a path that has one (another method than GET or HEAD on
// it answers 405), else the page that TanStack Start renders, signed out,
// because Convex Auth keeps the session in the browser. Convex answers HEAD
// through GET. Convex picks an exact path, then the longest prefix, so the
// routes of auth.addHttpRoutes keep winning over "/".
routeAll(http, components.hosting, versionId, server);

export default http;
