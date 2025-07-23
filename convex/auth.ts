import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { query, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, Anonymous],
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
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return user;
  },
});

export const sendAccountCreationEmail = internalAction({
  args: {
    email: v.string(),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    if (!process.env.RESEND_API_KEY) {
      console.log(
        "RESEND_API_KEY not configured, skipping account creation email",
      );
      return null;
    }

    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);

      // Send notification to admin about new account
      await resend.emails.send({
        from: "ChessMerge <contact@tsx.md>",
        to: "nicuchiciuc@gmail.com",
        subject: "New account created on ChessMerge",
        html: `New account created: ${args.email}`,
      });

      console.log("Account creation notification sent successfully");
    } catch (error) {
      console.error("Failed to send account creation notification:", error);
    }

    return null;
  },
});
