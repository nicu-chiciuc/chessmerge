import { createFileRoute } from "@tanstack/react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { useEffect, useRef } from "react";

import { api } from "../../convex/_generated/api";
import { ChessGameWrapper } from "../components/ChessGame";

export const Route = createFileRoute("/game/$gameId")({
  component: GameRoute,
});

function GameRoute() {
  const { gameId } = Route.useParams();
  const { isLoading } = useConvexAuth();
  const game = useQuery(api.gameLogic.getGame, { gameId });
  const heading = useRef<HTMLHeadingElement>(null);
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

  if (isLoading || game === undefined) {
    return (
      <p className="p-4 text-sm text-muted-foreground" aria-live="polite">
        Opening game…
      </p>
    );
  }

  if (game == null) {
    return (
      <h1 ref={heading} tabIndex={-1} className="p-4 text-xl font-semibold">
        Game unavailable
      </h1>
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
