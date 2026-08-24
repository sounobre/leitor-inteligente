---
name: Public dictionary import
description: Operational constraints for importing the large public Kaikki/Wiktextract English dump.
---

The English reference importer should use Kaikki's English-only JSONL gzip release rather than the all-language raw dump. The EN–PT-BR importer may read the same release, but must persist every English headword in its own source/table/checkpoint, with Portuguese translations optional. Persist records in batches and derive IDs from normalized content so casing variants remain idempotent.

**Why:** The all-language dump wastes substantial transfer and parsing time for an English-only product. Long HTTP/2 downloads from Kaikki can receive a GOAWAY before EOF, and raw duplicate/casing variants otherwise collide with the database's normalized uniqueness key.

**How to apply:** Keep the normal API boot path import-disabled. Run a controlled import workflow with a release version, use HTTP/1.1 for the long-lived download, and report the final database entry count rather than the sum of per-batch records. Source metadata and license must be returned with bilingual entry details. Batch upserts must deduplicate repeated IDs before sending them to PostgreSQL; otherwise one batch can attempt to update the same row twice.