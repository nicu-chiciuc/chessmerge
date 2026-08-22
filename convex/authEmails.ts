import { RandomReader, generateRandomString } from "@oslojs/crypto/random";
import { Email } from "@convex-dev/auth/providers/Email";

import { sendEmail } from "./email";

const CODE_LENGTH = 8;
const CODE_TTL_SECONDS = 15 * 60;
const AUTH_EMAIL_FROM = "ChessMerge <notifications@chessmerge.com>";

const random: RandomReader = {
  read(bytes) {
    crypto.getRandomValues(bytes);
  },
};

function createEmailCodeProvider({
  id,
  subject,
  message,
}: {
  id: string;
  subject: string;
  message: string;
}) {
  return Email({
    id,
    from: AUTH_EMAIL_FROM,
    maxAge: CODE_TTL_SECONDS,
    async generateVerificationToken() {
      return generateRandomString(random, "0123456789", CODE_LENGTH);
    },
    async sendVerificationRequest({ identifier: email, token }) {
      await sendEmail({
        to: email,
        subject,
        text: `${message}\n\n${token}\n\nThis code expires in 15 minutes. If you did not request it, you can ignore this email.`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
            <h1 style="font-size: 24px; margin: 0 0 16px;">ChessMerge</h1>
            <p>${message}</p>
            <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 24px 0;">${token}</p>
            <p>This code expires in 15 minutes.</p>
            <p style="color: #6b7280; font-size: 14px;">If you did not request it, you can ignore this email.</p>
          </div>
        `,
      });
    },
  });
}

export const emailVerificationCode = createEmailCodeProvider({
  id: "email-verification-code",
  subject: "Verify your ChessMerge email",
  message: "Enter this code in ChessMerge to verify your email address:",
});

export const passwordResetCode = createEmailCodeProvider({
  id: "password-reset-code",
  subject: "Reset your ChessMerge password",
  message: "Enter this code in ChessMerge to choose a new password:",
});
