#!/bin/bash
# 최초 1회. 인증서가 없으면 nginx가 뜨지 않으므로 자체서명으로 시작한 뒤 Let's Encrypt로 교체한다.
set -euo pipefail

APP_DIR=${APP_DIR:-/opt/sangsok}
cd "$APP_DIR"
. ./.env
: "${DOMAIN:?}" "${EMAIL:?EMAIL=you@example.com 형태로 지정}"

C="docker compose -f compose.prod.yaml"

# 1) nginx가 뜰 수 있도록 임시 자체서명 인증서
$C run --rm --entrypoint sh certbot -c "
  mkdir -p /etc/letsencrypt/live/$DOMAIN
  [ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ] || openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
    -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem -subj '/CN=$DOMAIN'"

$C up -d frontend

# 2) 진짜 인증서 발급. DuckDNS A 레코드가 이 서버의 EIP를 가리키고 있어야 한다.
$C run --rm --entrypoint sh certbot -c "
  rm -rf /etc/letsencrypt/live/$DOMAIN /etc/letsencrypt/archive/$DOMAIN /etc/letsencrypt/renewal/$DOMAIN.conf
  certbot certonly --webroot -w /var/www/certbot -d $DOMAIN --email $EMAIL --agree-tos --no-eff-email --non-interactive"

$C exec frontend nginx -s reload
echo "발급 완료: https://$DOMAIN"
