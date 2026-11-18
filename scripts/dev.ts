/** Serveur de développement : régénère les pages et recharge à chaud. Usage : bun run dev */
import { genererPages } from "./pages.ts";
await genererPages();
Bun.spawn(["bun", "scripts/pages.ts", "--watch"], { stdout: "inherit", stderr: "inherit" });
Bun.spawn(["bun", "--hot", ...[...new Bun.Glob("src/*.html").scanSync(".")]], { stdout: "inherit", stderr: "inherit" });
