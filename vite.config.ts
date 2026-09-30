import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    tanstackStart({
      // Convex Auth owns its session in the browser. Start still provides the
      // typed route tree and build pipeline, but authenticated UI is not SSR'd.
      spa: {
        enabled: true,
        maskPath: "/#__chessmerge-spa-shell",
        prerender: {
          outputPath: "/index.html",
        },
      },
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
