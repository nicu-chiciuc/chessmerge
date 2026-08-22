import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { query, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { emailVerificationCode, passwordResetCode } from "./authEmails";
import { sendEmail } from "./email";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      verify: emailVerificationCode,
      reset: passwordResetCode,
    }),
    Anonymous,
  ],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, { userId, existingUserId }) {
      // Only send email for new users (not updates)
      if (!existingUserId) {
        const user = await ctx.db.get(userId);
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
      email: v.optional(v.string()),
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
    return {
      _id: user._id,
      email: user.email,
    };
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
