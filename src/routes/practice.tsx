import { createFileRoute } from "@tanstack/react-router";

import { LocalPracticePage } from "../components/LocalPracticePage";

export const Route = createFileRoute("/practice")({
  validateSearch: (search: Record<string, unknown>): { gameState?: string } =>
    typeof search.gameState === "string" ? { gameState: search.gameState } : {},
  component: LocalPracticePage,
});
