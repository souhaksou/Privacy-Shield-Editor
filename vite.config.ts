import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";
import tailwindcss from "@tailwindcss/vite";

// GitHub Pages project sites are served under /<repo>/; Actions sets GITHUB_REPOSITORY=owner/repo.
// Optional override: VITE_BASE_URL=/my-repo/ (must include leading and trailing slashes).
const repoSlug = process.env.GITHUB_REPOSITORY?.split("/")[1];
const base =
  process.env.VITE_BASE_URL?.trim() ||
  (repoSlug ? `/${repoSlug}/` : "/");

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [vue(), vueDevTools(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
