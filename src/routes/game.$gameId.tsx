import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useEffect, useRef } from "react";

import { api } from "../../convex/_generated/api";
import { ChessGameWrapper } from "../components/ChessGame";

export const Route = createFileRoute("/game/$gameId")({
  component: GameRoute,
});

function GameRoute() {
  const { gameId } = Route.useParams();
  const game = useQuery(api.gameLogic.getGame, { gameId });
  const invalidGame = game === null;
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, [gameId, invalidGame]);

  if (invalidGame) {
    return (
      <h1 ref={heading} tabIndex={-1} className="p-4 text-xl font-semibold">
        Invalid game link
      </h1>
    );
  }

  return (
    <>
      <h1 ref={heading} tabIndex={-1} className="sr-only">
        Chess game
      </h1>
      {game ? <ChessGameWrapper game={game} /> : null}
    </>
  );
}
