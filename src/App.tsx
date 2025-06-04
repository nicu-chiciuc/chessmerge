import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { AppRoutes } from "./routes";
import { useLocation, useNavigate } from "react-router-dom";
import { EmailSubscribe } from "./components/EmailSubscribe";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isGameRoute = location.pathname.startsWith("/game/");

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-primary">ChessMerge</h2>
          {isGameRoute && (
            <button
              onClick={() => void navigate("/")}
              className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors"
            >
              ← Back to Lobby
            </button>
          )}
        </div>
        <SignOutButton />
      </header>
      <main className="flex-1 p-4">
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

  return (
    <div className="max-w-6xl mx-auto">
      <Authenticated>
        <AppRoutes />
      </Authenticated>

      <Unauthenticated>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-primary mb-4">ChessMerge</h1>
            <p className="text-xl mb-2">
              Chess with a twist - merge and unmerge pieces!
            </p>
            <p className="text-gray-600">
              Sign in to start playing this innovative chess variant
            </p>
          </div>
          <SignInForm />
          <div className="w-full max-w-md">
            <EmailSubscribe />
          </div>
        </div>
      </Unauthenticated>
    </div>
  );
}
