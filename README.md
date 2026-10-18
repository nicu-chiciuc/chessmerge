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

- `pnpm run build:app` - Type-check and build the browser files into `dist/client` and the server render into `dist/server`
- `pnpm run deploy` - Build, upload the site, and push the functions to the production Convex deployment
- `pnpm run deploy:dev` - The same for the development deployment in `.env.local`

Convex serves the site next to the backend with
[`@samebase/convex-hosting`](https://github.com/samebase/convex-hosting), at
`https://<deployment>.convex.site`. A deploy uploads `dist/client` and then pushes the
functions, and the push switches the site. Deploy with these scripts, not with a plain
`npx convex deploy`, which pushes no site version.

GitHub Actions deploys:

- A push to `main` deploys production with the repository secret `CONVEX_DEPLOY_KEY`, the
  production deploy key (`.github/workflows/deploy.yml`).
- A pull request from this repository deploys a Convex preview named after its branch with the
  repository secret `CONVEX_PREVIEW_DEPLOY_KEY`, the project's preview deploy key, and comments
  the preview URL (`.github/workflows/preview.yml`). Later pushes reuse the preview, so users,
  games, and sessions stay until Convex expires it.

`convex/http.ts` imports `.convex-hosting/version.js`, which a deploy writes, and the server
build `dist/server/server.js`. In a new clone, `convex dev` cannot push until both exist, so run
`npx convex dev --skip-push` (it creates the development deployment and `.env.local` without a
push), then `pnpm run deploy:dev` (it builds `dist/` and writes the version file), then
`pnpm run dev`.

**Note:** The type checking setup uses TypeScript project references with separate configurations:

- `tsconfig.app.json` - Frontend React app (`src/` directory)
- `tsconfig.node.json` - Node.js tooling (vite.config.ts, etc.)
- `convex/tsconfig.json` - Convex backend functions

The generated Convex bindings in `convex/_generated` are committed so CI can
build without development deployment credentials. Run
`pnpm exec convex codegen` after changing backend modules or the schema.

Convex renders the pages on the server. A path without a file reaches
`convex/http.ts`, which renders it with the TanStack Start server build through
[`@samebase/convex-hosting-tanstack-start`](https://github.com/samebase/convex-hosting/tree/main/packages/convex-hosting-tanstack-start).
Route loaders load the public Convex data (the lobby's live games, a challenge,
a game), so the first HTML contains it, and the browser keeps it live. A
missing challenge or game answers 404. Convex Auth keeps the session in the
browser's localStorage, so the server always renders signed out, and the
visitor's own data (the header name, "My games", a player's controls) appears
after the page loads.

`/rules` is prerendered at build time and served as a file. A prerendered route
and its parents must not query Convex, because CI builds with a placeholder
`VITE_CONVEX_URL`.

### Authentication email setup

ChessMerge uses Convex Auth with email/password accounts. A new account does
not receive a session until the user enters the 8-digit code sent through
Cloudflare Email Sending. The same setup handles password reset codes.

If the automatic first-run setup did not complete, generate the required
`SITE_URL`, `JWT_PRIVATE_KEY`, and `JWKS` values with:

```bash
npx @convex-dev/auth --skip-git-check --web-server-url http://localhost:5173
```

The Convex project also keeps these three values as **Development** and
**Preview** default environment variables. Convex copies project defaults into
new deployments; it does not update deployments that already exist. Development
uses `http://localhost:5173` for `SITE_URL`, while previews use
`https://chessmerge.com` as the stable redirect fallback. A new preview gets its
keys and `SITE_URL` from these defaults. Production gets them once from the
setup command with `--prod`, described below.

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

Newsletter signup is paused. Subscription creation and status lookup are internal Convex
functions. Existing subscriber records remain in `emailSubscribers`, and existing unsubscribe
links continue to work.

For the email unsubscribe functionality to work properly, you need to set the following environment variable in your [Convex Dashboard](https://dashboard.convex.dev):

- **`FRONTEND_URL`**: Your frontend site's URL (for example, `http://localhost:5173` for development or `https://chessmerge.com` for production)

To set this:

1. Go to your Convex Dashboard
2. Navigate to Settings > Environment Variables
3. Add `FRONTEND_URL` with your frontend site's URL

Without this, unsubscribe links in emails will point to a placeholder URL and won't work.
