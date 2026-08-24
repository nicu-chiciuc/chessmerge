import { getAuthUserId } from "@convex-dev/auth/server";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type AuthCtx = MutationCtx | QueryCtx;
type DeletedUser = Doc<"users"> & { deletedAt: number };
export type ActiveUser = Exclude<Doc<"users">, DeletedUser>;

export function isDeletedUser(user: Doc<"users">): user is DeletedUser {
  return "deletedAt" in user;
}

export async function getActiveUser(ctx: AuthCtx): Promise<ActiveUser | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;

  const user = await ctx.db.get(userId);
  if (!user || isDeletedUser(user)) return null;
  return user;
}

export async function getActiveUserId(
  ctx: AuthCtx,
): Promise<Id<"users"> | null> {
  return (await getActiveUser(ctx))?._id ?? null;
}

export async function requireActiveUser(ctx: AuthCtx): Promise<ActiveUser> {
  const user = await getActiveUser(ctx);
  if (!user) throw new Error("Not authenticated");
  return user;
}

export async function requireActiveUserId(ctx: AuthCtx): Promise<Id<"users">> {
  return (await requireActiveUser(ctx))._id;
}
