# ChessMerge

ChessMerge uses:

- Convex as your backend (database, server logic)
- [TanStack Start](https://tanstack.com/start/latest) with file-based TanStack Router routes
- [React](https://react.dev/) and [Vite](https://vite.dev/) for the frontend
- [Tailwind](https://tailwindcss.com/) for building great looking UI
- [Convex Auth](https://labs.convex.dev/auth) for authentication

## Get started

Install dependencies and start the frontend and Convex backend:

```
pnpm install
pnpm run dev
```

## Development scripts

### Core development

- `pnpm run dev` - Start both frontend and backend in development mode
- `pnpm run dev:frontend` - Start only the Vite frontend development server
- `pnpm run dev:backend` - Start only the Convex backend development server

### Type checking

- `pnpm run type-check` - Check TypeScript types across all projects (frontend, node tooling, and convex)
- `pnpm run type-check:convex` - Check TypeScript types specifically for Convex backend functions
- `pnpm run lint` - Run both TypeScript type checking and ESLint linting

### Build and deploy

- `pnpm run build:app` - Type-check and build the application locally
- `pnpm run build` - Select the Convex deployment in Cloudflare Workers Builds, deploy the Convex functions, and build the application
- `pnpm run preview` - Serve the current `dist/client` build through Wrangler's static-asset runtime

**Note:** The type checking setup uses TypeScript project references with separate configurations:

- `tsconfig.app.json` - Frontend React app (`src/` directory)
- `tsconfig.node.json` - Node.js tooling (vite.config.ts, etc.)
- `convex/tsconfig.json` - Convex backend functions

The generated Convex bindings in `convex/_generated` are committed so CI and
Cloudflare can build without development deployment credentials. Run
`pnpm exec convex codegen` after changing backend modules or the schema.

TanStack Start runs in SPA mode for this application. It prerenders the browser
shell to `dist/client/index.html`, and Cloudflare Workers Static Assets serves
that shell for direct route loads. Convex Auth and all authenticated game data
initialize in the browser; the Start prerender step does not read or recreate an
authenticated session on the server.

### Authentication email setup

ChessMerge uses Convex Auth with email/password accounts. A new account does
not receive a session until the user enters the 8-digit code sent through
Cloudflare Email Sending. The same setup handles password reset codes.

If the automatic first-run setup did not complete, generate the required
`SITE_URL`, `JWT_PRIVATE_KEY`, and `JWKS` values with:

```bash
pnpm exec @convex-dev/auth --skip-git-check --web-server-url http://localhost:5173
```

The Convex project also keeps these three values as **Development** and
**Preview** default environment variables. Convex copies project defaults into
new deployments; it does not update deployments that already exist. Development
uses `http://localhost:5173` for `SITE_URL`, while previews use
`https://chessmerge.com` as the stable redirect fallback. Cloudflare preview
builds reuse the named Convex deployment with `--preview-name`. New commits keep
the preview's users, games, sessions, and deployment URL while that deployment exists.
Convex can still expire previews under its retention policy.
The build requires a project preview key in `PREVIEW_CONVEX_DEPLOY_KEY` and rejects
production or individual-deployment keys before running Convex.

After a successful preview deploy, `scripts/ensure-preview-convex-auth.ts` checks
that same named deployment. It preserves existing auth keys and `SITE_URL`. If
both keys are absent, it creates a matching pair. If `SITE_URL` is absent, it adds
the documented redirect fallback above. A partial key pair or a failed read stops
the build without overwriting credentials. Missing settings are written together,
without forcing changes to values that another build may have configured.

This applies the Samebase template's persistent-preview and idempotent-auth
behavior, with explicit preview targeting and ChessMerge's existing redirect
fallback. The source is the [Samebase build helper](https://github.com/samebase/base/blob/main/scripts/build-cloudflare.ts)
and [auth helper](https://github.com/samebase/base/blob/main/scripts/ensure-convex-auth.ts).
This is a scoped template update, not a full template-version upgrade. It does not
change the Cloudflare preview model, Wrangler commands, or the existing
`CONVEX_DEPLOY_KEY` / `PREVIEW_CONVEX_DEPLOY_KEY` selection.

To verify the fix on a branch, sign in to its preview and create a test game.
Push a second commit to the same branch. Confirm that the Convex deployment URL,
saved game, and session remain usable. Test a new sign-in too. Do not use
`--preview-create` to repair authentication; that deletes the preview's data.

Manage the defaults in Convex Project Settings or with
`pnpm exec convex env default --help`. Keep `JWT_PRIVATE_KEY` and `JWKS` from the
same generated key pair.

Onboard `chessmerge.com` in Cloudflare Email Sending, then set the Cloudflare
account ID and an account-owned token with **Email Sending > Edit** on every
Convex deployment:

```bash
pnpm exec convex env set CLOUDFLARE_EMAIL_ACCOUNT_ID <account-id>
pnpm exec convex env set CLOUDFLARE_EMAIL_API_TOKEN <email-token>
```

For production, run the auth setup command with `--prod` and the production web
URL, then set both email values again with `pnpm exec convex env set --prod`.
Convex environment variables do not carry from development to production. All
application email uses `ChessMerge <notifications@chessmerge.com>`. See
[EMAIL_SETUP.md](./EMAIL_SETUP.md) for domain, token, and test instructions.

### Environment Variables

For the email unsubscribe functionality to work properly, you need to set the following environment variable in your [Convex Dashboard](https://dashboard.convex.dev):

- **`FRONTEND_URL`**: Your frontend site's URL (for example, `http://localhost:5173` for development or `https://chessmerge.com` for production)

To set this:

1. Go to your Convex Dashboard
2. Navigate to Settings > Environment Variables
3. Add `FRONTEND_URL` with your frontend site's URL

Without this, unsubscribe links in emails will point to a placeholder URL and won't work.
