# Marklight – engineered by EinfachDev · GPL-3.0-or-later
FROM php:8.3-apache

RUN a2enmod headers rewrite deflate mime \
 && a2dismod -f autoindex status \
 && sed -i 's/^Listen 80$/Listen 8080/' /etc/apache2/ports.conf \
 && rm -f /etc/apache2/sites-enabled/000-default.conf \
 && mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

COPY docker/apache.conf /etc/apache2/sites-enabled/marklight.conf
COPY docker/php.ini "$PHP_INI_DIR/conf.d/zz-marklight.ini"

WORKDIR /var/www/marklight
COPY --chown=root:root public ./public
COPY --chown=root:root src ./src
COPY --chown=root:root config ./config

# Code is read-only for the web server user; it only needs /tmp (rate limiter).
RUN chmod -R a-w /var/www/marklight

USER www-data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD curl -fsS -o /dev/null http://127.0.0.1:8080/robots.txt || exit 1
