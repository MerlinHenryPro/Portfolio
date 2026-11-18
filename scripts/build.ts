/**
 * Build de production : pages → dist/ (HTML, CSS, JS et images optimisés + fichiers de public/)
 * Usage : bun run build
 */
import { Glob } from "bun";
import { cp, rm } from "node:fs/promises";
import { genererPages } from "./pages.ts";

await genererPages();
await rm("dist", { recursive: true, force: true });

const entrypoints = [...new Glob("src/*.html").scanSync(".")];
const res = await Bun.build({ entrypoints, outdir: "dist", root: "src", minify: true, splitting: true, naming: { asset: "assets/[name]-[hash].[ext]", chunk: "assets/[name]-[hash].[ext]" } });
if (!res.success) {
  for (const l of res.logs) console.error(l);
  process.exit(1);
}
await cp("public", "dist", { recursive: true });
console.log(`✓ Build terminé : ${res.outputs.length} fichiers dans dist/`);
