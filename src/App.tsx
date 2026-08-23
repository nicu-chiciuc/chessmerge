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

  if (isAuthenticated && loggedInUser) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">{loggedInUser.email}</span>
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
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-primary">ChessMerge</h2>
          {isGameRoute && (
            <Button
              variant="outline"
              onClick={() => void navigate({ to: "/" })}
            >
              ← Lobby
            </Button>
          )}
        </div>
        {!isLocalPracticeRoute && <AuthButton />}
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
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isAuthenticated = loggedInUser !== null;

  return (
    <div className="max-w-6xl mx-auto">
      <AuthStateContext.Provider value={isAuthenticated}>
        <Outlet />
      </AuthStateContext.Provider>
    </div>
  );
}
