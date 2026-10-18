import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../convex/_generated/api";
import {
  getSubscriptionStatus,
  subscribe,
  unsubscribe,
} from "../convex/emailSubscriptions";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.*s");

describe("paused newsletter", () => {
  it("keeps signup and status internal while unsubscribe stays public", () => {
    expect(subscribe.isInternal).toBe(true);
    expect(getSubscriptionStatus.isInternal).toBe(true);
    expect(unsubscribe.isPublic).toBe(true);
  });

  it("preserves existing subscribers and accepts their unsubscribe tokens", async () => {
    const t = convexTest(schema, modules);
    const [subscriberId, otherSubscriberId] = await t.run(async (ctx) => {
      const subscriberId = await ctx.db.insert("emailSubscribers", {
        email: "subscriber@example.com",
        subscribedAt: 1,
        confirmed: true,
        confirmationToken: "existing-confirmation-token",
        unsubscribeToken: "existing-unsubscribe-token",
      });
      const otherSubscriberId = await ctx.db.insert("emailSubscribers", {
        email: "other@example.com",
        subscribedAt: 2,
        confirmed: false,
        unsubscribeToken: "other-unsubscribe-token",
      });
      return [subscriberId, otherSubscriberId] as const;
    });
    const originalRecords = await t.run(async (ctx) => [
      await ctx.db.get(subscriberId),
      await ctx.db.get(otherSubscriberId),
    ]);

    await expect(
      t.query(internal.emailSubscriptions.getSubscriptionStatus, {
        email: "subscriber@example.com",
      }),
    ).resolves.toEqual({ isSubscribed: true, confirmed: true });
    await expect(
      t.mutation(api.emailSubscriptions.unsubscribe, {
        token: "unknown-token",
      }),
    ).resolves.toEqual({ success: false, message: "Invalid unsubscribe link" });
    await expect(
      t.run(async (ctx) => [
        await ctx.db.get(subscriberId),
        await ctx.db.get(otherSubscriberId),
      ]),
    ).resolves.toEqual(originalRecords);

    await expect(
      t.mutation(api.emailSubscriptions.unsubscribe, {
        token: "existing-unsubscribe-token",
      }),
    ).resolves.toEqual({
      success: true,
      message: "You have been successfully unsubscribed",
    });
    await expect(
      t.run(async (ctx) => [
        await ctx.db.get(subscriberId),
        await ctx.db.get(otherSubscriberId),
      ]),
    ).resolves.toEqual([null, originalRecords[1]]);
  });
});
