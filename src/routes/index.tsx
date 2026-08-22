import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { Id } from "../../convex/_generated/dataModel";

import { GameLobby } from "../components/GameLobby";
import { useIsAuthenticated } from "../lib/auth-state-context";

export const Route = createFileRoute("/")({
  component: LobbyRoute,
});

function LobbyRoute() {
  const isAuthenticated = useIsAuthenticated();
  const navigate = useNavigate();

  const handleJoinGame = (gameId: Id<"games">) => {
    void navigate({ to: "/game/$gameId", params: { gameId } });
  };

  return (
    <GameLobby onJoinGame={handleJoinGame} isAuthenticated={isAuthenticated} />
  );
}
