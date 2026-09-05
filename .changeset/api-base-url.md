---
"@webmcp-stack/codegen": patch
---

**Fixed: tools now call your real API, not localhost.** Generated tools baked the spec's `servers[0]` into every fetch — and that's usually a dev address like `http://localhost:3001`, so on a deployed site every tool call hit the visitor's own machine and failed. Now the codegen picks the first non-local server from your spec (e.g. `https://api.beenthere.page`), and when no public URL exists it falls back to same-origin (the deployed app's own API) instead of a dead localhost.
