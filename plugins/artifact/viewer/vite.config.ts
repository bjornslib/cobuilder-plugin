import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

import { bundleData, repoRoot } from "./vite.bundleData";

export default defineConfig({
  // The sources live in src/. The build writes the committed, shipped viewer/index.html.
  root: "src",
  plugins: [react(), tailwindcss(), bundleData(), viteSingleFile()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5273,
    // `/@fs/` requests and any absolute path the app asks for must resolve inside
    // the repository, because the bundle sits above the Vite root.
    fs: {
      allow: [repoRoot],
    },
  },
  build: {
    // The plugin root: `root` is `src`, so `..` is plugins/artifact/viewer. Each build
    // rewrites the committed viewer/index.html, so no hand edit to it survives.
    outDir: "..",
    // Never true: outDir is the plugin root, so emptying it would delete package.json and src/.
    emptyOutDir: false,
    sourcemap: false,
    target: "es2022",
  },
});
