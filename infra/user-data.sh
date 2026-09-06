#!/bin/bash
# EC2 최초 부팅 시 1회 실행. 애플리케이션 파일은 배포하지 않고 실행 환경만 준비한다.
set -euxo pipefail

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl gnupg unzip

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
usermod -aG docker ubuntu

# 인스턴스 역할로 S3·SSM에 접근하므로 자격증명 파일을 두지 않는다.
ARCH=$(uname -m)
curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-${ARCH}.zip" -o /tmp/awscli.zip
unzip -q /tmp/awscli.zip -d /tmp
/tmp/aws/install
rm -rf /tmp/aws /tmp/awscli.zip

mkdir -p /opt/sangsok
chown ubuntu:ubuntu /opt/sangsok

# 2GB 인스턴스에서 빌드·마이그레이션 중 OOM을 피하기 위한 스왑.
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# 야간 DB 백업 (03:10 KST = 18:10 UTC)
cat > /opt/sangsok/backup.sh <<'SH'
#!/bin/bash
set -euo pipefail
cd /opt/sangsok
. ./.env
docker compose -f compose.prod.yaml exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip \
  | aws s3 cp - "s3://$S3_BUCKET/backups/$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
SH
chmod +x /opt/sangsok/backup.sh
echo '10 18 * * * ubuntu /opt/sangsok/backup.sh >> /var/log/sangsok-backup.log 2>&1' > /etc/cron.d/sangsok-backup
