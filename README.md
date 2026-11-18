# Portfolio — Merlin HENRY

Site portfolio statique (HTML / CSS / TypeScript) construit avec **Bun**, adapté du Figma « Portfolio perso ».
Responsive (mobile → grand écran), sans framework, publié sur un **VPS Apache** (https://portfolio.merlinhenry.fr).

---

## Livret d'instructions

### 1. Ce qu'il faut sur le PC

| Outil | Pourquoi | Vérifier |
|---|---|---|
| [Bun](https://bun.sh) | lancer, construire le site | `bun --version` |
| Git | envoyer sur GitHub | `git --version` |
| Blender 4.1 *(optionnel)* | métadonnées des nodes, rendu du trou noir | — |
| [Glaze](https://glaze.cs.uchicago.edu) *(optionnel)* | protéger tes créations contre l'IA | — |

> ⚠️ Mets le projet dans un dossier au **chemin court** (ex. `D:\projets web\Portfolio`).
> Windows limite les chemins à 260 caractères et la conversion d'images (`sharp`) échoue sinon.

### 2. Installer (une seule fois)

```bash
bun install
```

### 3. Travailler sur le site

```bash
bun run dev
```

Ouvre l'adresse affichée (ex. `http://localhost:3000`). La page se recharge toute seule à chaque modification.

### 4. Où se trouve quoi

```
assets-src/          ← tes ORIGINAUX (jamais publiés tels quels)
  projets/  shaders-3d/  references/  logos/  hero-trou-noir.png
  shaders/           ← exports JSON des shader nodes (addon Blender) + meta.json
src/
  pages/             ← les pages à modifier (index, projet-shaders-3d, 404…)
  partials/          ← head, header et footer communs à toutes les pages
  styles/main.css    ← tout le style (couleurs du Figma en haut du fichier)
  scripts/           ← menu mobile, visualiseur de nodes
  img/               ← images optimisées ET protégées (générées par « bun run images »)
  data/shaders/      ← graphes de nodes pour le site (générés par « bun run shaders »)
public/              ← robots.txt, ai.txt… copiés tels quels en ligne
protection/          ← registre des identifiants uniques de tes images
scripts/             ← outils (images, nodes, build, aperçu) + scripts/blender/
```

> Ne modifie pas `src/*.html` : ces fichiers sont **générés** depuis `src/pages/`.
> Le header et le footer se changent une seule fois dans `src/partials/`.

**Les pages** (adresse en ligne = nom du fichier sans `.html`) :

| Fichier `src/pages/` | Page |
|---|---|
| `index.html` | Accueil (hero, outils, projets) |
| `projets.html` | Tous les projets + filtres par catégorie |
| `biographie.html` | Parcours, chronologie, compétences |
| `a-propos.html` | Quel est ce site ? |
| `mentions-legales.html` | Mentions légales (éditeur, hébergeur, droits, IA) |
| `projet-site-matilda.html` | Site Matildas |
| `projet-olyvia.html` | Olyvia! |
| `projet-affiche.html` | Affiche évènementielle de Jazz |
| `projet-shaders-3d.html` | Les shaders en 3D (arbres de nodes interactifs) |
| `projet-montres.html` | TikTak, site de montres |
| `404.html` | Page introuvable |

**Ajouter un projet :** copie une page `projet-….html`, change les textes et images, puis ajoute sa carte
dans `index.html` et `projets.html` (attribut `data-cat="creation"`, `"communication"` ou `"programmation"` :
le compteur du filtre se met à jour tout seul).

### 5. Ajouter ou changer une image (avec protection)

1. *(Recommandé pour tes créations)* passe l'image dans **Glaze** et garde le fichier dont le nom contient `glazed`.
2. Dépose-la dans `assets-src/…` (ex. `assets-src/projets/mon-projet-glazed.png`).
3. Lance :
   ```bash
   bun run images
   ```
4. Utilise-la dans une page : `<img src="./img/projets/mon-projet.webp" alt="Description" loading="lazy">`
   (le suffixe `glazed` est retiré automatiquement du nom).

**Ce que fait `bun run images` sur chaque création :**
- conversion en **WebP** optimisé (≈ 10× plus léger) ;
- inscription d'un **identifiant unique** (`MH-2026-XXXXXXXXXXXX`), de ton copyright et des conditions d'utilisation dans les métadonnées (EXIF / XMP / IPTC) ;
- marqueur standard **« Data Mining : Prohibited »** (interdiction d'entraînement d'IA) ;
- enregistrement dans `protection/registre-images.json` (identifiant → fichier, empreinte SHA-256, date). Ce registre est versionné dans Git : l'historique des commits sert de preuve datée ;
- avertissement si une création n'est pas encore passée par Glaze.

Les dossiers `logos/` et `references/` (images qui ne sont pas de toi, comme la capture d'Interstellar) ne sont **jamais** marqués à ton nom.

Sur le site : `robots.txt` bloque les robots d'IA connus, `ai.txt`, la balise `noai, noimageai` et la réservation TDM (`tdm-reservation`) signalent le refus de fouille de données. Le clic droit / glisser-déposer sur les images est désactivé.

> **Limites (à connaître) :** aucune protection n'est absolue. Les métadonnées peuvent être effacées par
> quelqu'un qui le veut, les robots malhonnêtes ignorent `robots.txt`, et Glaze peut être atténué.
> L'ensemble décourage la réutilisation et te donne des **preuves d'antériorité**.
> Étapes suivantes possibles : filigrane invisible **TrustMark** (nécessite Python) et certificat **C2PA**.

### 6. Shader nodes interactifs

Les arbres de nodes sont affichés par un visualiseur maison (`src/scripts/node-viewer.ts`) au style Blender :
glisser pour se déplacer, pincer (mobile) ou clic puis molette (ordinateur) pour zoomer, boutons − + ⟲ ⤢ (plein écran),
flèches / + / − / 0 au clavier. Survoler un node met ses câbles en évidence.

**Ajouter un matériau :**
1. Exporte-le avec ton addon → copie le JSON dans `assets-src/shaders/` (ex. `mon-materiau.json`).
2. *(Recommandé)* génère les infos complémentaires (vrais noms des groupes, ports exacts, courbes) :
   ```bash
   "C:\Program Files\Blender Foundation\Blender 4.1\blender.exe" -b "D:\chemin\fichier.blend" --python scripts/blender/export_meta.py -- assets-src/shaders/meta.json
   ```
3. Convertis :
   ```bash
   bun run shaders
   ```
4. Déclare-le en haut de `src/scripts/node-viewer.ts` (une ligne `import` + une ligne dans `GRAPHS`),
   puis place-le dans une page : `<div class="node-viewer" data-graph="mon-materiau"></div>`
   (ajoute la classe `node-viewer--tall` pour un grand arbre).

### 7. Vérifier la version finale

```bash
bun run build
bun run preview
```

Ouvre `http://localhost:4173` : c'est exactement ce qui sera en ligne.

### 8. Mettre en ligne (VPS Apache)

Le site est servi par **Apache** sur le VPS (`185.157.244.202`, port SSH `23040`, utilisateur `etudiant`)
à l'adresse **https://portfolio.merlinhenry.fr**. C'est un site statique : pas de service à lancer,
Apache sert directement le dossier `/var/www/portfolio/dist`.

**Installation (une seule fois) :**
1. Chez **Infomaniak** → domaine `merlinhenry.fr` → **Zone DNS** → ajoute un enregistrement
   **A** : nom `portfolio`, valeur `185.157.244.202`.
2. Connecte-toi au VPS et lance le script d'installation :
   ```bash
   ssh -p 23040 etudiant@185.157.244.202
   ```
   ```bash
   curl -fsSL https://raw.githubusercontent.com/MerlinHenryPro/Portfolio/main/scripts/vps/installer.sh | bash
   ```
   Il installe ce qu'il faut (git, Bun, Apache, certbot), clone le dépôt dans `/var/www/portfolio`,
   construit le site, crée le VirtualHost Apache (`/etc/apache2/sites-available/portfolio.conf`)
   et le certificat HTTPS. Le mot de passe `sudo` est demandé.

**À chaque mise à jour (depuis ton PC) :**
```bash
git add .
git commit -m "Description du changement"
git push
bun run deploy
```
`bun run deploy` se connecte au VPS (mot de passe SSH demandé), récupère la dernière version de `main`
et reconstruit le site. Rien d'autre à redémarrer.

**Si quelque chose ne va pas (sur le VPS) :**
```bash
sudo tail -n 50 /var/log/apache2/portfolio-error.log
```

> Les commits sont signés avec ton nom (`git config user.name` / `user.email`) : tu es le seul contributeur.

### 9. Plus tard : le trou noir qui tourne au scroll

Le hero affiche pour l'instant le rendu fixe. Pour la version animée, lance le rendu de la séquence
(≈ 3 h sur la RTX 3060, peut être interrompu et repris : les images déjà faites sont gardées) :

```bash
"C:\Program Files\Blender Foundation\Blender 4.1\blender.exe" -b "D:\projets blender\Black hole\Black_hole_project.blend" --python scripts/blender/render_sequence_trou_noir.py -- "D:\projets blender\Black hole\web" 1 120 75 25 45 120
```
(paramètres : dossier de sortie, première et dernière image, résolution en %, montée de la caméra en degrés, rotation du disque en degrés, nombre d'images).
Il restera ensuite à brancher la séquence sur le scroll.
