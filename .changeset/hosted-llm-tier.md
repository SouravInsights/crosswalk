---
"@webmcp-stack/codegen": patch
---

**`--suggest` no longer dead-ends without an API key.** In a real terminal, running `generate --suggest` with no key configured now offers three choices: use the free hosted tier (our proxy holds the key server-side, rate-limited, so trying the LLM layer takes zero setup), enter your own key for this run (masked input, OpenRouter/OpenAI/any OpenAI-compatible endpoint), or skip. In CI it still quietly runs deterministic — a prompt can never block a pipeline.
