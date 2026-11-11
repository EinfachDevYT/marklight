#!/bin/sh
# Downloads the free "IP to Country Lite" database by DB-IP (CC BY 4.0) for nginx GeoIP2.
# Run monthly, e.g. /etc/cron.monthly/marklight-geoip → sh /var/www/marklight-web/scripts/update-geoip.sh
set -eu
DIR=/usr/share/GeoIP
DB="$DIR/dbip-country-lite.mmdb"
TMP=$(mktemp)
trap 'rm -f "$TMP" "$DB.new"' EXIT
mkdir -p "$DIR"
for month in "$(date +%Y-%m)" "$(date -d '-1 month' +%Y-%m)"; do
  if curl -fsSL "https://download.db-ip.com/free/dbip-country-lite-$month.mmdb.gz" -o "$TMP"; then
    gunzip -c "$TMP" > "$DB.new"
    mv "$DB.new" "$DB"
    chmod 644 "$DB"
    echo "GeoIP database updated ($month)."
    exit 0
  fi
done
echo "GeoIP download failed – keeping the existing database." >&2
exit 1
