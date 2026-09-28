import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * The component runner's own config. It is separate from `vite.config.ts` on
 * purpose, and Vitest uses this file in place of that one when both exist.
 *
 * `vite.config.ts` is the build and dev-server config. It roots Vite at `src/`
 * and loads the `/bundle/` middleware and the single-file packager. A test needs
 * neither, so this file holds the react transform and the `@` alias and stops.
 *
 * `index.html` at this package's root is the shipped viewer, and no test reads or
 * writes it.
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
    // The sources under `src/` only. The repository's Python suite lives in
    // `tests/` at the repository root, and no path from here reaches it.
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
