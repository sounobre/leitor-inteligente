---
name: Dictionary EPUB entry shape
description: Structural rule for the HTML text emitted by the private dictionary EPUB importer.
---

Some dictionary EPUBs flatten each HTML entry into a section marker, an alphabetical headword followed by a colon and expression (such as `amends: make amends (...)`), a separate Portuguese translation line, and a later bilingual example separated by ` / `. The section marker and headword are not necessarily the study term.

**Why:** Treating the extracted text as independent dash-separated lines creates fake one-letter entries; treating the alphabetical headword as the term produces entries such as `amends` instead of the learnable expression `make amends`.

**How to apply:** Parse a colon entry together with the next non-empty non-example line as its translation. Preserve the text before the colon as a display-only headword, store the English expression after it as the term, strip parenthetical usage slots from the search term while retaining the complete phrase as the sense definition, and ignore bilingual example lines during import.