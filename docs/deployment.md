# 모노레포 배포

GitHub 저장소 하나에서 두 서비스를 따로 빌드합니다. 호스팅 업체는 아직 선택하지 않았습니다.

| 서비스 | 빌드 기준 경로 | 명령 | 산출물/실행 |
| --- | --- | --- | --- |
| web | 저장소 루트 | `npm ci && npm run build` | `frontend/dist` 정적 호스팅 |
| api | `backend` | `sh mvnw -B verify` | `java -jar target/api-0.0.1-SNAPSHOT.jar` |

웹은 npm workspace의 루트 package-lock.json을 사용하므로 설치 기준을 저장소 루트로 설정합니다. 배포 UI가 프로젝트 디렉터리로 `frontend`을 요구하면 저장소 상위 파일 접근을 허용하고 설치는 `cd .. && npm ci`, 빌드는 해당 디렉터리에서 `npm run build`, 산출물은 `dist`로 지정합니다. 공급자별 실제 지원 방식은 선택 후 검증합니다.

API는 backend 전체와 `.mvn`을 빌드 컨텍스트에 포함합니다. JDK 17 빌드/JRE 17 실행 환경이 필요하고 런타임 PORT 변수를 지원합니다. 현재 API는 DB 없이 실행됩니다. business API 배포 전 인증과 DB 연결이 필요합니다.

## 웹 URL 하위 경로 배포

저장소 디렉터리 지정과 URL 경로는 별개입니다. `/compass/` URL 아래에 배포한다면 빌드 시 `VITE_BASE_PATH=/compass/`를 설정합니다. 이후 React Router 도입 시 동일한 basename을 사용하고 해당 경로의 SPA fallback을 index.html로 설정해야 합니다.
`VITE_API_BASE_URL` 기본값은 `/api`입니다. 개발 프록시는 배포 빌드에 포함되지 않으므로 운영 reverse proxy에서 `/api/*`를 API 서버로 전달해야 합니다. 서로 다른 도메인을 사용하면 CORS·쿠키·CSRF 설정을 함께 조정합니다.

## GitHub

로컬 모노레포 기반을 준비했습니다. 원격 URL·저장소 공개 범위는 정해지지 않아 원격 생성·push는 하지 않습니다. 최초 push 전 원본 문서 포함 범위와 `.env` 제외 상태를 확인합니다. CI는 양쪽 프로젝트를 모두 검증하며 서비스가 커지면 변경 경로 필터를 추가할 수 있습니다.
