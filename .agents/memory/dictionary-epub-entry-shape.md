---
name: Dictionary EPUB entry shape
description: Structural rule for the HTML text emitted by the private dictionary EPUB importer.
---

Some dictionary EPUBs flatten each HTML entry into a section marker, an alphabetical headword followed by a colon and expression (such as `amends: make amends (...)`), a separate Portuguese translation line, and a later bilingual example separated by ` / `. The section marker and headword are not necessarily the study term.

**Why:** Treating the extracted text as independent dash-separated lines creates fake one-letter entries; treating the alphabetical headword as the term produces entries such as `amends` instead of the learnable expression `make amends`.

**How to apply:** Parse a colon entry as a block: preserve the text before the colon as a display-only headword, recognize usage labels such as `inf` separately, store the English expression after it as the term, and create one ordered sense per translation (including numbered senses). Strip parenthetical usage slots from the search term while retaining the complete phrase as the sense definition; recognize and ignore all bilingual example blocks during import.