---
name: Dictionary EPUB entry shape
description: Structural rule for the HTML text emitted by the private dictionary EPUB importer.
---

Some dictionary EPUBs flatten each HTML entry into a section marker, a line such as `icing: be the icing on the cake`, a separate Portuguese translation line, and a later bilingual example separated by ` / `. The section marker is not an entry.

**Why:** Treating the extracted text as independent dash-separated lines creates fake one-letter entries and stores the English headword phrase as the Portuguese translation.

**How to apply:** Parse a colon entry together with the next non-empty non-example line as its translation; retain the English phrase as the sense definition and ignore bilingual example lines during import.