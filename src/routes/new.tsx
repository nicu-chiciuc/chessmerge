import { createFileRoute } from "@tanstack/react-router";

import { NewGamePage } from "../components/NewGamePage";
import { useIsAuthenticated } from "../lib/auth-state-context";

export const Route = createFileRoute("/new")({
  component: NewGameRoute,
});

function NewGameRoute() {
  const isAuthenticated = useIsAuthenticated();
  return <NewGamePage isAuthenticated={isAuthenticated} />;
}
