import { convexTest, type TestConvex } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import schema from "../convex/schema";
import {
  boardToString,
  createEmptyGameState,
  createInitialGameState,
  type Move,
  type Position,
} from "../lib/chessmerge";

type ChessMergeTest = TestConvex<typeof schema>;

const modules = import.meta.glob("../convex/**/*.*s");
const START_TIME = new Date("2026-08-23T00:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START_TIME);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("game move authority", () => {
  it("accepts legal moves from both player identities and stores canonical moves", async () => {
    const t = convexTest(schema, modules);
    const { white, black, gameId } = await createActiveGame(t);

    const whiteMove = serializeMove(
      { row: 6, col: 4 },
      { row: 5, col: 4 },
      "p",
      "base",
      {
        capturedPieces: [{ color: "b", pieceType: "q" }],
      },
    );
    await expect(
      white.mutation(api.gameLogic.makeMove, { gameId, move: whiteMove }),
    ).resolves.toMatchObject({ success: true, isCheckmate: false });

    await expect(
      black.mutation(api.gameLogic.makeMove, {
        gameId,
        move: serializeMove(
          { row: 1, col: 4 },
          { row: 2, col: 4 },
          "p",
          "base",
        ),
      }),
    ).resolves.toMatchObject({ success: true, isCheckmate: false });

    const game = await readGame(t, gameId);
    expect(game.status).toBe("active");
    expect(game.moveHistory).toHaveLength(2);
    expect(JSON.parse(game.moveHistory[0])).not.toHaveProperty(
      "capturedPieces",
    );
    expect(JSON.parse(game.gameState)).toMatchObject({
      options: { turn: "w" },
      board: createExpectedBoardAfterOpeningMoves(),
    });
  });

  it("rejects the wrong identity, opponent pieces, and consecutive turns", async () => {
    const t = convexTest(schema, modules);
    const { white, black, gameId } = await createActiveGame(t);
    const blackPawnMove = serializeMove(
      { row: 1, col: 4 },
      { row: 2, col: 4 },
      "p",
      "base",
    );

    await expect(
      black.mutation(api.gameLogic.makeMove, {
        gameId,
        move: blackPawnMove,
      }),
    ).rejects.toThrow("Not your turn");
    await expect(
      white.mutation(api.gameLogic.makeMove, {
        gameId,
        move: blackPawnMove,
      }),
    ).rejects.toThrow("Cannot move an opponent piece");

    await white.mutation(api.gameLogic.makeMove, {
      gameId,
      move: serializeMove({ row: 6, col: 4 }, { row: 5, col: 4 }, "p", "base"),
    });
    await expect(
      white.mutation(api.gameLogic.makeMove, {
        gameId,
        move: serializeMove(
          { row: 5, col: 4 },
          { row: 4, col: 4 },
          "p",
          "base",
        ),
      }),
    ).rejects.toThrow("Not your turn");
  });

  it("rejects malformed payloads and moves absent from the stored legal set", async () => {
    const t = convexTest(schema, modules);
    const { white, gameId } = await createActiveGame(t);
    const invalidMoves = [
      "{",
      JSON.stringify({
        from: { row: 6, col: 4 },
        piece: "p",
        type: "base",
      }),
      serializeMove({ row: 8, col: 4 }, { row: 5, col: 4 }, "p", "base"),
      serializeMove({ row: 6, col: 4 }, { row: 3, col: 4 }, "p", "base"),
    ];

    for (const move of invalidMoves) {
      await expect(
        white.mutation(api.gameLogic.makeMove, { gameId, move }),
      ).rejects.toThrow();
    }

    const game = await readGame(t, gameId);
    expect(game.moveHistory).toEqual([]);
    expect(JSON.parse(game.gameState)).toEqual(createInitialGameState());
  });

  it("rejects castling when the stored corner rook is absent", async () => {
    const t = convexTest(schema, modules);
    const { white, gameId } = await createActiveGame(t);
    const gameState = createEmptyGameState();
    gameState.board[0][4] = [{ color: "b", pieceType: "k" }];
    gameState.board[7][4] = [{ color: "w", pieceType: "k" }];

    await t.run(async (ctx) => {
      await ctx.db.patch(gameId, { gameState: JSON.stringify(gameState) });
    });

    await expect(
      white.mutation(api.gameLogic.makeMove, {
        gameId,
        move: serializeMove(
          { row: 7, col: 4 },
          { row: 7, col: 6 },
          "k",
          "castle",
        ),
      }),
    ).rejects.toThrow("Illegal move");
  });

  it("rejects castling through an empty square attacked by a pawn", async () => {
    const t = convexTest(schema, modules);
    const { white, gameId } = await createActiveGame(t);
    const gameState = createEmptyGameState();
    gameState.board[0][0] = [{ color: "b", pieceType: "k" }];
    gameState.board[6][4] = [{ color: "b", pieceType: "p" }];
    gameState.board[7][4] = [{ color: "w", pieceType: "k" }];
    gameState.board[7][7] = [{ color: "w", pieceType: "r" }];

    await t.run(async (ctx) => {
      await ctx.db.patch(gameId, { gameState: JSON.stringify(gameState) });
    });

    await expect(
      white.mutation(api.gameLogic.makeMove, {
        gameId,
        move: serializeMove(
          { row: 7, col: 4 },
          { row: 7, col: 6 },
          "k",
          "castle",
        ),
      }),
    ).rejects.toThrow("Illegal move");
  });

  it("awards checkmate to the side that made the mating move", async () => {
    const t = convexTest(schema, modules);
    const { white, gameId } = await createActiveGame(t);
    const mateInOne = createEmptyGameState();
    mateInOne.options.turn = "w";
    mateInOne.board[0][0] = [{ color: "b", pieceType: "k" }];
    mateInOne.board[1][2] = [{ color: "w", pieceType: "q" }];
    mateInOne.board[2][2] = [{ color: "w", pieceType: "k" }];

    await t.run(async (ctx) => {
      await ctx.db.patch(gameId, {
        gameState: JSON.stringify(mateInOne),
        moveHistory: [],
        moveTimestamps: [],
        gameStartedAt: Date.now(),
        lastMoveAt: Date.now(),
      });
    });

    await expect(
      white.mutation(api.gameLogic.makeMove, {
        gameId,
        move: serializeMove(
          { row: 1, col: 2 },
          { row: 1, col: 1 },
          "q",
          "base",
        ),
      }),
    ).resolves.toEqual({
      success: true,
      isCheck: true,
      isCheckmate: true,
    });

    const game = await readGame(t, gameId);
    expect(game.status).toBe("completed");
    expect(game.winner).toBe("w");
    expect(game.gameEndReason).toBe("checkmate");
    expect(JSON.parse(game.gameState)).toMatchObject({
      options: { turn: "b" },
    });
  });

  it("rejects a move after expiry and lets the timeout job record the result", async () => {
    const t = convexTest(schema, modules);
    const { white, gameId } = await createActiveGame(t, {
      initialTimeMs: 1_000,
    });

    vi.advanceTimersByTime(1_001);
    await expect(
      white.mutation(api.gameLogic.makeMove, {
        gameId,
        move: serializeMove(
          { row: 6, col: 4 },
          { row: 5, col: 4 },
          "p",
          "base",
        ),
      }),
    ).rejects.toThrow("Clock expired");

    const beforeTimeoutJob = await readGame(t, gameId);
    expect(beforeTimeoutJob.status).toBe("active");
    expect(beforeTimeoutJob.moveHistory).toEqual([]);

    vi.runAllTimers();
    await t.finishInProgressScheduledFunctions();

    const timedOutGame = await readGame(t, gameId);
    expect(timedOutGame.status).toBe("completed");
    expect(timedOutGame.winner).toBe("b");
    expect(timedOutGame.gameEndReason).toBe("timeout");
    expect(timedOutGame.moveHistory).toEqual([]);
  });
});

describe("legacy remote practice security", () => {
  it("keeps arbitrary positions and both-side play for the owner only", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await insertUser(t, "owner@example.com");
    const otherId = await insertUser(t, "other@example.com");
    const owner = t.withIdentity({ subject: ownerId });
    const other = t.withIdentity({ subject: otherId });
    const gameId = await owner.mutation(api.gameLogic.createPracticeGame, {});

    const practiceState = createEmptyGameState();
    practiceState.board[0][0] = [{ color: "b", pieceType: "k" }];
    practiceState.board[1][1] = [{ color: "b", pieceType: "p" }];
    practiceState.board[7][7] = [{ color: "w", pieceType: "k" }];
    const strBoard = boardToString(practiceState.board);

    await expect(
      t.mutation(api.gameLogic.setPracticeGameState, { gameId, strBoard }),
    ).rejects.toThrow("Not authenticated");
    await expect(
      other.mutation(api.gameLogic.setPracticeGameState, {
        gameId,
        strBoard,
      }),
    ).rejects.toThrow("Not the practice game owner");
    await expect(
      owner.mutation(api.gameLogic.setPracticeGameState, {
        gameId,
        strBoard,
      }),
    ).resolves.toEqual({ success: true });

    await expect(
      owner.mutation(api.gameLogic.makeMove, {
        gameId,
        move: serializeMove(
          { row: 1, col: 1 },
          { row: 2, col: 1 },
          "p",
          "base",
        ),
      }),
    ).resolves.toMatchObject({ success: true });

    const game = await readGame(t, gameId);
    expect(JSON.parse(game.gameState)).toMatchObject({
      board: practiceState.board.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          if (rowIndex === 1 && colIndex === 1) return [];
          if (rowIndex === 2 && colIndex === 1) {
            return [{ color: "b", pieceType: "p" }];
          }
          return cell;
        }),
      ),
      options: { turn: "b" },
    });
  });
});

async function insertUser(t: ChessMergeTest, email: string) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", { email });
  });
}

async function createActiveGame(
  t: ChessMergeTest,
  options: { initialTimeMs?: number; incrementMs?: number } = {},
) {
  const whiteId = await insertUser(t, "white@example.com");
  const blackId = await insertUser(t, "black@example.com");
  const white = t.withIdentity({ subject: whiteId });
  const black = t.withIdentity({ subject: blackId });
  const gameId = await white.mutation(api.gameLogic.createGame, {
    initialTimeMs: options.initialTimeMs ?? 60_000,
    incrementMs: options.incrementMs ?? 0,
  });
  await black.mutation(api.gameLogic.joinGame, { gameId });
  return { white, black, gameId };
}

async function readGame(t: ChessMergeTest, gameId: Id<"games">) {
  const game = await t.run(async (ctx) => await ctx.db.get(gameId));
  if (!game) {
    throw new Error("Expected game to exist");
  }
  return game;
}

function serializeMove(
  from: Position,
  to: Position,
  piece: string,
  type: Move["type"],
  extra: Record<string, unknown> = {},
): string {
  return JSON.stringify({ from, to, piece, type, ...extra });
}

function createExpectedBoardAfterOpeningMoves() {
  const expected = createInitialGameState().board;
  expected[6][4] = [];
  expected[5][4] = [{ color: "w", pieceType: "p" }];
  expected[1][4] = [];
  expected[2][4] = [{ color: "b", pieceType: "p" }];
  return expected;
}
