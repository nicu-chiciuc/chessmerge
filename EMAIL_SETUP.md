# Email setup with Cloudflare

ChessMerge sends all application email directly from Convex through the
[Cloudflare Email Sending REST API](https://developers.cloudflare.com/email-service/api/send-emails/rest-api/).
It does not use an email relay Worker or another transactional email provider.

Email is sent as `ChessMerge <notifications@chessmerge.com>`. Authentication
uses it for sign-up verification and password resets. The subscription and
admin-notification actions use the same sender.

## 1. Onboard the sending domain

1. Open **Compute > Email Service > Email Sending** in Cloudflare.
2. Onboard `chessmerge.com`.
3. Publish the bounce MX, SPF, DKIM, and DMARC records that Cloudflare creates.
4. Do not enable Email Routing unless Cloudflare should also receive inbound
   mail for the domain.

The sender domain must belong to the Cloudflare account used by the API token.

## 2. Create an API token

Create an account-owned token named `CHESSMERGE_EMAIL_SENDING` with only
**Account > Email Sending > Edit**. Use the same token for Convex development,
previews, and production.

Separate production and nonproduction tokens are optional if independent
rotation or revocation is useful. They do not restrict Email Sending to a
particular domain because the permission is account-scoped.

Keep the token values in Convex. Do not put them in frontend or build-time
environment variables.

## 3. Configure each Convex deployment

Set the Cloudflare account ID and the matching email token on development:

```bash
pnpm exec convex env set CLOUDFLARE_EMAIL_ACCOUNT_ID <account-id>
pnpm exec convex env set CLOUDFLARE_EMAIL_API_TOKEN <email-token>
```

Set them again on production:

```bash
pnpm exec convex env set --prod CLOUDFLARE_EMAIL_ACCOUNT_ID <account-id>
pnpm exec convex env set --prod CLOUDFLARE_EMAIL_API_TOKEN <email-token>
```

Convex environment variables do not copy from development to production. A
missing value prevents verification and password-reset emails from sending.

Subscription links also need the frontend URL:

```bash
pnpm exec convex env set FRONTEND_URL http://localhost:5173
pnpm exec convex env set --prod FRONTEND_URL https://chessmerge.com
```

Convex Auth separately needs `SITE_URL`, `JWT_PRIVATE_KEY`, and `JWKS`. The
project README contains the setup command for those values.

## 4. Test the integration

1. Create an account with an email address you can access.
2. Confirm that the app asks for an 8-digit verification code before it creates
   a session.
3. Enter the code and confirm that sign-in completes.
4. Sign out and complete the password-reset flow.
5. Subscribe to updates and test the unsubscribe link.
6. Confirm each send in **Cloudflare Email Service > Activity log**.

## Troubleshooting

- If configuration is missing, set both `CLOUDFLARE_EMAIL_ACCOUNT_ID` and
  `CLOUDFLARE_EMAIL_API_TOKEN` on the active Convex deployment.
- If Cloudflare rejects the sender, confirm that `chessmerge.com` is onboarded
  for Email Sending in the token's account.
- If a message does not arrive, inspect the Cloudflare activity log for its
  delivery or bounce status.
- If an unsubscribe link is invalid, confirm that `FRONTEND_URL` uses the
  correct deployment URL.
