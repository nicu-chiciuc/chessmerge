import { expect, test, type Page } from "@playwright/test";

test.describe("shareable challenges", () => {
  test.describe.configure({ mode: "serial" });

  test("a malformed direct link is compact and unavailable", async ({
    page,
  }) => {
    const response = await page.goto("/challenge/not-a-convex-id");

    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: "Challenge unavailable" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create a challenge" }),
    ).toBeFocused();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("an anonymous creator can create, share, and cancel", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: async (data: ShareData) => {
          localStorage.setItem("shared-challenge", JSON.stringify(data));
        },
      });
    });
    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto("/");
    const lobbyAction = page.getByRole("button", { name: "Create challenge" });
    await expect(lobbyAction).toBeEnabled();
    await lobbyAction.click();
    await expect(page).toHaveURL("/new");

    const create = page.getByRole("button", { name: "Create challenge" });
    await expect(create).toBeFocused();
    await expectPreviewBoardGeometry(page);
    await page.setViewportSize({ width: 320, height: 720 });
    await expectPreviewBoardGeometry(page);
    await page.setViewportSize({ width: 1280, height: 720 });
    await observePendingLabel(page, "creating-label", "Creating…");
    await create.click();
    await expect(page).toHaveURL(/\/challenge\/[a-zA-Z0-9_-]+$/);
    expect(
      await page.evaluate(() => sessionStorage.getItem("creating-label")),
    ).toBe("seen");
    await expect(
      page.getByRole("heading", { name: "Waiting for an opponent" }),
    ).toBeVisible();
    const creatorName = await page
      .getByLabel("Challenge seats")
      .locator("strong")
      .first()
      .innerText();
    expect(creatorName).toMatch(
      /^(Amber|Brave|Calm|Clever|Quiet|Swift)(Bishop|Knight|Pawn|Queen|Rook)\d{6}$/,
    );
    await expect(
      page.getByText("Guest", { exact: true }).first(),
    ).toBeVisible();

    const copy = page.getByRole("button", { name: "Copy link" });
    await expect(copy).toBeFocused();
    const canonicalUrl = page.url();
    await expect(page.getByLabel("Challenge link")).toHaveValue(canonicalUrl);
    await copy.click();
    await expect(
      page.getByRole("button", { name: "Link copied" }),
    ).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(canonicalUrl);

    await page.getByRole("button", { name: "Share" }).click();
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("shared-challenge")))
      .toContain(canonicalUrl);

    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: undefined,
      });
      Object.defineProperty(document, "execCommand", {
        configurable: true,
        value: (command: string) => {
          const field = Array.from(document.querySelectorAll("textarea")).at(
            -1,
          );
          localStorage.setItem("fallback-copy", field?.value ?? "");
          return command === "copy";
        },
      });
    });
    await page.getByRole("button", { name: "Copy for agent" }).click();
    await expect(
      page.getByRole("button", { name: "Agent invite copied" }),
    ).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("fallback-copy")))
      .toBe(
        `Open this ChessMerge challenge, join as a guest, and play against me: ${canonicalUrl}`,
      );

    await page.setViewportSize({ width: 320, height: 720 });
    await expect(page.getByRole("button", { name: "Share" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Agent invite copied" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Cancel challenge" }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => ({
          pageWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
        })),
      )
      .toEqual({ pageWidth: 320, viewportWidth: 320 });
    await page.setViewportSize({ width: 1280, height: 720 });

    const cancel = page.getByRole("button", { name: "Cancel challenge" });
    await cancel.click();
    const prompt = page.getByText(
      "Cancel this challenge? The link will stop working.",
    );
    const promptBox = prompt.locator("..");
    const keepWaiting = promptBox.getByRole("button", {
      name: "Keep waiting",
    });
    await expect(keepWaiting).toBeFocused();
    await keepWaiting.click();
    await expect(cancel).toBeFocused();

    await cancel.click();
    const confirmCancel = page
      .getByText("Cancel this challenge? The link will stop working.")
      .locator("..")
      .getByRole("button", { name: "Cancel challenge" });
    await confirmCancel.click();
    await expect(
      page.getByRole("heading", { name: "Challenge unavailable" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create a challenge" }),
    ).toBeFocused();
  });

  test("a guest joins from the public view and both players reach live play", async ({
    browser,
    page: creatorPage,
  }) => {
    await creatorPage.goto("/new");
    await creatorPage.getByRole("button", { name: "Create challenge" }).click();
    await expect(creatorPage).toHaveURL(/\/challenge\/[a-zA-Z0-9_-]+$/);
    const challengeUrl = creatorPage.url();

    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    const spectatorContext = await browser.newContext();
    const spectatorPage = await spectatorContext.newPage();

    try {
      await guestPage.goto(challengeUrl);
      await expect(
        guestPage.getByRole("heading", { name: "Join this challenge" }),
      ).toBeVisible();
      await expect(
        guestPage.getByText("Casual", { exact: true }),
      ).toBeVisible();
      await expect(
        guestPage.getByText("Untimed", { exact: true }),
      ).toBeVisible();
      const creatorName = await creatorPage
        .getByLabel("Challenge seats")
        .locator("strong")
        .first()
        .innerText();
      await expect(
        guestPage.getByText(creatorName, { exact: true }),
      ).toBeVisible();
      await expect(guestPage.getByText("Guest", { exact: true })).toBeVisible();
      await expect(
        guestPage.getByRole("img", { name: /Static ChessMerge board/ }),
      ).toBeVisible();
      await expectPreviewBoardGeometry(guestPage);
      await expect(
        guestPage.locator("[data-preview-board] button[data-square]:disabled"),
      ).toHaveCount(64);
      await expect(
        guestPage.getByRole("button", { name: "Sign in" }),
      ).toBeVisible();

      const join = guestPage.getByRole("button", { name: "Join as guest" });
      await expect(join).toBeFocused();
      await observePendingLabel(guestPage, "joining-label", "Joining…");
      await join.click();

      await expect(guestPage).toHaveURL(/\/game\/[a-zA-Z0-9_-]+$/);
      expect(
        await guestPage.evaluate(() => sessionStorage.getItem("joining-label")),
      ).toBe("seen");
      await expect(creatorPage).toHaveURL(/\/game\/[a-zA-Z0-9_-]+$/);
      await expect(
        guestPage.locator("h1", { hasText: "Chess game" }),
      ).toBeFocused();

      const gameUrl = creatorPage.url();
      await creatorPage.getByRole("button", { name: /Lobby/ }).click();
      await expect(creatorPage).toHaveURL("/");
      const resumeGame = creatorPage
        .getByRole("heading", { name: "My games" })
        .locator("..")
        .getByRole("button")
        .first();
      await expect(resumeGame).toBeVisible();
      await resumeGame.click();
      await expect(creatorPage).toHaveURL(gameUrl);

      await spectatorPage.goto(challengeUrl);
      await expect(
        spectatorPage.getByRole("heading", { name: "Watching chess game" }),
      ).toBeFocused();
      await expect(spectatorPage).toHaveURL(gameUrl);
      await expect(
        spectatorPage.getByRole("group", {
          name: "Chess board, read only",
        }),
      ).toBeVisible();
      await expect(spectatorPage.locator("button[data-square]")).toHaveCount(
        64,
      );
      await expect(
        spectatorPage.locator("button[data-square]:not(:disabled)"),
      ).toHaveCount(0);

      await spectatorPage.goto("/");
      await expect(
        spectatorPage.getByRole("heading", { name: "Live games" }),
      ).toBeVisible();
      const watchLiveGame = spectatorPage.getByRole("button", {
        name: new RegExp(creatorName),
      });
      await expect(watchLiveGame).toBeVisible();
      await watchLiveGame.click();
      await expect(spectatorPage).toHaveURL(gameUrl);

      await guestPage.setViewportSize({ width: 320, height: 720 });
      const currentIdentity = guestPage.locator("header span[title]");
      await expect(currentIdentity).toBeVisible();
      const currentName = (await currentIdentity.textContent())?.trim();
      expect(currentName).toBeTruthy();
      await expect(currentIdentity).toHaveAttribute("title", currentName!);
      await expect(
        guestPage.getByRole("button", { name: /Lobby/ }),
      ).toBeVisible();
      await expect(
        guestPage.getByRole("button", { name: "Sign out" }),
      ).toBeVisible();
      const longName = "VeryLongChessPlayer_2026";
      await currentIdentity.evaluate((element, name) => {
        element.textContent = name;
        element.title = name;
      }, longName);
      await expect(currentIdentity).toHaveAttribute("title", longName);
      await expect
        .poll(() =>
          currentIdentity.evaluate(
            (element) => element.scrollWidth > element.clientWidth,
          ),
        )
        .toBe(true);
      await expect
        .poll(() =>
          guestPage.evaluate(() => ({
            pageWidth: document.documentElement.scrollWidth,
            viewportWidth: window.innerWidth,
          })),
        )
        .toEqual({ pageWidth: 320, viewportWidth: 320 });

      await expect(creatorPage.locator("button[data-square]")).toHaveCount(64);
      await expect(guestPage.locator("button[data-square]")).toHaveCount(64);

      await creatorPage.locator('button[data-square="e2"]').click();
      await expect(
        creatorPage.locator('button[data-square="e3"]'),
      ).toHaveAttribute("data-legal-move", "true");
      await creatorPage.locator('button[data-square="e3"]').click();
      await expect(
        guestPage.locator('button[data-square="e3"] img'),
      ).toHaveCount(1);
      await expect(
        guestPage.locator('button[data-square="e2"] img'),
      ).toHaveCount(0);
      await expect(
        creatorPage.locator('button[data-square="e3"] img'),
      ).toHaveCount(1);
      await expect(
        creatorPage.locator('button[data-square="e3"]'),
      ).toBeFocused();
      await expect(
        spectatorPage.locator('button[data-square="e3"] img'),
      ).toHaveCount(1);
      await expect(
        spectatorPage.locator('button[data-square="e2"] img'),
      ).toHaveCount(0);
      await expect(
        spectatorPage.locator("button[data-square]:not(:disabled)"),
      ).toHaveCount(0);
      for (const gamePage of [creatorPage, guestPage, spectatorPage]) {
        await expect(
          gamePage.locator('button[data-square="e2"]'),
        ).toHaveAttribute("data-last-move", "from");
        await expect(
          gamePage.locator('button[data-square="e3"]'),
        ).toHaveAttribute("data-last-move", "to");
        await expect(
          gamePage.getByRole("button", { name: /e2.*last move from/ }),
        ).toBeVisible();
        await expect(
          gamePage.getByRole("button", { name: /e3.*last move to/ }),
        ).toBeVisible();
      }
      const squareBackground = async (square: string) =>
        guestPage
          .locator(`button[data-square="${square}"]`)
          .evaluate((element) => getComputedStyle(element).backgroundColor);
      expect(await squareBackground("e2")).not.toBe(
        await squareBackground("e4"),
      );
      expect(await squareBackground("e3")).not.toBe(
        await squareBackground("e5"),
      );

      await spectatorPage.reload();
      await expect(
        spectatorPage.locator('button[data-square="e2"]'),
      ).toHaveAttribute("data-last-move", "from");
      await expect(
        spectatorPage.locator('button[data-square="e3"]'),
      ).toHaveAttribute("data-last-move", "to");

      await expect(
        spectatorPage.getByRole("button", { name: "Resign game" }),
      ).toHaveCount(0);
      const resign = guestPage.getByRole("button", { name: "Resign game" });
      await resign.click();
      const keepPlaying = guestPage.getByRole("button", {
        name: "Keep playing",
      });
      await expect(keepPlaying).toBeFocused();
      await keepPlaying.click();
      await expect(resign).toBeFocused();

      await resign.click();
      await guestPage
        .getByText("Resign this game? Your opponent will win.")
        .locator("..")
        .getByRole("button", { name: "Resign game" })
        .click();

      await expect(
        creatorPage.getByText("White wins! You won!", { exact: true }),
      ).toBeVisible();
      await expect(
        guestPage.getByText("White wins! You lost.", { exact: true }),
      ).toBeVisible();
      await expect(
        spectatorPage.getByText("White wins", { exact: true }),
      ).toBeVisible();
      for (const gamePage of [creatorPage, guestPage, spectatorPage]) {
        await expect(
          gamePage.getByText("resignation", { exact: true }),
        ).toBeVisible();
        await expect(
          gamePage.getByRole("group", { name: "Chess board, read only" }),
        ).toBeVisible();
        await expect(
          gamePage.locator('button[data-square="e2"]'),
        ).toHaveAttribute("data-last-move", "from");
        await expect(
          gamePage.locator('button[data-square="e3"]'),
        ).toHaveAttribute("data-last-move", "to");
      }

      await creatorPage.getByRole("button", { name: /Lobby/ }).click();
      const myGames = creatorPage
        .getByRole("heading", { name: "My games" })
        .locator("..");
      await expect(myGames.getByText("won by resignation")).toBeVisible();
    } finally {
      await Promise.all([guestContext.close(), spectatorContext.close()]);
    }
  });
});

async function observePendingLabel(page: Page, key: string, label: string) {
  await page.evaluate(
    ({ storageKey, text }) => {
      const markIfPresent = () => {
        if (document.body.textContent?.includes(text)) {
          sessionStorage.setItem(storageKey, "seen");
          return true;
        }
        return false;
      };
      if (markIfPresent()) return;

      const observer = new MutationObserver(() => {
        if (!markIfPresent()) return;
        observer.disconnect();
      });
      observer.observe(document.body, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    },
    { storageKey: key, text: label },
  );
}

async function expectPreviewBoardGeometry(page: Page) {
  const squares = page.locator("[data-preview-board] [data-square]");
  await expect(squares).toHaveCount(64);

  const sizes = await squares.evaluateAll((elements) =>
    elements.map((element) => {
      const { width, height } = element.getBoundingClientRect();
      return { width, height };
    }),
  );

  expect(Math.min(...sizes.map(({ width }) => width))).toBeGreaterThan(0);
  expect(
    Math.max(...sizes.map(({ width }) => width)) -
      Math.min(...sizes.map(({ width }) => width)),
  ).toBeLessThan(1);
  expect(
    Math.max(...sizes.map(({ height }) => height)) -
      Math.min(...sizes.map(({ height }) => height)),
  ).toBeLessThan(1);
  expect(
    Math.max(...sizes.map(({ width, height }) => Math.abs(width - height))),
  ).toBeLessThan(1);

  const kingIsClipped = await page
    .locator('[data-preview-board] [data-square="e1"] img[alt="White king"]')
    .evaluate((king) => {
      const square = king.closest("[data-square]");
      for (
        let ancestor = king.parentElement;
        ancestor && ancestor !== square;
        ancestor = ancestor.parentElement
      ) {
        if (getComputedStyle(ancestor).overflow === "hidden") return true;
      }
      return false;
    });
  expect(kingIsClipped).toBe(false);
}
