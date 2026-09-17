# ── Stage 1: build the React SPA ──────────────────────────────────────────
# The frontend build auto-publishes into /app/public (see
# frontend/scripts/publish-to-laravel.mjs), so the final image serves the
# SPA + the Laravel API from a single origin (no CORS needed).
FROM node:20-bookworm-slim AS frontend

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Laravel 12 + Apache runtime with baked SQLite data ────────────
FROM php:8.2-apache-bookworm

ENV DEBIAN_FRONTEND=noninteractive

# PHP extensions required by laravel/framework + SQLite/MySQL drivers.
RUN apt-get update && apt-get install -y --no-install-recommends \
        git unzip libzip-dev libsqlite3-dev \
    && docker-php-ext-install -j$(nproc) pdo pdo_mysql pdo_sqlite mbstring zip bcmath \
    && a2enmod rewrite \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Trial traffic does full-network journey planning; give PHP room to finish.
RUN printf 'max_execution_time=180\nmemory_limit=256M\n' \
        > /usr/local/etc/php/conf.d/wasel-trial.ini

# Apache serves Laravel's public/ and listens on $PORT (injected by Render).
COPY docker/apache/vhost.conf /etc/apache2/sites-available/000-default.conf
RUN echo 'Listen ${PORT:-80}' > /etc/apache2/ports.conf

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Application source (data archives under storage/app/gtfs-sources and
# storage/app/osm-sources are committed to git for reproducible builds).
COPY . ./
COPY --from=frontend /app/public ./public

RUN cp .env.example .env \
    && touch database/database.sqlite \
    && composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction \
    && php artisan key:generate --force \
    && php artisan migrate --force \
    && php artisan db:seed --force \
    && php artisan gtfs:import storage/app/gtfs-sources/mdb-3355-latest.zip \
        --source-name=mobilitydb:mdb-3355 \
        --source-url=https://mobilitydatabase.org/feeds/gtfs/mdb-3355 \
        --source-version=cairo \
        --license=CC-BY-NC-SA-2.0 \
        --service-start=2026-09-01 --service-end=2027-09-01 \
        --agency-mode-map='{"CTA":"bus","CTA_M":"minibus","MM":"bus","GRN":"bus","LTRA_M":"minibus","P_O_14":"microbus","P_B_8":"microbus","COOP":"minibus","BOX":"microbus","PGT":"microbus","NAT":"metro"}' \
    && php artisan osm:metro-import \
        --file=storage/app/osm-sources/cairo-metro-relations.json \
        --service-start=2026-09-01 --service-end=2027-09-01 \
    && php artisan tfc:fare-import \
    && php artisan cache:clear \
    && php artisan config:clear \
    && php artisan transit:quality-report \
    && chown -R www-data:www-data storage bootstrap/cache database \
    && chmod -R ug+w storage bootstrap/cache database

EXPOSE 80

COPY docker/entrypoint.sh /usr/local/bin/wasel-entrypoint.sh
RUN chmod +x /usr/local/bin/wasel-entrypoint.sh

CMD ["/usr/local/bin/wasel-entrypoint.sh"]
