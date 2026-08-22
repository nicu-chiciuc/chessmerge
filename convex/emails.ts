"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { sendEmail } from "./email";

export const sendWelcomeEmail = internalAction({
  args: {
    email: v.string(),
    confirmationToken: v.string(),
    unsubscribeToken: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) {
      throw new Error("FRONTEND_URL is required for subscription emails");
    }

    const confirmationUrl = `${frontendUrl}/confirm?token=${args.confirmationToken}`;
    const unsubscribeUrl = `${frontendUrl}/unsubscribe?token=${args.unsubscribeToken}`;
    await sendEmail({
      to: args.email,
      subject: "Welcome to ChessMerge Updates!",
      text: `Welcome to ChessMerge!\n\nConfirm your email: ${confirmationUrl}\n\nUnsubscribe: ${unsubscribeUrl}`,
      html: `
        <h2>Welcome to ChessMerge!</h2>
        <p>Thank you for subscribing to our updates. You'll be the first to know about new features and game updates.</p>
        <p><a href="${confirmationUrl}">Confirm your email</a></p>
        <hr>
        <p style="font-size: 12px; color: #666;">
          <a href="${unsubscribeUrl}">Unsubscribe</a>
        </p>
      `,
    });
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
          sendEmail({
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
