import { expect, test, type Page } from "@playwright/test";

async function createGuest(page: Page) {
  await page.goto("/new");
  await page.getByRole("button", { name: "Create challenge" }).click();
  await expect(page).toHaveURL(/\/challenge\/[a-zA-Z0-9_-]+$/);
}

function uniqueName(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

test("a guest can rename and another guest cannot take that name", async ({
  browser,
  page,
}) => {
  const availableName = uniqueName("Guest");

  await createGuest(page);
  await page.locator('header a[href="/settings"]').click();
  const nameInput = page.getByLabel("Public name");
  const saveButton = page.getByRole("button", { name: "Save name" });

  await nameInput.fill("bad name");
  await expect(page.getByRole("alert")).toHaveText(
    "Use 4 to 24 letters, numbers, underscores, or hyphens.",
  );
  await expect(saveButton).toBeDisabled();

  await nameInput.fill(`  ${availableName}  `);
  await saveButton.click();
  await expect(page.getByRole("status")).toHaveText("Name saved.");
  await expect(nameInput).toHaveValue(availableName);
  await expect(page.locator('header a[href="/settings"]')).toHaveText(
    availableName,
  );

  const secondContext = await browser.newContext();
  const secondGuest = await secondContext.newPage();
  try {
    await createGuest(secondGuest);
    const originalSecondName = await secondGuest
      .locator('header a[href="/settings"]')
      .innerText();
    await secondGuest.locator('header a[href="/settings"]').click();
    await secondGuest
      .getByLabel("Public name")
      .fill(availableName.toUpperCase());
    await secondGuest.getByRole("button", { name: "Save name" }).click();

    await expect(secondGuest.getByRole("alert")).toHaveText(
      "That name is already taken.",
    );
    await expect(secondGuest.locator('header a[href="/settings"]')).toHaveText(
      originalSecondName,
    );
  } finally {
    await secondContext.close();
  }
});

test("a clean name form follows another tab without replacing a draft", async ({
  page,
}) => {
  await createGuest(page);
  await page.locator('header a[href="/settings"]').click();
  const firstInput = page.getByLabel("Public name");

  const otherTab = await page.context().newPage();
  try {
    await otherTab.goto("/settings");
    const otherInput = otherTab.getByLabel("Public name");
    const syncedName = uniqueName("Synced");
    await otherInput.fill(syncedName);
    await otherTab.getByRole("button", { name: "Save name" }).click();
    await expect(otherTab.getByRole("status")).toHaveText("Name saved.");
    await expect(firstInput).toHaveValue(syncedName);

    await firstInput.fill("LocalDraft");
    const newerName = uniqueName("Remote");
    await otherInput.fill(newerName);
    await otherTab.getByRole("button", { name: "Save name" }).click();
    await expect(otherTab.getByRole("status")).toHaveText("Name saved.");

    await expect(firstInput).toHaveValue("LocalDraft");
    await expect(page.locator('header a[href="/settings"]')).toHaveText(
      newerName,
    );
  } finally {
    await otherTab.close();
  }
});
