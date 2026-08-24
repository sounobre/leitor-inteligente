---
name: Reading position reconciliation
description: How offline reader progress is reconciled across devices.
---

The reader queues one pending position per book locally and sends chapter, offset, progress, and a client timestamp during synchronization. The server accepts only positions whose timestamp is at least as recent as the stored position and returns the canonical book when an older update loses.

**Why:** Reading must remain available offline, while concurrent devices need a deterministic winner instead of whichever request arrives last.

**How to apply:** Keep local writes independent of network availability, upload queued positions before pulling the prepared-book snapshot, and remove a queue entry only after a successful API response. Never resolve conflicts by arrival order alone.