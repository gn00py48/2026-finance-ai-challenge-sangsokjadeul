#!/bin/bash
# 최초 1회. 인증서가 없으면 nginx가 뜨지 않으므로 자체서명으로 시작한 뒤 Let's Encrypt로 교체한다.
set -euo pipefail

APP_DIR=${APP_DIR:-/opt/sangsok}
cd "$APP_DIR"
. ./.env
: "${DOMAIN:?}" "${EMAIL:?EMAIL=you@example.com 형태로 지정}"

C="docker compose -f compose.prod.yaml"

# nginx가 항상 뜰 수 있도록 하는 임시 인증서. 발급에 실패해도 이걸로 되돌려 놓는다.
selfsigned() {
  $C run --rm --entrypoint sh certbot -c "
    mkdir -p /etc/letsencrypt/live/$DOMAIN
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
      -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
      -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem -subj '/CN=$DOMAIN'"
}

$C run --rm --entrypoint sh certbot -c "[ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]" || selfsigned
$C up -d frontend
# 인증서가 없어 재시작 백오프에 걸려 있을 수 있다. 다시 띄우고 실제로 running이 될 때까지 기다린다.
$C restart frontend >/dev/null
for _ in $(seq 1 30); do
  [ "$(docker inspect -f '{{.State.Running}}' "$($C ps -q frontend)" 2>/dev/null)" = "true" ] && break
  sleep 2
done

# ACME 챌린지가 SPA fallback이 아니라 webroot에서 응답하는지 먼저 확인한다.
$C exec -T frontend sh -c "mkdir -p /var/www/certbot/.well-known/acme-challenge && echo ok > /var/www/certbot/.well-known/acme-challenge/probe"
if [ "$(curl -fsS --max-time 10 "http://$DOMAIN/.well-known/acme-challenge/probe" || true)" != "ok" ]; then
  echo "ACME 경로가 webroot에서 응답하지 않는다. DNS와 nginx 설정을 먼저 확인한다." >&2
  exit 1
fi

# certbot은 자기가 만들지 않은 live 디렉터리를 그대로 쓰지 못하므로 임시 인증서를 비운 뒤 발급한다.
$C run --rm --entrypoint sh certbot -c "rm -rf /etc/letsencrypt/live/$DOMAIN /etc/letsencrypt/archive/$DOMAIN /etc/letsencrypt/renewal/$DOMAIN.conf"
if ! $C run --rm --entrypoint certbot certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" \
      --email "$EMAIL" --agree-tos --no-eff-email --non-interactive; then
  echo "발급 실패. nginx가 계속 뜰 수 있도록 임시 인증서를 복구한다." >&2
  selfsigned
  $C restart frontend
  exit 1
fi

$C restart frontend
echo "발급 완료: https://$DOMAIN"
