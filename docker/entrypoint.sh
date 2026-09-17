#!/bin/sh
# Wasel Egypt trial entrypoint: bind Apache to $PORT and boot Laravel.
set -e

PORT="${PORT:-80}"
sed -i "s/__PORT__/${PORT}/g" /etc/apache2/sites-available/000-default.conf

# Real env vars (Render dashboard) override the baked .env file. If no
# APP_KEY was provided, mint an ephemeral one so the app can boot —
# sessions won't survive restarts until a stable APP_KEY is configured.
if [ -z "$APP_KEY" ]; then
  export APP_KEY="$(php artisan key:generate --show)"
  echo "APP_KEY was empty: generated an ephemeral key for this boot."
fi

# Safe no-op when the baked SQLite database is already migrated.
php artisan migrate --force
php artisan config:clear
php artisan cache:clear

exec apache2-foreground
