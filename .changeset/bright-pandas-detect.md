---
"webmcp-codegen": minor
---

Zero-config `generate`: auto-detects OpenAPI/Swagger specs anywhere in the project (monorepo layouts included), so `npx webmcp-codegen generate` now works with no install and no config file. Adds `--spec` and `--out` flags as config-free overrides; `init` remains the path to full control via codegen.config.mjs.
