import { expect, test, type Page } from "@playwright/test";

const chosenSetup = "4k3/8/8/8/8/8/4P3/4K3 b - - 0 1";
const serializedChosenSetup = "4k3/8/8/8/8/8/4P3/4K3_b_-_-_0_1";
const promotionSetup = "k7/4P3/8/8/8/8/8/4K3 w - - 0 1";

test.describe("Sandbox", () => {
  test("plays both turns, undoes, and resets without changing the setup URL", async ({
    page,
  }) => {
    const browserErrors: string[] = [];
    const openedWebSockets: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        browserErrors.push(message.text());
      }
    });
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("websocket", (socket) => openedWebSockets.push(socket.url()));

    await page.goto("/practice");

    await expect(page.getByRole("heading", { name: "Sandbox" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("button[data-square]")).toHaveCount(64);
    await expect(square(page, "e2")).toHaveAttribute(
      "aria-label",
      /e2, white pawn/i,
    );
    await expect(page.getByText("White to move")).toBeVisible();

    await square(page, "e2").click();
    await expect(square(page, "e3")).toHaveAttribute("data-legal-move", "true");
    await square(page, "e3").click();
    await expect(page.getByText("Black to move")).toBeVisible();
    expect(new URL(page.url()).searchParams.has("gameState")).toBe(false);

    await square(page, "e7").click();
    await square(page, "e6").click();
    await expect(page.getByText("White to move")).toBeVisible();

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByText("Black to move")).toBeVisible();
    await expect(square(page, "e7")).toHaveAttribute(
      "aria-label",
      /black pawn/i,
    );

    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.getByText("White to move")).toBeVisible();
    await expect(square(page, "e2")).toHaveAttribute(
      "aria-label",
      /white pawn/i,
    );
    await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(browserErrors).toEqual([]);
    expect(openedWebSockets).toEqual([]);
  });

  test("applies and shares a chosen setup while moves stay local", async ({
    context,
    page,
  }) => {
    await page.goto("/practice");
    await expect(page.getByRole("heading", { name: "Sandbox" })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByText("Advanced", { exact: true }).click();
    await page.getByLabel("FEMN position").fill(chosenSetup);
    await page.getByRole("button", { name: "Apply position" }).click();

    await expect
      .poll(() => new URL(page.url()).searchParams.get("gameState"))
      .toBe(serializedChosenSetup);
    await expect(page.getByText("Black to move")).toBeVisible();
    await expect(square(page, "e8")).toHaveAttribute(
      "aria-label",
      /black king/i,
    );

    await square(page, "e8").click();
    await square(page, "e7").click();
    await expect(page.getByText("White to move")).toBeVisible();
    expect(new URL(page.url()).searchParams.get("gameState")).toBe(
      serializedChosenSetup,
    );

    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copy setup link" }).click();
    await expect(page.getByText("Setup link copied.")).toBeVisible();
    const copiedLink = await page.evaluate(() =>
      navigator.clipboard.readText(),
    );
    expect(new URL(copiedLink).searchParams.get("gameState")).toBe(
      serializedChosenSetup,
    );

    await page.reload();
    await expect(page.getByText("Black to move")).toBeVisible({
      timeout: 15_000,
    });
    await expect(square(page, "e8")).toHaveAttribute(
      "aria-label",
      /black king/i,
    );
  });

  test("focuses the promotion choice and locks the board", async ({ page }) => {
    await page.goto("/practice");
    await expect(page.getByRole("heading", { name: "Sandbox" })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByText("Advanced", { exact: true }).click();
    await page.getByLabel("FEMN position").fill(promotionSetup);
    await page.getByRole("button", { name: "Apply position" }).click();
    await square(page, "e7").click();
    await square(page, "e8").click();

    const queenChoice = page.getByRole("button", { name: "Promote to queen" });
    await expect(queenChoice).toBeFocused();
    await expect(page.locator("button[data-square]:disabled")).toHaveCount(64);

    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("dialog", { name: "Choose a promotion piece" }),
    ).toHaveCount(0);
    await expect(square(page, "e8")).toHaveAttribute(
      "aria-label",
      /white queen/i,
    );
    await expect(square(page, "e8")).toBeFocused();
    await expect(square(page, "a8")).toBeEnabled();
    await expect(page.getByText("Black to move")).toBeVisible();
  });
});

function square(page: Page, name: string) {
  return page.locator(`button[data-square="${name}"]`);
}
