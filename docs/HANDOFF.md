# 개발 인수인계 및 현재 구현 상태

최종 갱신: 2026-09-06  
기준 브랜치: `dev`. PR #2(MVP), #3(S3·마스킹·refresh token·로드맵 이관·배포 구성),
#4(배포 중 발견한 TLS 부트스트랩 수정), #5(COMMON-04 챗봇 예외 처리),
#6(HANDOFF 갱신), #7(UI)이 머지되었다. WARN-01 공식 링크 노출 PR이 열려 있다.

**운영 배포됨: https://sangsokjadeul.duckdns.org** — `dev` 최신 코드가 반영되어 있다. 상세는 아래 "운영 배포 현황".

## 작업 시작 체크리스트

```powershell
git status --short
git branch --show-current
git log --oneline -10
git remote -v
git diff --stat
```

1. 기존 미커밋 변경을 삭제하거나 stash하지 않는다.
2. `git pull`, merge, rebase 전에 현재 변경 파일과 담당자 작업 범위를 비교한다.
3. `.env.local`이 없으면 `.env.example`을 복사하고 로컬 비밀값을 넣는다.
4. 백엔드 테스트와 프론트 빌드를 통과시킨 뒤 기능 작업을 시작한다.
5. 공통 충돌 가능 파일은 수정 전에 팀에 알린다.

## 현재 아키텍처

- Backend: Java 17, Spring Boot 4.1.1, Maven, Spring MVC/Security/JPA, JWT, Flyway, PostgreSQL/H2
- Frontend: React 19, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS
- AI: `AiDocumentAnalyzer`, `AiChatService` 인터페이스 아래 Mock/OpenAI 구현체 교체
- 개인정보: `pii` 패키지가 AI 전송 전 문서를 이미지로 재렌더링하고 주민등록번호·계좌번호를 픽셀 단위로 지운다
- 문서 저장: `DocumentStorage` 인터페이스 아래 `local`(개발)과 `s3`(운영) 구현. `STORAGE_TYPE`으로 전환
- 인증: access token(15분) + HttpOnly 쿠키의 refresh token(14일, 회전·폐기)
- 로컬 통합 실행: Docker Compose + PostgreSQL + Nginx
- 운영: AWS 단일 EC2에 `compose.prod.yaml`. 시크릿은 SSM Parameter Store, 문서는 S3, 인증서는 Let's Encrypt

## 기능명세서 구현 현황

| 기능 ID | 기능 | 상태 | 관련 영역 | 남은 작업 |
| --- | --- | --- | --- | --- |
| COMMON-01 | 기한·불확실성 규칙 | 완료 | `roadmap/DeadlinePolicy` | 법령 변경 시 정책 버전 갱신 |
| COMMON-02 | AI 판단 제한 | 완료 | `ai`, `chat` | 프롬프트 회귀 평가 고도화 |
| COMMON-03 | 상태·데이터 관리 | 부분 구현 | JPA 전 도메인 | 변경 영향 규칙 세분화 |
| ONB-01 | 단계형 기본정보 | 완료 | `CaseController`, `/onboarding` | 완료 절차 입력 UI 고도화 |
| ONB-02 | 파악 상태 선택 | 완료 | onboarding | 없음 |
| ONB-03 | 문서 업로드 | 완료 | `DocumentController`, upload page | 없음 (S3 저장, 사용자 삭제 지원) |
| ONB-04 | AI 분석·검수·확정 | 완료 | `document`, `ai`, documents page | 운영 키를 사용한 라이브 호출 검증 |
| ONB-05 | 직접 입력 | 완료 | `FinancialController`, financial page | 입력 UX 고도화 |
| ONB-06 | 규칙 로드맵 생성 | 완료 | `RoadmapService` | 규칙 케이스 확대 |
| MAIN-01~05 | 대시보드 | 완료 | dashboard page/API | 가로 로드맵 터치 UX 점검 |
| INFO-01~04 | 내 상속 정보 | 완료 | info/edit pages, `GET /api/documents/{id}/file` | 없음 |
| EDIT-01~02 | 통합 수정·영향 검사 | 완료 | edit/financial APIs | 영향 설명 세분화 |
| TASK-01~03 | 단계 상세·결과·취소 | 완료 | roadmap controller/pages | 단계 유형별 결과 폼 세분화 |
| WARN-01 | 전체 주의사항 | 완료 | warning API/page | 필터는 카테고리 6칩, 공식 링크는 warning의 관련 step에서 상속 |
| COMMON-04 | AI 챗봇 화면 바로가기 | 완료 | `chat`, `OpenAiChatService`, floating chat | 사건 요약 컨텍스트 확대 |
| AUTH | 가입·로그인·JWT·소유권 | 완료 | `auth`, `SecurityConfig` | 없음 (refresh token 회전·폐기 구현) |

`완료`는 현재 MVP 흐름이 API·DB·화면까지 연결된 상태를 뜻한다. 실제 기관 조회나 법률·세무 판단 기능은 요구사항상 구현 대상이 아니다.

## 현재 동작하는 시연 흐름

1. `demo / demo1234` 로그인 또는 회원가입
2. 사건 기본정보 입력
3. 샘플 문서 또는 PDF/이미지 업로드(동의 필수)
4. Mock/OpenAI 분석 실행
5. 분석 후보 수정·삭제 후 확정
6. 맞춤 로드맵 생성
7. 대시보드 최우선 업무 확인
8. 챗봇에 `업로드한 문서 보여줘` 입력 후 등록 문서 이동
9. 단계 완료 및 다음 단계 활성화
10. 재산·채무 수정 후 영향 확인과 로드맵 재계산

## 실행 방법

### Docker Compose 권장

```powershell
Copy-Item .env.example .env.local
# .env.local의 AI_API_KEY, JWT_SECRET, POSTGRES_PASSWORD를 실제 로컬 값으로 변경
docker compose --env-file .env.local up --build
```

- 웹: `http://localhost:5173`
- 백엔드 상태: `http://localhost:5173/api/actuator/health`
- 종료: `docker compose --env-file .env.local down`
- DB와 문서 볼륨까지 삭제하는 `down -v`는 데이터 삭제이므로 임의 실행하지 않는다.

Mock으로 비용 없이 실행하려면 `.env.local`에서 `AI_PROVIDER=mock`으로 바꾼다. 실제 OpenAI 모드는 `AI_PROVIDER=openai`, `AI_API_KEY`, `AI_MODEL`을 사용한다. API 키는 채팅·Git·Dockerfile·Compose 파일에 직접 넣지 않는다.

### 네이티브 개발

```powershell
npm ci
npm run dev
```

별도 터미널에서 필요한 환경변수를 IDE Run Configuration 또는 PowerShell 프로세스에 주입하고:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Spring Boot는 일반 `.env`를 자동 로드하지 않는다. 네이티브 실행은 IDE 환경변수를 사용하고, `.env.local` 자동 주입은 Compose 실행에서 담당한다.

## 검증 명령과 마지막 결과

```powershell
npm run lint
npm run build
cd backend
.\mvnw.cmd test
```

- Backend: 19 tests passed (tesseract가 없는 환경에서는 마스킹 실동작 테스트 1개가 skip된다)
- Frontend lint / production build: passed
- Docker 이미지: GitHub Actions에서 linux/amd64·linux/arm64 빌드 후 GHCR push 성공
- 마스킹 실동작: 렌더한 `900101-1234567`을 마스킹한 뒤 재-OCR에서 숫자가 사라지는 것 확인
- 배포 검증: HTTPS 헬스체크 UP, HTTP→HTTPS 301(딥링크 포함), HSTS `max-age=31536000`, 로그인 200,
  refresh 쿠키 `Secure; HttpOnly; SameSite=Strict`
- 챗봇 운영 확인: 범위 밖 입력은 이동하지 않고 주요 메뉴를 주고, 모호한 입력은 후보를 주며, 명확한 키워드는 바로 이동한다
- 실제 OpenAI 네트워크 호출: 미실행. 운영은 `AI_PROVIDER=mock`이고 `AI_API_KEY`는 자리표시자다
- OpenAI 요청 계약: 로컬 가짜 HTTP 서버로 JSON Schema와 `store=false` 검증 통과

JDK가 없는 환경에서는 CI와 같은 컨테이너로 검증한다.

```bash
cd backend
docker run --rm -u "$(id -u):$(id -g)" -v "$PWD":/app -w /app -v "$HOME/.m2":/var/maven/.m2 \
  -e MAVEN_CONFIG=/var/maven/.m2 -e HOME=/var/maven \
  maven:3.9.11-eclipse-temurin-17 mvn -B -Duser.home=/var/maven verify
```

## 운영 배포 현황

| 항목 | 값 |
| --- | --- |
| 주소 | https://sangsokjadeul.duckdns.org |
| AWS 계정 / 리전 | `245324547761` / `ap-northeast-2` |
| EC2 | `i-05c15888efd92d75d` (t4g.small, arm64) |
| 고정 IP | `3.35.82.92` (DuckDNS A 레코드가 이 값을 가리킨다) |
| 문서 버킷 | `sangsokjadeul-documents-245324547761` (`documents/`), DB 백업은 `backups/` |
| 인증서 | Let's Encrypt, 2026-12-05 만료. certbot 컨테이너가 12시간마다 갱신 시도, nginx는 6시간마다 reload |
| 이미지 | `ghcr.io/gn00py48/2026-finance-ai-challenge-sangsokjadeul/{backend,frontend}:latest` (public) |

인프라는 `infra/`의 Terraform으로 만들었다. 상태 파일 `infra/terraform.tfstate`는 Git에 없으므로
만든 사람의 로컬에만 있다. 잃어버리면 `terraform destroy`로 정리할 수 없고 콘솔에서 수동으로 지워야 한다.

### 운영 명령

접속은 22번 포트 대신 SSM Session Manager를 쓴다.

```bash
aws ssm start-session --target i-05c15888efd92d75d   # AWS_PROFILE 지정 필요
sudo -iu ubuntu && cd /opt/sangsok

./deploy/deploy.sh                    # .env 재생성이나 compose 변경이 있을 때만 필요
docker compose -f compose.prod.yaml ps
docker compose -f compose.prod.yaml logs -f backend
```

**코드 배포는 자동이다.** `dev` 브랜치가 갱신되면 GitHub Actions가 GHCR에 새 이미지(`:latest`)를
올리고, EC2의 `watchtower` 컨테이너가 60초 간격으로 감지해 `backend`, `frontend` 컨테이너를 다시
pull하고 재기동한다. `deploy.sh`는 SSM 파라미터가 바뀌었거나 `compose.prod.yaml` 자체가 바뀌었을
때만 수동으로 돌린다.

설정값은 SSM Parameter Store `/sangsok/*`에 있다. 바꾸려면 파라미터를 `--overwrite`로 갱신한 뒤
`deploy.sh`를 다시 실행한다. 서버의 `.env`를 직접 고치면 다음 배포에서 덮어써진다.

```bash
aws ssm put-parameter --name /sangsok/AI_PROVIDER --overwrite --type String --value openai
aws ssm put-parameter --name /sangsok/AI_API_KEY --overwrite --type SecureString --value "<키>"
```

### 비용

월 약 $22. EC2 $15.18 + EBS 20GB $1.82 + 공인 IPv4 $3.65 + S3·전송 $0 수준.
SSM 파라미터, Session Manager, 예산 알림, IAM, 보안그룹은 무료다.
예산 알림은 월 $25의 80% 도달과 초과 예상 시 메일로 온다.
쓰지 않는 기간에는 `terraform destroy`가 유일한 완전 정지 수단이다. 인스턴스만 stop하면 EBS와 IP 요금은 계속 나간다.

## 다음 우선순위

1. **실문서로 마스킹 검증.** 은행 거래내역서 등 실제 계좌번호 표기가 있는 PDF로 `PiiPatterns`를 확인한다.
   현재 규칙은 "구분자 포함 숫자 10자리 이상"이라 콤마 없는 10억 이상 금액이 함께 가려질 수 있다.
   검증 전까지 운영은 `AI_PROVIDER=mock`으로 둔다.
2. 마스킹 검증 후 OpenAI 실키로 전환하고 PDF/PNG 라이브 E2E 확인.
3. 단계 유형별 결과 입력 폼. 현재 `resultText`가 "사용자 입력"으로 하드코딩되어 있다.
4. 로그 마스킹, DB 백업 복구 리허설, 탈퇴·보존 정책 확정.

### 자주 묻는 것

브라우저에 "주의 요함"이 뜨는데 같은 창에 "인증서가 유효함"이 함께 보이면, 그 탭이 `http://`로 열린 것이다.
인증서 발급 전에 접속한 페이지가 캐시에 남아 SPA 라우팅만 이어진 경우에 그렇다. `https://`를 명시해 한 번
열면 HSTS가 등록되어 이후에는 브라우저가 요청 전에 스스로 https로 바꾼다. 서버는 딥링크까지 301로 넘긴다.

### 미해결 관찰

`DemoDataConfig`에 `@Profile("!prod")`가 붙어 있고 운영 프로필이 `prod`인데도 `demo` 계정이 생성되었다.
배포된 이미지에는 해당 어노테이션이 들어 있음을 확인했으나 원인은 규명하지 못했다.
심사위원이 회원가입 없이 확인할 수 있도록 `demo` 계정은 의도적으로 유지하는 것이므로 동작 자체는 문제가 없다.
정리한다면 어노테이션을 제거해 "운영에도 데모 계정을 둔다"는 의도를 코드에 드러내는 편이 낫다.

## 충돌 가능성이 높은 파일

- `backend/pom.xml`, `application.properties`, `application-prod.properties`
- `domain/Models.java`, `domain/Enums.java`, Flyway `V1__initial_schema.sql`, `V2__refresh_token.sql`
- `auth/SecurityConfig.java`, `auth/AuthController.java`
- `frontend/src/App.tsx`, `frontend/src/index.css`, `frontend/src/shared/api/client.ts`, Router 구성
- `package-lock.json`, `compose.yaml`, `compose.prod.yaml`, `README.md`
- `infra/*.tf`, `deploy/*` — 배포 중이면 서버 반영 여부까지 함께 확인한다

새 DB 변경은 기존 마이그레이션을 수정하지 않고 `V3__...sql`부터 추가한다.
