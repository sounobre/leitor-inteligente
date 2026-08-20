---
name: OpenAPI numeric schema generation
description: Numeric fields in the shared OpenAPI contract must account for the workspace's Zod generator version.
---

Use `number` with an integer description when adding numeric fields to the OpenAPI contract; the current generated Zod dependency cannot emit `z.int()` from `type: integer`.

**Why:** Code generation succeeds, but the shared TypeScript build fails when an OpenAPI integer becomes the unsupported `z.int()` call.

**How to apply:** After changing `lib/api-spec/openapi.yaml`, run the API codegen and workspace typecheck before consuming regenerated client types.