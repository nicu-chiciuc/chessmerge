import { httpRouter } from "convex/server";
import { serveSite } from "@samebase/convex-hosting";
import { components } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { versionId } from "../.convex-hosting/version.js";

const http = httpRouter();

auth.addHttpRoutes(http);

// The built SPA. Convex Auth's exact routes and longer prefixes win over "/".
http.route({
  pathPrefix: "/",
  method: "GET",
  handler: httpAction((ctx, request) =>
    serveSite(ctx, components.hosting, request, versionId),
  ),
});

export default http;
