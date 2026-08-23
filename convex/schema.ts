import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  games: defineTable({
    whitePlayerId: v.id("users"),
    blackPlayerId: v.optional(v.id("users")),
    // Retained for stored remote-practice games. New practice is local.
    isPracticeGame: v.optional(v.boolean()),
    status: v.union(
      v.literal("waiting"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("abandoned"),
    ),
    winner: v.optional(
      v.union(v.literal("w"), v.literal("b"), v.literal("draw")),
    ),
    gameState: v.string(), // JSON serialized game state
    moveHistory: v.array(v.string()), // JSON serialized moves
    lastMoveAt: v.number(),
    gameEndReason: v.optional(
      v.union(
        v.literal("checkmate"),
        v.literal("stalemate"),
        v.literal("resignation"),
        v.literal("timeout"),
        v.literal("draw_agreement"),
      ),
    ),
    // Legacy clock fields stay optional so stored games continue to validate.
    // New games are untimed challenges.
    timeControl: v.optional(
      v.object({
        initialTimeMs: v.number(), // Initial time in milliseconds
        incrementMs: v.number(), // Increment per move in milliseconds
      }),
    ),
    moveTimestamps: v.optional(v.array(v.number())), // When each move was made
    gameStartedAt: v.optional(v.number()), // When the game became active (black joined)
    scheduledTimeoutId: v.optional(v.id("_scheduled_functions")), // Timeout check scheduled function
  })
    .index("by_player", ["whitePlayerId"])
    .index("by_black_player", ["blackPlayerId"])
    .index("by_status_and_last_move", ["status", "lastMoveAt"]),

  challenges: defineTable(
    v.union(
      v.object({
        creatorId: v.id("users"),
        status: v.literal("waiting"),
        expiresAt: v.number(),
      }),
      v.object({
        creatorId: v.id("users"),
        status: v.literal("joined"),
        expiresAt: v.number(),
        gameId: v.id("games"),
      }),
      v.object({
        creatorId: v.id("users"),
        status: v.literal("canceled"),
        expiresAt: v.number(),
      }),
      v.object({
        creatorId: v.id("users"),
        status: v.literal("expired"),
        expiresAt: v.number(),
      }),
    ),
  ).index("by_creatorId", ["creatorId"]),

  emailSubscribers: defineTable({
    email: v.string(),
    subscribedAt: v.number(),
    confirmed: v.boolean(),
    confirmationToken: v.optional(v.string()),
    unsubscribeToken: v.string(),
  })
    .index("by_email", ["email"])
    .index("by_confirmation_token", ["confirmationToken"])
    .index("by_unsubscribe_token", ["unsubscribeToken"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
