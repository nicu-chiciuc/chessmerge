import { useQuery, useConvexAuth } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import {
  Outlet,
  Link,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { useEffect, useRef } from "react";
import { SamebaseAttribution } from "./components/SamebaseAttribution";
import { Button } from "./components/ui/button";
import { AuthStateContext } from "./lib/auth-state-context";

type LoggedInUser = { name: string } | null | undefined;

function AuthButton({
  isAuthenticated,
  loggedInUser,
}: {
  isAuthenticated: boolean;
  loggedInUser: LoggedInUser;
}) {
  const { signOut } = useAuthActions();
  const navigate = useNavigate();

  if (isAuthenticated) {
    const identity = loggedInUser?.name ?? "Guest";

    return (
      <div className="flex min-w-0 max-w-full items-center gap-2 sm:gap-3">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="min-w-0 max-w-28 px-2 text-gray-600 sm:max-w-56"
        >
          <Link to="/settings" title={`${identity} settings`}>
            <span className="block min-w-0 truncate">{identity}</span>
          </Link>
        </Button>
        <Button onClick={() => void signOut()}>Sign out</Button>
      </div>
    );
  }

  return (
    <Button onClick={() => void navigate({ to: "/login" })}>Sign in</Button>
  );
}

function AccountControls() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const staleSignOutStarted = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      staleSignOutStarted.current = false;
      return;
    }
    if (isLoading || loggedInUser !== null || staleSignOutStarted.current) {
      return;
    }

    staleSignOutStarted.current = true;
    void signOut();
  }, [isAuthenticated, isLoading, loggedInUser, signOut]);

  return (
    <AuthButton isAuthenticated={isAuthenticated} loggedInUser={loggedInUser} />
  );
}

export default function App() {
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isGameRoute =
    pathname.startsWith("/game") || pathname.startsWith("/practice");

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 flex min-h-16 flex-wrap items-center gap-2 border-b bg-white/80 px-2 py-2 shadow-sm backdrop-blur-sm sm:h-16 sm:flex-nowrap sm:gap-4 sm:px-4 sm:py-0">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <h2 className="shrink-0 text-lg font-semibold text-primary sm:text-xl">
            ChessMerge
          </h2>
          {isGameRoute && (
            <Button
              variant="outline"
              onClick={() => void navigate({ to: "/" })}
            >
              ← Lobby
            </Button>
          )}
        </div>
        <div className="ml-auto min-w-0 max-w-full">
          <AccountControls />
        </div>
      </header>
      <main className="flex flex-1 flex-col">
        <Content />
      </main>
      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 px-3 py-3 text-muted-foreground sm:px-6">
        <p className="py-3 text-xs">
          Pieces adapted from{" "}
          <a
            href="https://commons.wikimedia.org/wiki/Template:SVG_chess_pieces"
            className="underline"
          >
            Cburnett and contributors
          </a>
          {", "}
          <a
            href="https://creativecommons.org/licenses/by-sa/3.0/"
            rel="license"
            className="underline"
          >
            CC BY-SA 3.0
          </a>
          .
        </p>
        <SamebaseAttribution />
      </footer>
      <Toaster />
    </div>
  );
}

function Content() {
  const { isAuthenticated } = useConvexAuth();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col">
      <AuthStateContext.Provider value={isAuthenticated}>
        <Outlet />
      </AuthStateContext.Provider>
    </div>
  );
}
