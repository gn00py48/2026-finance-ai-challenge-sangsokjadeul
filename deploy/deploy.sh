#!/bin/bash
# EC2 인스턴스 위에서 실행한다. /opt/sangsok 에 compose.prod.yaml 과 deploy/ 가 있어야 한다.
# 시크릿은 저장소에 두지 않고 SSM Parameter Store에서 매번 읽어 .env 로 만든다.
set -euo pipefail

APP_DIR=${APP_DIR:-/opt/sangsok}
PROJECT=${PROJECT:-sangsok}
REGION=${AWS_REGION:-ap-northeast-2}
cd "$APP_DIR"

param() { aws ssm get-parameter --name "/$PROJECT/$1" --with-decryption --region "$REGION" --query Parameter.Value --output text; }

umask 077
cat > .env <<EOF
POSTGRES_DB=$(param POSTGRES_DB)
POSTGRES_USER=$(param POSTGRES_USER)
POSTGRES_PASSWORD=$(param POSTGRES_PASSWORD)
JWT_SECRET=$(param JWT_SECRET)
AI_PROVIDER=$(param AI_PROVIDER)
AI_API_KEY=$(param AI_API_KEY)
AI_MODEL=$(param AI_MODEL)
S3_BUCKET=$(param S3_BUCKET)
DOMAIN=$(param DOMAIN)
BACKEND_IMAGE=$(param BACKEND_IMAGE)
FRONTEND_IMAGE=$(param FRONTEND_IMAGE)
AWS_REGION=$REGION
EOF

docker compose -f compose.prod.yaml pull
docker compose -f compose.prod.yaml up -d
docker image prune -f
