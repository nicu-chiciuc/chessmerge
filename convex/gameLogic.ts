import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  isInCheck,
  applyMove,
  canAnyMoveCombatCheck,
  equalPositions,
  getAllMovesForCell,
} from "../lib/chessmerge";
import type { GameState, Move, PieceType, Position } from "../lib/chessmerge";
import type { Doc, Id } from "./_generated/dataModel";

const participantGameValidator = v.union(
  v.object({
    _id: v.id("games"),
    playerColor: v.union(v.literal("w"), v.literal("b")),
    gameState: v.string(),
    moveHistory: v.array(v.string()),
    lastMoveAt: v.number(),
    status: v.literal("active"),
  }),
  v.object({
    _id: v.id("games"),
    playerColor: v.union(v.literal("w"), v.literal("b")),
    gameState: v.string(),
    moveHistory: v.array(v.string()),
    lastMoveAt: v.number(),
    status: v.literal("completed"),
    winner: v.union(v.literal("w"), v.literal("b"), v.literal("draw")),
    gameEndReason: v.union(v.literal("checkmate"), v.literal("stalemate")),
  }),
);

type ResumableGame = Doc<"games"> & { blackPlayerId: Id<"users"> } & (
    | { status: "active"; winner?: undefined; gameEndReason?: undefined }
    | {
        status: "completed";
        winner: "w" | "b" | "draw";
        gameEndReason: "checkmate" | "stalemate";
      }
  );

function isResumableGame(game: Doc<"games">): game is ResumableGame {
  if (
    game.blackPlayerId === undefined ||
    game.blackPlayerId === game.whitePlayerId ||
    game.isPracticeGame === true ||
    game.timeControl !== undefined
  ) {
    return false;
  }

  if (game.status === "active") {
    return game.winner === undefined && game.gameEndReason === undefined;
  }

  return (
    game.status === "completed" &&
    game.winner !== undefined &&
    (game.gameEndReason === "checkmate" || game.gameEndReason === "stalemate")
  );
}

type SubmittedMove = {
  from: Position;
  to: Position;
  piece: string;
  promotion?: PieceType;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePosition(value: unknown): Position {
  if (
    !isRecord(value) ||
    typeof value.row !== "number" ||
    !Number.isInteger(value.row) ||
    value.row < 0 ||
    value.row >= 8 ||
    typeof value.col !== "number" ||
    !Number.isInteger(value.col) ||
    value.col < 0 ||
    value.col >= 8
  ) {
    throw new Error("Malformed move");
  }
  return { row: value.row, col: value.col };
}

function parseSubmittedMove(serializedMove: string): SubmittedMove {
  let value: unknown;
  try {
    value = JSON.parse(serializedMove);
  } catch {
    throw new Error("Malformed move");
  }

  if (!isRecord(value) || typeof value.piece !== "string") {
    throw new Error("Malformed move");
  }

  const from = parsePosition(value.from);
  const to = parsePosition(value.to);
  const promotion = value.promotion;
  if (
    promotion !== undefined &&
    promotion !== "q" &&
    promotion !== "r" &&
    promotion !== "b" &&
    promotion !== "n"
  ) {
    throw new Error("Malformed move");
  }

  return promotion === undefined
    ? { from, to, piece: value.piece }
    : { from, to, piece: value.piece, promotion };
}

function findCanonicalLegalMove(
  gameState: GameState,
  submittedMove: SubmittedMove,
): Move {
  const sourcePiece =
    gameState.board[submittedMove.from.row][submittedMove.from.col][0];
  if (!sourcePiece) throw new Error("Illegal move");
  if (sourcePiece.color !== gameState.options.turn) {
    throw new Error("Cannot move an opponent piece");
  }

  const legalMove = getAllMovesForCell(submittedMove.from, gameState).find(
    (candidate) =>
      equalPositions(candidate.to, submittedMove.to) &&
      candidate.piece === submittedMove.piece,
  );

  if (!legalMove) throw new Error("Illegal move");

  if (legalMove.isPromotion) {
    if (!submittedMove.promotion) throw new Error("Illegal move");
    return { ...legalMove, promotion: submittedMove.promotion };
  }
  if (submittedMove.promotion) throw new Error("Illegal move");

  return legalMove;
}

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
    if (!isResumableGame(game)) throw new Error("Game unavailable");
    if (game.status !== "active") throw new Error("Game is not active");

    const isWhitePlayer = game.whitePlayerId === userId;
    const isBlackPlayer = game.blackPlayerId === userId;

    if (!isWhitePlayer && !isBlackPlayer)
      throw new Error("Not a player in this game");

    const gameState: GameState = JSON.parse(game.gameState);

    if (gameState.options.turn !== (isWhitePlayer ? "w" : "b")) {
      throw new Error("Not your turn");
    }

    const now = Date.now();
    const submittedMove = parseSubmittedMove(args.move);
    const move = findCanonicalLegalMove(gameState, submittedMove);

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
        winner = newGameState.options.turn === "w" ? "b" : "w";
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

    // Update the game state
    await ctx.db.patch(args.gameId, {
      gameState: JSON.stringify(newGameState),
      moveHistory: [...game.moveHistory, JSON.stringify(move)],
      lastMoveAt: now,
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
  args: { gameId: v.string() },
  returns: v.union(v.null(), participantGameValidator),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const gameId = ctx.db.normalizeId("games", args.gameId);
    if (!gameId) return null;
    const game = await ctx.db.get(gameId);
    if (!game || !isResumableGame(game)) return null;

    const playerColor: "w" | "b" | null =
      game.whitePlayerId === userId
        ? "w"
        : game.blackPlayerId === userId
          ? "b"
          : null;
    if (!playerColor) return null;

    const participantGame = {
      _id: game._id,
      playerColor,
      gameState: game.gameState,
      moveHistory: game.moveHistory,
      lastMoveAt: game.lastMoveAt,
    };

    if (game.status === "active") {
      return { ...participantGame, status: game.status };
    }

    return {
      ...participantGame,
      status: game.status,
      winner: game.winner,
      gameEndReason: game.gameEndReason,
    };
  },
});

export const listGames = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const [whiteGames, blackGames] = await Promise.all([
      ctx.db
        .query("games")
        .withIndex("by_player", (q) => q.eq("whitePlayerId", userId))
        .order("desc")
        .take(20),
      ctx.db
        .query("games")
        .withIndex("by_black_player", (q) => q.eq("blackPlayerId", userId))
        .order("desc")
        .take(20),
    ]);

    const resumableGames = new Map<Id<"games">, ResumableGame>();
    for (const game of [...whiteGames, ...blackGames]) {
      if (isResumableGame(game)) resumableGames.set(game._id, game);
    }

    return [...resumableGames.values()]
      .sort((first, second) => second._creationTime - first._creationTime)
      .slice(0, 20);
  },
});

// Already-enqueued legacy timeout jobs must still resolve after deployment.
export const checkTimeout = internalMutation({
  args: { gameId: v.id("games") },
  returns: v.null(),
  handler: () => null,
});
