import { expect, test } from "@playwright/test";

test("a guest can confirm and delete their account", async ({ page }) => {
  await page.goto("/new");
  await page.getByRole("button", { name: "Create challenge" }).click();
  await expect(page).toHaveURL(/\/challenge\/[a-zA-Z0-9_-]+$/);

  const accountLink = page.locator('header a[href="/settings"]');
  await expect(accountLink).toHaveText(
    /^(Amber|Brave|Calm|Clever|Quiet|Swift)(Bishop|Knight|Pawn|Queen|Rook)\d{6}$/,
  );
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
