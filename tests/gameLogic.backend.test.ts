import { convexTest, type TestConvex } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import schema from "../convex/schema";
import {
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

describe("participant game lookup", () => {
  it("returns null for a malformed game id", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, "player@example.com");
    const player = t.withIdentity({ subject: userId });

    await expect(
      player.query(api.gameLogic.getGame, { gameId: "not-a-convex-id" }),
    ).resolves.toBeNull();
  });

  it("denies anonymous and unrelated callers while returning a participant DTO", async () => {
    const t = convexTest(schema, modules);
    const { white, black, gameId } = await createActiveGame(t);
    const unrelatedId = await insertUser(t, "unrelated@example.com");
    const unrelated = t.withIdentity({ subject: unrelatedId });

    await expect(
      t.query(api.gameLogic.getGame, { gameId }),
    ).resolves.toBeNull();
    await expect(
      unrelated.query(api.gameLogic.getGame, { gameId }),
    ).resolves.toBeNull();
    await expect(
      white.query(api.gameLogic.getGame, { gameId }),
    ).resolves.toEqual({
      _id: gameId,
      status: "active",
      playerColor: "w",
      gameState: JSON.stringify(createInitialGameState()),
      moveHistory: [],
      lastMoveAt: START_TIME.getTime(),
    });
    await expect(
      black.query(api.gameLogic.getGame, { gameId }),
    ).resolves.toEqual({
      _id: gameId,
      status: "active",
      playerColor: "b",
      gameState: JSON.stringify(createInitialGameState()),
      moveHistory: [],
      lastMoveAt: START_TIME.getTime(),
    });

    await t.run(async (ctx) => {
      await ctx.db.patch(gameId, {
        status: "completed",
        winner: "w",
        gameEndReason: "checkmate",
      });
    });
    await expect(
      white.query(api.gameLogic.getGame, { gameId }),
    ).resolves.toEqual({
      _id: gameId,
      status: "completed",
      playerColor: "w",
      gameState: JSON.stringify(createInitialGameState()),
      moveHistory: [],
      lastMoveAt: START_TIME.getTime(),
      winner: "w",
      gameEndReason: "checkmate",
    });
  });

  it("returns null for legacy and otherwise non-resumable records", async () => {
    const t = convexTest(schema, modules);
    const whiteId = await insertUser(t, "white@example.com");
    const blackId = await insertUser(t, "black@example.com");
    const white = t.withIdentity({ subject: whiteId });
    const gameState = JSON.stringify(createInitialGameState());

    const gameIds = await t.run(async (ctx) => {
      const baseGame = {
        whitePlayerId: whiteId,
        blackPlayerId: blackId,
        gameState,
        moveHistory: [],
        lastMoveAt: START_TIME.getTime(),
      };

      return await Promise.all([
        ctx.db.insert("games", { ...baseGame, status: "waiting" }),
        ctx.db.insert("games", {
          ...baseGame,
          status: "active",
          timeControl: { initialTimeMs: 60_000, incrementMs: 0 },
        }),
        ctx.db.insert("games", {
          ...baseGame,
          status: "active",
          isPracticeGame: true,
        }),
        ctx.db.insert("games", { ...baseGame, status: "abandoned" }),
        ctx.db.insert("games", {
          whitePlayerId: whiteId,
          status: "active",
          gameState,
          moveHistory: [],
          lastMoveAt: START_TIME.getTime(),
        }),
      ]);
    });

    for (const gameId of gameIds) {
      await expect(
        white.query(api.gameLogic.getGame, { gameId }),
      ).resolves.toBeNull();
    }
  });
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

  it("rejects moves for legacy timed and remote-practice records", async () => {
    for (const legacyFields of [
      { timeControl: { initialTimeMs: 60_000, incrementMs: 0 } },
      { isPracticeGame: true },
    ]) {
      const t = convexTest(schema, modules);
      const { white, gameId } = await createActiveGame(t);
      await t.run(async (ctx) => {
        await ctx.db.patch(gameId, legacyFields);
      });

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
      ).rejects.toThrow("Game unavailable");
      expect((await readGame(t, gameId)).moveHistory).toEqual([]);
    }
  });
});

describe("legacy scheduled jobs", () => {
  it("keeps checkTimeout callable without changing the game", async () => {
    const t = convexTest(schema, modules);
    const { gameId } = await createActiveGame(t);
    const before = await readGame(t, gameId);

    await expect(
      t.mutation(internal.gameLogic.checkTimeout, { gameId }),
    ).resolves.toBeNull();
    expect(await readGame(t, gameId)).toEqual(before);
  });
});

async function insertUser(t: ChessMergeTest, email: string) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", { email });
  });
}

async function createActiveGame(t: ChessMergeTest) {
  const whiteId = await insertUser(t, "white@example.com");
  const blackId = await insertUser(t, "black@example.com");
  const white = t.withIdentity({ subject: whiteId });
  const black = t.withIdentity({ subject: blackId });
  const { challengeId } = await white.mutation(
    api.challenges.createChallenge,
    {},
  );
  const { gameId } = await black.mutation(api.challenges.joinChallenge, {
    challengeId,
  });
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
