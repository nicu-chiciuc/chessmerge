import { createFileRoute } from "@tanstack/react-router";

import { UnsubscribePage } from "../components/UnsubscribePage";

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (search: Record<string, unknown>): { token?: string } =>
    typeof search.token === "string" ? { token: search.token } : {},
  component: UnsubscribeRoute,
});

function UnsubscribeRoute() {
  const { token } = Route.useSearch();
  return <UnsubscribePage token={token} />;
}
