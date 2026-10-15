import { createFileRoute } from "@tanstack/react-router";

import { GameLobby } from "../components/GameLobby";
import { liveGamesQuery } from "../components/GameLobby.queries";
import { useIsAuthenticated } from "../lib/auth-state-context";

const HOUR = 60 * 60 * 1_000;

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    // Rounded to the hour, so preloads and navigations within the hour reuse
    // one query key and one subscription.
    const activeSince = Math.floor(Date.now() / HOUR) * HOUR - 24 * HOUR;
    await context.queryClient.ensureQueryData(liveGamesQuery(activeSince));
    return activeSince;
  },
  component: LobbyRoute,
});

function LobbyRoute() {
  const isAuthenticated = useIsAuthenticated();
  const activeSince = Route.useLoaderData();
  return (
    <GameLobby isAuthenticated={isAuthenticated} activeSince={activeSince} />
  );
}
