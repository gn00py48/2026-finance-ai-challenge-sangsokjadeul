# 개발 인수인계 및 현재 구현 상태

최종 갱신: 2026-09-06  
기준 브랜치: `dev`  
주의: 아래 변경은 현재 작업 트리에 있으며 아직 커밋·push하지 않았다. 팀원이 시작할 때 원격 코드만 보고 판단하지 말고 반드시 로컬 `git status`를 먼저 확인한다.

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
- 개발 저장소: 로컬 파일 시스템, 외부 공개 URL 없음
- 로컬 통합 실행: Docker Compose + PostgreSQL + Nginx
- 운영 설정: `prod` 프로필과 배포 플랫폼 Secret 사용

## 기능명세서 구현 현황

| 기능 ID | 기능 | 상태 | 관련 영역 | 남은 작업 |
| --- | --- | --- | --- | --- |
| COMMON-01 | 기한·불확실성 규칙 | 완료 | `roadmap/DeadlinePolicy` | 법령 변경 시 정책 버전 갱신 |
| COMMON-02 | AI 판단 제한 | 완료 | `ai`, `chat` | 프롬프트 회귀 평가 고도화 |
| COMMON-03 | 상태·데이터 관리 | 부분 구현 | JPA 전 도메인 | 변경 영향 규칙 세분화 |
| ONB-01 | 단계형 기본정보 | 완료 | `CaseController`, `/onboarding` | 완료 절차 입력 UI 고도화 |
| ONB-02 | 파악 상태 선택 | 완료 | onboarding | 없음 |
| ONB-03 | 문서 업로드 | 완료 | `DocumentController`, upload page | 원본 삭제 선택 기능 |
| ONB-04 | AI 분석·검수·확정 | 완료 | `document`, `ai`, documents page | 운영 키를 사용한 라이브 호출 검증 |
| ONB-05 | 직접 입력 | 완료 | `FinancialController`, financial page | 입력 UX 고도화 |
| ONB-06 | 규칙 로드맵 생성 | 완료 | `RoadmapService` | 규칙 케이스 확대 |
| MAIN-01~05 | 대시보드 | 완료 | dashboard page/API | 가로 로드맵 터치 UX 점검 |
| INFO-01~04 | 내 상속 정보 | 부분 구현 | info/edit pages | 원본 문서 안전 보기 API |
| EDIT-01~02 | 통합 수정·영향 검사 | 완료 | edit/financial APIs | 영향 설명 세분화 |
| TASK-01~03 | 단계 상세·결과·취소 | 완료 | roadmap controller/pages | 단계 유형별 결과 폼 세분화 |
| WARN-01 | 전체 주의사항 | 부분 구현 | warning API/page | 필터 UI 및 공식 링크 관리 |
| CHAT | AI 내비게이션 챗봇 | 완료 | `OpenAiChatService`, floating chat | 사건 요약 컨텍스트 확대 |
| AUTH | 가입·로그인·JWT·소유권 | 완료 | `auth`, `SecurityConfig` | Refresh Token 회전·폐기 저장소 |

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

- Backend: 10 tests passed
- Frontend lint: passed
- Frontend production build: passed
- Docker Compose config validation: passed
- Docker image build: Docker Desktop 엔진이 실행 중이지 않아 미완료 (`dockerDesktopLinuxEngine` 연결 불가)
- 실제 OpenAI 네트워크 호출: 현재 머신에 `AI_API_KEY`가 없어 미실행
- OpenAI 요청 계약: 로컬 가짜 HTTP 서버로 JSON Schema와 `store=false` 검증 통과

## 다음 우선순위

1. 실제 OpenAI 키를 Secret으로 주입한 PDF/PNG 라이브 E2E 검증
2. AI 전송 전 OCR 기반 주민번호·계좌번호 로컬 마스킹
3. S3 호환 비공개 저장소와 원본 삭제 옵션
4. Refresh Token 회전·로그아웃 폐기 구현
5. 로드맵 재계산 시 이전 결과 이관 및 버전 비교
6. 문서 원본 안전 보기, 주의사항 필터, 사건 컨텍스트 기반 챗봇 강화
7. 배포 플랫폼 결정 후 HTTPS, CORS, 로그 마스킹, 백업·복구 검증

운영 전 필수 차단 항목은 1~4이다. 특히 현재 OpenAI 모드는 동의된 원본 파일을 공급자에게 보내므로 실제 개인정보 사용 전 로컬 비식별화 파이프라인을 완성해야 한다.

## 충돌 가능성이 높은 파일

- `backend/pom.xml`, `application.properties`, `application-prod.properties`
- `domain/Models.java`, `domain/Enums.java`, Flyway `V1__initial_schema.sql`
- `auth/SecurityConfig.java`
- `frontend/src/App.tsx`, `frontend/src/index.css`, Router 구성
- `package-lock.json`, `compose.yaml`, `README.md`

새 DB 변경은 기존 `V1`을 수정하지 않고 `V2__...sql`부터 추가한다.
