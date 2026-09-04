# What a good WebMCP tool needs, and where each piece comes from

> The design map for the whole codegen. Written to answer one question: for a
> successful tool generation, what do we ideally need, and how does each piece
> get fed into the pipeline? This is the frame the source/output naming
> hangs off of.


## The five things every tool needs

A tool an agent can actually use needs all five of these. Miss one and the
tool fails in a specific, predictable way:

| # | What the tool needs | Without it |
|---|---|---|
| 1 | **A name + description** the agent reads to decide whether to call it | The tool is invisible or misused |
| 2 | **An input contract**: fields, types, requiredness, constraints, descriptions | The agent guesses at inputs and fails validation |
| 3 | **A way to execute**: the real work the tool does | The tool is a stub that does nothing |
| 4 | **A safety posture**: is it a read or a write, does it touch PII, does it need auth | The agent can mutate or leak things unchecked |
| 5 | **Context for the agent**: what it returns, what's missing, what to do next | The agent can't recover or continue the task |

Here is the central fact of the whole design: **no single source provides all
five.** Every source is strong on some and silent on others. The codegen's job
is to fill the gaps deterministically where it can, and surface the rest to
the developer.

## Where each source contributes, and where each stays silent

| Need | `openapi` source | `schema` source | `manual` |
|---|---|---|---|
| 1. name/description | from `operationId` + `summary` (often thin) | from the tool name you declare + `.describe()` | you write it |
| 2. input contract | request schema | the schema itself (it IS the runtime truth) | you write it |
| 3. execute | method + path + server URL = a real request scaffold | silent: a schema says what inputs look like, not what to do with them | you write it |
| 4. safety | method heuristics + name heuristics + PII scan | name heuristics (no HTTP verb) | you write it |
| 5. agent context | `outputSchema` when the spec has one | silent (no return shape known) | you write it |

Each row is a contribution or a silence, not a grade. The two facts worth
stating:

- **OpenAPI knows *how to call the endpoint* (3), but not *what the action
  means to your product* (1, 5).**
- **A schema *is* the input contract (2) and carries your declared intent (1),
  but says nothing about *what happens when the tool runs* (3)**, because in a
  real app that's your code: the `handleCreate` sequence, the store, the
  navigation.

That is not a flaw to fix. It is the reason the two sources exist, and it
dictates where the developer's effort goes:

- With `openapi`, the scaffold for `execute()` is real (a request). Your job
  is the contract's *meaning*: better descriptions, reviewing the audit.
- With `schema`, the contract is already yours. Your job is `execute()`:
  wiring it to your app's own actions instead of a raw endpoint.

## How the pipeline feeds it all together

```
            ┌──────────────┐         ┌──────────────┐
            │ openapi spec │         │ your schema  │         (more later:
            │ (what the API│         │ (what the    │          tRPC router,
            │  exposes)    │         │  action is)  │          manual file)
            └──────┬───────┘         └──────┬───────┘
                   │                        │
                   ▼                        ▼
            ┌──────────────────────────────────────┐
            │  normalize → CandidateTool            │   needs 1, 2 (+ 3 for openapi)
            │  ┌─ constraint synthesis (need 2 text)│
            │  └─ LLM drafting (needs 1, 2) [opt-in]│
            ├──────────────────────────────────────┤
            │  safety review (need 4)               │   deterministic, always
            ├──────────────────────────────────────┤
            │  audit pass (needs 1, 2, 5 gaps)      │   deterministic findings
            │  + LLM suggestions [opt-in]           │
            └──────────────────────────────────────┘
                   │
                   ▼   one CandidateTool type, regardless of source
            ┌──────────────────────────────────────┐
            │  outputs                              │
            │  ├─ tools   → .webmcp.ts (contract   │   need 5: structured
            │  │            + scaffolded execute)   │   results, "missing" lists
            │  └─ form    → annotate a <form>      │
            └──────────────────────────────────────┘
```

Three things to take from this:

1. **Sources feed one shared type.** After `normalize`, an OpenAPI endpoint
   and a declared schema are the same `CandidateTool`. Everything downstream
   (safety, audit, outputs) works identically on both. This is why adding a
   source is cheap and why the pipelines don't fork.

2. **The gaps get filled in order: deterministic first, then LLM, then you.**
   Constraint synthesis fills thin descriptions mechanically. The LLM layer
   (opt-in) drafts better ones. Whatever is still missing lands in the audit
   report for you. Nothing is silently guessed.

3. **The output owns need 5.** Whatever the source, the `tools` output wraps
   results in `toolResult(...)` so the agent always gets structured data back,
   and the journey layer (separate spec) adds the "here's what's missing"
   shape. The source doesn't have to provide this; the generated code does.

## The two sources answer different questions

They are not alternatives and not in competition. Each answers a different
question about the same job:

- **`openapi` answers "what does the HTTP API expose?"** Use it when you have
  an API contract and the endpoint roughly *is* the action.
- **`schema` answers "what should an agent be able to do, in my product's
  terms?"** Use it when the action is bigger than one endpoint (it needs
  product behavior around it), or when there's no HTTP API at all.

beenthere uses both, on the same product: `openapi` for the 73 raw operations,
`schema` for the create-trip action that must drive the editor. The shared
pipeline is what makes them feel like one tool instead of two.
