import { createFileRoute } from "@tanstack/react-router";

import { GameLobby } from "../components/GameLobby";
import { useIsAuthenticated } from "../lib/auth-state-context";

export const Route = createFileRoute("/")({
  component: LobbyRoute,
});

function LobbyRoute() {
  const isAuthenticated = useIsAuthenticated();
  return <GameLobby isAuthenticated={isAuthenticated} />;
}
