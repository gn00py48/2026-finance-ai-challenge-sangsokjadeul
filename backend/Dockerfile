FROM maven:3.9.11-eclipse-temurin-17 AS build
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:17-jre-jammy
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* \
    && useradd --system --create-home --uid 10001 appuser
WORKDIR /app
COPY --from=build /workspace/target/api-0.0.1-SNAPSHOT.jar app.jar
RUN mkdir -p /var/lib/sangsok/uploads && chown -R appuser:appuser /var/lib/sangsok
USER appuser
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
