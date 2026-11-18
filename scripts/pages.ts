/**
 * Assemble les pages : src/pages/*.html + src/partials/*.html  →  src/*.html
 * Dans une page, `<!-- @head -->`, `<!-- @header -->` et `<!-- @footer -->` sont remplacés
 * par le contenu du partial correspondant (header/footer communs à tout le site).
 *
 * Usage : bun scripts/pages.ts          (une fois)
 *         bun scripts/pages.ts --watch  (régénère à chaque modification)
 */
import { Glob } from "bun";
import { watch } from "node:fs";
import { join } from "node:path";

const PAGES = "src/pages", PARTIALS = "src/partials", OUT = "src";

export async function genererPages() {
  const partials: Record<string, string> = {};
  for await (const f of new Glob("*.html").scan(PARTIALS)) partials[f.replace(".html", "")] = (await Bun.file(join(PARTIALS, f)).text()).trim();
  let n = 0;
  for await (const f of new Glob("*.html").scan(PAGES)) {
    const src = await Bun.file(join(PAGES, f)).text();
    const html = src.replace(/<!--\s*@(\w+)\s*-->/g, (m, name) => partials[name] ?? m);
    const entete = "<!-- Fichier généré depuis src/pages/ : ne pas modifier ici -->\n";
    await Bun.write(join(OUT, f), html.replace(/^<!doctype html>\n?/i, `<!doctype html>\n${entete}`));
    n++;
  }
  return n;
}

if (import.meta.main) {
  console.log(`✓ ${await genererPages()} page(s) générée(s)`);
  if (process.argv.includes("--watch")) {
    for (const dir of [PAGES, PARTIALS]) {
      watch(dir, async () => console.log(`↻ ${await genererPages()} page(s) régénérée(s)`));
    }
    console.log("Surveillance de src/pages et src/partials…");
  }
}
