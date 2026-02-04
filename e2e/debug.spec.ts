import { test, expect } from "@playwright/test";

test("debug - find headings on page", async ({ page }) => {
  await page.goto("/login");
  await page.waitForTimeout(5000);
  
  // Get all headings
  const headings = await page.locator("h1, h2, h3, h4").allTextContents();
  console.log("All headings:", headings);
  
  // Check for the card title specifically
  const cardTitle = await page.locator(".text-2xl").textContent();
  console.log("Card title:", cardTitle);
  
  // Check if form elements exist
  const emailInput = await page.locator('input[name="email"]').count();
  console.log("Email inputs:", emailInput);
  
  // Try to find by text
  const welcomeText = await page.getByText("Welcome back").count();
  console.log("Welcome back text count:", welcomeText);
});
