# 백엔드 설계 제안

상세 기능 확정 전 제안입니다. 현재 구현은 Spring Boot 실행 기반과 health endpoint뿐이며 DB·인증·AI 의존성은 아직 연결하지 않았습니다.

## 권장 구조

모듈형 단일 Spring Boot 서버 + PostgreSQL + 비공개 S3 호환 객체 저장소를 권장합니다. 처음부터 마이크로서비스·Kafka·벡터 DB를 도입할 필요는 없습니다.
Java 17은 현재 로컬 환경과 맞추었습니다. Spring Boot 4.1.1과 Maven Wrapper를 사용하며, 팀 표준 JDK가 정해지면 함께 변경합니다. Initializr가 반환한 RELEASE 접미사는 Maven 좌표에서 제외했습니다.

| 모듈 | 책임 | 대응 요구사항 |
| --- | --- | --- |
| auth | 아이디/비밀번호, 쿠키 세션, 접근 제어 | AUTH |
| inheritance | 사건, 기본정보, 공동상속인, 조회 상태 | ONB-01/02, INFO, EDIT |
| inventory | 재산·채무, 금액 상태, 수동/문서 출처 | ONB-05, DATA, INFO-03 |
| document | 업로드, 비공개 조회, 분석 작업, 검수 | ONB-03/04, DATA-01/02 |
| roadmap | 단계 선별, DAG, 버전, 영향 검사/승인 | ONB-06, MAIN, DATA-03, EDIT-02 |
| task | 결과 입력/수정, 완료·취소 및 진행 계산 | TASK |
| warning | 조건 평가, 범주·심각도·해결 상태 | MAIN-05, WARN |
| rules | 기산일, 기한, 조건, 공식 근거 버전 | COMMON-01/02 |

모듈 안에서 api/application/domain/infrastructure를 나눕니다. 다른 모듈의 repository 직접 호출 대신 application 서비스를 경계로 사용합니다.
Spring MVC, Bean Validation, Spring Data JPA, Flyway, Spring Security를 제안합니다. JPA는 일반 CRUD에 사용하고 복잡한 조회가 실제로 필요할 때만 별도 쿼리 도구를 도입합니다.

## 데이터 모델 초안

| 엔티티 | 주요 필드·관계 |
| --- | --- |
| users | id, unique username, password_hash, created_at |
| inheritance_cases | owner_id, display_name, death_date, awareness_date, relationship, inquiry_status, version |
| heirs | case_id, relationship, minor_status; 실명 대신 필요한 구성 정보 우선 |
| inventory_items | case_id, ASSET/DEBT, type, institution, amount numeric, KNOWN/UNKNOWN, as_of_date, source_document_id |
| documents | case_id, opaque object_key, original_name, mime_type, size, analysis_status |
| analysis_jobs | document_id, status, attempts, lease_until, error_code, model_version |
| extraction_candidates | job_id, field_values, evidence_page, confidence, review_status |
| roadmap_versions | case_id, input_revision, rules_version, generated_at, active |
| roadmap_steps / step_dependencies | roadmap_version_id, stable_step_key, template_version, predecessor_id |
| task_results | case_id, stable_step_key, result_type, result_value, revision, updated_at |
| warnings | case_id, rule_key, related_step_key, severity, category, resolved_at |
| change_reviews | case_id, base_roadmap_version, input_revision, impact_summary, status |
| audit_events | actor_id, case_id, operation, entity_id, revision, created_at; 문서 본문/비밀번호 제외 |

모든 사건 하위 조회에서 owner_id를 검증합니다. UUID 사용은 권한 검사를 대체하지 않습니다.
금액은 null=미확인, 0=확인된 0으로 분리하며 DB CHECK 제약으로 상태와 값의 일관성을 보장합니다. JSON API 금액은 정밀도 손실을 막도록 십진 문자열로 전달합니다.
일자는 LocalDate, 이벤트 시간은 UTC Instant를 사용합니다. 법정 기산일과 휴일 처리는 검토된 규칙에 명시하며 단순 일수 더하기로 고정하지 않습니다.

## 핵심 트랜잭션

**문서 분석:** 업로드 검증 → 비공개 저장 → DB 작업 등록 → worker 선점 → OCR/추출 → 후보 저장 → 사용자 수정/확정 → inventory 반영. 실패 작업은 재시도 횟수/백오프/lease로 관리합니다. 동일 확정 요청은 중복 생성되지 않게 idempotency key와 unique 제약을 둡니다. 처음에는 PostgreSQL 작업 테이블을 사용하는 동일 코드베이스 worker로 충분하며, 부하가 커지면 별도 프로세스로 분리합니다.

**정보 변경:** optimistic version 확인 → 새 입력 revision 저장 → 중요 필드/조건 비교 → 영향 없으면 일반 갱신 → 영향 있으면 change_review 생성. 사용자에게 변경될 범위를 반환하고 승인을 기다립니다. 승인 시 revision을 다시 확인하고 후보 로드맵 생성·검증 후 active 버전을 원자적으로 교체합니다. 승인 중 새 변경은 409로 재검토를 요청합니다. 실패하면 기존 active 버전을 보존합니다.

**단계 결과:** 허용된 결과 enum 검증 → 업무별 완료 predicate 평가 → 선행관계에 따라 완료/현재/예정 재계산. 완료 취소 시 이후 입력 결과를 무조건 삭제하지 않고 선행조건 미충족 상태를 재계산해 표시합니다. 구체적인 결과 보존/무효화 정책은 단계 카탈로그에서 확정합니다. 이 과정에는 AI 호출이 없습니다.

**로드맵 생성:** AI가 제공하더라도 허용된 단계 ID만 수용하고, 기한·완료 조건·순환 여부·필수 선행관계는 서버가 검증합니다. AI 설명과 확정 사실을 분리합니다. 기한 규칙은 출처 URL·검토일·버전·기산일 종류를 저장하며 미확정 입력에는 확인 필요를 반환합니다.

## API 초안

모든 business API는 `/api/v1`. 응답은 리소스 DTO, 오류는 Problem Details 형식(code, detail, fieldErrors, traceId)을 제안합니다. 목록은 pagination을 사용합니다.

| Method | 경로 | 역할 |
| --- | --- | --- |
| POST | /auth/signup, /auth/login, /auth/logout | 가입·세션 생성·종료 |
| GET | /auth/me, /auth/csrf | 세션 복원·CSRF 토큰 |
| POST / GET / PATCH | /cases, /cases/{id} | 사건 생성·조회·변경/영향 반환 |
| GET | /cases/{id}/dashboard | 최우선 업무·주변 단계·미확인·현재 경고 |
| POST / PATCH / DELETE | /cases/{id}/items[/{itemId}] | 수동 항목 CRUD |
| POST / GET / DELETE | /cases/{id}/documents[/{documentId}] | 업로드·목록/원본 접근·삭제 |
| GET / POST | /documents/{id}/analysis, /documents/{id}/analysis/retry | 작업 상태·재시도 (소유자 검증) |
| PUT | /documents/{id}/review | 검수 확정, 중복 반영 방지 |
| POST / GET | /cases/{id}/roadmaps | 최초 생성·현재 조회 |
| POST | /cases/{id}/change-reviews/{reviewId}/approve | 변경 revision 확인 후 재분석 |
| GET / PUT / DELETE | /cases/{id}/tasks/{taskId}/result | 결과 조회·수정·취소 |
| GET | /cases/{id}/tasks/{taskId}, /cases/{id}/warnings | 단계 안내·전체 주의사항 |

분석·로드맵 비동기 요청은 202와 작업 ID를 반환하고 초기에는 polling을 사용합니다. 예측 가능한 오류는 400/401/403/404/409/413/415/422로 구분합니다.

## 인증·운영

동일 도메인 `/api` 역방향 프록시 + HttpOnly/Secure/SameSite 쿠키 세션을 권장합니다. Spring Security 비밀번호 해시, 로그인 제한, 세션 고정 방지, CSRF를 적용합니다. 다중 인스턴스가 필요하면 Spring Session JDBC 또는 Redis를 선택합니다. JWT를 localStorage에 보관하는 구조는 도입하지 않습니다.
파일은 확장자뿐 아니라 MIME/실제 포맷/크기/페이지 수를 검사하고 비공개 객체 키를 사용합니다. 원본 다운로드는 권한 확인 후 제한 시간 URL 또는 서버 스트리밍으로 제공합니다. 문서 삭제 시 연결된 확정 항목의 출처 및 재분석 영향도 처리해야 합니다.
AI 비밀키는 서버 환경 변수로만 주입하고 외부 서비스 전송 전 최소화/마스킹 정책을 확정합니다. 로그에는 문서 본문과 금융 금액을 기본적으로 남기지 않습니다. 보존 기간·탈퇴 삭제·백업 복구를 운영 정책으로 정의합니다.

## 검증 계획

미확인/0원 구분, 날짜 경계와 미확정 기산일, 단계 선행조건과 완료 취소, 중요 변경 승인 전후, stale revision 충돌, 다른 계정 사건 접근 차단, 문서 재시도와 중복 확정을 핵심 자동화 테스트로 둡니다. PostgreSQL Testcontainers 통합 테스트와 인증→입력→로드맵→결과 수정 E2E를 기능 구현 시 추가합니다.

참고: [Spring Boot](https://spring.io/projects/spring-boot/), [Spring Initializr](https://start.spring.io/), [Tailwind Vite 연동](https://tailwindcss.com/docs/installation/using-vite).
