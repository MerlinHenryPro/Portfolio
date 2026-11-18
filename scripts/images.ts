/**
 * Pipeline de protection des images.
 *
 *   assets-src/**  (originaux, jamais publiés)
 *        │  1. vérifie que les créations sont passées par Glaze (nom contenant "glazed")
 *        │  2. convertit en WebP optimisé
 *        │  3. inscrit un identifiant unique + copyright + interdiction de fouille IA (XMP / IPTC)
 *        ▼
 *   src/img/**     (images utilisées par le site)
 *   protection/registre-images.json  (identifiant → fichier, empreinte, date)
 *
 * Usage : bun run images
 */
import sharp from "sharp";
import { exiftool } from "exiftool-vendored";
import { Glob } from "bun";
import { mkdir } from "node:fs/promises";
import { dirname, join, parse, relative } from "node:path";

const AUTEUR = "Merlin HENRY";
const SITE = "https://github.com/MerlinHenryPro/Portfolio";
const SRC = "assets-src";
const OUT = "public/img";
const REGISTRE = "protection/registre-images.json";

// Largeur max par dossier (les logos restent petits, les créations sont protégées)
const REGLES: Record<string, { largeur: number; proteger: boolean }> = {
  logos: { largeur: 256, proteger: false },
  // Images qui ne sont pas de toi (ex. capture de film) : jamais marquées à ton nom
  references: { largeur: 1600, proteger: false },
  biographie: { largeur: 800, proteger: true },
  default: { largeur: 1920, proteger: true },
};

type Entree = { id: string; source: string; sortie: string; sha256: string; date: string; glaze: boolean };
const registre: Record<string, Entree> = (await Bun.file(REGISTRE).exists())
  ? await Bun.file(REGISTRE).json()
  : {};

const sansGlaze: string[] = [];
let n = 0;

for await (const fichier of new Glob("**/*.{png,jpg,jpeg,webp,PNG,JPG,JPEG}").scan(SRC)) {
  const chemin = join(SRC, fichier).replaceAll("\\", "/");
  const dossier = fichier.split(/[\\/]/)[0];
  const regle = REGLES[dossier] ?? REGLES.default;
  const { dir, name } = parse(fichier);
  const nomPropre = name.replace(/[-_. ]?glazed.*$/i, "");
  const sortie = join(OUT, dir, `${nomPropre}.webp`).replaceAll("\\", "/");
  const octets = new Uint8Array(await Bun.file(chemin).arrayBuffer());
  const sha256 = new Bun.CryptoHasher("sha256").update(octets).digest("hex");
  const glaze = /glazed/i.test(name);

  await mkdir(dirname(sortie), { recursive: true });
  await sharp(octets)
    .resize({ width: regle.largeur, withoutEnlargement: true })
    .webp({ quality: 82, effort: 5 })
    .toFile(sortie);

  if (regle.proteger) {
    if (!glaze) sansGlaze.push(chemin);
    // Identifiant stable : on le réutilise si l'image source n'a pas changé
    const existant = Object.values(registre).find((e) => e.sha256 === sha256);
    const id = existant?.id ?? `MH-${new Date().getFullYear()}-${sha256.slice(0, 12).toUpperCase()}`;
    await exiftool.write(
      sortie,
      {
        Artist: AUTEUR,
        Creator: AUTEUR,
        Copyright: `© ${new Date().getFullYear()} ${AUTEUR} - Tous droits réservés. Reproduction et entraînement d'IA interdits.`,
        Rights: `© ${AUTEUR} - Tous droits réservés`,
        UsageTerms: "Toute réutilisation, y compris pour l'entraînement ou l'inférence d'IA, est interdite sans autorisation écrite.",
        WebStatement: SITE,
        ImageUniqueID: id,
        DocumentID: `xmp.did:${id}`,
        Identifier: id,
        "XMP-plus:DataMining": "Prohibited",
        "XMP-plus:OtherConstraints": "Fouille de textes et de données (TDM) et entraînement d'IA interdits.",
      } as any,
      { writeArgs: ["-overwrite_original"] },
    );
    registre[id] = { id, source: chemin, sortie, sha256, date: existant?.date ?? new Date().toISOString(), glaze };
  }
  n++;
  console.log(`✓ ${relative(".", sortie)}`);
}

await exiftool.end();
await mkdir(dirname(REGISTRE), { recursive: true });
await Bun.write(REGISTRE, JSON.stringify(registre, null, 2) + "\n");

console.log(`\n${n} image(s) traitée(s). Registre : ${REGISTRE}`);
if (sansGlaze.length) {
  console.warn(`\n⚠ ${sansGlaze.length} création(s) pas encore passée(s) par Glaze :`);
  for (const f of sansGlaze) console.warn(`   - ${f}`);
  console.warn("  → Passe-les dans Glaze, remplace l'original par le fichier « …glazed… », puis relance « bun run images ».");
}
