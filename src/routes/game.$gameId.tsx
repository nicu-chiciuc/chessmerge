import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { useEffect, useRef } from "react";

import { api } from "../../convex/_generated/api";
import { ChessGameWrapper } from "../components/ChessGame";
import { Button } from "../components/ui/button";

export const Route = createFileRoute("/game/$gameId")({
  component: GameRoute,
});

function GameRoute() {
  const { gameId } = Route.useParams();
  const navigate = useNavigate();
  const { isLoading } = useConvexAuth();
  const game = useQuery(api.gameLogic.getGame, { gameId });
  const heading = useRef<HTMLHeadingElement>(null);
  const observedRematch = useRef<{ gameId: string; ready: boolean } | null>(
    null,
  );
  const rematchGameId =
    game?.rematch?.status === "ready" ? game.rematch.gameId : null;
  const focusState =
    isLoading || game === undefined
      ? "loading"
      : game === null
        ? "unavailable"
        : "ready";

  useEffect(() => {
    if (focusState === "loading") return;
    heading.current?.focus();
  }, [focusState, gameId]);

  useEffect(() => {
    if (!game) return;

    const previous = observedRematch.current;
    const ready = rematchGameId !== null;
    observedRematch.current = { gameId, ready };
    if (!rematchGameId || previous?.gameId !== gameId || previous.ready) {
      return;
    }

    void navigate({
      to: "/game/$gameId",
      params: { gameId: rematchGameId },
      replace: true,
    });
  }, [game, gameId, navigate, rematchGameId]);

  if (isLoading || game === undefined) {
    return (
      <p className="p-4 text-sm text-muted-foreground" aria-live="polite">
        Opening game…
      </p>
    );
  }

  if (game == null) {
    return (
      <div className="grid min-h-[calc(100vh-4rem)] place-items-center px-3 py-8">
        <article className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-lg sm:p-8">
          <h1
            ref={heading}
            tabIndex={-1}
            className="font-serif text-3xl leading-tight tracking-tight sm:text-4xl"
          >
            Game unavailable
          </h1>
          <p className="mt-3 text-muted-foreground">
            This link doesn&apos;t point to an available game.
          </p>
          <div className="mt-6 grid gap-2 min-[420px]:grid-cols-2">
            <Button
              type="button"
              size="lg"
              onClick={() => void navigate({ to: "/new" })}
            >
              Create challenge
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={() => void navigate({ to: "/" })}
            >
              Lobby
            </Button>
          </div>
        </article>
      </div>
    );
  }

  return (
    <>
      <h1 ref={heading} tabIndex={-1} className="sr-only">
        {game.playerColor === null ? "Watching chess game" : "Chess game"}
      </h1>
      <ChessGameWrapper game={game} />
    </>
  );
}
