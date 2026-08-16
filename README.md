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
3. Set up Convex:
   ```bash
   pnpm run setup
   ```
4. Start the development server:
   ```bash
   pnpm run dev
   ```

### Environment Variables

For the email unsubscribe functionality to work properly, you need to set the following environment variable in your [Convex Dashboard](https://dashboard.convex.dev):

- **`FRONTEND_URL`**: Your frontend site's URL (e.g., `http://localhost:5173` for development or `https://your-app.vercel.app` for production)

To set this:
1. Go to your Convex Dashboard
2. Navigate to Settings > Environment Variables
3. Add `FRONTEND_URL` with your frontend site's URL

Without this, unsubscribe links in emails will point to a placeholder URL and won't work.
