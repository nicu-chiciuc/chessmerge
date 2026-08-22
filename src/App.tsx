import { useQuery, useConvexAuth } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  const [isMounted, setIsMounted] = useState(false);
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isGameRoute =
    isMounted &&
    (pathname.startsWith("/game") || pathname.startsWith("/practice"));

  useEffect(() => {
    // Cloudflare serves the prerendered root shell for direct SPA route loads.
    // Read route-dependent header state only after that shell has hydrated.
    setIsMounted(true);
  }, []);

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
        <AuthButton />
      </header>
      <main>
        <Content />
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
