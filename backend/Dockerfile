# 빌드 스테이지는 항상 빌더 아키텍처에서 돈다. jar은 아키텍처 중립이라 arm64 타깃도 QEMU 없이 빌드된다.
FROM --platform=$BUILDPLATFORM maven:3.9.11-eclipse-temurin-17 AS build
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:17-jre-jammy
# tesseract는 AI 전송 전 개인정보 마스킹에 쓴다. 숫자 위치만 찾으므로 한국어 학습 데이터는 넣지 않는다.
RUN apt-get update && apt-get install -y --no-install-recommends curl tesseract-ocr && rm -rf /var/lib/apt/lists/* \
    && useradd --system --create-home --uid 10001 appuser
WORKDIR /app
COPY --from=build /workspace/target/api-0.0.1-SNAPSHOT.jar app.jar
RUN mkdir -p /var/lib/sangsok/uploads && chown -R appuser:appuser /var/lib/sangsok
USER appuser
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
