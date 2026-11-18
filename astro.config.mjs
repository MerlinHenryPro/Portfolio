// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://portfolio.merlinhenry.fr",
  output: "static",
  // Les images sont servies depuis public/img sans retraitement :
  // Astro ne doit pas les ré-encoder (cela effacerait les métadonnées de protection).
  build: { format: "directory", assets: "assets" },
  vite: { plugins: [tailwindcss()] },
});
