---
name: Mobile offline boundary
description: Architecture boundary between local Ollama preparation on the computer and offline study on mobile.
---

The mobile app must never interact with Ollama or depend on the computer being online during study. The computer handles import, extraction, AI preparation, and synchronization; the mobile stores downloaded books and prepared study material locally.

**Why:** The core mobile promise is uninterrupted reading and study while the computer is turned off.

**How to apply:** Keep Ollama endpoint/model settings and generation flows in the computer web app. Treat synchronization as an occasional download boundary, show the last sync status on mobile, and make reading, cards, semantic maps, and review work from SQLite/offline data.