import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { createInitialGameState } from "../lib/chessmerge";
import { mutation, query } from "./_generated/server";

const CHALLENGE_EXPIRY_MS = 24 * 60 * 60 * 1_000;
const CREATION_COOLDOWN_MS = 30 * 1_000;

const nonJoinedChallengeStatus = v.union(
  v.literal("waiting"),
  v.literal("canceled"),
  v.literal("expired"),
);

export const createChallenge = mutation({
  args: {},
  returns: v.object({
    challengeId: v.id("challenges"),
    expiresAt: v.number(),
  }),
  handler: async (ctx) => {
    const creatorId = await getAuthUserId(ctx);
    if (!creatorId) throw new Error("Not authenticated");

    const now = Date.now();
    const latestChallenge = await ctx.db
      .query("challenges")
      .withIndex("by_creatorId", (q) => q.eq("creatorId", creatorId))
      .order("desc")
      .first();

    if (
      latestChallenge?.status === "waiting" &&
      latestChallenge.expiresAt > now
    ) {
      throw new Error("You already have an open challenge");
    }

    if (
      latestChallenge &&
      now - latestChallenge._creationTime < CREATION_COOLDOWN_MS
    ) {
      throw new Error("Challenge creation is on cooldown");
    }

    if (latestChallenge?.status === "waiting") {
      await ctx.db.replace(latestChallenge._id, {
        creatorId: latestChallenge.creatorId,
        status: "expired",
        expiresAt: latestChallenge.expiresAt,
      });
    }

    const expiresAt = now + CHALLENGE_EXPIRY_MS;
    const challengeId = await ctx.db.insert("challenges", {
      creatorId,
      status: "waiting",
      expiresAt,
    });

    return { challengeId, expiresAt };
  },
});

export const getChallenge = query({
  args: { challengeId: v.id("challenges") },
  returns: v.union(
    v.null(),
    v.object({
      status: nonJoinedChallengeStatus,
      expiresAt: v.number(),
      viewerRole: v.union(v.literal("creator"), v.literal("guest")),
    }),
    v.object({
      status: v.literal("joined"),
      expiresAt: v.number(),
      viewerRole: v.literal("guest"),
    }),
    v.object({
      status: v.literal("joined"),
      expiresAt: v.number(),
      viewerRole: v.union(v.literal("creator"), v.literal("opponent")),
      gameId: v.id("games"),
    }),
  ),
  handler: async (ctx, args) => {
    const viewerId = await getAuthUserId(ctx);
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) return null;

    if (challenge.status === "joined") {
      const game = viewerId ? await ctx.db.get(challenge.gameId) : null;
      if (
        game &&
        (game.whitePlayerId === viewerId || game.blackPlayerId === viewerId)
      ) {
        const viewerRole: "creator" | "opponent" =
          game.whitePlayerId === viewerId ? "creator" : "opponent";
        return {
          status: challenge.status,
          expiresAt: challenge.expiresAt,
          viewerRole,
          gameId: challenge.gameId,
        };
      }

      const viewerRole = "guest" as const;
      return {
        status: challenge.status,
        expiresAt: challenge.expiresAt,
        viewerRole,
      };
    }

    const viewerRole: "creator" | "guest" =
      challenge.creatorId === viewerId ? "creator" : "guest";

    return {
      status: challenge.status,
      expiresAt: challenge.expiresAt,
      viewerRole,
    };
  },
});

export const joinChallenge = mutation({
  args: { challengeId: v.id("challenges") },
  returns: v.object({ gameId: v.id("games") }),
  handler: async (ctx, args) => {
    const guestId = await getAuthUserId(ctx);
    if (!guestId) throw new Error("Not authenticated");

    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) throw new Error("Challenge unavailable");
    if (challenge.creatorId === guestId) {
      throw new Error("Cannot join your own challenge");
    }

    const now = Date.now();
    if (challenge.status !== "waiting" || challenge.expiresAt <= now) {
      throw new Error("Challenge unavailable");
    }

    const gameId = await ctx.db.insert("games", {
      whitePlayerId: challenge.creatorId,
      blackPlayerId: guestId,
      status: "active",
      gameState: JSON.stringify(createInitialGameState()),
      moveHistory: [],
      lastMoveAt: now,
      gameStartedAt: now,
    });

    await ctx.db.replace(args.challengeId, {
      creatorId: challenge.creatorId,
      status: "joined",
      expiresAt: challenge.expiresAt,
      gameId,
    });

    return { gameId };
  },
});

export const cancelChallenge = mutation({
  args: { challengeId: v.id("challenges") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const creatorId = await getAuthUserId(ctx);
    if (!creatorId) throw new Error("Not authenticated");

    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) throw new Error("Challenge unavailable");
    if (challenge.creatorId !== creatorId) {
      throw new Error("Only the creator can cancel this challenge");
    }
    if (challenge.status === "joined") {
      throw new Error("Joined challenges cannot be canceled");
    }
    if (challenge.status !== "waiting") return null;

    await ctx.db.replace(args.challengeId, {
      creatorId,
      status: challenge.expiresAt <= Date.now() ? "expired" : "canceled",
      expiresAt: challenge.expiresAt,
    });

    return null;
  },
});
