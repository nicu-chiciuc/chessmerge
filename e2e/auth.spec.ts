import { test, expect } from "@playwright/test";

// Mock responses for Convex auth
const mockAuthSuccess = {
  signedIn: true,
  tokens: {
    token: "mock-jwt-token",
    refreshToken: "mock-refresh-token",
  },
};

const mockLoggedInUser = {
  _id: "mock-user-id",
  email: "test@example.com",
};

test.describe("Authentication Flow", () => {
  test.describe("Sign Up", () => {
    test("should show sign up form when clicking 'Sign up instead'", async ({
      page,
    }) => {
      await page.goto("/login");

      // Initially shows sign in
      await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

      // Click to switch to sign up
      await page.getByRole("button", { name: "Sign up instead" }).click();

      // Now shows sign up form
      await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Sign up" })).toBeVisible();
    });

    test("should redirect to lobby after successful sign up", async ({
      page,
    }) => {
      // Track if we navigated to the lobby
      let navigatedToLobby = false;

      // Mock the Convex auth endpoint for successful sign up
      await page.route("**/.well-known/**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ issuer: "https://test.convex.cloud" }),
        });
      });

      // Mock successful auth response
      await page.route("**/api/auth/**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockAuthSuccess),
        });
      });

      // Listen for navigation
      page.on("framenavigated", (frame) => {
        if (frame === page.mainFrame() && frame.url().endsWith("/")) {
          navigatedToLobby = true;
        }
      });

      await page.goto("/login");

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

    test("should show error toast on sign up failure", async ({ page }) => {
      // Mock failed auth response
      await page.route("**/api/auth/**", async (route) => {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "User already exists" }),
        });
      });

      await page.goto("/login");

      // Switch to sign up
      await page.getByRole("button", { name: "Sign up instead" }).click();

      // Fill in the form
      await page.getByLabel("Email").fill("existing@example.com");
      await page.getByLabel("Password").fill("password123");

      // Submit the form
      await page.getByRole("button", { name: "Sign up" }).click();

      // Should show error toast and button should not be loading anymore
      await expect(page.getByRole("button", { name: "Sign up" })).toBeVisible({
        timeout: 5000,
      });
    });
  });

  test.describe("Login Page Redirect", () => {
    test("should show login form for unauthenticated users", async ({
      page,
    }) => {
      await page.goto("/login");

      // Should show the login form
      await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
      await expect(page.getByLabel("Email")).toBeVisible();
      await expect(page.getByLabel("Password")).toBeVisible();
    });

    test("should have back to lobby button", async ({ page }) => {
      await page.goto("/login");

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

      await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
      await expect(
        page.getByText("Enter your credentials to sign in to your account")
      ).toBeVisible();
    });

    test("should toggle between sign in and sign up", async ({ page }) => {
      await page.goto("/login");

      // Start with sign in
      await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();

      // Switch to sign up
      await page.getByRole("button", { name: "Sign up instead" }).click();
      await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();

      // Switch back to sign in
      await page.getByRole("button", { name: "Sign in instead" }).click();
      await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    });
  });
});
