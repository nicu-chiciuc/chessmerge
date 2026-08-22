import { defineApp } from "convex/server";
import { v } from "convex/values";

export default defineApp({
  env: {
    CLOUDFLARE_EMAIL_ACCOUNT_ID: v.optional(v.string()),
    CLOUDFLARE_EMAIL_API_TOKEN: v.optional(v.string()),
  },
});
