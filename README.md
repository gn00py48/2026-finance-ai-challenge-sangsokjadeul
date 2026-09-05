# 상속나침반

기능명세서를 최종 기준으로 진행하는 금융상속 절차 안내 서비스의 초기 모노레포입니다.
현재는 개발 환경과 로그인 와이어프레임 골격만 구현했습니다. 인증·DB·문서 분석·로드맵 기능은 아직 구현되지 않았습니다.

## 구성

| 경로 | 역할 |
| --- | --- |
| `frontend` | React + Vite + TypeScript + Tailwind CSS, npm workspace |
| `backend` | Java 17 + Spring Boot + Maven Wrapper |
| `docs/analysis.md` | 최종 명세 분석, 화면 매핑, 범위와 확인 사항 |
| `docs/backend-design.md` | 서버 모듈·데이터·API·처리 흐름 제안 |
| `docs/deployment.md` | 경로별 빌드 및 배포 가이드 |
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

선택 설정: `frontend/.env.example`을 `.env.local`로 복사합니다. `VITE_` 변수는 브라우저에 공개되므로 비밀키를 넣지 않습니다.

## 검증

```powershell
npm run lint
npm run build
cd backend
./mvnw.cmd verify
```

GitHub Actions에서 웹 lint/build와 API verify를 실행합니다. GitHub 원격 저장소 생성·push 및 실제 배포는 아직 진행하지 않았습니다.

## 개발 기준

최종 기능명세서 > Figma의 화면 구조 > 수정 전 기획안 순으로 적용합니다.
원본 CSV의 `구현=No`는 변경하지 않았습니다. 화면 골격은 기능 완료가 아닙니다.
실제 사용자 정보나 업로드 원본을 Git에 추가하지 않습니다.
