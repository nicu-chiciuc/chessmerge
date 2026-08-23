import { useQuery, useConvexAuth } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import {
  Outlet,
  useHydrated,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { Button } from "./components/ui/button";
import { AuthStateContext } from "./lib/auth-state-context";

function AuthButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (isAuthenticated) {
    const identity = loggedInUser?.name ?? "Guest";

    return (
      <div className="flex min-w-0 max-w-full items-center gap-2 sm:gap-3">
        <span
          className="block min-w-8 max-w-28 truncate text-sm text-gray-600 sm:max-w-56"
          title={identity}
        >
          {identity}
        </span>
        <Button onClick={() => void signOut()}>Sign out</Button>
      </div>
    );
  }

  return (
    <Button onClick={() => void navigate({ to: "/login" })}>Sign in</Button>
  );
}

export default function App() {
  const navigate = useNavigate();
  const isHydrated = useHydrated();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isLocalPracticeRoute = isHydrated && pathname.startsWith("/practice");
  const isGameRoute =
    isHydrated &&
    (pathname.startsWith("/game") || pathname.startsWith("/practice"));

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
        {!isLocalPracticeRoute && (
          <div className="ml-auto min-w-0 max-w-full">
            <AuthButton />
          </div>
        )}
      </header>
      <main>
        {isLocalPracticeRoute ? (
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        ) : (
          <Content />
        )}
      </main>
      <Toaster />
    </div>
  );
}

function Content() {
  const { isAuthenticated } = useConvexAuth();

  return (
    <div className="max-w-6xl mx-auto">
      <AuthStateContext.Provider value={isAuthenticated}>
        <Outlet />
      </AuthStateContext.Provider>
    </div>
  );
}
