import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  games: defineTable({
    whitePlayerId: v.id("users"),
    blackPlayerId: v.optional(v.id("users")),
    isPracticeGame: v.optional(v.boolean()),
    status: v.union(
      v.literal("waiting"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("abandoned"),
    ),
    currentTurn: v.union(v.literal("white"), v.literal("black")),
    winner: v.optional(
      v.union(v.literal("white"), v.literal("black"), v.literal("draw")),
    ),
    board: v.string(), // JSON serialized board state
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
  })
    .index("by_status", ["status"])
    .index("by_player", ["whitePlayerId"])
    .index("by_black_player", ["blackPlayerId"]),

  gameSpectators: defineTable({
    gameId: v.id("games"),
    userId: v.id("users"),
  })
    .index("by_game", ["gameId"])
    .index("by_user", ["userId"]),

  savedGames: defineTable({
    userId: v.id("users"),
    gameId: v.id("games"),
    name: v.string(),
    description: v.optional(v.string()),
  }).index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
