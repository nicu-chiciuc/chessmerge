import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  Board,
  createInitialBoard,
  Move,
  isInCheck,
  hasAnyValidMoves,
  applyMove,
} from "../lib/chessmerge";

// Check if king is in check

export const createGame = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const board = createInitialBoard();

    return await ctx.db.insert("games", {
      whitePlayerId: userId,
      status: "waiting",
      currentTurn: "w",
      board: JSON.stringify(board),
      moveHistory: [],
      lastMoveAt: Date.now(),
    });
  },
});

export const createPracticeGame = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const board = createInitialBoard();

    return await ctx.db.insert("games", {
      whitePlayerId: userId,
      blackPlayerId: userId, // Same user plays both sides
      isPracticeGame: true,
      status: "active", // Start immediately, no need to wait
      currentTurn: "w",
      board: JSON.stringify(board),
      moveHistory: [],
      lastMoveAt: Date.now(),
    });
  },
});

export const joinGame = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");
    if (game.status !== "waiting")
      throw new Error("Game is not waiting for players");
    if (game.whitePlayerId === userId)
      throw new Error("Cannot join your own game");

    await ctx.db.patch(args.gameId, {
      blackPlayerId: userId,
      status: "active",
    });

    return game;
  },
});

export const makeMove = mutation({
  args: {
    gameId: v.id("games"),
    move: v.string(), // JSON serialized move
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");
    if (game.status !== "active") throw new Error("Game is not active");

    const isWhitePlayer = game.whitePlayerId === userId;
    const isBlackPlayer = game.blackPlayerId === userId;

    if (!isWhitePlayer && !isBlackPlayer)
      throw new Error("Not a player in this game");

    // For practice games, allow the same user to play both sides
    if (game.isPracticeGame) {
      // In practice mode, user can make moves for either side
    } else {
      // For regular games, enforce turn order
      if (game.currentTurn !== (isWhitePlayer ? "w" : "b")) {
        throw new Error("Not your turn");
      }
    }

    const move: Move = JSON.parse(args.move);
    const board: Board = JSON.parse(game.board);

    // Validate and apply move
    const newBoard = applyMove(board, move);
    const nextTurn = game.currentTurn === "w" ? "b" : "w";

    // Check for game end conditions
    const isCheck = isInCheck(newBoard, nextTurn);
    let status: "waiting" | "active" | "completed" | "abandoned" = game.status;
    let winner: "w" | "b" | "draw" | undefined = game.winner;
    let gameEndReason:
      | "checkmate"
      | "stalemate"
      | "resignation"
      | "timeout"
      | "draw_agreement"
      | undefined = game.gameEndReason;

    if (isCheck) {
      // Check for checkmate
      const hasValidMoves = hasAnyValidMoves(newBoard, nextTurn);
      if (!hasValidMoves) {
        status = "completed";
        winner = game.currentTurn;
        gameEndReason = "checkmate";
      }
    } else {
      // Check for stalemate
      const hasValidMoves = hasAnyValidMoves(newBoard, nextTurn);
      if (!hasValidMoves) {
        status = "completed";
        winner = "draw";
        gameEndReason = "stalemate";
      }
    }

    await ctx.db.patch(args.gameId, {
      board: JSON.stringify(newBoard),
      currentTurn: nextTurn,
      moveHistory: [...game.moveHistory, args.move],
      lastMoveAt: Date.now(),
      status,
      winner,
      gameEndReason,
    });

    return {
      success: true,
      isCheck,
      isCheckmate: gameEndReason === "checkmate",
    };
  },
});

export const getGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.gameId);
  },
});

export const listGames = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const games = await ctx.db
      .query("games")
      .filter((q) =>
        q.or(
          q.eq(q.field("whitePlayerId"), userId),
          q.eq(q.field("blackPlayerId"), userId),
        ),
      )
      .order("desc")
      .take(20);

    return games;
  },
});

export const getWaitingGames = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("games")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .filter((q) => q.neq(q.field("whitePlayerId"), userId))
      .order("desc")
      .take(10);
  },
});
