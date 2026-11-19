# Usage de l'intelligence artificielle

## Outil utilisé

**Claude (Anthropic), via l'application Claude Code.** C'est le seul outil d'IA générative utilisé sur ce projet.

## Ce que j'ai fait moi-même

- **La maquette Figma :** la direction artistique, la charte graphique (couleurs, polices Lora et Outfit), la mise en page de toutes les pages.
- **Les contenus :** les textes de présentation, la biographie, les articles de projets.
- **Les visuels :** les créations des projets (affiche, Olyvia!, Matildas, TikTak), les rendus 3D et les shaders du trou noir dans Blender.
- **L'addon Blender** qui exporte les arbres de nodes en JSON, utilisé par le visualiseur du site.
- **La mise en ligne :** le sous-domaine et les enregistrements DNS chez Infomaniak, la connexion au VPS, l'activation du VirtualHost, le certificat HTTPS avec certbot.

## Ce que Claude a produit, étape par étape

| Étape | Ce que Claude a fait |
|---|---|
| Intégration | Il a écrit les pages et composants Astro et la configuration Tailwind (`src/`) à partir de ma maquette Figma, en version responsive. |
| Visualiseur de nodes | Il a écrit `src/scripts/node-viewer.ts`, qui affiche les arbres de nodes exportés par mon addon (déplacement, zoom, plein écran). Il a aussi écrit le script Blender `export_meta.py`, qui ajoute aux exports les numéros de ports et les courbes. |
| Images | Il a écrit `scripts/images.ts` : conversion en WebP et ajout d'un identifiant unique dans les métadonnées. |
| Mise en ligne | Le build plantait sur le VPS (« Illegal instruction » : le processeur n'a pas les instructions AVX2 demandées par Astro 7). Claude a trouvé la cause et proposé de construire le site sur mon PC. Il a écrit le script d'envoi `scripts/deploy.ts`, le script shell `scripts/vps/installer.sh` (configuration Apache) et le livret `LIVRET.md`. |
| Corrections | Il a corrigé des oublis et des erreurs de syntaxe, la page « Vite » affichée en HTTPS et le favicon WordPress resté en cache. |
| Mentions légales | Il a rédigé un premier jet que j'ai ensuite modifié. |


## Ce que j'ai modifié, corrigé ou rejeté

- **Images dans les nodes :** j'ai refusé les images dans les nodes, je voulais uniquement les arbres, explorables.
- **Passage en JavaScript :** Claude proposait de passer le code de l'addon blender en JavaScript, j'ai choisi de garder TypeScript.
- **Installation sur le VPS :** j'ai refusé toute installation de logiciel sur le VPS. Le script d'installation ne fait plus que configurer Apache.
- **DNS :** j'ai corrigé moi-même les enregistrements DNS en double (ancien site WordPress, IPv6).
