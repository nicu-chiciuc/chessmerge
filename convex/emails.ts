"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

// Initialize Resend with your API key (store in environment variables)
const resend = new Resend(process.env.RESEND_API_KEY);

export const sendWelcomeEmail = internalAction({
  args: {
    email: v.string(),
    confirmationToken: v.string(),
    unsubscribeToken: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    try {
      await resend.emails.send({
        from: "ChessMerge <hello@yourchessdomain.com>",
        to: args.email,
        subject: "Welcome to ChessMerge Updates!",
        html: `
          <h2>Welcome to ChessMerge!</h2>
          <p>Thank you for subscribing to our updates. You'll be the first to know about new features and game updates.</p>
          <p><a href="https://yoursite.com/confirm?token=${args.confirmationToken}">Confirm your email</a></p>
          <hr>
          <p style="font-size: 12px; color: #666;">
            <a href="https://yoursite.com/unsubscribe?token=${args.unsubscribeToken}">Unsubscribe</a>
          </p>
        `,
      });
    } catch (error) {
      console.error("Failed to send email:", error);
      // You might want to retry or handle this error appropriately
    }
    return null;
  },
});

export const sendNewsletterEmail = internalAction({
  args: {
    emails: v.array(v.string()),
    subject: v.string(),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    // Send emails in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < args.emails.length; i += batchSize) {
      const batch = args.emails.slice(i, i + batchSize);

      await Promise.all(
        batch.map((email) =>
          resend.emails.send({
            from: "ChessMerge <updates@yourchessdomain.com>",
            to: email,
            subject: args.subject,
            html: args.content,
          }),
        ),
      );

      // Add a small delay between batches
      if (i + batchSize < args.emails.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    return null;
  },
});
