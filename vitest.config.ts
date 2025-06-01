import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "convex/_generated/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/coverage/**",
        "**/test{,s}/**",
      ],
    },
    // Run tests sequentially to avoid conflicts with shared state
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
});
