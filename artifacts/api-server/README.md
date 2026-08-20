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
JAVA_HOME=$(dirname "$(dirname "$(readlink -f "$(which java)")")") mvn spring-boot:run
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
JAVA_HOME=$(dirname "$(dirname "$(readlink -f "$(which java)")")") mvn spring-boot:run
```

## Organização

A API é organizada por contexto de negócio e camada:

- `book`: importação, consulta, domínio, leitor EPUB e persistência PostgreSQL;
- `study`: dashboard e sincronização para o aplicativo mobile;
- `engine`: criação e validação de planos com Ollama;
- `health`: verificação de disponibilidade;
- `shared`: configuração comum de infraestrutura.

Em cada contexto, `api` expõe HTTP, `application` contém os casos de uso,
`domain` contém os modelos e `infra` contém os adaptadores externos.

O ponto de entrada principal é `local.leitor.Application`.