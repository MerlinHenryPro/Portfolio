#!/usr/bin/env bash
# =============================================================================
# Installation du portfolio sur le VPS (à lancer UNE SEULE FOIS, sur le VPS)
#
#   ssh -p 23040 etudiant@185.157.244.202
#   curl -fsSL https://raw.githubusercontent.com/MerlinHenryPro/Portfolio/main/scripts/vps/installer.sh | bash
#
# Prérequis :
#  - un enregistrement DNS « A » portfolio.merlinhenry.fr → 185.157.244.202 (Infomaniak)
#  - Apache et certbot déjà installés sur le VPS (fait pendant le TP)
#  - le site déjà envoyé depuis le PC avec « bun run deploy »
#
# Le site n'est PAS construit sur le VPS : son processeur n'a pas les instructions AVX2
# dont le compilateur d'Astro 7 a besoin. Il est construit sur le PC et seul dist/ est envoyé.
# =============================================================================
set -euo pipefail

DOMAINE="${DOMAINE:-portfolio.merlinhenry.fr}"
DOSSIER="/var/www/portfolio"
EMAIL="${EMAIL:-henrymerlin.pro@gmail.com}"

for outil in apache2ctl certbot; do
  command -v "$outil" >/dev/null 2>&1 || { echo "!! « $outil » est introuvable sur le VPS : installe-le puis relance ce script."; exit 1; }
done

echo "==> 1/3 Vérification du site dans $DOSSIER/dist"
if [ ! -f "$DOSSIER/dist/index.html" ]; then
  echo "!! $DOSSIER/dist est vide. Depuis ton PC, lance d'abord : bun run deploy"
  exit 1
fi

echo "==> 2/3 Configuration Apache pour $DOMAINE"
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

echo "==> 3/3 Certificat HTTPS (Let's Encrypt)"
if getent hosts "$DOMAINE" >/dev/null; then
  sudo certbot --apache -d "$DOMAINE" --non-interactive --agree-tos -m "$EMAIL" --redirect
else
  echo "!! Le domaine $DOMAINE ne pointe pas encore vers ce serveur."
  echo "   Ajoute l'enregistrement DNS A chez Infomaniak, attends quelques minutes, puis lance :"
  echo "   sudo certbot --apache -d $DOMAINE --redirect"
fi

echo
echo "✓ Terminé : https://$DOMAINE"
