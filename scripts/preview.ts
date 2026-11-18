/** Sert dist/ comme GitHub Pages (URL sans .html acceptées). Usage : bun run preview */
const port = Number(process.env.PORT ?? 4173);
Bun.serve({
  port,
  async fetch(req) {
    let path = decodeURIComponent(new URL(req.url).pathname);
    if (path.endsWith("/")) path += "index.html";
    for (const p of [path, `${path}.html`]) {
      const f = Bun.file(`dist${p}`);
      if (await f.exists()) return new Response(f);
    }
    return new Response(Bun.file("dist/404.html"), { status: 404 });
  },
});
console.log(`Aperçu du build : http://localhost:${port}`);
