import { ConvexAuthProvider } from "@convex-dev/auth/react";
import type { ConvexQueryClient } from "@convex-dev/react-query";
import type { QueryClient } from "@tanstack/react-query";
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  useRouterState,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import App from "../App";
import appCss from "../index.css?url";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  convexQueryClient: ConvexQueryClient;
}>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1.0",
      },
      { title: "ChessMerge" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/bishop_horse.svg" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  const { convexQueryClient } = Route.useRouteContext();
  const isLocalPracticeRoute = useRouterState({
    select: (state) => state.location.pathname.startsWith("/practice"),
  });
  const app = <App />;

  // Convex Auth reads its token from localStorage in an effect, so the server
  // and the hydration render signed out, and both renders agree.
  return (
    <RootDocument>
      {isLocalPracticeRoute ? (
        app
      ) : (
        <ConvexAuthProvider client={convexQueryClient.convexClient}>
          {app}
        </ConvexAuthProvider>
      )}
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
