import { httpRouter } from "convex/server";
import { serveSite } from "@samebase/convex-hosting";
import { components } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { versionId } from "../.convex-hosting/version.js";
// Type only, nothing is bundled: the type of the server build imported below,
// so this file typechecks before the first build.
import type {} from "@samebase/convex-hosting-tanstack-start/server-build";
import server from "../dist/server/server.js";

const http = httpRouter();
const toServer = httpAction((_ctx, request) => server.fetch(request));

auth.addHttpRoutes(http);

// Every request that is not a GET goes to the app's server, as every request
// that is not a GET or HEAD goes to a Cloudflare Worker. Convex answers HEAD
// through GET. Convex picks an exact path, then the longest prefix, so the
// routes of auth.addHttpRoutes keep winning over "/".
for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const) {
  http.route({ pathPrefix: "/", method, handler: toServer });
}

// The built site. Convex Auth's exact routes and longer prefixes win over "/".
// A path without a file is a page: TanStack Start renders it, signed out,
// because Convex Auth keeps the session in the browser.
http.route({
  pathPrefix: "/",
  method: "GET",
  handler: httpAction((ctx, request) =>
    serveSite(ctx, components.hosting, request, versionId, () =>
      server.fetch(request),
    ),
  ),
});

export default http;
