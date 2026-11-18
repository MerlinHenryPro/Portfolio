/**
 * Met le site en ligne sur le VPS (après « git push » sur main).
 * Usage : bun run deploy   → demande le mot de passe SSH du VPS
 */
const HOTE = "etudiant@185.157.244.202", PORT = "23040";
const statut = Bun.spawnSync(["git", "status", "--porcelain"]).stdout.toString().trim();
if (statut) console.warn("⚠ Des modifications ne sont pas commitées : elles ne seront pas en ligne.\n");
const branche = Bun.spawnSync(["git", "rev-parse", "--abbrev-ref", "HEAD"]).stdout.toString().trim();
if (branche !== "main") console.warn(`⚠ Tu es sur « ${branche} » : le VPS publie la branche main.\n`);
const p = Bun.spawn(["ssh", "-p", PORT, HOTE, "bash /var/www/portfolio/scripts/vps/mettre-a-jour.sh"], { stdin: "inherit", stdout: "inherit", stderr: "inherit" });
process.exit(await p.exited);
