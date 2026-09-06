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

## 운영 배포 원칙

- `SPRING_PROFILES_ACTIVE=prod`를 사용한다.
- `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`을 배포 플랫폼 Secret으로 주입한다.
- 운영 서버에 저장소의 `.env.local`을 복사하거나 컨테이너 이미지에 포함하지 않는다.
- 웹 `/api/*`는 API 서비스로 reverse proxy하고 외부 통신은 HTTPS만 허용한다.
- PostgreSQL 백업·복구, 문서 저장소 암호화·수명주기, 로그 마스킹을 배포 전에 검증한다.
- 현재 로컬 파일 저장소는 단일 인스턴스용이다. 다중 인스턴스 운영 전 S3 호환 비공개 저장소 구현이 필요하다.

## 웹 URL 하위 경로 배포

저장소 디렉터리 지정과 URL 경로는 별개입니다. `/compass/` URL 아래에 배포한다면 빌드 시 `VITE_BASE_PATH=/compass/`를 설정합니다. 이후 React Router 도입 시 동일한 basename을 사용하고 해당 경로의 SPA fallback을 index.html로 설정해야 합니다.
`VITE_API_BASE_URL` 기본값은 `/api`입니다. 개발 프록시는 배포 빌드에 포함되지 않으므로 운영 reverse proxy에서 `/api/*`를 API 서버로 전달해야 합니다. 서로 다른 도메인을 사용하면 CORS·쿠키·CSRF 설정을 함께 조정합니다.

## GitHub와 CI/CD

원격은 기존 GitHub 저장소를 사용한다. 현재 작업은 커밋·push하지 않았다. 최초 push 전에 `git status`, `git diff --stat`, 비밀키 및 업로드 원본 포함 여부를 확인한다. CI는 양쪽 프로젝트를 검증하며, 실제 배포 단계에서는 Secret을 CI 변수로 주입하고 이미지 레지스트리·호스팅 선택 후 배포 작업을 별도 추가한다.
