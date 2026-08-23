import { convexTest, type TestConvex } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { createInitialGameState } from "../lib/chessmerge";

type ChessMergeTest = TestConvex<typeof schema>;

const modules = import.meta.glob("../convex/**/*.*s");
const START_TIME = new Date("2026-08-23T00:00:00.000Z");
const CHALLENGE_EXPIRY_MS = 24 * 60 * 60 * 1_000;
const CREATION_COOLDOWN_MS = 30 * 1_000;
const CREATOR_PLAYER = { name: "creator", isGuest: false };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START_TIME);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("shareable challenges", () => {
  it("requires authentication for challenge mutations", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.challenges.createChallenge, {}),
    ).rejects.toThrow("Not authenticated");

    const creatorId = await insertUser(t, "creator@example.com");
    const creator = t.withIdentity({ subject: creatorId });
    const { challengeId } = await creator.mutation(
      api.challenges.createChallenge,
      {},
    );

    await expect(
      t.mutation(api.challenges.joinChallenge, { challengeId }),
    ).rejects.toThrow("Not authenticated");
    await expect(
      t.mutation(api.challenges.cancelChallenge, { challengeId }),
    ).rejects.toThrow("Not authenticated");
  });

  it("returns the existing unexpired waiting challenge on duplicate create", async () => {
    const t = convexTest(schema, modules);
    const creatorId = await insertUser(t, "creator@example.com");
    const creator = t.withIdentity({ subject: creatorId });

    const first = await creator.mutation(api.challenges.createChallenge, {});
    const duplicate = await creator.mutation(
      api.challenges.createChallenge,
      {},
    );

    expect(duplicate).toEqual(first);
    await t.run(async (ctx) => {
      const challenges = await ctx.db.query("challenges").collect();
      expect(challenges).toHaveLength(1);
      expect(challenges[0]).toMatchObject({
        _id: first.challengeId,
        creatorId,
        status: "waiting",
        expiresAt: first.expiresAt,
      });
    });
  });

  it("enforces a 30-second creation cooldown from the latest challenge", async () => {
    const t = convexTest(schema, modules);
    const creatorId = await insertUser(t, "creator@example.com");
    const creator = t.withIdentity({ subject: creatorId });

    const first = await creator.mutation(api.challenges.createChallenge, {});
    await creator.mutation(api.challenges.cancelChallenge, {
      challengeId: first.challengeId,
    });

    const firstRecord = await t.run(async (ctx) =>
      ctx.db.get(first.challengeId),
    );
    if (!firstRecord) throw new Error("Expected challenge to exist");
    const cooldownEndsAt = Math.ceil(
      firstRecord._creationTime + CREATION_COOLDOWN_MS,
    );

    vi.setSystemTime(cooldownEndsAt - 1);
    await expect(
      creator.mutation(api.challenges.createChallenge, {}),
    ).rejects.toThrow("Challenge creation is on cooldown");

    vi.setSystemTime(cooldownEndsAt);
    await expect(
      creator.mutation(api.challenges.createChallenge, {}),
    ).resolves.toMatchObject({
      expiresAt: cooldownEndsAt + CHALLENGE_EXPIRY_MS,
    });
  });

  it("returns only the safe pre-join DTO", async () => {
    const t = convexTest(schema, modules);
    const creatorId = await insertUser(t, "creator@example.com");
    const guestId = await insertUser(t, "guest@example.com");
    const creator = t.withIdentity({ subject: creatorId });
    const guest = t.withIdentity({ subject: guestId });

    const challenge = await creator.mutation(
      api.challenges.createChallenge,
      {},
    );

    await expect(
      creator.query(api.challenges.getChallenge, {
        challengeId: challenge.challengeId,
      }),
    ).resolves.toEqual({
      status: "waiting",
      expiresAt: challenge.expiresAt,
      viewerRole: "creator",
      creator: CREATOR_PLAYER,
    });
    await expect(
      guest.query(api.challenges.getChallenge, {
        challengeId: challenge.challengeId,
      }),
    ).resolves.toEqual({
      status: "waiting",
      expiresAt: challenge.expiresAt,
      viewerRole: "guest",
      creator: CREATOR_PLAYER,
    });
    await expect(
      t.query(api.challenges.getChallenge, {
        challengeId: challenge.challengeId,
      }),
    ).resolves.toEqual({
      status: "waiting",
      expiresAt: challenge.expiresAt,
      viewerRole: "guest",
      creator: CREATOR_PLAYER,
    });
  });

  it("returns null for a malformed public challenge id", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.query(api.challenges.getChallenge, {
        challengeId: "not-a-convex-id",
      }),
    ).resolves.toBeNull();
  });

  it("rejects the creator from claiming the guest seat", async () => {
    const t = convexTest(schema, modules);
    const creatorId = await insertUser(t, "creator@example.com");
    const creator = t.withIdentity({ subject: creatorId });
    const { challengeId } = await creator.mutation(
      api.challenges.createChallenge,
      {},
    );

    await expect(
      creator.mutation(api.challenges.joinChallenge, { challengeId }),
    ).rejects.toThrow("Cannot join your own challenge");

    await t.run(async (ctx) => {
      expect(await ctx.db.query("games").collect()).toEqual([]);
    });
  });

  it("returns the existing game when the same guest joins twice", async () => {
    const t = convexTest(schema, modules);
    const creatorId = await insertUser(t, "creator@example.com");
    const guestId = await insertUser(t, "guest@example.com");
    const creator = t.withIdentity({ subject: creatorId });
    const guest = t.withIdentity({ subject: guestId });
    const challenge = await creator.mutation(
      api.challenges.createChallenge,
      {},
    );

    const { gameId } = await guest.mutation(api.challenges.joinChallenge, {
      challengeId: challenge.challengeId,
    });
    await expect(
      guest.mutation(api.challenges.joinChallenge, {
        challengeId: challenge.challengeId,
      }),
    ).resolves.toEqual({ gameId });

    await t.run(async (ctx) => {
      const game = await ctx.db.get(gameId);
      expect(game).toEqual({
        _id: gameId,
        _creationTime: expect.any(Number),
        whitePlayerId: creatorId,
        blackPlayerId: guestId,
        status: "active",
        gameState: JSON.stringify(createInitialGameState()),
        moveHistory: [],
        lastMoveAt: START_TIME.getTime(),
      });

      expect(await ctx.db.get(challenge.challengeId)).toEqual({
        _id: challenge.challengeId,
        _creationTime: expect.any(Number),
        creatorId,
        status: "joined",
        expiresAt: challenge.expiresAt,
        gameId,
      });
      expect(await ctx.db.query("games").collect()).toHaveLength(1);
    });

    await expect(
      creator.mutation(api.challenges.cancelChallenge, {
        challengeId: challenge.challengeId,
      }),
    ).rejects.toThrow("Joined challenges cannot be canceled");
  });

  it("returns a joined game's public route to every viewer", async () => {
    const t = convexTest(schema, modules);
    const creatorId = await insertUser(t, "creator@example.com");
    const opponentId = await insertUser(t, "opponent@example.com");
    const unrelatedId = await insertUser(t, "unrelated@example.com");
    const creator = t.withIdentity({ subject: creatorId });
    const opponent = t.withIdentity({ subject: opponentId });
    const unrelated = t.withIdentity({ subject: unrelatedId });
    const challenge = await creator.mutation(
      api.challenges.createChallenge,
      {},
    );
    const { gameId } = await opponent.mutation(api.challenges.joinChallenge, {
      challengeId: challenge.challengeId,
    });

    const joinedDto = { status: "joined", gameId } as const;
    await expect(
      creator.query(api.challenges.getChallenge, {
        challengeId: challenge.challengeId,
      }),
    ).resolves.toEqual(joinedDto);
    await expect(
      opponent.query(api.challenges.getChallenge, {
        challengeId: challenge.challengeId,
      }),
    ).resolves.toEqual(joinedDto);
    await expect(
      unrelated.query(api.challenges.getChallenge, {
        challengeId: challenge.challengeId,
      }),
    ).resolves.toEqual(joinedDto);
    await expect(
      t.query(api.challenges.getChallenge, {
        challengeId: challenge.challengeId,
      }),
    ).resolves.toEqual(joinedDto);
    await expect(
      unrelated.mutation(api.challenges.joinChallenge, {
        challengeId: challenge.challengeId,
      }),
    ).rejects.toThrow("Challenge unavailable");
    await t.run(async (ctx) => {
      expect(await ctx.db.query("games").collect()).toHaveLength(1);
    });
  });

  it("merges both player indexes and lists only resumable untimed games", async () => {
    const t = convexTest(schema, modules);
    const creatorId = await insertUser(t, "creator@example.com");
    const opponentId = await insertUser(t, "opponent@example.com");
    const unrelatedId = await insertUser(t, "unrelated@example.com");
    const creator = t.withIdentity({ subject: creatorId });
    const opponent = t.withIdentity({ subject: opponentId });
    const unrelated = t.withIdentity({ subject: unrelatedId });
    const challenge = await creator.mutation(
      api.challenges.createChallenge,
      {},
    );
    const { gameId } = await opponent.mutation(api.challenges.joinChallenge, {
      challengeId: challenge.challengeId,
    });

    vi.advanceTimersByTime(1);
    const reverseChallenge = await opponent.mutation(
      api.challenges.createChallenge,
      {},
    );
    const { gameId: reverseGameId } = await creator.mutation(
      api.challenges.joinChallenge,
      { challengeId: reverseChallenge.challengeId },
    );

    await t.run(async (ctx) => {
      const gameState = JSON.stringify(createInitialGameState());
      await ctx.db.patch(gameId, {
        status: "completed",
        winner: "w",
        gameEndReason: "checkmate",
      });
      await ctx.db.insert("games", {
        whitePlayerId: creatorId,
        status: "waiting",
        gameState,
        moveHistory: [],
        lastMoveAt: START_TIME.getTime(),
      });
      await ctx.db.insert("games", {
        whitePlayerId: creatorId,
        blackPlayerId: creatorId,
        isPracticeGame: true,
        status: "active",
        gameState,
        moveHistory: [],
        lastMoveAt: START_TIME.getTime(),
      });
      await ctx.db.insert("games", {
        whitePlayerId: creatorId,
        blackPlayerId: opponentId,
        timeControl: { initialTimeMs: 60_000, incrementMs: 0 },
        status: "active",
        gameState,
        moveHistory: [],
        lastMoveAt: START_TIME.getTime(),
      });
    });

    const creatorGames = await creator.query(api.gameLogic.listGames, {});
    const opponentGames = await opponent.query(api.gameLogic.listGames, {});
    expect(
      creatorGames.map((game) => ({ id: game._id, status: game.status })),
    ).toEqual([
      { id: reverseGameId, status: "active" },
      { id: gameId, status: "completed" },
    ]);
    expect(
      opponentGames.map((game) => ({ id: game._id, status: game.status })),
    ).toEqual([
      { id: reverseGameId, status: "active" },
      { id: gameId, status: "completed" },
    ]);
    await expect(unrelated.query(api.gameLogic.listGames, {})).resolves.toEqual(
      [],
    );
    await expect(t.query(api.gameLogic.listGames, {})).resolves.toEqual([]);
  });

  it("lets only one of two racing guests claim the seat", async () => {
    const t = convexTest(schema, modules);
    const creatorId = await insertUser(t, "creator@example.com");
    const firstGuestId = await insertUser(t, "first-guest@example.com");
    const secondGuestId = await insertUser(t, "second-guest@example.com");
    const creator = t.withIdentity({ subject: creatorId });
    const firstGuest = t.withIdentity({ subject: firstGuestId });
    const secondGuest = t.withIdentity({ subject: secondGuestId });
    const { challengeId } = await creator.mutation(
      api.challenges.createChallenge,
      {},
    );

    const results = await Promise.allSettled([
      firstGuest.mutation(api.challenges.joinChallenge, { challengeId }),
      secondGuest.mutation(api.challenges.joinChallenge, { challengeId }),
    ]);
    const successfulResults = results.filter(
      (result) => result.status === "fulfilled",
    );
    const rejectedResults = results.filter(
      (result) => result.status === "rejected",
    );

    expect(successfulResults).toHaveLength(1);
    expect(rejectedResults).toHaveLength(1);
    await t.run(async (ctx) => {
      expect(await ctx.db.query("games").collect()).toHaveLength(1);
    });
  });

  it("settles a racing cancel and join without an orphan game", async () => {
    const t = convexTest(schema, modules);
    const creatorId = await insertUser(t, "creator@example.com");
    const guestId = await insertUser(t, "guest@example.com");
    const creator = t.withIdentity({ subject: creatorId });
    const guest = t.withIdentity({ subject: guestId });
    const { challengeId } = await creator.mutation(
      api.challenges.createChallenge,
      {},
    );

    const results = await Promise.allSettled([
      creator.mutation(api.challenges.cancelChallenge, { challengeId }),
      guest.mutation(api.challenges.joinChallenge, { challengeId }),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);

    await t.run(async (ctx) => {
      const challenge = await ctx.db.get(challengeId);
      if (!challenge) throw new Error("Expected challenge to exist");
      const games = await ctx.db.query("games").collect();

      if (challenge.status === "joined") {
        expect(games).toHaveLength(1);
        expect(games[0]._id).toBe(challenge.gameId);
        return;
      }

      expect(challenge.status).toBe("canceled");
      expect(games).toEqual([]);
    });
  });

  it("rejects an expired link and lets creation mark it expired", async () => {
    const t = convexTest(schema, modules);
    const creatorId = await insertUser(t, "creator@example.com");
    const guestId = await insertUser(t, "guest@example.com");
    const creator = t.withIdentity({ subject: creatorId });
    const guest = t.withIdentity({ subject: guestId });
    const first = await creator.mutation(api.challenges.createChallenge, {});

    vi.advanceTimersByTime(CHALLENGE_EXPIRY_MS);
    await expect(
      guest.mutation(api.challenges.joinChallenge, {
        challengeId: first.challengeId,
      }),
    ).rejects.toThrow("Challenge unavailable");

    const second = await creator.mutation(api.challenges.createChallenge, {});
    expect(second.challengeId).not.toBe(first.challengeId);
    await t.run(async (ctx) => {
      expect(await ctx.db.get(first.challengeId)).toMatchObject({
        status: "expired",
      });
      expect(await ctx.db.query("games").collect()).toEqual([]);
    });
    await expect(
      guest.query(api.challenges.getChallenge, {
        challengeId: first.challengeId,
      }),
    ).resolves.toEqual({
      status: "expired",
      expiresAt: first.expiresAt,
      viewerRole: "guest",
      creator: CREATOR_PLAYER,
    });
  });

  it("allows only the creator to cancel and makes cancellation idempotent", async () => {
    const t = convexTest(schema, modules);
    const creatorId = await insertUser(t, "creator@example.com");
    const guestId = await insertUser(t, "guest@example.com");
    const creator = t.withIdentity({ subject: creatorId });
    const guest = t.withIdentity({ subject: guestId });
    const { challengeId } = await creator.mutation(
      api.challenges.createChallenge,
      {},
    );

    await expect(
      guest.mutation(api.challenges.cancelChallenge, { challengeId }),
    ).rejects.toThrow("Only the creator can cancel this challenge");
    await expect(
      creator.mutation(api.challenges.cancelChallenge, { challengeId }),
    ).resolves.toBeNull();
    await expect(
      creator.mutation(api.challenges.cancelChallenge, { challengeId }),
    ).resolves.toBeNull();

    await expect(
      creator.query(api.challenges.getChallenge, { challengeId }),
    ).resolves.toEqual({
      status: "canceled",
      expiresAt: START_TIME.getTime() + CHALLENGE_EXPIRY_MS,
      viewerRole: "creator",
      creator: CREATOR_PLAYER,
    });
    await expect(
      guest.mutation(api.challenges.joinChallenge, { challengeId }),
    ).rejects.toThrow("Challenge unavailable");
  });
});

async function insertUser(t: ChessMergeTest, email: string) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      email,
      name: email.slice(0, email.indexOf("@")),
    });
  });
}
