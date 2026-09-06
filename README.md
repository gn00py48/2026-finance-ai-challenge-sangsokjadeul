# 상속나침반

사용자가 입력하거나 동의 후 업로드한 정보를 실행 가능한 상속 절차 로드맵으로 정리하는 모바일 우선 웹서비스입니다. JWT 인증, 사건·문서·재산 및 채무 저장, 문서 분석 검수, 규칙 기반 로드맵, 단계 처리, 주의사항과 AI 내비게이션 챗봇이 연결되어 있습니다.

## 구성

| 경로 | 역할 |
| --- | --- |
| `frontend` | React + Vite + TypeScript + Tailwind CSS, npm workspace |
| `backend` | Java 17 + Spring Boot + Maven Wrapper |
| `backend/src/main/java/com/sangsok/api/ai` | Mock 및 OpenAI Responses API 구현체 |
| `backend/src/main/resources/db/migration` | Flyway 스키마 마이그레이션 |
| `docs/analysis.md` | 최종 명세 분석, 화면 매핑, 범위와 확인 사항 |
| `docs/backend-design.md` | 서버 모듈·데이터·API·처리 흐름 제안 |
| `docs/deployment.md` | 경로별 빌드 및 배포 가이드 |
| `docs/HANDOFF.md` | 팀 인수인계, 구현 현황, 남은 작업과 시작 체크리스트 |
| `기능명세서` | 원본 최종 요구사항, 수정하지 않음 |

## 실행

Node.js 22.12 이상, npm 10 이상, JDK 17이 필요합니다. Maven은 Wrapper가 내려받습니다.

루트에서:

```powershell
npm ci
npm run dev
```

프론트엔드: http://localhost:5173

별도 터미널에서:

```powershell
cd backend
./mvnw.cmd spring-boot:run
```

macOS/Linux는 `sh ./mvnw spring-boot:run`을 사용합니다.
서버 상태: http://localhost:8080/api/actuator/health
프론트 개발 서버의 `/api` 요청은 8080으로 프록시됩니다.

선택 설정: `frontend/.env.example`을 `.env.local`로 복사합니다. `VITE_` 변수는 브라우저에 공개되므로 비밀키를 넣지 않습니다. 개발 DB는 기본적으로 로컬 H2 파일을 사용하고 서버 시작 시 Flyway가 자동 마이그레이션합니다.

## 실제 OpenAI 연동

API 키는 프론트엔드나 Git 파일에 넣지 않고 **백엔드 프로세스의 환경변수**로만 주입합니다. PowerShell 예시:

```powershell
cd backend
$env:AI_PROVIDER='openai'
$env:AI_API_KEY='배포 플랫폼의 secret에서 주입'
$env:AI_MODEL='gpt-4o'
./mvnw.cmd spring-boot:run
```

이 모드에서는 PDF를 `input_file`, PNG/JPEG를 `input_image`로 OpenAI Responses API에 전송합니다. 분석 및 챗봇 응답은 JSON Schema로 제한하고, API 측 응답 저장은 `store=false`로 요청합니다. AI 응답은 후보 데이터이며 사용자가 검수·확정하기 전에는 재산·채무 원장에 반영하지 않습니다. OpenAI 챗봇 호출이 실패하면 URL 생성 없이 enum 화이트리스트를 사용하는 키워드 라우터로 자동 대체됩니다. `AI_PROVIDER=openai`인데 `AI_API_KEY`가 비어 있으면 잘못된 운영 배포를 막기 위해 서버 시작이 실패합니다.

운영 프로필은 PostgreSQL과 충분히 긴 JWT 비밀키를 필수로 받습니다:

```powershell
$env:SPRING_PROFILES_ACTIVE='prod'
$env:DB_URL='jdbc:postgresql://db-host:5432/sangsok'
$env:DB_USERNAME='sangsok'
$env:DB_PASSWORD='배포 secret'
$env:JWT_SECRET='32자 이상의 무작위 배포 secret'
$env:AI_PROVIDER='openai'
$env:AI_API_KEY='배포 secret'
$env:AI_MODEL='gpt-4o'
./mvnw.cmd spring-boot:run
```

로컬 비용 없는 시연은 `AI_PROVIDER=mock`으로 전환합니다. 루트의 `.env.example`은 변수 이름만 제공하며 실제 비밀값은 포함하지 않습니다. 문서는 민감정보를 포함할 수 있으므로 업로드 시 AI 분석 동의가 필수이며, 현재 로컬 저장소는 외부 공개 URL을 만들지 않습니다.

## Docker Compose 통합 실행

```powershell
Copy-Item .env.example .env.local
# .env.local의 로컬 비밀값을 변경
docker compose --env-file .env.local up --build
```

웹은 `http://localhost:5173`에서 열립니다. Compose는 PostgreSQL, API, Nginx 정적 웹을 함께 실행하고 `.env.local`을 컨테이너 환경변수로 전달합니다. 실제 운영에서는 `.env.local`을 서버에 복사하지 말고 배포 플랫폼의 Secret Manager를 사용합니다.

다른 팀원이 이어서 작업할 때는 먼저 [개발 인수인계 문서](docs/HANDOFF.md)의 Git 확인 절차, 구현 현황, 다음 우선순위와 충돌 주의 파일을 확인합니다.

## 검증

```powershell
npm run lint
npm run build
cd backend
./mvnw.cmd verify
```

OpenAI 공급자 계약 테스트는 로컬 가짜 HTTP 서버로 요청의 JSON Schema와 `store=false`를 검증하므로 실제 API 비용을 사용하지 않습니다. 실제 키를 이용한 라이브 호출은 운영 secret을 주입한 환경에서 별도로 확인해야 합니다.

## 개발 기준

최종 기능명세서 > Figma의 화면 구조 > 수정 전 기획안 순으로 적용합니다.
원본 CSV의 `구현=No`는 변경하지 않았습니다. 화면 골격은 기능 완료가 아닙니다.
실제 사용자 정보나 업로드 원본을 Git에 추가하지 않습니다.
