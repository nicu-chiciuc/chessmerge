import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      lib: path.resolve(__dirname, "./lib"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    exclude: ["node_modules", "dist", "e2e"],
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
    maxWorkers: 1,
  },
});
