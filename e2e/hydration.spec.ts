import { expect, test } from "@playwright/test";

const directRoutes = [
  { path: "/", showsLobbyButton: false },
  { path: "/practice", showsLobbyButton: true },
  { path: "/game/smoke-game-id", showsLobbyButton: true },
] as const;

test.describe("production deep links", () => {
  for (const { path, showsLobbyButton } of directRoutes) {
    test(`${path} hydrates without browser errors`, async ({ page }) => {
      const browserErrors: string[] = [];

      await page.routeWebSocket(/\/api\/[^/]+\/sync$/, (socket) => {
        socket.onMessage(() => undefined);
      });
      page.on("console", (message) => {
        if (message.type() === "error") {
          browserErrors.push(message.text());
        }
      });
      page.on("pageerror", (error) => {
        browserErrors.push(error.message);
      });

      const response = await page.goto(path);

      expect(response?.status()).toBe(200);
      await expect(
        page.getByRole("heading", { name: "ChessMerge" }),
      ).toBeVisible();

      const lobbyButton = page.getByRole("button", { name: "Lobby" });
      if (showsLobbyButton) {
        await expect(lobbyButton).toBeVisible();
      } else {
        await expect(lobbyButton).toHaveCount(0);
      }

      expect(browserErrors).toEqual([]);
    });
  }
});
