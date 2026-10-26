import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

import { bundleData, repoRoot } from "./vite.bundleData";

export default defineConfig({
  // The React sources live in src/ and the dev entry is src/index.html. The build
  // writes the packaged viewer at viewer/index.html, which is the committed,
  // shipped file from here on.
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
    // The plugin root. `root` is `src`, so `..` is plugins/artifact/viewer, and the
    // build writes the committed viewer/index.html in place. Every build rewrites
    // that file, and no hand edit to it survives one.
    outDir: "..",
    // Never true here. The output directory is the plugin root, so a build that
    // emptied it would delete package.json and src/.
    emptyOutDir: false,
    sourcemap: false,
    target: "es2022",
  },
});
