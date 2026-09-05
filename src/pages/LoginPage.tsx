import { SignInForm } from "../SignInForm";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect } from "react";
import { EmailSubscribe } from "../components/EmailSubscribe";

export function LoginPage() {
  const navigate = useNavigate();
  const loggedInUser = useQuery(api.auth.loggedInUser);

  useEffect(() => {
    if (loggedInUser) {
      void navigate({ to: "/" });
    }
  }, [loggedInUser, navigate]);

  // Show loading while checking auth status
  if (loggedInUser === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user is logged in, show nothing while redirecting
  if (loggedInUser) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-start bg-gray-50 px-4 pt-16">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">ChessMerge</h1>
          <p className="text-lg mb-1">
            Chess with a twist - merge and unmerge pieces!
          </p>
          <p className="text-gray-600 mb-3">
            Sign in to start playing this innovative chess variant
          </p>
          <Button
            variant="outline"
            onClick={() => void navigate({ to: "/" })}
            className="mb-3"
          >
            ← Back to Lobby
          </Button>
        </div>

        <SignInForm />

        <div className="w-full">
          <EmailSubscribe />
        </div>
      </div>
    </div>
  );
}
