import { createFileRoute } from "@tanstack/react-router";

import { SettingsPage } from "../components/SettingsPage";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Account settings | ChessMerge" },
      {
        name: "description",
        content: "View or delete your ChessMerge account.",
      },
    ],
  }),
  component: SettingsPage,
});
