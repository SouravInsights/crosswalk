---
"@webmcp-stack/codegen": minor
---

Generated tools now carry the full WebMCP authoring contract:

- **Annotations in every tool definition.** `readOnlyHint` comes from the safety classification; `untrustedContentHint` is set when a tool's output can contain user-written text (free-text fields with no enum or format). Agents use these to decide how careful to be.
- **Failures return readable results instead of throwing.** A rejected `execute` reaches the agent as a bare `UnknownError` with the message discarded; generated wrappers now convert failures into error results the agent can read and retry from. Cancellation (`AbortError`) still throws, as it should.
- **The execute context's `signal` reaches fetch**, so a cancelled tool call actually stops the request.
- **Registration skips quietly when the browser has no WebMCP.** One quiet log line per page load instead of a thrown error per tool; the human-facing page never notices.
- The CLI now exits with `process.exitCode` instead of `process.exit()`, so no log line can be truncated at the end of a run.
