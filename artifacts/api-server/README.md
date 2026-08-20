# Leitor Inteligente API

API local em Java 21, Spring Boot e PostgreSQL.

## Iniciar em desenvolvimento

Defina as variáveis do PostgreSQL:

```bash
export PGHOST=localhost
export PGPORT=5432
export PGDATABASE=leitor_inteligente
export PGUSER=postgres
export PGPASSWORD=postgres
```

Depois, a partir de `artifacts/api-server`:

```bash
mvn spring-boot:run
```

A API ficará disponível em `http://localhost:8080/api`.

## Gerar e executar o JAR

```bash
mvn clean package
java -jar target/api-server-0.0.1-SNAPSHOT.jar
```

Também é possível informar uma URL JDBC completa:

```bash
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/leitor_inteligente \
SPRING_DATASOURCE_USERNAME=postgres \
SPRING_DATASOURCE_PASSWORD=postgres \
mvn spring-boot:run
```

O ponto de entrada principal é `local.leitor.api.Application`.