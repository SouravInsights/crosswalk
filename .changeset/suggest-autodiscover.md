---
"@webmcp-stack/codegen": minor
---

**Two LLM flags, one job each, no file paths.** `generate --llm` improves the names and descriptions of the tools being generated (applied as marked drafts you review — your words always win). `generate --suggest` discovers schemas worth declaring, and now finds your schema modules itself instead of taking a path. Both share one key chooser: hosted tier, your own key, or skip — and CI always runs deterministic. Also fixed: TypeBox modules are now actually loaded (the loader only recognized the Standard Schema marker before), and Node's type-stripping warning no longer leaks into output.
