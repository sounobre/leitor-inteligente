---
name: GitHub initial import
description: Reliable publishing of a full local monorepo through the GitHub connector.
---

Initialize an otherwise empty GitHub repository with a first file commit before using the Git Database API. For a large initial import, create the tree using inline text content and upload only binary files as blobs.

**Why:** The empty repository rejects Git Database blob creation, and large batches of per-file blob requests can be connector-throttled even when the GitHub core rate limit is available.

**How to apply:** Create a small initial file first, then construct one tree request from tracked text files, add binary blob SHAs, create a commit from that tree, and move the default branch ref.