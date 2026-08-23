import { createFileRoute } from "@tanstack/react-router";

import { NewGamePage } from "../components/NewGamePage";

export const Route = createFileRoute("/new")({
  component: NewGameRoute,
});

function NewGameRoute() {
  return <NewGamePage />;
}
