FROM openjdk:21-jdk-slim

WORKDIR /app

# Копируем Maven wrapper и pom.xml
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# Даем права на выполнение mvnw
RUN chmod +x ./mvnw

# Скачиваем зависимости (кэшируем этот слой)
RUN ./mvnw dependency:go-offline -B

# Копируем исходный код
COPY src ./src

# Собираем приложение
RUN ./mvnw clean package -DskipTests

# Запускаем приложение
EXPOSE 8084
CMD ["java", "-jar", "target/backend-java-1.0.0.jar"]
