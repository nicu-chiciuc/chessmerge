import { createFileRoute } from "@tanstack/react-router";
import type { Id } from "../../convex/_generated/dataModel";

import { ChessGameWrapper } from "../components/ChessGame";

export const Route = createFileRoute("/game/$gameId")({
  component: GameRoute,
});

function GameRoute() {
  const { gameId: rawGameId } = Route.useParams();
  const gameId = parseGameId(rawGameId);

  if (!gameId) {
    return <div>Invalid game ID format</div>;
  }

  return <ChessGameWrapper gameId={gameId} />;
}

function parseGameId(value: string): Id<"games"> | null {
  if (value.length === 0 || !/^[a-zA-Z0-9_-]+$/.test(value)) {
    return null;
  }
  return value as Id<"games">;
}
