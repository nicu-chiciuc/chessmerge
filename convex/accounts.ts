import { v } from "convex/values";

import { ACCOUNT_DELETION_CONFIRMATION } from "../lib/accountDeletion";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  type MutationCtx,
} from "./_generated/server";
import { isDeletedUser, requireActiveUser } from "./authUser";

const MAX_AUTH_ACCOUNTS = 8;
const MAX_ACCOUNT_CHILDREN = 8;
const MAX_EMAIL_RECORDS = 8;
const WAITING_CHALLENGE_BATCH = 8;
const SESSION_BATCH = 8;
const SESSION_CHILD_BATCH = 32;
const GAME_BATCH = 48;

export const deleteAccount = mutation({
  args: { confirmation: v.literal(ACCOUNT_DELETION_CONFIRMATION) },
  returns: v.null(),
  handler: async (ctx) => {
    const user = await requireActiveUser(ctx);
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (query) => query.eq("userId", user._id))
      .take(MAX_AUTH_ACCOUNTS + 1);
    if (accounts.length > MAX_AUTH_ACCOUNTS) {
      throw new Error("Account has too many sign-in methods to delete safely");
    }

    for (const account of accounts) {
      const verificationCodes = await ctx.db
        .query("authVerificationCodes")
        .withIndex("accountId", (query) => query.eq("accountId", account._id))
        .take(MAX_ACCOUNT_CHILDREN + 1);
      if (verificationCodes.length > MAX_ACCOUNT_CHILDREN) {
        throw new Error(
          "Account has too many verification codes to delete safely",
        );
      }
      for (const code of verificationCodes) await ctx.db.delete(code._id);
      await ctx.db.delete(account._id);
    }

    const identifiers = new Set(
      [
        user.email,
        user.phone,
        ...accounts.flatMap((account) => [
          account._id,
          account.providerAccountId,
          account.emailVerified,
          account.phoneVerified,
        ]),
      ].filter((identifier): identifier is string => identifier !== undefined),
    );
    for (const identifier of identifiers) {
      await deleteIndexedEmailRecords(ctx, identifier);
    }

    const waitingChallenges = await ctx.db
      .query("challenges")
      .withIndex("by_creatorId_and_status", (query) =>
        query.eq("creatorId", user._id).eq("status", "waiting"),
      )
      .take(WAITING_CHALLENGE_BATCH + 1);
    if (waitingChallenges.length > WAITING_CHALLENGE_BATCH) {
      throw new Error(
        "Account has too many waiting challenges to delete safely",
      );
    }
    for (const challenge of waitingChallenges) {
      await ctx.db.replace(challenge._id, {
        creatorId: challenge.creatorId,
        status: "canceled",
        expiresAt: challenge.expiresAt,
      });
    }

    await ctx.db.replace(user._id, { deletedAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.accounts.cleanupDeletedAccount, {
      userId: user._id,
    });
    return null;
  },
});

export const cleanupDeletedAccount = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !isDeletedUser(user)) return null;

    const sessionsNeedMore = await deleteSessionBatch(ctx, args.userId);
    const gamesNeedMore = await settleGameBatch(ctx, args.userId);

    if (sessionsNeedMore || gamesNeedMore) {
      await ctx.scheduler.runAfter(
        0,
        internal.accounts.cleanupDeletedAccount,
        args,
      );
    }
    return null;
  },
});

async function deleteIndexedEmailRecords(ctx: MutationCtx, identifier: string) {
  const [rateLimits, subscriptions] = await Promise.all([
    ctx.db
      .query("authRateLimits")
      .withIndex("identifier", (query) => query.eq("identifier", identifier))
      .take(MAX_EMAIL_RECORDS + 1),
    ctx.db
      .query("emailSubscribers")
      .withIndex("by_email", (query) => query.eq("email", identifier))
      .take(MAX_EMAIL_RECORDS + 1),
  ]);
  if (
    rateLimits.length > MAX_EMAIL_RECORDS ||
    subscriptions.length > MAX_EMAIL_RECORDS
  ) {
    throw new Error("Account has too many email records to delete safely");
  }
  for (const rateLimit of rateLimits) await ctx.db.delete(rateLimit._id);
  for (const subscription of subscriptions)
    await ctx.db.delete(subscription._id);
}

async function deleteSessionBatch(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<boolean> {
  const sessions = await ctx.db
    .query("authSessions")
    .withIndex("userId", (query) => query.eq("userId", userId))
    .take(SESSION_BATCH);
  let retainedSession = false;

  for (const session of sessions) {
    const [refreshTokens, verifiers] = await Promise.all([
      ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (query) => query.eq("sessionId", session._id))
        .take(SESSION_CHILD_BATCH),
      ctx.db
        .query("authVerifiers")
        .withIndex("sessionId", (query) => query.eq("sessionId", session._id))
        .take(SESSION_CHILD_BATCH),
    ]);
    for (const token of refreshTokens) await ctx.db.delete(token._id);
    for (const verifier of verifiers) await ctx.db.delete(verifier._id);

    if (
      refreshTokens.length === SESSION_CHILD_BATCH ||
      verifiers.length === SESSION_CHILD_BATCH
    ) {
      retainedSession = true;
    } else {
      await ctx.db.delete(session._id);
    }
  }

  return retainedSession || sessions.length === SESSION_BATCH;
}

async function settleGameBatch(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<boolean> {
  const [whiteGames, blackGames] = await Promise.all([
    ctx.db
      .query("games")
      .withIndex("by_white_player_and_status", (query) =>
        query.eq("whitePlayerId", userId).eq("status", "active"),
      )
      .take(GAME_BATCH),
    ctx.db
      .query("games")
      .withIndex("by_black_player_and_status", (query) =>
        query.eq("blackPlayerId", userId).eq("status", "active"),
      )
      .take(GAME_BATCH),
  ]);
  const games = new Map<Id<"games">, Doc<"games">>();
  for (const game of [...whiteGames, ...blackGames]) games.set(game._id, game);

  const now = Date.now();
  for (const game of games.values()) {
    if (!game.blackPlayerId || game.whitePlayerId === game.blackPlayerId) {
      await ctx.db.patch(game._id, {
        status: "abandoned",
        winner: undefined,
        gameEndReason: undefined,
        rematchOfferedBy: undefined,
        rematchGameId: undefined,
        lastMoveAt: now,
      });
      continue;
    }

    await ctx.db.patch(game._id, {
      status: "completed",
      winner: game.whitePlayerId === userId ? "b" : "w",
      gameEndReason: "resignation",
      rematchOfferedBy: undefined,
      rematchGameId: undefined,
      lastMoveAt: now,
    });
  }

  return whiteGames.length === GAME_BATCH || blackGames.length === GAME_BATCH;
}
