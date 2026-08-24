import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test.describe("Sign Up", () => {
    test("should show sign up form when clicking 'Create one'", async ({
      page,
    }) => {
      await page.goto("/login");

      // Wait for the form to load
      await expect(page.getByText("Welcome back")).toBeVisible({
        timeout: 10000,
      });

      // Find the auth form (contains password field)
      const authForm = page
        .locator("form")
        .filter({ has: page.getByLabel("Password") });
      const submitButton = authForm.locator('button[type="submit"]');

      await expect(submitButton).toBeVisible();
      await expect(submitButton).toHaveText("Sign in");

      // Click to switch to sign up
      await page.getByRole("button", { name: "Create one" }).click();

      // Now shows sign up form
      await expect(page.locator('[data-slot="card-title"]')).toHaveText(
        "Create account",
      );
      const username = page.getByLabel("Username");
      await expect(username).toHaveAttribute("minlength", "4");
      await username.fill("bad name");
      expect(
        await username.evaluate(
          (input: HTMLInputElement) => input.validity.patternMismatch,
        ),
      ).toBe(true);
      await username.fill("valid-name");
      expect(
        await username.evaluate(
          (input: HTMLInputElement) => input.validity.patternMismatch,
        ),
      ).toBe(false);
      expect(
        await username.evaluate((input: HTMLInputElement) =>
          input.checkValidity(),
        ),
      ).toBe(true);
      await expect(page.getByLabel("Confirm password")).toBeVisible();
      await expect(
        page.getByText(
          "We will email you an 8-digit code before you can sign in.",
        ),
      ).toBeVisible();
      await expect(submitButton).toHaveText("Create account");
    });

    test("should show loading state when submitting sign up form", async ({
      page,
    }) => {
      await page.goto("/login");

      // Wait for the form to load
      await expect(page.getByText("Welcome back")).toBeVisible({
        timeout: 10000,
      });

      // Find the auth form
      const authForm = page
        .locator("form")
        .filter({ has: page.getByLabel("Password") });
      const submitButton = authForm.locator('button[type="submit"]');

      // Switch to sign up
      await page.getByRole("button", { name: "Create one" }).click();

      // Fill in the form
      await page.getByLabel("Username").fill("NewPlayer");
      await page.getByLabel("Email").fill("newuser@example.com");
      await page
        .getByLabel("Password", { exact: true })
        .fill("securepassword123");
      await page.getByLabel("Confirm password").fill("securepassword123");

      // Submit the form
      await submitButton.click();

      // Button should show loading state
      await expect(submitButton).toHaveText("Creating account...");
    });
  });

  test.describe("Login Page", () => {
    test("should show login form for unauthenticated users", async ({
      page,
    }) => {
      await page.goto("/login");

      // Wait for the form to load
      await expect(page.getByText("Welcome back")).toBeVisible({
        timeout: 10000,
      });
      await expect(page.getByLabel("Email")).toBeVisible();
      await expect(page.getByLabel("Password")).toBeVisible();
    });

    test("should have back to lobby button", async ({ page }) => {
      await page.goto("/login");

      // Wait for the form to load
      await expect(page.getByText("Welcome back")).toBeVisible({
        timeout: 10000,
      });

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
      await expect(page.getByText("Welcome back")).toBeVisible({
        timeout: 10000,
      });
      await expect(
        page.getByText("Enter your email and password to continue."),
      ).toBeVisible();
    });

    test("should toggle between sign in and sign up", async ({ page }) => {
      await page.goto("/login");

      // Wait for the form to load
      await expect(page.getByText("Welcome back")).toBeVisible({
        timeout: 10000,
      });

      // Switch to sign up
      await page.getByRole("button", { name: "Create one" }).click();
      await expect(page.locator('[data-slot="card-title"]')).toHaveText(
        "Create account",
      );

      // Switch back to sign in
      await page
        .getByRole("main")
        .getByRole("button", { name: "Sign in", exact: true })
        .click();
      await expect(page.getByText("Welcome back")).toBeVisible();
    });

    test("should show loading state when submitting sign in form", async ({
      page,
    }) => {
      await page.goto("/login");

      // Wait for the form to load
      await expect(page.getByText("Welcome back")).toBeVisible({
        timeout: 10000,
      });

      // Find the auth form
      const authForm = page
        .locator("form")
        .filter({ has: page.getByLabel("Password") });
      const submitButton = authForm.locator('button[type="submit"]');

      // Fill in the form
      await page.getByLabel("Email").fill("test@example.com");
      await page.getByLabel("Password").fill("password123");

      // Submit the form
      await submitButton.click();

      // Button should show loading state
      await expect(submitButton).toHaveText("Signing in...");
    });

    test("should open the password reset flow", async ({ page }) => {
      await page.goto("/login");

      await expect(page.getByText("Welcome back")).toBeVisible({
        timeout: 10000,
      });
      await page.getByRole("button", { name: "Forgot password?" }).click();

      await expect(page.getByText("Reset your password")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Send reset code" }),
      ).toBeVisible();
    });
  });
});
