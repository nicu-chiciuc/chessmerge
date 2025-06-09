import { SignInForm } from "../SignInForm";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { EmailSubscribe } from "../components/EmailSubscribe";

export function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gray-50 px-4 pt-16">
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
            onClick={() => void navigate("/")}
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