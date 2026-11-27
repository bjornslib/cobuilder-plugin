import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * The component runner's own config. It is separate from `vite.config.ts` on purpose:
 * Vitest uses this file in place of that one, and a test needs neither the `/bundle/`
 * middleware nor the single-file packager. `index.html` at the package root is the
 * shipped viewer, and no test reads or writes it.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
