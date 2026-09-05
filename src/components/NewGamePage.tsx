import { useAuthActions } from "@convex-dev/auth/react";
import { useNavigate } from "@tanstack/react-router";
import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useRef, useState } from "react";

import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ChallengeBoardPreview } from "./ChallengeBoardPreview";

type CreateState =
  | { kind: "creating" }
  | { kind: "failed"; message: string }
  | { kind: "idle" }
  | { kind: "waitingForAuth" };

export function NewGamePage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn } = useAuthActions();
  const createChallenge = useMutation(api.challenges.createChallenge);
  const [state, setState] = useState<CreateState>({ kind: "idle" });
  const signInStarted = useRef(false);
  const creationStarted = useRef(false);
  const createButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() =>
      createButton.current?.focus(),
    );
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (state.kind !== "waitingForAuth" || isLoading) return;

    if (!isAuthenticated) {
      if (signInStarted.current) return;

      signInStarted.current = true;
      void signIn("anonymous").catch((error: unknown) => {
        console.error("Anonymous sign-in failed", error);
        setState({
          kind: "failed",
          message: "Could not start a guest session. Try again.",
        });
      });
      return;
    }

    if (creationStarted.current) return;

    creationStarted.current = true;
    setState({ kind: "creating" });
    void createChallenge({})
      .then(({ challengeId }) => {
        void navigate({
          to: "/challenge/$challengeId",
          params: { challengeId },
        });
      })
      .catch((error: unknown) => {
        console.error("Challenge creation failed", error);
        creationStarted.current = false;
        setState({
          kind: "failed",
          message: "Could not create challenge. Try again.",
        });
      });
  }, [
    createChallenge,
    isAuthenticated,
    isLoading,
    navigate,
    signIn,
    state.kind,
  ]);

  const create = () => {
    signInStarted.current = false;
    creationStarted.current = false;
    setState({ kind: "waitingForAuth" });
  };

  const isPending =
    state.kind === "waitingForAuth" || state.kind === "creating";

  return (
    <div className="flex-1 bg-background">
      <div className="mx-auto grid w-full max-w-6xl gap-7 px-3 py-6 sm:px-6 md:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] md:items-center md:gap-10 md:py-12">
        <ChallengeBoardPreview />
        <article
          className="order-first min-w-0 rounded-xl border bg-card p-5 shadow-lg sm:p-8 md:order-last"
          aria-labelledby="create-title"
        >
          <div>
            <h1
              id="create-title"
              className="font-serif text-[clamp(1.9rem,5vw,3rem)] leading-[1.08] tracking-tight"
            >
              Challenge a friend
            </h1>
            <p className="mt-3 text-muted-foreground">
              Create an untimed game and send one link.
            </p>
            <div
              className="my-5 flex flex-wrap gap-2 font-mono text-[0.7rem] text-muted-foreground"
              aria-label="Game format"
            >
              <span className="rounded-full border bg-muted/40 px-2.5 py-1.5">
                Casual
              </span>
              <span className="rounded-full border bg-muted/40 px-2.5 py-1.5">
                Untimed
              </span>
            </div>
            <Button
              ref={createButton}
              type="button"
              size="lg"
              className="w-full"
              disabled={isPending}
              onClick={create}
            >
              {isPending ? "Creating…" : "Create challenge"}
            </Button>
            {state.kind === "failed" ? (
              <p
                className="mt-4 text-sm text-destructive [overflow-wrap:anywhere]"
                role="alert"
              >
                {state.message}
              </p>
            ) : null}
          </div>
        </article>
      </div>
    </div>
  );
}
