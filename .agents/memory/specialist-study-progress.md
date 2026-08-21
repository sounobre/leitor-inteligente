---
name: Specialist study progress
description: Persistence boundary for the standalone specialist study catalog.
---

The web specialist catalog is standalone static learning content, and its Pendente/Estudado/Dominado progress is stored only in the browser.

**Why:** The first version must work without creating new PostgreSQL tables or mixing reusable language study with a specific book's preparation.

**How to apply:** Keep catalog updates editorial and local. Introduce server synchronization only as an explicit product change; preserve an offline-friendly local progress path when it is added.