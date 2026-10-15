import { defineApp } from "convex/server";
import { v } from "convex/values";
import hosting from "@samebase/convex-hosting/convex.config";

const app = defineApp({
  env: {
    CLOUDFLARE_EMAIL_ACCOUNT_ID: v.optional(v.string()),
    CLOUDFLARE_EMAIL_API_TOKEN: v.optional(v.string()),
  },
});
app.use(hosting);

export default app;
