# 모노레포 실행·배포

GitHub 저장소 하나에서 웹과 API를 각각 빌드한다. 로컬 통합 환경은 `compose.yaml`로 PostgreSQL, Spring Boot API, Nginx 웹을 실행한다. 실제 운영 호스팅 업체는 아직 선택하지 않았다.

| 서비스 | 빌드 기준 경로 | 명령 | 산출물/실행 |
| --- | --- | --- | --- |
| web | 저장소 루트 | `npm ci && npm run build` | `frontend/dist` 정적 호스팅 |
| api | `backend` | `sh mvnw -B verify` | `java -jar target/api-0.0.1-SNAPSHOT.jar` |

웹은 npm workspace의 루트 package-lock.json을 사용하므로 설치 기준을 저장소 루트로 설정합니다. 배포 UI가 프로젝트 디렉터리로 `frontend`을 요구하면 저장소 상위 파일 접근을 허용하고 설치는 `cd .. && npm ci`, 빌드는 해당 디렉터리에서 `npm run build`, 산출물은 `dist`로 지정합니다. 공급자별 실제 지원 방식은 선택 후 검증합니다.

API는 backend 전체를 빌드 컨텍스트에 포함한다. JDK 17 빌드/JRE 17 실행 환경이 필요하고 런타임 `PORT`를 지원한다. 인증과 PostgreSQL 연결은 구현되어 있으며 Flyway가 배포 시작 시 마이그레이션을 검증·적용한다.

## 로컬 Docker Compose

```powershell
Copy-Item .env.example .env.local
# .env.local의 POSTGRES_PASSWORD, JWT_SECRET, AI_API_KEY 변경
docker compose --env-file .env.local up --build
```

`AI_PROVIDER=mock`은 비용 없는 로컬 검증용이고 `openai`는 Responses API 실연동이다. `.env.local`은 Git 및 Docker 빌드 컨텍스트에서 제외된다. 데이터베이스와 문서는 named volume에 남기므로 단순 `down`으로 삭제되지 않는다.

## AWS 단일 EC2 배포

요금을 최소화하기 위해 로드밸런서와 RDS를 쓰지 않는다. EC2 한 대에서 앱·Nginx·PostgreSQL을 함께 돌리고,
문서 원본만 S3로 분리한다. 인증서는 DuckDNS 서브도메인 + Let's Encrypt로 무료 발급한다.

| 구성요소 | 선택 | 이유 |
| --- | --- | --- |
| 컴퓨트 | EC2 `t4g.small` 1대 + EIP | ALB(월 약 $18) 미사용. Nginx가 직접 TLS 종료 |
| DB | 같은 인스턴스의 postgres 컨테이너 | RDS 미사용. 야간 `pg_dump` → S3 백업 |
| 문서 | S3 버킷 (`documents/` 프리픽스) | EBS 증설·백업 부담 제거, 인스턴스 교체와 무관하게 보존 |
| 시크릿 | SSM Parameter Store SecureString | 표준 파라미터는 무료. Secrets Manager는 시크릿당 월 $0.40 |
| 이미지 | GitHub Actions 빌드 → GHCR | 2GB 인스턴스에서 빌드하지 않는다 |
| 접속 | SSM Session Manager | 기본값은 22번 포트를 열지 않는다 |

자격증명은 EC2 인스턴스 프로파일로만 주입한다. 액세스 키를 `.env`나 이미지에 넣지 않는다.

### 1. 인프라 생성

```bash
cd infra
terraform init
terraform apply -var bucket_name=<전역에서 고유한 버킷 이름>
```

출력값 `public_ip`, `bucket`, `instance_id`를 받아둔다.

### 2. DuckDNS

[duckdns.org](https://www.duckdns.org)에서 서브도메인을 만들고 위 `public_ip`를 A 레코드로 지정한다.
EIP는 고정이므로 갱신 스크립트는 필요 없다.

### 3. 시크릿 등록

```bash
P=/sangsok
aws ssm put-parameter --name $P/POSTGRES_DB --type String --value sangsok
aws ssm put-parameter --name $P/POSTGRES_USER --type String --value sangsok
aws ssm put-parameter --name $P/POSTGRES_PASSWORD --type SecureString --value "$(openssl rand -base64 24)"
aws ssm put-parameter --name $P/JWT_SECRET --type SecureString --value "$(openssl rand -base64 48)"
aws ssm put-parameter --name $P/AI_PROVIDER --type String --value mock
aws ssm put-parameter --name $P/AI_API_KEY --type SecureString --value "<OpenAI 키>"
aws ssm put-parameter --name $P/AI_MODEL --type String --value gpt-4.1-nano
aws ssm put-parameter --name $P/S3_BUCKET --type String --value "<버킷 이름>"
aws ssm put-parameter --name $P/DOMAIN --type String --value "<서브도메인>.duckdns.org"
aws ssm put-parameter --name $P/BACKEND_IMAGE --type String --value ghcr.io/<owner>/<repo>/backend:latest
aws ssm put-parameter --name $P/FRONTEND_IMAGE --type String --value ghcr.io/<owner>/<repo>/frontend:latest
```

개인정보 마스킹 파이프라인이 들어가기 전까지 `AI_PROVIDER`는 `mock`으로 둔다.

### 4. 애플리케이션 파일 배치와 첫 배포

`compose.prod.yaml`과 `deploy/`를 인스턴스의 `/opt/sangsok`에 올린다. GHCR 패키지를 public으로 두면
서버에서 레지스트리 로그인이 필요 없다.

```bash
aws ssm start-session --target <instance_id>
sudo -iu ubuntu
cd /opt/sangsok
./deploy/deploy.sh                       # SSM에서 .env 생성 후 pull & up
EMAIL=you@example.com ./deploy/bootstrap-tls.sh   # 최초 1회, 인증서 발급
```

이후 재배포는 `./deploy/deploy.sh` 한 줄이다. 인증서 갱신은 certbot 컨테이너가 12시간마다 시도하고,
Nginx는 6시간마다 reload해서 갱신된 인증서를 다시 읽는다.

### 확인

```bash
curl -fsS https://<도메인>/api/actuator/health
```

## 운영 배포 원칙

- `SPRING_PROFILES_ACTIVE=prod`를 사용한다.
- `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`을 배포 플랫폼 Secret으로 주입한다.
- 운영 서버에 저장소의 `.env.local`을 복사하거나 컨테이너 이미지에 포함하지 않는다.
- 웹 `/api/*`는 API 서비스로 reverse proxy하고 외부 통신은 HTTPS만 허용한다.
- PostgreSQL 백업·복구, 문서 저장소 암호화·수명주기, 로그 마스킹을 배포 전에 검증한다.
- 문서 원본은 `STORAGE_TYPE=s3`로 S3 비공개 버킷에 저장한다. `local`은 개발 전용이다.

## 웹 URL 하위 경로 배포

저장소 디렉터리 지정과 URL 경로는 별개입니다. `/compass/` URL 아래에 배포한다면 빌드 시 `VITE_BASE_PATH=/compass/`를 설정합니다. 이후 React Router 도입 시 동일한 basename을 사용하고 해당 경로의 SPA fallback을 index.html로 설정해야 합니다.
`VITE_API_BASE_URL` 기본값은 `/api`입니다. 개발 프록시는 배포 빌드에 포함되지 않으므로 운영 reverse proxy에서 `/api/*`를 API 서버로 전달해야 합니다. 서로 다른 도메인을 사용하면 CORS·쿠키·CSRF 설정을 함께 조정합니다.

## GitHub와 CI/CD

원격은 기존 GitHub 저장소를 사용한다. 현재 작업은 커밋·push하지 않았다. 최초 push 전에 `git status`, `git diff --stat`, 비밀키 및 업로드 원본 포함 여부를 확인한다. CI는 양쪽 프로젝트를 검증하며, 실제 배포 단계에서는 Secret을 CI 변수로 주입하고 이미지 레지스트리·호스팅 선택 후 배포 작업을 별도 추가한다.
