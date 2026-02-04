import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test.describe("Sign Up", () => {
    test("should show sign up form when clicking 'Sign up instead'", async ({
      page,
    }) => {
      await page.goto("/login");

      // Wait for the form to load (CardTitle is a div, not a heading)
      await expect(page.getByText("Welcome back")).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

      // Click to switch to sign up
      await page.getByRole("button", { name: "Sign up instead" }).click();

      // Now shows sign up form
      await expect(page.getByText("Create account")).toBeVisible();
      await expect(page.getByRole("button", { name: "Sign up" })).toBeVisible();
    });

    test("should show loading state when submitting sign up form", async ({
      page,
    }) => {
      await page.goto("/login");

      // Wait for the form to load
      await expect(page.getByText("Welcome back")).toBeVisible({ timeout: 10000 });

      // Switch to sign up
      await page.getByRole("button", { name: "Sign up instead" }).click();

      // Fill in the form
      await page.getByLabel("Email").fill("newuser@example.com");
      await page.getByLabel("Password").fill("securepassword123");

      // Submit the form
      await page.getByRole("button", { name: "Sign up" }).click();

      // Button should show loading state
      await expect(page.getByRole("button", { name: "Loading..." })).toBeVisible();
    });
  });

  test.describe("Login Page", () => {
    test("should show login form for unauthenticated users", async ({
      page,
    }) => {
      await page.goto("/login");

      // Wait for the form to load
      await expect(page.getByText("Welcome back")).toBeVisible({ timeout: 10000 });
      await expect(page.getByLabel("Email")).toBeVisible();
      await expect(page.getByLabel("Password")).toBeVisible();
    });

    test("should have back to lobby button", async ({ page }) => {
      await page.goto("/login");

      // Wait for the form to load
      await expect(page.getByText("Welcome back")).toBeVisible({ timeout: 10000 });

      const backButton = page.getByRole("button", { name: "← Back to Lobby" });
      await expect(backButton).toBeVisible();

      // Click should navigate to lobby
      await backButton.click();
      await expect(page).toHaveURL("/");
    });
  });

  test.describe("Sign In", () => {
    test("should show sign in form by default", async ({ page }) => {
      await page.goto("/login");

      // Wait for the form to load
      await expect(page.getByText("Welcome back")).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByText("Enter your credentials to sign in to your account")
      ).toBeVisible();
    });

    test("should toggle between sign in and sign up", async ({ page }) => {
      await page.goto("/login");

      // Wait for the form to load
      await expect(page.getByText("Welcome back")).toBeVisible({ timeout: 10000 });

      // Switch to sign up
      await page.getByRole("button", { name: "Sign up instead" }).click();
      await expect(page.getByText("Create account")).toBeVisible();

      // Switch back to sign in
      await page.getByRole("button", { name: "Sign in instead" }).click();
      await expect(page.getByText("Welcome back")).toBeVisible();
    });

    test("should show loading state when submitting sign in form", async ({
      page,
    }) => {
      await page.goto("/login");

      // Wait for the form to load
      await expect(page.getByText("Welcome back")).toBeVisible({ timeout: 10000 });

      // Fill in the form
      await page.getByLabel("Email").fill("test@example.com");
      await page.getByLabel("Password").fill("password123");

      // Submit the form
      await page.getByRole("button", { name: "Sign in" }).click();

      // Button should show loading state
      await expect(page.getByRole("button", { name: "Loading..." })).toBeVisible();
    });
  });
});
