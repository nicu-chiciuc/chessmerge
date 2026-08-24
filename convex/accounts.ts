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
import { usernameKey, validateUsername } from "./publicPlayers";

const SESSION_BATCH = 8;
const SESSION_CHILD_BATCH = 32;
const GAME_BATCH = 48;

export const updateName = mutation({
  args: { name: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    const user = await requireActiveUser(ctx);
    const name = validateUsername(args.name);
    const normalizedName = usernameKey(name);
    const matches = await ctx.db
      .query("users")
      .withIndex("username", (query) => query.eq("usernameKey", normalizedName))
      .take(2);

    if (matches.some((match) => match._id !== user._id)) {
      throw new Error("Username already taken");
    }

    await ctx.db.patch(user._id, { name, usernameKey: normalizedName });
    return name;
  },
});

export const deleteAccount = mutation({
  args: { confirmation: v.literal(ACCOUNT_DELETION_CONFIRMATION) },
  returns: v.null(),
  handler: async (ctx) => {
    const user = await requireActiveUser(ctx);
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (query) => query.eq("userId", user._id))
      .collect();
    const authIdentifiers: Array<string | undefined> = [user.email, user.phone];

    for (const account of accounts) {
      const verificationCodes = await ctx.db
        .query("authVerificationCodes")
        .withIndex("accountId", (query) => query.eq("accountId", account._id))
        .collect();
      for (const code of verificationCodes) {
        authIdentifiers.push(code.emailVerified, code.phoneVerified);
        await ctx.db.delete(code._id);
      }
      authIdentifiers.push(
        account._id,
        account.providerAccountId,
        account.emailVerified,
        account.phoneVerified,
      );
      await ctx.db.delete(account._id);
    }

    const identifiers = new Set(
      authIdentifiers.filter(
        (identifier): identifier is string => identifier !== undefined,
      ),
    );
    for (const identifier of identifiers) {
      const rateLimits = await ctx.db
        .query("authRateLimits")
        .withIndex("identifier", (query) => query.eq("identifier", identifier))
        .collect();
      for (const rateLimit of rateLimits) await ctx.db.delete(rateLimit._id);
    }

    const waitingChallenges = await ctx.db
      .query("challenges")
      .withIndex("by_creatorId_and_status", (query) =>
        query.eq("creatorId", user._id).eq("status", "waiting"),
      )
      .collect();
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
