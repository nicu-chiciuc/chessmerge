import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "./ui/button";

interface EmailSubscribeProps {
  compact?: boolean;
  hideCard?: boolean;
}

export function EmailSubscribe({ compact = false, hideCard = false }: EmailSubscribeProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  const subscribe = useMutation(api.emailSubscriptions.subscribe);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const result = await subscribe({ email });
      if (result.success) {
        setStatus("success");
        setMessage(result.message);
        setEmail("");
      } else {
        setStatus("error");
        setMessage(result.message);
      }
    } catch (error) {
      setStatus("error");
      setMessage("Something went wrong. Please try again later.");
    }
  };

  const formContent = (
    <>
      {!compact && <h3 className="text-lg font-semibold mb-2">Stay Updated</h3>}
      <p
        className={`text-gray-600 ${compact ? "text-xs mb-3" : "text-sm mb-4"}`}
      >
        Get notified about new features and updates to ChessMerge!
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className={`w-full px-3 ${compact ? "py-1.5 text-sm" : "py-2"} border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50`}
            required
            disabled={status === "loading" || status === "success"}
          />
        </div>

        <Button
          type="submit"
          disabled={status === "loading" || status === "success"}
        >
          {status === "loading" ? "Subscribing..." : "Subscribe"}
        </Button>
      </form>

      {message && (
        <div
          className={`mt-3 ${compact ? "text-xs" : "text-sm"} ${status === "success" ? "text-green-600" : "text-red-600"}`}
        >
          {message}
        </div>
      )}
    </>
  );

  if (hideCard) {
    return <>{formContent}</>;
  }

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border ${compact ? "p-4" : "p-6"} w-full`}
    >
      {formContent}
    </div>
  );
}
