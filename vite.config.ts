import { convexSsr } from "@samebase/convex-hosting-tanstack-start/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    convexSsr(),
    tanstackStart({
      // Prerenders /rules only, so Convex hosting serves it as a file. A
      // prerendered route and its parents must not query Convex: CI builds
      // with a placeholder VITE_CONVEX_URL.
      pages: [
        { path: "/rules", prerender: { enabled: true, crawlLinks: false } },
      ],
    }),
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      lib: path.resolve(__dirname, "./lib"),
    },
  },
});
