import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { query, internalAction, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v, type Value } from "convex/values";
import { emailVerificationCode, passwordResetCode } from "./authEmails";
import { sendEmail } from "./email";
import {
  createGuestName,
  getPublicPlayer,
  usernameKey,
  validateUsername,
} from "./publicPlayers";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      verify: emailVerificationCode,
      reset: passwordResetCode,
      profile(params): Record<string, Value> & { email: string } {
        const email =
          typeof params.email === "string" ? params.email.trim() : "";
        if (!email) throw new Error("Missing email");

        if (params.flow === "signUp") {
          const name = validateUsername(params.username);
          return { email, name, usernameKey: usernameKey(name) };
        }
        return { email };
      },
    }),
    Anonymous({
      profile: () => {
        const name = createGuestName();
        return {
          isAnonymous: true,
          name,
          usernameKey: usernameKey(name),
        };
      },
    }),
  ],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, { userId, existingUserId }) {
      const user = await ctx.db.get(userId);
      if (user?.usernameKey) {
        // Convex Auth's generic callback type does not retain application indexes.
        const db = ctx.db as MutationCtx["db"];
        const matches = await db
          .query("users")
          .withIndex("username", (q) => q.eq("usernameKey", user.usernameKey))
          .take(2);
        if (matches.some((match) => match._id !== userId)) {
          throw new Error("Username already taken");
        }
      }

      // Only send email for new users (not updates)
      if (!existingUserId) {
        if (user?.email) {
          await ctx.scheduler.runAfter(
            0,
            internal.auth.sendAccountCreationEmail,
            {
              email: user.email,
              userId: userId,
            },
          );
        }
      }
    },
  },
});

export const loggedInUser = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("users"),
      name: v.string(),
      isGuest: v.boolean(),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return { _id: user._id, ...getPublicPlayer(user) };
  },
});

export const sendAccountCreationEmail = internalAction({
  args: {
    email: v.string(),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    await sendEmail({
      to: "nicuchiciuc@gmail.com",
      subject: "New account created on ChessMerge",
      text: `New account created: ${args.email}\nUser ID: ${args.userId}`,
    });

    return null;
  },
});
