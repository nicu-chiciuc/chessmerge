# Welcome to your Convex + React (Vite) + Convex Auth app

This is a [Convex](https://convex.dev/) project created with [`pnpm create convex`](https://www.npmjs.com/package/create-convex).

After the initial setup (<2 minutes) you'll have a working full-stack app using:

- Convex as your backend (database, server logic)
- [React](https://react.dev/) as your frontend (web page interactivity)
- [Vite](https://vitest.dev/) for optimized web hosting
- [Tailwind](https://tailwindcss.com/) for building great looking UI
- [Convex Auth](https://labs.convex.dev/auth) for authentication

## Get started

If you just cloned this codebase and didn't use `pnpm create convex`, run:

```
pnpm install
pnpm run dev
```

If you're reading this README on GitHub and want to use this template, run:

```
pnpm create convex@latest -- -t react-vite-convexauth
```

## Development Scripts

This project includes several useful scripts for development:

### Core Development

- `pnpm run dev` - Start both frontend and backend in development mode
- `pnpm run dev:frontend` - Start only the Vite frontend development server
- `pnpm run dev:backend` - Start only the Convex backend development server

### Type Checking

- `pnpm run type-check` - Check TypeScript types across all projects (frontend, node tooling, and convex)
- `pnpm run type-check:convex` - Check TypeScript types specifically for Convex backend functions
- `pnpm run lint` - Run both TypeScript type checking and ESLint linting

### Build & Deploy

- `pnpm run build` - Build the project for production
- `pnpm run preview` - Preview the production build locally

**Note:** The type checking setup uses TypeScript project references with separate configurations:

- `tsconfig.app.json` - Frontend React app (`src/` directory)
- `tsconfig.node.json` - Node.js tooling (vite.config.ts, etc.)
- `convex/tsconfig.json` - Convex backend functions

For more information on how to configure Convex Auth, check out the [Convex Auth docs](https://labs.convex.dev/auth/).

For more examples of different Convex Auth flows, check out this [example repo](https://www.convex.dev/templates/convex-auth).

## Learn more

To learn more about developing your project with Convex, check out:

- The [Tour of Convex](https://docs.convex.dev/get-started) for a thorough introduction to Convex principles.
- The rest of [Convex docs](https://docs.convex.dev/) to learn about all Convex features.
- [Stack](https://stack.convex.dev/) for in-depth articles on advanced topics.

## Join the community

Join thousands of developers building full-stack apps with Convex:

- Join the [Convex Discord community](https://convex.dev/community) to get help in real-time.
- Follow [Convex on GitHub](https://github.com/get-convex/), star and contribute to the open-source implementation of Convex.

## Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start the development server. The first run configures the Convex
   deployment and its auth keys:
   ```bash
   pnpm run dev
   ```

### Authentication email setup

ChessMerge uses Convex Auth with email/password accounts. A new account does
not receive a session until the user enters the 8-digit code sent through
Cloudflare Email Sending. The same setup handles password reset codes.

If the automatic first-run setup did not complete, generate the required
`SITE_URL`, `JWT_PRIVATE_KEY`, and `JWKS` values with:

```bash
pnpm exec @convex-dev/auth --skip-git-check --web-server-url http://localhost:5173
```

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
