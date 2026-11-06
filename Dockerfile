FROM eclipse-temurin:17-jdk AS build
WORKDIR /app
COPY . .
RUN chmod +x mvnw
RUN ./mvnw -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/tutor-management-system-0.0.1-SNAPSHOT.jar app.jar
CMD ["java", "-jar", "app.jar"]
