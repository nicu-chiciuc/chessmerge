import { array, literal, number, object, string, union } from "@robolex/sure";

import { env } from "./_generated/server";

const CLOUDFLARE_API_BASE_URL = "https://api.cloudflare.com/client/v4";
const EMAIL_FROM = {
  address: "notifications@chessmerge.com",
  name: "ChessMerge",
};

const cloudflareEmailResponseSchema = union(
  object({
    success: literal(true),
    result: object({
      delivered: array(string),
      message_id: string,
      permanent_bounces: array(string),
      queued: array(string),
    }),
  }),
  object({
    success: literal(false),
    errors: array(
      object({
        code: union(number, string),
        message: string,
      }),
    ),
  }),
);

type EmailContent =
  | { text: string; html?: string }
  | { text?: string; html: string };

export type SendEmailArgs = {
  to: string | string[];
  subject: string;
} & EmailContent;

export async function sendEmail(args: SendEmailArgs): Promise<void> {
  const accountId = env.CLOUDFLARE_EMAIL_ACCOUNT_ID?.trim();
  const token = env.CLOUDFLARE_EMAIL_API_TOKEN?.trim();

  if (!accountId || !token) {
    throw new Error(
      "CLOUDFLARE_EMAIL_ACCOUNT_ID and CLOUDFLARE_EMAIL_API_TOKEN are required for email sending.",
    );
  }

  const response = await fetch(
    `${CLOUDFLARE_API_BASE_URL}/accounts/${encodeURIComponent(accountId)}/email/sending/send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: args.to,
        from: EMAIL_FROM,
        subject: args.subject,
        text: args.text,
        html: args.html,
      }),
    },
  );

  const responseText = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(responseText);
  } catch {
    throw new Error(
      `Cloudflare Email Sending returned a non-JSON response (${response.status}).`,
    );
  }

  const parsed = cloudflareEmailResponseSchema(payload);
  if (!parsed[0]) {
    throw new Error(
      `Cloudflare Email Sending returned an invalid response (${response.status}): ${JSON.stringify(parsed[1])}`,
    );
  }

  const result = parsed[1];
  if (!result.success) {
    const details = result.errors
      .map((error) => `${error.code}: ${error.message}`)
      .join("; ");
    throw new Error(
      `Cloudflare Email Sending failed (${response.status}): ${details}`,
    );
  }
  if (!response.ok) {
    throw new Error(`Cloudflare Email Sending failed (${response.status}).`);
  }
  if (result.result.permanent_bounces.length > 0) {
    throw new Error(
      `Cloudflare Email Sending permanently bounced for ${result.result.permanent_bounces.length} recipient(s).`,
    );
  }
}
