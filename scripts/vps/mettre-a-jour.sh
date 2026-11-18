#!/usr/bin/env bash
# Met à jour le site sur le VPS : récupère la dernière version de main et reconstruit dist/.
# Lancé automatiquement par « bun run deploy » depuis ton PC (ou à la main sur le VPS).
set -euo pipefail
export PATH="$HOME/.bun/bin:$PATH"
cd /var/www/portfolio
git pull --ff-only origin main
bun install --frozen-lockfile
bun run build
echo "✓ Site mis à jour : https://portfolio.merlinhenry.fr"
