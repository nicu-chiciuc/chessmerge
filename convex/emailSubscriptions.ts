import { mutation, query, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const subscribe = mutation({
  args: {
    email: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      return {
        success: false,
        message: "Please enter a valid email address",
      };
    }

    // Check if already subscribed
    const existingSubscriber = await ctx.db
      .query("emailSubscribers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existingSubscriber) {
      return {
        success: false,
        message: "This email is already subscribed",
      };
    }

    // Generate tokens for confirmation and unsubscribe
    const confirmationToken =
      Math.random().toString(36).substring(2) + Date.now().toString(36);
    const unsubscribeToken =
      Math.random().toString(36).substring(2) + Date.now().toString(36);

    // Add subscriber
    const _subscriberId = await ctx.db.insert("emailSubscribers", {
      email: args.email,
      subscribedAt: Date.now(),
      confirmed: true, // Setting to true since we're sending a welcome email
      confirmationToken,
      unsubscribeToken,
    });

    // Schedule welcome email
    await ctx.scheduler.runAfter(
      0,
      internal.emailSubscriptions.sendWelcomeEmail,
      {
        email: args.email,
        unsubscribeToken,
      },
    );

    return {
      success: true,
      message: "Successfully subscribed! Check your email for confirmation.",
    };
  },
});

export const getSubscriptionStatus = query({
  args: {
    email: v.string(),
  },
  returns: v.object({
    isSubscribed: v.boolean(),
    confirmed: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const subscriber = await ctx.db
      .query("emailSubscribers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (!subscriber) {
      return {
        isSubscribed: false,
        confirmed: false,
      };
    }

    return {
      isSubscribed: true,
      confirmed: subscriber.confirmed,
    };
  },
});

export const unsubscribe = mutation({
  args: {
    token: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const subscriber = await ctx.db
      .query("emailSubscribers")
      .withIndex("by_unsubscribe_token", (q) =>
        q.eq("unsubscribeToken", args.token),
      )
      .unique();

    if (!subscriber) {
      return {
        success: false,
        message: "Invalid unsubscribe link",
      };
    }

    await ctx.db.delete(subscriber._id);

    return {
      success: true,
      message: "You have been successfully unsubscribed",
    };
  },
});

export const sendWelcomeEmail = internalAction({
  args: {
    email: v.string(),
    unsubscribeToken: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    if (!process.env.RESEND_API_KEY) {
      console.log("RESEND_API_KEY not configured, skipping email send");
      return null;
    }

    try {
      // Dynamic import to avoid errors when Resend is not configured
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);

      const unsubscribeUrl = `${process.env.CONVEX_SITE_URL || "https://yoursite.com"}/unsubscribe?token=${args.unsubscribeToken}`;

      const result = await resend.emails.send({
        from: "ChessMerge <onboarding@resend.dev>", // Use Resend's test domain if you haven't set up your own
        to: args.email,
        subject: "Welcome to ChessMerge Updates!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a1a;">Welcome to ChessMerge!</h2>
            <p style="color: #666; line-height: 1.6;">
              Thank you for subscribing to our updates. You'll be the first to know about:
            </p>
            <ul style="color: #666; line-height: 1.8;">
              <li>New game features and piece combinations</li>
              <li>Tournament announcements</li>
              <li>Strategy tips and guides</li>
              <li>Community highlights</li>
            </ul>
            <p style="color: #666; line-height: 1.6;">
              We're excited to have you in our chess community!
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">
              If you no longer wish to receive these emails, you can 
              <a href="${unsubscribeUrl}" style="color: #666;">unsubscribe here</a>.
            </p>
          </div>
        `,
      });

      console.log("Welcome email sent successfully:", result);
    } catch (error) {
      console.error("Failed to send welcome email:", error);
      // Don't throw - we don't want to fail the subscription if email fails
    }

    return null;
  },
});
