---
name: Public dictionary import
description: Operational constraints for importing the large public Kaikki/Wiktextract English dump.
---

The public dictionary importer should use Kaikki's English-only JSONL gzip release rather than the all-language raw dump. Persist entries, senses, forms, and sounds in batches, and derive entry IDs from normalized term plus part of speech so casing variants remain idempotent.

**Why:** The all-language dump wastes substantial transfer and parsing time for an English-only product. Long HTTP/2 downloads from Kaikki can receive a GOAWAY before EOF, and raw duplicate/casing variants otherwise collide with the database's normalized uniqueness key.

**How to apply:** Keep the normal API boot path import-disabled. Run a controlled import workflow with a release version, use HTTP/1.1 for the long-lived download, and report the final database entry count rather than the sum of per-batch records.