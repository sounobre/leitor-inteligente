---
name: Active API runtime
description: Which backend implementation is actually served by the configured API workflow.
---

The configured API workflow runs the Spring Boot application from the Java sources. The repository also contains an Express/TypeScript scaffold, but changing it alone does not change the preview API.

**Why:** The two implementations can diverge while appearing to provide the same routes, causing the frontend to hit behavior that was never updated.

**How to apply:** For API features, update and validate `StudyController.java` first; only update the Express routes when the parallel scaffold's contract also needs to stay consistent.