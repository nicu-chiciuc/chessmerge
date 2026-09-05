import { expect, test, type Page } from "@playwright/test";

for (const viewport of [
  { width: 1280, height: 1000 },
  { width: 320, height: 800 },
]) {
  test(`keeps the board still through check and selection at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openPosition(page, "4k3/8/8/8/8/8/3r4/R3K3 b - - 0 1");
    const initialBoardTop = await boardTop(page);
    await expect(page.getByRole("status")).toBeEmpty();
    await expect(page.locator("[data-check]")).toHaveCount(0);

    await square(page, "d2").click();
    await square(page, "e2").click();

    const notice = page.getByRole("status");
    await expect(notice).toHaveText("Your king is in check");
    await expect.poll(() => boardTop(page)).toBe(initialBoardTop);
    await expect(square(page, "e1")).toHaveAttribute("data-check", "true");
    await expect(square(page, "e1")).toHaveAccessibleName(
      /white king, in check/,
    );
    await expect(
      page.getByRole("group", { name: "Chess board", exact: true }),
    ).toHaveAccessibleDescription(/Your king is in check/);

    await square(page, "a1").click();
    await expect(square(page, "a1")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("[data-legal-move]")).toHaveCount(0);
    await expect(notice).toContainText(
      "This piece can't resolve check. Choose another piece.",
    );
    await expect(square(page, "e1")).toHaveAttribute("data-check", "true");
    await expect.poll(() => boardTop(page)).toBe(initialBoardTop);
    await expect(notice).toBeInViewport();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(viewport.width);

    await square(page, "e1").click();
    await expect(square(page, "e1")).toHaveAttribute("data-check", "true");
    await expect(notice).toHaveText("Your king is in check");
    await expect.poll(() => boardTop(page)).toBe(initialBoardTop);
    await expect(square(page, "f1")).toHaveAttribute("data-legal-move", "true");
    await square(page, "f1").click();
    await expect(notice).toBeEmpty();
    await expect(page.locator("[data-check]")).toHaveCount(0);
    await expect.poll(() => boardTop(page)).toBe(initialBoardTop);

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(notice).toContainText("Your king is in check");
    await expect(square(page, "e1")).toHaveAttribute("data-check", "true");
    await expect.poll(() => boardTop(page)).toBe(initialBoardTop);
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(notice).toBeEmpty();
    await expect(page.locator("[data-check]")).toHaveCount(0);
    await expect.poll(() => boardTop(page)).toBe(initialBoardTop);
  });
}

for (const response of [
  {
    name: "blocks the attack",
    position: "4r2k/8/8/8/8/8/R7/4K3 w - - 0 1",
    from: "a2",
    to: "e2",
  },
  {
    name: "captures the attacker",
    position: "4r2k/8/8/1B6/8/8/8/4K3 w - - 0 1",
    from: "b5",
    to: "e8",
  },
]) {
  test(`shows a legal response that ${response.name}`, async ({ page }) => {
    await openPosition(page, response.position);
    await expect(square(page, "e1")).toHaveAttribute("data-check", "true");
    await square(page, response.from).click();
    await expect(square(page, response.to)).toHaveAttribute(
      "data-legal-move",
      "true",
    );
    await square(page, response.to).click();
    await expect(page.getByRole("status")).toBeEmpty();
    await expect(page.locator("[data-check]")).toHaveCount(0);
  });
}

test("guides a merged piece to split when moving together would leave the king in check", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await openPosition(page, "4r2k/8/8/8/1b6/8/4R:N3/4K3 w - - 0 1");
  const initialBoardTop = await boardTop(page);
  await square(page, "e2").click();
  await expect(page.locator("[data-legal-move]")).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText(
    "These pieces can't move together. Try moving just one.",
  );
  await expect.poll(() => boardTop(page)).toBe(initialBoardTop);

  await page
    .getByRole("button", { name: "Move only the white knight" })
    .click();
  await expect(square(page, "c3")).toHaveAttribute("data-legal-move", "true");
  await expect(page.getByRole("status")).toHaveText("Your king is in check");
  await expect.poll(() => boardTop(page)).toBe(initialBoardTop);
  await square(page, "c3").click();
  await expect(square(page, "c3")).toHaveAccessibleName(/white knight/);
  await expect(square(page, "e2")).toHaveAccessibleName(/white rook/);
  await expect(page.getByRole("status")).toBeEmpty();
  await expect.poll(() => boardTop(page)).toBe(initialBoardTop);
});

test("shows checkmate without suggesting a response or allowing empty selections", async ({
  page,
}) => {
  await openPosition(page, "7k/6Q1/5K2/8/8/8/8/8 b - - 0 1");
  await expect(page.getByRole("status")).toHaveText("Checkmate. White wins.");
  await expect(square(page, "h8")).toHaveAttribute("data-check", "true");
  await expect(page.locator("button[data-square]:disabled")).toHaveCount(64);
});

async function openPosition(page: Page, position: string) {
  await page.goto(
    `/practice?gameState=${encodeURIComponent(position.replaceAll(" ", "_"))}`,
  );
  await expect(page.getByRole("heading", { name: "Sandbox" })).toBeVisible();
}

function square(page: Page, name: string) {
  return page.locator(`button[data-square="${name}"]`);
}

function boardTop(page: Page) {
  return page
    .getByRole("group", { name: "Chess board", exact: true })
    .evaluate((board) => board.getBoundingClientRect().top + window.scrollY);
}
