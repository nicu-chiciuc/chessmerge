import { expect, test, type WebSocketRoute } from "@playwright/test";

const isHydrationSmoke = process.env.CHESSMERGE_E2E_SMOKE === "1";
const directRoutes = [
  { path: "/", showsLobbyButton: false },
  { path: "/practice", showsLobbyButton: true },
  {
    path: "/game/not-a-convex-id",
    showsLobbyButton: true,
    expectedHeading: "Game unavailable",
  },
  { path: "/challenge/not-a-convex-id", showsLobbyButton: false },
] as const;

test.describe("production deep links", () => {
  for (const route of directRoutes) {
    const { path, showsLobbyButton } = route;
    test(`${path} hydrates without browser errors`, async ({ page }) => {
      const browserErrors: string[] = [];

      const useRealBackend = "expectedHeading" in route && !isHydrationSmoke;
      if (!useRealBackend) {
        await page.routeWebSocket(
          /\/api\/[^/]+\/sync$/,
          "expectedHeading" in route
            ? replyToQueriesWithNull
            : (socket) => socket.onMessage(() => undefined),
        );
      }
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

      if ("expectedHeading" in route) {
        await expect(
          page.getByRole("heading", { name: route.expectedHeading }),
        ).toBeVisible();
      }

      expect(browserErrors).toEqual([]);
    });
  }
});

function replyToQueriesWithNull(socket: WebSocketRoute) {
  socket.onMessage((message) => {
    if (typeof message !== "string") return;
    const request = JSON.parse(message) as QuerySetRequest;
    if (request.type !== "ModifyQuerySet") return;
    const queryIds = request.modifications
      .filter((modification) => modification.type === "Add")
      .map((modification) => modification.queryId);
    if (queryIds.length === 0) return;

    socket.send(
      JSON.stringify({
        type: "Transition",
        startVersion: {
          querySet: request.baseVersion,
          ts: "AAAAAAAAAAA=",
          identity: 0,
        },
        endVersion: {
          querySet: request.newVersion,
          ts: "AAAAAAAAAAA=",
          identity: 0,
        },
        modifications: queryIds.map((queryId) => ({
          type: "QueryUpdated",
          queryId,
          value: null,
          logLines: [],
          journal: null,
        })),
      }),
    );
  });
}

type QuerySetRequest = {
  type: string;
  baseVersion: number;
  newVersion: number;
  modifications: Array<{ type: string; queryId: number }>;
};
