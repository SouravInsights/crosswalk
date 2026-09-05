---
"@webmcp-stack/codegen": patch
---

Generated files now import only the runtime helpers they actually use. Disabled tools (which keep their request commented out) no longer import `callApi`/`toolResult`, and standalone schema tools no longer import `callApi`, so generated output passes strict `no-unused-vars` lint configs — including Next.js production builds, which treat those warnings as errors. The disabled-tool scaffold comment now names the imports to add back when enabling the call by hand.
