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
- `pnpm run build` - Build locally, or deploy the selected Convex backend and build in Cloudflare Workers Builds
- `pnpm run deploy` - Publish production with Wrangler
- `pnpm run deploy:preview` - Create or update a native Worker Preview
- `pnpm run preview` - Serve the current `dist/client` build through Wrangler's static-asset runtime

Set the build secret `CONVEX_DEPLOY_KEY` to the production deploy key in **Builds > Production**
and the project Preview deploy key in **Builds > Previews Base**, not runtime settings.

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
builds use `--preview-name` to preserve users, games, sessions, and the deployment
URL until Convex expires the preview. They reject production or individual-deployment
keys before running Convex.

After a preview deployment, `scripts/ensure-preview-convex-auth.ts` preserves existing keys
and `SITE_URL`. It creates a matching key pair only when both keys are absent and
adds the redirect fallback only when `SITE_URL` is absent. Missing settings are
written together without overwriting values. A failed read or partial key pair
stops the build.

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
