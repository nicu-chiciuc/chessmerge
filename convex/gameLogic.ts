import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  createInitialGameState,
  Move,
  isInCheck,
  applyMove,
  canAnyMoveCombatCheck,
  GameState,
  stringToBoard,
} from "../lib/chessmerge";
import { Doc, Id } from "./_generated/dataModel";
import { MutationCtx } from "./_generated/server";

// Buffer time before timeout check fires (to avoid race conditions)
const TIMEOUT_BUFFER_MS = 500;

/**
 * Calculate remaining time for a player based on move timestamps
 * This mirrors the frontend calculation logic
 */
function calculateRemainingTime(
  game: Doc<"games">,
  player: "w" | "b",
  now: number,
): number {
  const timeControl = game.timeControl;
  if (!timeControl || game.gameStartedAt === undefined) {
    return Infinity; // No time control or game hasn't started
  }

  const { initialTimeMs, incrementMs } = timeControl;
  const timestamps = game.moveTimestamps || [];
  const moveCount = timestamps.length;
  const gameStartedAt = game.gameStartedAt; // Safe: checked above

  // Calculate time spent on completed moves
  let timeSpent = 0;
  let movesCompleted = 0;

  for (let i = 0; i < moveCount; i++) {
    const isWhiteMove = i % 2 === 0;
    if ((player === "w" && isWhiteMove) || (player === "b" && !isWhiteMove)) {
      let moveDuration: number;

      if (i === 0) {
        // First move (white's) - use gameStartedAt
        moveDuration = timestamps[0] - gameStartedAt;
      } else {
        moveDuration = timestamps[i] - timestamps[i - 1];
      }

      timeSpent += moveDuration;
      movesCompleted++;
    }
  }

  // Add increment for completed moves
  const totalIncrement = movesCompleted * incrementMs;

  // Calculate live elapsed time if it's this player's turn
  const currentTurn = moveCount % 2 === 0 ? "w" : "b";
  let liveElapsed = 0;

  if (currentTurn === player && game.status === "active") {
    const turnStartTime =
      moveCount === 0 ? gameStartedAt : timestamps[moveCount - 1];
    liveElapsed = now - turnStartTime;
  }

  return Math.max(0, initialTimeMs + totalIncrement - timeSpent - liveElapsed);
}

/**
 * Schedule a timeout check for the current player
 * Returns the scheduled function ID
 */
async function scheduleTimeoutCheck(
  ctx: MutationCtx,
  game: Doc<"games">,
  now: number,
): Promise<Id<"_scheduled_functions"> | undefined> {
  // Don't schedule for practice games or games without time control
  if (game.isPracticeGame || !game.timeControl) {
    return undefined;
  }

  const moveCount = (game.moveTimestamps || []).length;
  const currentTurn = moveCount % 2 === 0 ? "w" : "b";
  const remainingTime = calculateRemainingTime(game, currentTurn, now);

  if (remainingTime === Infinity) {
    return undefined;
  }

  // Schedule the timeout check with a buffer
  const expiryTime = now + remainingTime + TIMEOUT_BUFFER_MS;

  const scheduledId = await ctx.scheduler.runAt(
    expiryTime,
    internal.gameLogic.checkTimeout,
    { gameId: game._id },
  );

  return scheduledId;
}

export const createGame = mutation({
  args: {
    initialTimeMs: v.number(),
    incrementMs: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const board = createInitialGameState();

    return await ctx.db.insert("games", {
      whitePlayerId: userId,
      status: "waiting",
      gameState: JSON.stringify(board),
      moveHistory: [],
      moveTimestamps: [],
      lastMoveAt: Date.now(),
      gameStartedAt: 0, // Will be set when game becomes active
      timeControl: {
        initialTimeMs: args.initialTimeMs,
        incrementMs: args.incrementMs,
      },
    });
  },
});

export const createPracticeGame = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const board = createInitialGameState();

    const now = Date.now();
    return await ctx.db.insert("games", {
      whitePlayerId: userId,
      blackPlayerId: userId, // Same user plays both sides
      isPracticeGame: true,
      status: "active", // Start immediately, no need to wait
      gameState: JSON.stringify(board),
      moveHistory: [],
      lastMoveAt: now,
      gameStartedAt: now, // Practice games start immediately
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

    const now = Date.now();

    // Update game to active state
    await ctx.db.patch(args.gameId, {
      blackPlayerId: userId,
      status: "active",
      lastMoveAt: now, // Clock starts when game becomes active
      gameStartedAt: now, // Record when game started for timer calculation
    });

    // Fetch the updated game to schedule timeout
    const updatedGame = await ctx.db.get(args.gameId);
    if (updatedGame && updatedGame.timeControl) {
      const scheduledId = await scheduleTimeoutCheck(ctx, updatedGame, now);
      if (scheduledId) {
        await ctx.db.patch(args.gameId, { scheduledTimeoutId: scheduledId });
      }
    }

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

    const move: Move = JSON.parse(args.move);
    const gameState: GameState = JSON.parse(game.gameState);

    // For practice games, allow the same user to play both sides
    if (game.isPracticeGame) {
      // In practice mode, user can make moves for either side
    } else {
      // For regular games, enforce turn order
      if (gameState.options.turn !== (isWhitePlayer ? "w" : "b")) {
        throw new Error("Not your turn");
      }
    }

    // Validate and apply move
    const newGameState = applyMove(gameState, move);
    // TODO: move this inside
    newGameState.options.turn = gameState.options.turn === "w" ? "b" : "w";

    // Check for game end conditions
    const isCheck = isInCheck(newGameState, newGameState.options.turn);
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
      const canMoveCombatCheck = canAnyMoveCombatCheck(
        newGameState,
        newGameState.options.turn,
      );
      if (!canMoveCombatCheck) {
        status = "completed";
        winner = newGameState.options.turn;
        gameEndReason = "checkmate";
      }
    } else {
      // Check for stalemate
      const canMoveCombatCheck = canAnyMoveCombatCheck(
        newGameState,
        newGameState.options.turn,
      );
      if (!canMoveCombatCheck) {
        status = "completed";
        winner = "draw";
        gameEndReason = "stalemate";
      }
    }

    const now = Date.now();

    // Cancel any existing scheduled timeout
    if (game.scheduledTimeoutId) {
      await ctx.scheduler.cancel(game.scheduledTimeoutId);
    }

    // Update the game state
    const newMoveTimestamps = [...(game.moveTimestamps || []), now];
    await ctx.db.patch(args.gameId, {
      gameState: JSON.stringify(newGameState),
      moveHistory: [...game.moveHistory, args.move],
      moveTimestamps: newMoveTimestamps,
      lastMoveAt: now,
      status,
      winner,
      gameEndReason,
      scheduledTimeoutId: undefined, // Clear old scheduled ID
    });

    // If game is still active, schedule timeout for next player
    if (status === "active" && game.timeControl && !game.isPracticeGame) {
      // Fetch updated game to get correct state for scheduling
      const updatedGame = await ctx.db.get(args.gameId);
      if (updatedGame) {
        const scheduledId = await scheduleTimeoutCheck(ctx, updatedGame, now);
        if (scheduledId) {
          await ctx.db.patch(args.gameId, { scheduledTimeoutId: scheduledId });
        }
      }
    }

    return {
      success: true,
      isCheck,
      isCheckmate: gameEndReason === "checkmate",
    };
  },
});

export const setPracticeGameState = mutation({
  args: {
    gameId: v.id("games"),
    // Array string representation of board
    strBoard: v.string(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");

    // Only practice games can have their state set
    if (!game.isPracticeGame) throw new Error("Game is not a practice game");

    try {
      const board = stringToBoard(args.strBoard);

      const oldGameState: GameState = JSON.parse(game.gameState);

      const newGameState: GameState = {
        ...oldGameState,
        board,
      };

      await ctx.db.patch(args.gameId, {
        gameState: JSON.stringify(newGameState),
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error(error);
      // throw new Error("Invalid board");
    }
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

/**
 * Internal mutation to check if a player has timed out
 * Called by scheduled function when a player's time should expire
 */
export const checkTimeout = internalMutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) return;

    // Only check active games with time control
    if (game.status !== "active" || !game.timeControl) {
      return;
    }

    const now = Date.now();
    const moveCount = (game.moveTimestamps || []).length;
    const currentTurn = moveCount % 2 === 0 ? "w" : "b";
    const remainingTime = calculateRemainingTime(game, currentTurn, now);

    // Check if player has actually timed out
    if (remainingTime <= 0) {
      // Player has timed out - end the game
      const winner = currentTurn === "w" ? "b" : "w";

      await ctx.db.patch(args.gameId, {
        status: "completed",
        winner,
        gameEndReason: "timeout",
        scheduledTimeoutId: undefined,
      });
    }
    // If remainingTime > 0, the player made a move in time
    // The scheduled function from that move will handle the next timeout
  },
});
