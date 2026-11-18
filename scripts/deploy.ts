/**
 * Met le site en ligne sur le VPS.
 *
 * Le site est construit ICI, sur le PC, puis seul le dossier dist/ est envoyé au VPS.
 * Pourquoi : le processeur du VPS n'a pas les instructions AVX2 dont le compilateur
 * d'Astro 7 a besoin (« Illegal instruction » si on lance « bun run build » sur le VPS).
 *
 * Usage : bun run deploy   → construit le site puis demande le mot de passe SSH du VPS
 */
const HOTE = "etudiant@185.157.244.202";
const PORT = "23040";
const DOSSIER = "/var/www/portfolio";

const statut = Bun.spawnSync(["git", "status", "--porcelain"]).stdout.toString().trim();
if (statut) console.warn("⚠ Des modifications ne sont pas commitées : elles seront en ligne mais pas sur GitHub.\n");

// 1. Construction du site sur le PC
console.log("==> 1/2 Construction du site (dist/)");
const build = Bun.spawnSync(["bun", "run", "build"], { stdout: "inherit", stderr: "inherit" });
if (build.exitCode !== 0) {
  console.error("✗ Le build a échoué : rien n'a été envoyé.");
  process.exit(1);
}

// 2. Envoi de dist/ en une seule connexion SSH (archive compressée)
//    Sur le VPS : extraction dans dist.nouveau puis échange avec dist (aucune coupure du site).
console.log(`\n==> 2/2 Envoi vers ${HOTE} (mot de passe SSH demandé)`);
const distant = [
  "set -e",
  `mkdir -p ${DOSSIER}`,
  `rm -rf ${DOSSIER}/dist.nouveau && mkdir ${DOSSIER}/dist.nouveau`,
  `tar -xzf - -C ${DOSSIER}/dist.nouveau`,
  `rm -rf ${DOSSIER}/dist.ancien`,
  `if [ -d ${DOSSIER}/dist ]; then mv ${DOSSIER}/dist ${DOSSIER}/dist.ancien; fi`,
  `mv ${DOSSIER}/dist.nouveau ${DOSSIER}/dist`,
  `rm -rf ${DOSSIER}/dist.ancien`,
  `echo "✓ Site en ligne : https://portfolio.merlinhenry.fr"`,
].join(" && ");

const archive = Bun.spawn(["tar", "-czf", "-", "-C", "dist", "."], { stdout: "pipe", stderr: "inherit" });
const ssh = Bun.spawn(["ssh", "-p", PORT, HOTE, distant], { stdin: archive.stdout, stdout: "inherit", stderr: "inherit" });
const code = await ssh.exited;
if (code !== 0) console.error("✗ L'envoi a échoué (mot de passe, connexion ou droits sur " + DOSSIER + ").");
process.exit(code);
