import { test } from "@playwright/test";

test("debug - check what page looks like", async ({ page }) => {
  await page.goto("/login");
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "debug-screenshot.png", fullPage: true });
  console.log("Page URL:", page.url());
  console.log("Page title:", await page.title());
  const html = await page.content();
  console.log("Page HTML length:", html.length);
  console.log("Has Welcome back:", html.includes("Welcome back"));
  console.log("Has loading spinner:", html.includes("animate-spin"));
});
