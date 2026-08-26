import { expect, test, type Page } from "@playwright/test";

import { boardToString, stringToBoard } from "../lib/chessmerge";

const chosenSetup = "4k3/8/8/8/8/8/4P3/4K3 b - - 0 1";
const serializedChosenSetup = "4k3/8/8/8/8/8/4P3/4K3_b_-_-_0_1";
const promotionSetup = "k7/4P3/8/8/8/8/8/4K3 w - - 0 1";
const mergedPieceSetup = "4k3/8/8/3R:N4/8/8/8/4K3 w - - 0 1";

test.describe("Sandbox", () => {
  test("keeps board text and the visual board in sync", async ({ page }) => {
    const editedBoard = [
      ". . . . k . . .",
      ". . . . . . . .",
      ". . . . . . . .",
      ". . . . . . . .",
      "RN . . . . . . .",
      ". . . . . . . .",
      ". . . . . . . .",
      ". . . . K . . .",
    ].join("\n");

    await page.goto("/practice");
    await expect(page.getByRole("heading", { name: "Sandbox" })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByText("Advanced", { exact: true }).click();

    const boardText = page.getByLabel("Board text");

    await square(page, "e2").click();
    await square(page, "e3").click();
    await expect(boardText).toHaveValue(/\.  \.  \.  \.  P  \.  \.  \. /);
    await expect(page.getByLabel("FEMN position")).toHaveValue(
      / b KQkq - 1 1$/,
    );

    await boardText.fill(editedBoard);
    await expect(square(page, "a4")).toHaveAttribute(
      "aria-label",
      /white rook and white knight/i,
    );
    await expect(page.getByText("Black to move")).toBeVisible();
    await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
    await expect(page.getByLabel("FEMN position")).toHaveValue(
      "4k3/8/8/8/R:N7/8/8/4K3 b KQkq - 1 1",
    );

    const invalidBoard = editedBoard.replace("RN", "X");
    await boardText.fill(invalidBoard);
    await expect(page.getByRole("alert")).toHaveText(
      "The board contains an unknown piece. Use ., p, r, n, b, q, or k.",
    );
    await expect(square(page, "a4")).toHaveAttribute(
      "aria-label",
      /white rook and white knight/i,
    );
    await boardText.blur();
    await expect(boardText).toHaveValue(
      boardToString(stringToBoard(editedBoard)),
    );
    await expect(page.getByRole("alert")).toHaveCount(0);

    await square(page, "e8").click();
    await square(page, "e7").click();
    await expect(boardText).toHaveValue(/\.  \.  \.  \.  k  \.  \.  \. /);
    await expect(page.getByRole("alert")).toHaveCount(0);

    await page.setViewportSize({ width: 320, height: 800 });
    await expect
      .poll(() =>
        page.evaluate(() => ({
          innerWidth: window.innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
        })),
      )
      .toEqual({ innerWidth: 320, scrollWidth: 320 });
  });

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

  test("edits and shares a chosen setup while moves stay local", async ({
    context,
    page,
  }) => {
    await page.goto("/practice");
    await expect(page.getByRole("heading", { name: "Sandbox" })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByText("Advanced", { exact: true }).click();
    const femnPosition = page.getByLabel("FEMN position");
    await femnPosition.fill(chosenSetup);

    await expect(page.getByText("Black to move")).toBeVisible();
    await expect(square(page, "e8")).toHaveAttribute(
      "aria-label",
      /black king/i,
    );
    await expect(page.getByLabel("Board text")).toHaveValue(
      /\.  \.  \.  \.  P  \.  \.  \. /,
    );
    await expect
      .poll(() => new URL(page.url()).searchParams.get("gameState"))
      .toBe(serializedChosenSetup);
    await expect(
      page.getByRole("button", { name: "Use current board" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Apply position" }),
    ).toHaveCount(0);

    await femnPosition.fill("not a position");
    await expect(page.getByRole("alert")).toHaveText(
      "Enter a full FEMN position with a board, turn, castling rights, and move counts.",
    );
    await femnPosition.blur();
    await expect(femnPosition).toHaveValue(chosenSetup);
    await expect(page.getByRole("alert")).toHaveCount(0);

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

  test("drags single pieces but requires controls for merged pieces", async ({
    page,
  }) => {
    await page.goto("/practice");
    await expect(page.getByRole("heading", { name: "Sandbox" })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByText("Advanced", { exact: true }).click();
    await page.getByLabel("FEMN position").fill(mergedPieceSetup);

    const whiteKing = square(page, "e1").locator('[draggable="true"]');
    await expect(whiteKing).toHaveCount(1);
    await whiteKing.dragTo(square(page, "e2"));
    await expect(square(page, "e2")).toHaveAttribute(
      "aria-label",
      /white king/i,
    );

    await page.getByRole("button", { name: "Reset" }).click();

    const mergedSquare = square(page, "d5");
    await expect(mergedSquare.locator('[draggable="true"]')).toHaveCount(0);
    await expect(mergedSquare.locator('img[draggable="false"]')).toHaveCount(2);

    await mergedSquare.click();
    await expect(
      page.getByRole("button", { name: "Move only the white rook" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Move only the white knight" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Move both the white rook and white knight",
      }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Move only the white knight" })
      .click();
    await expect(square(page, "f6")).toHaveAttribute("data-legal-move", "true");
    await square(page, "f6").click();
    await expect(square(page, "d5")).toHaveAttribute(
      "aria-label",
      /white rook/i,
    );
    await expect(square(page, "f6")).toHaveAttribute(
      "aria-label",
      /white knight/i,
    );
  });
});

function square(page: Page, name: string) {
  return page.locator(`button[data-square="${name}"]`);
}
