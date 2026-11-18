#!/usr/bin/env bash
# =============================================================================
# Installation du portfolio sur le VPS (à lancer UNE SEULE FOIS, sur le VPS)
#
#   ssh -p 23040 etudiant@185.157.244.202
#   curl -fsSL https://raw.githubusercontent.com/MerlinHenryPro/Portfolio/main/scripts/vps/installer.sh | bash
#
# Prérequis : un enregistrement DNS « A » portfolio.merlinhenry.fr → 185.157.244.202 (Infomaniak)
# =============================================================================
set -euo pipefail

DOMAINE="${DOMAINE:-portfolio.merlinhenry.fr}"
DEPOT="https://github.com/MerlinHenryPro/Portfolio.git"
DOSSIER="/var/www/portfolio"
EMAIL="${EMAIL:-henrymerlin.pro@gmail.com}"

echo "==> 1/6 Paquets nécessaires (git, curl, unzip, apache, certbot)"
sudo apt-get update -qq
sudo apt-get install -y -qq git curl unzip apache2 certbot python3-certbot-apache

echo "==> 2/6 Bun"
if ! command -v bun >/dev/null 2>&1 && [ ! -x "$HOME/.bun/bin/bun" ]; then
  curl -fsSL https://bun.sh/install | bash
fi
export PATH="$HOME/.bun/bin:$PATH"
bun --version

echo "==> 3/6 Récupération du site dans $DOSSIER"
sudo mkdir -p "$DOSSIER"
sudo chown -R "$USER:$USER" "$DOSSIER"
if [ -d "$DOSSIER/.git" ]; then
  git -C "$DOSSIER" pull --ff-only origin main
else
  git clone "$DEPOT" "$DOSSIER"
fi

echo "==> 4/6 Construction du site (dist/)"
cd "$DOSSIER"
bun install --frozen-lockfile
bun run build

echo "==> 5/6 Configuration Apache pour $DOMAINE"
sudo a2enmod -q rewrite headers expires ssl >/dev/null
sudo tee "/etc/apache2/sites-available/portfolio.conf" >/dev/null <<APACHE
<VirtualHost *:80>
    ServerName $DOMAINE
    DocumentRoot $DOSSIER/dist

    <Directory $DOSSIER/dist>
        Options -Indexes -MultiViews +FollowSymLinks
        AllowOverride None
        Require all granted

        RewriteEngine On
        # /projets  ->  projets.html
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteCond %{REQUEST_FILENAME}.html -f
        RewriteRule ^(.+?)/?$ \$1.html [L]
    </Directory>

    ErrorDocument 404 /404.html

    # Refus de l'utilisation des contenus par les IA
    Header set X-Robots-Tag "noai, noimageai"
    Header set tdm-reservation "1"
    # Sécurité de base
    Header set X-Content-Type-Options "nosniff"
    Header set Referrer-Policy "strict-origin-when-cross-origin"

    # Cache long pour les fichiers versionnés (nom avec empreinte), court pour les pages
    <LocationMatch "^/assets/">
        Header set Cache-Control "public, max-age=31536000, immutable"
    </LocationMatch>
    <FilesMatch "\.html$">
        Header set Cache-Control "no-cache"
    </FilesMatch>

    ErrorLog \${APACHE_LOG_DIR}/portfolio-error.log
    CustomLog \${APACHE_LOG_DIR}/portfolio-access.log combined
</VirtualHost>
APACHE
sudo a2ensite -q portfolio.conf >/dev/null
sudo apache2ctl configtest
sudo systemctl reload apache2

echo "==> 6/6 Certificat HTTPS (Let's Encrypt)"
if getent hosts "$DOMAINE" >/dev/null; then
  sudo certbot --apache -d "$DOMAINE" --non-interactive --agree-tos -m "$EMAIL" --redirect
else
  echo "!! Le domaine $DOMAINE ne pointe pas encore vers ce serveur."
  echo "   Ajoute l'enregistrement DNS A chez Infomaniak, attends quelques minutes, puis lance :"
  echo "   sudo certbot --apache -d $DOMAINE --redirect"
fi

echo
echo "✓ Terminé : https://$DOMAINE"
