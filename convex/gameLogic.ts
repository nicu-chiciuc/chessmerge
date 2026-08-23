import { v } from "convex/values";
import {
  internalMutation,
  mutation,
  query,
  type QueryCtx,
} from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  isInCheck,
  applyMove,
  canAnyMoveCombatCheck,
  createInitialGameState,
  equalPositions,
  getAllMovesForCell,
} from "../lib/chessmerge";
import type {
  GameState,
  Move,
  Piece,
  PieceType,
  Position,
} from "../lib/chessmerge";
import type { Doc, Id } from "./_generated/dataModel";
import {
  getPublicPlayer,
  publicPlayerValidator,
  type PublicPlayer,
} from "./publicPlayers";

const playersValidator = v.object({
  white: publicPlayerValidator,
  black: publicPlayerValidator,
});

const lastMoveValidator = v.union(
  v.object({
    from: v.object({ row: v.number(), col: v.number() }),
    to: v.object({ row: v.number(), col: v.number() }),
  }),
  v.null(),
);

const rematchStateValidator = v.union(
  v.null(),
  v.object({ status: v.literal("available") }),
  v.object({ status: v.literal("waiting") }),
  v.object({ status: v.literal("offered") }),
  v.object({ status: v.literal("ready"), gameId: v.id("games") }),
);

const gameViewValidator = v.union(
  v.object({
    _id: v.id("games"),
    playerColor: v.union(v.literal("w"), v.literal("b"), v.null()),
    gameState: v.string(),
    moveCount: v.number(),
    lastMove: lastMoveValidator,
    lastMoveAt: v.number(),
    players: playersValidator,
    rematch: v.null(),
    status: v.literal("active"),
  }),
  v.object({
    _id: v.id("games"),
    playerColor: v.union(v.literal("w"), v.literal("b"), v.null()),
    gameState: v.string(),
    moveCount: v.number(),
    lastMove: lastMoveValidator,
    lastMoveAt: v.number(),
    players: playersValidator,
    rematch: rematchStateValidator,
    status: v.literal("completed"),
    winner: v.union(v.literal("w"), v.literal("b"), v.literal("draw")),
    gameEndReason: v.union(
      v.literal("checkmate"),
      v.literal("stalemate"),
      v.literal("resignation"),
    ),
  }),
);

const liveGameSummaryValidator = v.object({
  _id: v.id("games"),
  lastMoveAt: v.number(),
  moveCount: v.number(),
  turn: v.union(v.literal("w"), v.literal("b")),
  players: playersValidator,
});

const gameSummaryValidator = v.union(
  v.object({
    _id: v.id("games"),
    lastMoveAt: v.number(),
    status: v.literal("active"),
    players: playersValidator,
  }),
  v.object({
    _id: v.id("games"),
    lastMoveAt: v.number(),
    status: v.literal("completed"),
    winner: v.union(v.literal("w"), v.literal("b"), v.literal("draw")),
    gameEndReason: v.union(
      v.literal("checkmate"),
      v.literal("stalemate"),
      v.literal("resignation"),
    ),
    players: playersValidator,
  }),
);

type ResumableGame = Doc<"games"> & { blackPlayerId: Id<"users"> } & (
    | { status: "active"; winner?: undefined; gameEndReason?: undefined }
    | {
        status: "completed";
        winner: "w" | "b" | "draw";
        gameEndReason: "checkmate" | "stalemate" | "resignation";
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
    (game.gameEndReason === "checkmate" ||
      game.gameEndReason === "stalemate" ||
      game.gameEndReason === "resignation")
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

function isPiece(value: unknown): value is Piece {
  if (!isRecord(value)) return false;
  const pieceType = value.pieceType;
  return (
    (value.color === "w" || value.color === "b") &&
    (pieceType === "p" ||
      pieceType === "r" ||
      pieceType === "n" ||
      pieceType === "b" ||
      pieceType === "q" ||
      pieceType === "k")
  );
}

function isCell(value: unknown): value is Piece[] {
  return (
    Array.isArray(value) &&
    value.length <= 2 &&
    value.every(isPiece) &&
    (value.length < 2 || value[0].color === value[1].color)
  );
}

function parseStoredGameState(serializedState: string): GameState | null {
  let value: unknown;
  try {
    value = JSON.parse(serializedState);
  } catch {
    return null;
  }

  if (!isRecord(value) || !Array.isArray(value.board)) return null;
  if (
    value.board.length !== 8 ||
    !value.board.every(
      (row) => Array.isArray(row) && row.length === 8 && row.every(isCell),
    )
  ) {
    return null;
  }

  const options = value.options;
  if (!isRecord(options)) return null;
  const castlingRights = options.castlingRights;
  if (!isRecord(castlingRights)) return null;
  const whiteRights = castlingRights.w;
  const blackRights = castlingRights.b;
  if (
    (options.turn !== "w" && options.turn !== "b") ||
    !isRecord(whiteRights) ||
    typeof whiteRights.short !== "boolean" ||
    typeof whiteRights.long !== "boolean" ||
    !isRecord(blackRights) ||
    typeof blackRights.short !== "boolean" ||
    typeof blackRights.long !== "boolean" ||
    options.enPassantTarget !== null ||
    typeof options.halfMoveClock !== "number" ||
    typeof options.fullMoveClock !== "number"
  ) {
    return null;
  }

  return value as GameState;
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

function parseLastMove(moveHistory: string[]): {
  from: Position;
  to: Position;
} | null {
  const serializedMove = moveHistory.at(-1);
  if (!serializedMove) return null;

  try {
    const value: unknown = JSON.parse(serializedMove);
    if (!isRecord(value)) return null;

    return {
      from: parsePosition(value.from),
      to: parsePosition(value.to),
    };
  } catch {
    return null;
  }
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

    const gameState = parseStoredGameState(game.gameState);
    if (!gameState) throw new Error("Game unavailable");

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

export const resignGame = mutation({
  args: { gameId: v.id("games") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");
    if (!isResumableGame(game)) throw new Error("Game unavailable");
    if (game.status !== "active") throw new Error("Game is not active");

    const isWhitePlayer = game.whitePlayerId === userId;
    const isBlackPlayer = game.blackPlayerId === userId;
    if (!isWhitePlayer && !isBlackPlayer) {
      throw new Error("Not a player in this game");
    }

    await ctx.db.patch(args.gameId, {
      status: "completed",
      winner: isWhitePlayer ? "b" : "w",
      gameEndReason: "resignation",
      lastMoveAt: Date.now(),
    });

    return null;
  },
});

export const requestRematch = mutation({
  args: { gameId: v.id("games") },
  returns: v.union(
    v.object({ status: v.literal("waiting") }),
    v.object({ status: v.literal("ready"), gameId: v.id("games") }),
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const game = await ctx.db.get(args.gameId);
    if (!game || !isResumableGame(game)) throw new Error("Game unavailable");
    if (game.status !== "completed") throw new Error("Game is not completed");

    const isWhitePlayer = game.whitePlayerId === userId;
    const isBlackPlayer = game.blackPlayerId === userId;
    if (!isWhitePlayer && !isBlackPlayer) {
      throw new Error("Not a player in this game");
    }

    if (game.rematchGameId) {
      return { status: "ready" as const, gameId: game.rematchGameId };
    }

    if (!game.rematchOfferedBy) {
      await ctx.db.patch(args.gameId, { rematchOfferedBy: userId });
      return { status: "waiting" as const };
    }

    if (game.rematchOfferedBy === userId) {
      return { status: "waiting" as const };
    }

    const now = Date.now();
    const rematchGameId = await ctx.db.insert("games", {
      whitePlayerId: game.blackPlayerId,
      blackPlayerId: game.whitePlayerId,
      status: "active",
      gameState: JSON.stringify(createInitialGameState()),
      moveHistory: [],
      lastMoveAt: now,
    });
    await ctx.db.patch(args.gameId, { rematchGameId });

    return { status: "ready" as const, gameId: rematchGameId };
  },
});

export const getGame = query({
  args: { gameId: v.string() },
  returns: v.union(v.null(), gameViewValidator),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    const gameId = ctx.db.normalizeId("games", args.gameId);
    if (!gameId) return null;
    const game = await ctx.db.get(gameId);
    if (!game || !isResumableGame(game)) return null;
    if (!parseStoredGameState(game.gameState)) return null;
    const players = await getPlayers(ctx, game);

    const playerColor: "w" | "b" | null = userId
      ? game.whitePlayerId === userId
        ? "w"
        : game.blackPlayerId === userId
          ? "b"
          : null
      : null;

    const participantGame = {
      _id: game._id,
      playerColor,
      gameState: game.gameState,
      moveCount: game.moveHistory.length,
      lastMove: parseLastMove(game.moveHistory),
      lastMoveAt: game.lastMoveAt,
      players,
    };

    if (game.status === "active") {
      return { ...participantGame, status: game.status, rematch: null };
    }

    return {
      ...participantGame,
      status: game.status,
      winner: game.winner,
      gameEndReason: game.gameEndReason,
      rematch:
        playerColor === null
          ? null
          : game.rematchGameId
            ? { status: "ready" as const, gameId: game.rematchGameId }
            : !game.rematchOfferedBy
              ? { status: "available" as const }
              : game.rematchOfferedBy === userId
                ? { status: "waiting" as const }
                : { status: "offered" as const },
    };
  },
});

export const listLiveGames = query({
  args: { activeSince: v.number() },
  returns: v.array(liveGameSummaryValidator),
  handler: async (ctx, args) => {
    const candidates = await ctx.db
      .query("games")
      .withIndex("by_status_and_last_move", (q) =>
        q.eq("status", "active").gte("lastMoveAt", args.activeSince),
      )
      .order("desc")
      .take(24);

    const liveGames: Array<{
      _id: Id<"games">;
      lastMoveAt: number;
      moveCount: number;
      turn: "w" | "b";
      players: { white: PublicPlayer; black: PublicPlayer };
    }> = [];

    for (const game of candidates) {
      if (!isResumableGame(game)) continue;

      const gameState = parseStoredGameState(game.gameState);
      if (!gameState) continue;
      liveGames.push({
        _id: game._id,
        lastMoveAt: game.lastMoveAt,
        moveCount: game.moveHistory.length,
        turn: gameState.options.turn,
        players: await getPlayers(ctx, game),
      });

      if (liveGames.length === 6) break;
    }

    return liveGames;
  },
});

export const listGames = query({
  args: {},
  returns: v.array(gameSummaryValidator),
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

    const games = [...resumableGames.values()]
      .sort((first, second) => second._creationTime - first._creationTime)
      .slice(0, 20);

    return await Promise.all(
      games.map(async (game) => {
        const summary = {
          _id: game._id,
          lastMoveAt: game.lastMoveAt,
          players: await getPlayers(ctx, game),
        };

        return game.status === "active"
          ? { ...summary, status: game.status }
          : {
              ...summary,
              status: game.status,
              winner: game.winner,
              gameEndReason: game.gameEndReason,
            };
      }),
    );
  },
});

async function getPlayers(ctx: QueryCtx, game: ResumableGame) {
  const [white, black] = await Promise.all([
    ctx.db.get(game.whitePlayerId),
    ctx.db.get(game.blackPlayerId),
  ]);
  return {
    white: getPublicPlayer(white),
    black: getPublicPlayer(black),
  };
}

// Already-enqueued legacy timeout jobs must still resolve after deployment.
export const checkTimeout = internalMutation({
  args: { gameId: v.id("games") },
  returns: v.null(),
  handler: () => null,
});
