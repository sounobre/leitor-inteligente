---
name: Java 21 workflow runtime
description: Spring Boot workflows must explicitly select the installed Java 21 runtime.
---

When the local API runs Maven, set `JAVA_HOME` based on the active `java` executable in the workflow command.

**Why:** The environment can expose Java 21 as `java` while Maven still defaults to an older bundled JVM, which rejects a Java 21 build target.

**How to apply:** Keep the `JAVA_HOME=$(dirname $(dirname $(readlink -f $(which java))))` prefix when running Maven commands for the Spring Boot API, including build and development commands.

When validating a newly added Spring controller route, use a clean compile before restarting the workflow if Maven's incremental compiler leaves the existing class unchanged.

**Why:** The API workflow runs directly from `target/classes`, so an incremental compile can keep an older controller binary even when the source has changed.

**How to apply:** Run `mvn -q clean compile` with the Java 21 `JAVA_HOME` prefix when a route change is not visible at runtime.