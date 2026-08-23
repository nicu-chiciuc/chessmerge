import { useAuthActions } from "@convex-dev/auth/react";
import { useNavigate } from "@tanstack/react-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState, type RefObject } from "react";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ChallengeBoardPreview } from "./ChallengeBoardPreview";
import { resolveChallengeView, type ChallengeView } from "./challenge-view";

type PageView = ChallengeView | { kind: "loading" };
type JoinState =
  | { kind: "failed"; message: string }
  | { kind: "idle" }
  | { kind: "joining" }
  | { kind: "waitingForAuth" };
type CancelState =
  | { kind: "canceling" }
  | { kind: "failed"; message: string }
  | { kind: "idle" };

export function ChallengePage({ challengeId }: { challengeId: string }) {
  const navigate = useNavigate();
  const challenge = useQuery(api.challenges.getChallenge, { challengeId });
  const joinChallenge = useMutation(api.challenges.joinChallenge);
  const cancelChallenge = useMutation(api.challenges.cancelChallenge);
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn } = useAuthActions();
  const [now, setNow] = useState(() => Date.now());
  const [joinState, setJoinState] = useState<JoinState>({ kind: "idle" });
  const [cancelState, setCancelState] = useState<CancelState>({ kind: "idle" });
  const [showCancel, setShowCancel] = useState(false);
  const [copiedItem, setCopiedItem] = useState<"agent" | "link" | null>(null);
  const [shareError, setShareError] = useState("");
  const [locallyUnavailable, setLocallyUnavailable] = useState(false);
  const signInStarted = useRef(false);
  const joinStarted = useRef(false);
  const copyButton = useRef<HTMLButtonElement>(null);
  const joinButton = useRef<HTMLButtonElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const keepWaitingButton = useRef<HTMLButtonElement>(null);
  const unavailableButton = useRef<HTMLButtonElement>(null);
  const previousView = useRef<PageView["kind"]>("loading");
  const previousCancelPrompt = useRef(false);

  const canonicalUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/challenge/${encodeURIComponent(challengeId)}`;
  const agentInvite = `Open this ChessMerge challenge, join as a guest, and play against me: ${canonicalUrl}`;
  const canShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";
  const view: PageView = locallyUnavailable
    ? { kind: "unavailable" }
    : challenge === undefined
      ? { kind: "loading" }
      : resolveChallengeView(challenge, now);
  const gameId = view.kind === "game" ? view.gameId : null;

  // The public query returns a usable view only after Convex normalizes this raw route value.
  const normalizedChallengeId: Id<"challenges"> | null =
    view.kind === "creator" || view.kind === "guest"
      ? (challengeId as Id<"challenges">)
      : null;

  useEffect(() => {
    if (challenge?.status !== "waiting") return;

    const currentTime = Date.now();
    setNow(currentTime);
    const remaining = challenge.expiresAt - currentTime;
    if (remaining <= 0) return;

    const timeout = window.setTimeout(
      () => setNow(Date.now()),
      Math.min(remaining + 1, 2_147_483_647),
    );
    return () => window.clearTimeout(timeout);
  }, [challenge?.expiresAt, challenge?.status]);

  useEffect(() => {
    if (!gameId) return;
    void navigate({
      to: "/game/$gameId",
      params: { gameId },
      replace: true,
    });
  }, [gameId, navigate]);

  useEffect(() => {
    const viewChanged = previousView.current !== view.kind;
    const promptChanged = previousCancelPrompt.current !== showCancel;
    previousView.current = view.kind;
    previousCancelPrompt.current = showCancel;
    if (!viewChanged && !promptChanged) return;

    const frame = window.requestAnimationFrame(() => {
      if (view.kind === "unavailable") unavailableButton.current?.focus();
      if (view.kind === "guest" && viewChanged) joinButton.current?.focus();
      if (view.kind !== "creator") return;
      if (showCancel) keepWaitingButton.current?.focus();
      else if (promptChanged) cancelButton.current?.focus();
      else if (viewChanged) copyButton.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [showCancel, view.kind]);

  useEffect(() => {
    if (
      joinState.kind !== "waitingForAuth" ||
      isLoading ||
      view.kind !== "guest" ||
      !normalizedChallengeId
    ) {
      return;
    }

    if (!isAuthenticated) {
      if (signInStarted.current) return;
      signInStarted.current = true;
      void signIn("anonymous").catch((error: unknown) => {
        console.error("Anonymous sign-in failed", error);
        setJoinState({
          kind: "failed",
          message: "Could not start a guest session. Try again.",
        });
      });
      return;
    }

    if (joinStarted.current) return;
    joinStarted.current = true;
    setJoinState({ kind: "joining" });
    void joinChallenge({ challengeId: normalizedChallengeId }).catch(
      (error: unknown) => {
        console.error("Challenge join failed", error);
        setLocallyUnavailable(true);
      },
    );
  }, [
    isAuthenticated,
    isLoading,
    joinChallenge,
    joinState.kind,
    normalizedChallengeId,
    signIn,
    view.kind,
  ]);

  const beginJoin = () => {
    signInStarted.current = false;
    joinStarted.current = false;
    setJoinState({ kind: "waitingForAuth" });
  };

  const copyLink = async () => {
    setShareError("");
    setCopiedItem(null);
    try {
      await copyText(canonicalUrl);
      setCopiedItem("link");
    } catch (error: unknown) {
      console.error("Challenge link copy failed", error);
      setShareError("Select the challenge link and copy it.");
    }
  };

  const copyAgentInvite = async () => {
    setShareError("");
    setCopiedItem(null);
    try {
      await copyText(agentInvite);
      setCopiedItem("agent");
    } catch (error: unknown) {
      console.error("Agent invite copy failed", error);
      setShareError("Copy the challenge link and send it to your agent.");
    }
  };

  const shareLink = async () => {
    if (!canShare) return;
    setShareError("");
    try {
      await navigator.share({
        title: "ChessMerge challenge",
        text: "Join my untimed ChessMerge challenge.",
        url: canonicalUrl,
      });
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Challenge sharing failed", error);
      setShareError("Could not open sharing. Copy the link instead.");
    }
  };

  const confirmCancel = async () => {
    if (!normalizedChallengeId || cancelState.kind === "canceling") return;
    setCancelState({ kind: "canceling" });
    try {
      await cancelChallenge({ challengeId: normalizedChallengeId });
      setLocallyUnavailable(true);
    } catch (error: unknown) {
      console.error("Challenge cancellation failed", error);
      setCancelState({
        kind: "failed",
        message: "Could not cancel challenge. Try again.",
      });
    }
  };

  if (view.kind === "unavailable") {
    return (
      <UnavailableChallenge
        buttonRef={unavailableButton}
        onCreate={() => void navigate({ to: "/new" })}
      />
    );
  }

  if (view.kind === "loading" || view.kind === "game") {
    return (
      <div className="grid min-h-[calc(100vh-4rem)] place-items-center px-4">
        <p
          className="font-mono text-xs text-muted-foreground"
          aria-live="polite"
        >
          {view.kind === "game" ? "Opening game…" : "Opening challenge…"}
        </p>
      </div>
    );
  }

  const pendingJoin =
    joinState.kind === "waitingForAuth" || joinState.kind === "joining";

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="mx-auto grid w-full max-w-6xl gap-7 px-3 py-6 sm:px-6 md:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] md:items-center md:gap-10 md:py-12">
        <ChallengeBoardPreview />
        <article
          className="order-first min-w-0 rounded-xl border bg-card p-5 shadow-lg sm:p-8 md:order-last"
          aria-labelledby={
            view.kind === "creator" ? "waiting-title" : "join-title"
          }
        >
          {view.kind === "creator" ? (
            <>
              <h1
                id="waiting-title"
                className="font-serif text-[clamp(1.9rem,5vw,3rem)] leading-[1.08] tracking-tight"
              >
                Waiting for an opponent
              </h1>
              <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <span
                  className="size-2 rounded-full bg-emerald-700"
                  aria-hidden="true"
                />
                No one has joined yet.
              </p>
              <div className="my-5 grid gap-2" aria-label="Challenge seats">
                <PlayerSlot symbol="Y" name="You" detail="Challenge creator" />
                <PlayerSlot symbol="?" name="Guest" detail="Open seat" empty />
              </div>
              <label
                className="mb-2 block text-sm font-medium"
                htmlFor="challenge-link"
              >
                Challenge link
              </label>
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto]">
                <input
                  id="challenge-link"
                  className="min-w-0 rounded-l-md border bg-background px-3 py-2 font-mono text-xs text-ellipsis outline-none focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={canonicalUrl}
                  readOnly
                />
                <Button
                  ref={copyButton}
                  type="button"
                  variant="outline"
                  className="rounded-l-none border-l-0"
                  onClick={() => void copyLink()}
                >
                  {copiedItem === "link" ? "Link copied" : "Copy link"}
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {canShare ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void shareLink()}
                  >
                    Share
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void copyAgentInvite()}
                >
                  {copiedItem === "agent"
                    ? "Agent invite copied"
                    : "Copy for agent"}
                </Button>
                <Button
                  ref={cancelButton}
                  type="button"
                  variant="link"
                  className="text-destructive"
                  onClick={() => {
                    setCancelState({ kind: "idle" });
                    setShowCancel(true);
                  }}
                >
                  Cancel challenge
                </Button>
              </div>
              {showCancel ? (
                <div className="mt-4 rounded-lg border border-destructive/35 bg-destructive/5 p-3">
                  <p className="text-sm text-destructive">
                    Cancel this challenge? The link will stop working.
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Button
                      ref={keepWaitingButton}
                      type="button"
                      variant="outline"
                      disabled={cancelState.kind === "canceling"}
                      onClick={() => setShowCancel(false)}
                    >
                      Keep waiting
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={cancelState.kind === "canceling"}
                      onClick={() => void confirmCancel()}
                    >
                      {cancelState.kind === "canceling"
                        ? "Canceling…"
                        : "Cancel challenge"}
                    </Button>
                  </div>
                  {cancelState.kind === "failed" ? (
                    <p className="mt-3 text-sm text-destructive" role="alert">
                      {cancelState.message}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {shareError ? (
                <p className="mt-3 text-sm text-destructive" role="alert">
                  {shareError}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <h1
                id="join-title"
                className="font-serif text-[clamp(1.9rem,5vw,3rem)] leading-[1.08] tracking-tight"
              >
                Join this challenge
              </h1>
              <div
                className="my-5 flex gap-2 font-mono text-[0.7rem] text-muted-foreground"
                aria-label="Game format"
              >
                <span className="rounded-full border bg-muted/40 px-2.5 py-1.5">
                  Casual
                </span>
                <span className="rounded-full border bg-muted/40 px-2.5 py-1.5">
                  Untimed
                </span>
              </div>
              <div className="mb-5 grid gap-2" aria-label="Challenge seats">
                <PlayerSlot symbol="H" name="Host" detail="Challenge creator" />
                <PlayerSlot symbol="G" name="Guest" detail="Open seat" empty />
              </div>
              <Button
                ref={joinButton}
                type="button"
                size="lg"
                className="w-full"
                disabled={pendingJoin}
                onClick={beginJoin}
              >
                {pendingJoin ? "Joining…" : "Join as guest"}
              </Button>
              {joinState.kind === "failed" ? (
                <p
                  className="mt-4 text-sm text-destructive [overflow-wrap:anywhere]"
                  role="alert"
                >
                  {joinState.message}
                </p>
              ) : null}
            </>
          )}
        </article>
      </div>
    </div>
  );
}

function PlayerSlot({
  detail,
  empty = false,
  name,
  symbol,
}: {
  detail: string;
  empty?: boolean;
  name: string;
  symbol: string;
}) {
  return (
    <div className="grid min-h-14 min-w-0 grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-3 rounded-lg border bg-background px-3 py-2">
      <span
        className={
          empty
            ? "grid size-8 place-items-center rounded-full border border-dashed text-sm text-muted-foreground"
            : "grid size-8 place-items-center rounded-full bg-foreground font-serif text-sm font-bold text-background"
        }
        aria-hidden="true"
      >
        {symbol}
      </span>
      <span className="min-w-0">
        <strong className="block text-sm">{name}</strong>
        <small className="block text-xs text-muted-foreground">{detail}</small>
      </span>
    </div>
  );
}

function UnavailableChallenge({
  buttonRef,
  onCreate,
}: {
  buttonRef: RefObject<HTMLButtonElement | null>;
  onCreate: () => void;
}) {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] place-items-center px-3 py-8">
      <article className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-lg sm:p-8">
        <h1 className="font-serif text-3xl leading-tight tracking-tight sm:text-4xl">
          Challenge unavailable
        </h1>
        <p className="mt-3 text-muted-foreground">
          This link can&apos;t be used. It may have expired, been canceled, or
          already have an opponent.
        </p>
        <Button
          ref={buttonRef}
          type="button"
          size="lg"
          className="mt-6 w-full"
          onClick={onCreate}
        >
          Create a challenge
        </Button>
      </article>
    </div>
  );
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const field = document.createElement("textarea");
  field.value = text;
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied) throw new Error("Copy failed");
}
