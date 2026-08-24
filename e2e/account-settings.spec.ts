import { expect, test } from "@playwright/test";

const guestName =
  /^(Amber|Brave|Calm|Clever|Quiet|Swift)(Bishop|Knight|Pawn|Queen|Rook)\d{6}$/;

test("a guest can confirm and delete their account", async ({ page }) => {
  await page.goto("/new");
  await page.getByRole("button", { name: "Create challenge" }).click();
  await expect(page).toHaveURL(/\/challenge\/[a-zA-Z0-9_-]+$/);

  const accountLink = page.locator('header a[href="/settings"]');
  await expect(accountLink).toHaveText(guestName);
  await accountLink.click();
  await expect(page).toHaveURL(/\/settings$/);

  await expect(
    page.getByRole("heading", { name: "Account settings" }),
  ).toBeVisible();
  await expect(page.getByText("Guest", { exact: true })).toBeVisible();
  const confirmation = page.getByLabel(/delete my account/);
  const deleteButton = page.getByRole("button", { name: "Delete account" });
  await expect(deleteButton).toBeDisabled();
  await confirmation.fill("delete my accoun");
  await expect(deleteButton).toBeDisabled();
  await confirmation.fill("delete my account");
  await expect(deleteButton).toBeEnabled();

  await page.setViewportSize({ width: 320, height: 720 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);

  await deleteButton.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("a second device recovers after the account is deleted", async ({
  browser,
  page,
}) => {
  await page.goto("/new");
  await page.getByRole("button", { name: "Create challenge" }).click();
  await expect(page).toHaveURL(/\/challenge\/[a-zA-Z0-9_-]+$/);
  const deletingAccount = page.locator('header a[href="/settings"]');
  await expect(deletingAccount).toHaveText(guestName);
  const deletedName = await deletingAccount.innerText();

  const secondContext = await browser.newContext({
    storageState: await page.context().storageState(),
  });
  const secondDevice = await secondContext.newPage();

  try {
    await secondDevice.goto("/");
    await expect(secondDevice.locator('header a[href="/settings"]')).toHaveText(
      deletedName,
    );

    await deletingAccount.click();
    await page.getByLabel(/delete my account/).fill("delete my account");
    await page.getByRole("button", { name: "Delete account" }).click();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

    await expect(
      secondDevice.getByRole("button", { name: "Sign in" }),
    ).toBeVisible();
    await secondDevice.goto("/new");
    await secondDevice
      .getByRole("button", { name: "Create challenge" })
      .click();
    await expect(secondDevice).toHaveURL(/\/challenge\/[a-zA-Z0-9_-]+$/);
    const replacementAccount = secondDevice.locator(
      'header a[href="/settings"]',
    );
    await expect(replacementAccount).toHaveText(guestName);
    await expect(replacementAccount).not.toHaveText(deletedName);
  } finally {
    await secondContext.close();
  }
});
