import { convexTest, type TestConvex } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import schema from "../convex/schema";
import { ACCOUNT_DELETION_CONFIRMATION } from "../lib/accountDeletion";
import { createInitialGameState } from "../lib/chessmerge";

type ChessMergeTest = TestConvex<typeof schema>;

const modules = import.meta.glob("../convex/**/*.*s");
const START_TIME = new Date("2026-08-24T12:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START_TIME);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("account deletion", () => {
  it("scrubs identity data while preserving and settling games", async () => {
    const t = convexTest(schema, modules);
    const seeded = await seedAccount(t);
    const player = t.withIdentity({ subject: seeded.userId });
    const opponent = t.withIdentity({ subject: seeded.opponentId });

    await player.mutation(api.accounts.deleteAccount, {
      confirmation: ACCOUNT_DELETION_CONFIRMATION,
    });

    await t.run(async (ctx) => {
      const deletedUser = await ctx.db.get(seeded.userId);
      expect(deletedUser).toEqual({
        _id: seeded.userId,
        _creationTime: expect.any(Number),
        deletedAt: START_TIME.getTime(),
      });
      expect(await ctx.db.query("authAccounts").take(1)).toEqual([]);
      expect(await ctx.db.query("authVerificationCodes").take(1)).toEqual([]);
      expect(await ctx.db.query("authRateLimits").take(1)).toEqual([]);
      expect(await ctx.db.query("emailSubscribers").take(1)).toEqual([]);
      expect(await ctx.db.get(seeded.waitingChallengeId)).toMatchObject({
        status: "canceled",
      });

      const completedGame = await ctx.db.get(seeded.completedGameId);
      expect(completedGame).toMatchObject({
        status: "completed",
        winner: "w",
        gameEndReason: "checkmate",
        gameState: seeded.gameState,
        moveHistory: seeded.completedMoveHistory,
      });
    });

    await expect(
      player.mutation(api.challenges.createChallenge, {}),
    ).rejects.toThrow("Not authenticated");
    await expect(
      opponent.mutation(api.gameLogic.requestRematch, {
        gameId: seeded.completedGameId,
      }),
    ).rejects.toThrow("Game unavailable");
    await expect(
      t.query(api.gameLogic.listLiveGames, {
        activeSince: START_TIME.getTime() - 1,
      }),
    ).resolves.toEqual([]);

    await t.finishAllScheduledFunctions(vi.runAllTimers);

    await t.run(async (ctx) => {
      expect(await ctx.db.query("authSessions").take(1)).toEqual([]);
      expect(await ctx.db.query("authRefreshTokens").take(1)).toEqual([]);
      expect(await ctx.db.query("authVerifiers").take(1)).toEqual([]);

      const activeGame = await ctx.db.get(seeded.activeGameId);
      expect(activeGame).toMatchObject({
        status: "completed",
        winner: "b",
        gameEndReason: "resignation",
        gameState: seeded.gameState,
        moveHistory: [],
      });

      const replacementId = await ctx.db.insert("users", {
        name: "DeleteMe",
        usernameKey: "deleteme",
        email: "delete-me@example.com",
      });
      const usernameMatches = await ctx.db
        .query("users")
        .withIndex("username", (query) => query.eq("usernameKey", "deleteme"))
        .take(2);
      expect(usernameMatches.map((user) => user._id)).toEqual([replacementId]);
    });

    await expect(
      t.query(api.gameLogic.getGame, { gameId: seeded.activeGameId }),
    ).resolves.toMatchObject({
      status: "completed",
      players: {
        white: { name: "Deleted player", isGuest: false },
        black: { name: "Opponent", isGuest: false },
      },
      rematch: null,
    });
  });

  it("finishes account cleanup across bounded scheduled batches", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => {
      const deletingUserId = await ctx.db.insert("users", {
        name: "BatchPlayer",
        usernameKey: "batchplayer",
        email: "batch@example.com",
      });
      const opponentId = await ctx.db.insert("users", { name: "Opponent" });
      const sessionId = await ctx.db.insert("authSessions", {
        userId: deletingUserId,
        expirationTime: START_TIME.getTime() + 60_000,
      });
      for (let index = 0; index < 33; index += 1) {
        await ctx.db.insert("authRefreshTokens", {
          sessionId,
          expirationTime: START_TIME.getTime() + index + 1,
        });
      }
      for (let index = 0; index < 49; index += 1) {
        await ctx.db.insert("games", {
          whitePlayerId: deletingUserId,
          blackPlayerId: opponentId,
          status: "active",
          gameState: JSON.stringify(createInitialGameState()),
          moveHistory: [],
          lastMoveAt: START_TIME.getTime() + index,
        });
      }
      return deletingUserId;
    });

    await t
      .withIdentity({ subject: userId })
      .mutation(api.accounts.deleteAccount, {
        confirmation: ACCOUNT_DELETION_CONFIRMATION,
      });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    await t.run(async (ctx) => {
      expect(await ctx.db.query("authSessions").take(1)).toEqual([]);
      expect(await ctx.db.query("authRefreshTokens").take(1)).toEqual([]);
      const remainingActiveGames = await ctx.db
        .query("games")
        .withIndex("by_white_player_and_status", (query) =>
          query.eq("whitePlayerId", userId).eq("status", "active"),
        )
        .take(1);
      expect(remainingActiveGames).toEqual([]);
    });
  });
});

async function seedAccount(t: ChessMergeTest) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      name: "DeleteMe",
      usernameKey: "deleteme",
      email: "delete-me@example.com",
      emailVerificationTime: START_TIME.getTime(),
      phone: "+15555550123",
      phoneVerificationTime: START_TIME.getTime(),
      image: "https://example.com/avatar.png",
    });
    const opponentId = await ctx.db.insert("users", {
      name: "Opponent",
      usernameKey: "opponent",
      email: "opponent@example.com",
    });
    const accountId = await ctx.db.insert("authAccounts", {
      userId,
      provider: "password",
      providerAccountId: "delete-me@example.com",
      secret: "password-hash",
    });
    await ctx.db.insert("authVerificationCodes", {
      accountId,
      provider: "password",
      code: "hashed-code",
      expirationTime: START_TIME.getTime() + 60_000,
      emailVerified: "delete-me@example.com",
    });
    const sessionId = await ctx.db.insert("authSessions", {
      userId,
      expirationTime: START_TIME.getTime() + 60_000,
    });
    await ctx.db.insert("authRefreshTokens", {
      sessionId,
      expirationTime: START_TIME.getTime() + 60_000,
    });
    await ctx.db.insert("authVerifiers", {
      sessionId,
      signature: "oauth-verifier",
    });
    await ctx.db.insert("authRateLimits", {
      identifier: "delete-me@example.com",
      lastAttemptTime: START_TIME.getTime(),
      attemptsLeft: 1,
    });
    await ctx.db.insert("authRateLimits", {
      identifier: accountId,
      lastAttemptTime: START_TIME.getTime(),
      attemptsLeft: 1,
    });
    await ctx.db.insert("emailSubscribers", {
      email: "delete-me@example.com",
      subscribedAt: START_TIME.getTime(),
      confirmed: true,
      unsubscribeToken: "unsubscribe-token",
    });
    const waitingChallengeId = await ctx.db.insert("challenges", {
      creatorId: userId,
      status: "waiting",
      expiresAt: START_TIME.getTime() + 60_000,
    });

    const gameState = JSON.stringify(createInitialGameState());
    const activeGameId = await ctx.db.insert("games", {
      whitePlayerId: userId,
      blackPlayerId: opponentId,
      status: "active",
      gameState,
      moveHistory: [],
      lastMoveAt: START_TIME.getTime(),
    });
    const completedMoveHistory = [
      JSON.stringify({
        from: { row: 6, col: 4 },
        to: { row: 5, col: 4 },
        piece: "p",
      }),
    ];
    const completedGameId = await ctx.db.insert("games", {
      whitePlayerId: userId,
      blackPlayerId: opponentId,
      status: "completed",
      winner: "w",
      gameEndReason: "checkmate",
      gameState,
      moveHistory: completedMoveHistory,
      lastMoveAt: START_TIME.getTime(),
    });

    return {
      userId,
      opponentId,
      waitingChallengeId,
      activeGameId,
      completedGameId,
      gameState,
      completedMoveHistory,
    } satisfies {
      userId: Id<"users">;
      opponentId: Id<"users">;
      waitingChallengeId: Id<"challenges">;
      activeGameId: Id<"games">;
      completedGameId: Id<"games">;
      gameState: string;
      completedMoveHistory: string[];
    };
  });
}
