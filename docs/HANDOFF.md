# 개발 인수인계 및 현재 구현 상태

최신 인수인계 기준: 2026-09-06 UI QA 작업 종료 시점. 로컬 브랜치 `feat/UI`, HEAD `0cbc74b` (`UI 구현`).
아래 최신 작업은 **미커밋 작업 트리**에 있다. 이번 작업에서 커밋·PR 생성·push·운영 배포는 하지 않았다.
원격 브랜치와 열린 PR 현황은 이번 문서 갱신에서 조회하지 않았다.

## 최신 작업 요약 — 먼저 읽을 내용

기존 화면의 CSS 중복과 잘못된 고정 배치를 정리하고 주요 화면을 Figma에 맞춰 수정했다.
로컬에서 실제 API와 연결해 주요 사용자 흐름을 검증했으며, 금액 수정 시 발생한 서버 500 오류도 수정했다.
다만 **전체 Figma 프레임의 1:1 구현 및 픽셀 단위 QA 완료를 뜻하지 않는다.** 아래 미완료 항목이 남아 있다.

- 기획 우선순위: 폴더 내 최종 기능명세서 > 수정 전 기획안. Figma는 시각 구성의 기준이다.
- 디자인: [Figma 페이지 40:230](https://www.figma.com/design/cmDRw239zpdF0Uz02ZIBmG/2026-%EA%B8%88%EC%9C%B5-AI-Challenge?node-id=40-230&m=dev)
- 모노레포 구조: 루트의 `frontend/`, `backend/`를 유지한다. `apps/`를 추가하지 않는다.
- 협업 선호: PR 제목·본문 요청에는 채팅으로 답하고 파일로 저장하지 않는다. 이 파일은 요청받은 인수인계 문서다.

## 진행된 작업

| 영역 | 반영 내용 | 주요 파일 |
| --- | --- | --- |
| 공통 스타일 | 누적된 중복 CSS 제거, 색상 토큰 정리, 52px 입력/버튼·카드·라벨·배지 규격 통일 | `frontend/src/index.css` |
| 화면 틀 | 경로별 헤더와 뒤로가기, 페이지 이동 시 스크롤 초기화, 일반 버튼과 하단 고정 버튼 분리 | `frontend/src/App.tsx` |
| 로그인·가입 | 로그인 로고·문구·폼·하단 안내 위치 수정, 가입 화면 헤더 분리 | `App.tsx`, `shared/ui/index.tsx` |
| 온보딩 | 기존 5단계 흐름 유지, 헤더·진행 바·제목 줄바꿈·하단 다음 버튼 간격 수정 | `Onboarding.tsx`의 기존 구조, `index.css` |
| 대시보드 | 중복 제목 제거, 사건 요약·우선 업무 카드·원형 로드맵·좌우 이동·미확인 목록 구성 | `App.tsx` |
| 재산·채무 | 상단 추가 버튼, 필터, 기관/금액/출처 배치, 금액 입력·자료 등록 버튼 정리 | `Finances.tsx`, `FinancialForm.tsx` |
| 내 정보·수정 | 정보 요약 카드, 문서·재산/채무 묶음, 수정 탭과 기본/공동상속인/조건부 카드, 고정 저장 버튼 | `App.tsx` |
| 문서 | 업로드 영역과 드래그 상태, 검수 카드와 필터, 추출 근거 펼치기, 확정 안내 | `App.tsx` |
| 절차·결과 | 요약/처리 순서/서류/기관 카드, 결과 입력 시트, 하단 고정 작업 버튼 | `Task.tsx` |
| 주의사항 | 기존 필터·상세 동작 유지, 중복 페이지 제목 제거 및 건수 표시 | `App.tsx` |
| 챗봇·모달 | 채팅 전용 헤더, 보낸 메시지와 응답 배치, 입력창 고정, 시트 스크롤·버튼 배치 | `App.tsx`, `Sheet.tsx`, `index.css` |
| 버튼 겹침 | 절차·정보 수정·문서 검토·업로드 화면에서는 챗봇 FAB를 렌더링하지 않음 | `Shell` in `App.tsx` |
| 서버 오류 | 금액 수정 시 사건 지연 로딩으로 발생한 `LazyInitializationException` 해결. 재산/채무 컨트롤러 트랜잭션 적용 | `backend/.../financial/FinancialController.java` |
| 회귀 테스트 | 미확인 금액 확정→재조회→로드맵 변경 표시→삭제 테스트 추가. 기존 0원 검수 테스트의 배열 순서 의존 제거 | `backend/.../ApiFlowTests.java` |

### 이전 작업에서 이어받아 유지한 변경

- 문서 검수 시 사용자가 확정한 금액(0원 포함)을 AI 신뢰도로 다시 덮어쓰지 않는 변경.
- 문서 조회 응답에 수정·확정된 분석 내용을 반환하는 변경.
- 사망일 변경을 로드맵 영향 대상으로 포함한 변경.
- 위 변경은 작업 시작 시 이미 미커밋 상태였으며, 이번 UI 작업과 함께 작업 트리에 남아 있다.
- `package-lock.json`, 이 문서에도 시작 시 변경이 있었다. 이번 작업의 변경만으로 오인하거나 일괄 되돌리지 않는다.

## 검증된 범위와 결과

| 검증 | 결과 및 한계 |
| --- | --- |
| 프론트엔드 | `npm run build`, `npm run lint` 통과. TypeScript 및 Vite 프로덕션 빌드 확인 |
| 백엔드 | `mvnw.cmd -B -ntp test`: 총 22건, 성공 21건, 실패/오류 0건, 생략 1건. 마스킹 실동작 조건부 테스트가 생략됨 |
| 변경 형식 | `git diff --check` 통과. LF/CRLF 안내는 있었으나 공백 오류 없음 |
| 시각 비교 | 390×844 기준 로그인, 온보딩 첫 화면, 대시보드, 절차 상세, 결과 시트, 재산·채무, 금액 수정 시트, 내 정보/수정, 업로드/검수, 챗봇을 실제 브라우저로 확인 |
| 로그인 측정 | 390px 기준 입력 높이 52px, 로그인 버튼 y=500px, 하단 안내 y=730px 확인 |
| 반응형 | 로그인은 320/390/768px에서 DOM 폭과 입력 규격 확인. 주요 내부 경로는 320px 가로 넘침 검사. 모든 경로×모든 폭의 시각 검증 완료는 아님 |
| 실제 흐름 | 로그인, 정보 저장, 샘플 문서 분석·확정, 처리 결과 저장, 챗봇 응답 확인 |
| 오류 재검증 | 수정된 백엔드를 재실행해 미확인 금액을 1,200,000원으로 저장하고 목록의 확정 상태·미확인 건수 변경까지 확인 |

QA는 로컬 Mock AI, 별도 메모리 H2 DB에서 수행했다. 실제 기관 자료나 운영 데이터는 사용하지 않았다.
사용했던 포트는 프론트 5178 / 백엔드 8087이며, 임시 서버는 작업 종료 시 중지했다. 메모리 DB의 QA 데이터는 유지되지 않는다.
백엔드 테스트 로그 `backend/target/ui-qa-tests.log`는 로컬 빌드 산출물이며 재빌드/정리 시 사라질 수 있다.

## 진행되지 않은 작업 / 남은 차이

| 항목 | 현재 상태 | 다음 담당자가 할 일 |
| --- | --- | --- |
| 전체 Figma 일치 확인 | 주요 화면 비교 완료, 모든 프레임·상태의 전수 대조 및 자동 이미지 차이 검사는 미실행 | 노드별 화면/상태 매핑표를 만들고 동일 데이터·뷰포트로 비교 |
| 가입·인증의 추가 기능 | 카카오/네이버 로그인, 비밀번호 찾기, 중복확인 버튼용 API, 약관 동의 저장 흐름 미구현 | API/약관/소셜 앱 설정 확정 후 화면과 함께 연결. 동작하지 않는 버튼으로 완료 처리하지 않기 |
| 로드맵·결과 유형 | 실제 서버는 5단계, Figma 예시는 7단계. 결과 폼도 서버 상태값 기준 | 최종 명세와 단계/결과 스키마를 대조하고 상세화 여부 결정 |
| 온보딩·공동상속인 | 기존 표시명·후보 입력 모델 유지. Figma의 가족 구성 컨트롤과 모두 동일하지 않음 | 저장 모델과 화면 입력 항목을 함께 정리 |
| 업로드 | 실제 한도 10MB 유지(Figma 일부 화면 20MB). 다중 파일 분석 상태·진행률을 예시 그대로 구현하지 않음 | 서버 한도와 분석 작업 상태 API를 확정하고 실제 진행 상태 연결 |
| 정보·문서·주의사항 상세 | 실제 데이터와 기존 API 동작을 유지. 예시 문구/건수, 그룹 구성, 일부 세부 액션은 1:1 미완료 | 목록 그룹·정렬·상세 링크와 실패/빈 상태를 노드별 추가 점검 |
| 예외 상태 전수 QA | 일부 로딩/미확인/저장 오류는 확인. 세션 만료·분석 실패·긴 텍스트 등 조합 전체 미검증 | 오류/빈 상태/키보드/중첩 시트 시나리오 추가 |
| 브라우저·접근성 | 앱 내 Chromium 브라우저 중심. iOS Safari·Android 실기기·전체 키보드/스크린리더 QA 미실행 | 실제 기기에서 날짜 입력, 키보드 노출, safe-area, 초점 이동 확인 |
| 폰트 | Pretendard를 외부 CDN에서 로드 | 필요 시 자체 호스팅 결정, 폰트 로드 실패 시 레이아웃 확인 |
| 운영 AI·마스킹 | 이번 UI QA는 Mock. 실제 OpenAI·실문서 마스킹·S3 E2E 미검증 | 운영 전 별도 승인된 테스트 자료와 환경으로 검증 |
| 협업 반영·배포 | 로컬 미커밋. 원격 최신 변경 재통합·PR·배포 미실행 | 팀 변경과 diff 대조→커밋/PR→CI 이미지→EC2 반영 순서로 진행 |

## 다음 작업 권장 순서

1. **작업 트리 보존 및 원격 차이 확인:** 아래 명령으로 현재 변경을 읽고, 팀원 변경과 충돌 범위를 확인한다. 미커밋 상태를 임의 reset/stash하지 않는다.
2. **Figma 전수 매핑:** 우선 인증(43:30), 공동상속인(46:81), 업로드 상태(58:58), 검수(48:2), 결과 폼(50:81), 주의사항(51:2), 정보 수정(54:2)을 기존 코드와 대조한다. 나머지 프레임은 Figma 페이지에서 식별한다.
3. **스키마 차이 결정:** 5/7단계, 업로드 10/20MB, 가입 동의/가족 구성 등은 CSS로 해결하지 않는다. 기능명세서와 API 기준으로 결론을 낸다.
4. **남은 UI/상태 구현:** 확정된 API 범위 안에서 수정하고, 320/390px 및 실제 모바일 키보드 환경을 검증한다.
5. **회귀 검증:** 로그인→사건 생성→자료 등록/확정→금액 수정→로드맵 생성/재계산→결과 저장→챗봇 이동을 다시 실행한다.
6. **커밋·PR·배포:** 기존 변경과 이번 변경을 함께 리뷰한다. PR 본문은 채팅으로 작성한다. 운영 반영 후 브라우저가 받는 JS/CSS 파일과 화면을 확인한다.

## 배포에 대한 현재 코드 기준 사실

- `.github/workflows/ci.yml`: push/PR에서 빌드·테스트 실행.
- **`dev` push에만** GHCR 이미지 빌드 job 실행. `main` push만으로 이미지가 갱신되는 구성은 아니다.
- 워크플로에 EC2 자동 배포 단계가 없다. 이미지 생성과 서버 반영은 별개다.
- 실제 서버 반영에는 기존 배포 담당자의 AWS/SSM 접근 권한과 서버에서의 배포 절차가 필요하다. `docs/deployment.md`와 `deploy/`를 확인한다.
- 이번 변경이 운영 사이트에 반영되었다고 가정하지 않는다. 아래 과거 운영 기록은 최신 운영 상태의 증거가 아니다.

## 로컬 QA 재현 명령

프로젝트 루트에서 의존성이 준비되어 있다는 전제다. 첫 실행은 루트 `npm ci`를 실행한다.
다음 명령은 **터미널 두 개**에서 각각 실행한다. 일반 `.env` 파일은 Spring Boot 네이티브 실행에 자동 주입되지 않는다.

터미널 1 — 루트에서 백엔드 실행:

```powershell
cd backend
$env:PORT='8087'
$env:AI_PROVIDER='mock'
$env:DB_URL='jdbc:h2:mem:ui_qa;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1'
$env:STORAGE_PATH='./target/ui-qa-uploads'
.\mvnw.cmd -B -ntp spring-boot:run
```

터미널 2 — 루트에서 프론트 실행:

```powershell
cd frontend
$env:API_PROXY_TARGET='http://localhost:8087'
npm.cmd run dev -- --host 127.0.0.1 --port 5178 --strictPort
```

브라우저에서 `http://127.0.0.1:5178`을 연다. 로컬 개발용 `demo / demo1234` 로그인 후 QA용 사건을 생성한다.
서버 종료는 각 터미널에서 Ctrl+C. 재시작하면 메모리 DB 데이터가 사라지는 것이 정상이다.

검증 명령 — 프로젝트 루트:

```powershell
npm.cmd run lint
npm.cmd run build
git diff --check
cd backend
.\mvnw.cmd -B -ntp test
```

---

## 이전 인수인계 기록 — 현재 완료/배포 판정에 사용하지 않음

이하 내용은 이전 담당자의 아키텍처·운영 참고 기록을 보존한 것이다. 과거의 `완료`, 테스트 수,
PR 상태, 계정/인스턴스 정보, 비용과 운영 확인 결과는 이번에 재검증하지 않았다.
충돌하는 내용은 위 최신 인수인계 내용을 우선한다. 실제 운영 작업 전 담당자와 현재 상태를 확인한다.

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
| WARN-01 | 전체 주의사항 | 부분 구현 | warning API/page | 필터 UI 및 공식 링크 관리 |
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

./deploy/deploy.sh                    # SSM에서 .env를 다시 만들고 이미지 pull 후 재기동
docker compose -f compose.prod.yaml ps
docker compose -f compose.prod.yaml logs -f backend
```

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
4. WARN-01 주의사항 필터 UI와 공식 링크 관리.
5. 로그 마스킹, DB 백업 복구 리허설, 탈퇴·보존 정책 확정.

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

## 2026-09-06 Figma UI 반영

- Figma `40:230`의 버튼·입력·카드·바텀시트 스타일을 반영했다. 공통 UI는 `frontend/src/shared/ui`, 금액 유형·기한 표시는 `shared/format.ts`에 있다.
- 5단계 온보딩, 재산·채무 필터/추가/수정, 문서 검수 편집, 처리 결과 폼, 주의사항 필터/상세, 재계산 확인, 챗봇 화면을 기존 JWT/API 흐름에 연결했다.
- 문서 검수 확정 시 사용자가 수정한 금액(0원 포함)을 낮은 AI 신뢰도로 덮어쓰지 않고, 문서 조회에도 검수 결과를 반환하도록 수정했다. 사망일 변경도 로드맵 재계산 대상으로 포함한다.
- 프론트 빌드·린트, 백엔드 테스트 21개(성공 20, 건너뜀 1)를 확인했다. 별도 메모리 DB에서 온보딩, 항목 저장, 문서 검수, 결과 저장, 재계산 및 챗봇 이동을 확인했다.
- Figma의 예시 7단계 대신 현재 서버의 5단계/진행 상태를 사용한다. 업로드 한도는 서버의 10MB를 따른다. 소셜 로그인·비밀번호 찾기·약관 동의 저장 등 미구현 API의 기능은 추가하지 않았다.
- 운영 배포는 수행하지 않았다.
