# webmcp-codegen: the complete first run

Date: 2026-08-30. Status: implemented (sections 1-6 and the dashboard's first drop).
The dashboard's agent panel (7, "agent test") and the standalone audit
CI command remain unbuilt.

## The goal in one sentence

A developer runs one command in their repo, and a few minutes later an AI agent
can really call their app in the browser — without the developer needing to
understand WebMCP first.

```
$ npx @webmcp-stack/codegen

  found spec:    apps/server/openapi/openapi.json (73 operations)
  found web app: apps/web (next)

  ✓ 71 tools written to apps/web/src/webmcp/ (52 read, 15 write, 4 destructive)
  ✓ 2 webhook endpoints skipped (they are for servers, not agents)
  ✓ registration wired into apps/web/src/app/providers.tsx (2 lines added)
  ⚠ 1 thing to review: create-user-admin returns an email field

  Try it: start your app, open it in Chrome with the WebMCP flag on,
  and ask the agent "list my trips".
```

That whole flow is the product. Everything below exists to make it real.

## 1. Generated tools work out of the box

Today `execute()` throws until the developer fills it in. But the spec already
knows how to call the endpoint (method, path, params, server URL), so the
generated code should just call it.

**Read tools** (GET, and search-style POSTs): generated with a working `fetch`
call to the API, using the page's login session. They work immediately.
The developer can later replace `fetch` with their SDK client if they want;
it is a refinement, not homework.

**Mutations** (POST/PUT/PATCH/DELETE that create, change, or delete things):
the working `fetch` code is generated but **commented out**, and the function
starts with a clear "this tool is disabled" message. Enabling a tool is
uncommenting the body. The developer reviews each mutation before it can run.
(Your call from review: mutations start off.)

**Search-style POSTs are not mutations.** Some endpoints use POST to read
(`POST /search`, `POST /estimate`, `POST /preview`). Rule: if the name starts
with a reading word (search, query, list, find, filter, estimate, preview,
validate, check), the tool is treated like a read and starts enabled.

**Consent for mutations moves into generated code.** Today the comment tells
the developer to remember to ask the user for confirmation. Instead, the
generated wrapper does it automatically for mutations (a confirm dialog the
developer can replace with their own). Impossible to forget.

## 2. Endpoint rules (from the real beenthere run)

- **Webhooks are skipped entirely.** They receive server callbacks; they are
  meaningless as agent tools. Listed in the report as skipped, not generated.
- **Auth endpoints** (signin, login, logout, token, oauth, password): flagged
  with a warning and generated disabled. Agents should not drive login.
- **Admin endpoints**: flagged with a warning and generated disabled.
- The existing checks (PII in responses, destructive-sounding GETs,
  agent-instructing descriptions) stay as they are.

## 3. Finding the right folder in a monorepo

The bug you hit: running from the monorepo root put files in root `src/webmcp`,
which belongs to no app. The rule: tools are browser code, so they belong in
the package that is the web app.

Detection order:
1. Read every workspace package's `package.json`. The one whose dependencies
   include a browser framework (next, react+vite, nuxt, sveltekit) is the web
   app. In beenthere this finds exactly `apps/web`.
2. **Exactly one candidate: proceed without asking**, and say what we decided.
3. **Several candidates: ask once**, most likely one pre-selected.
4. **None found: fall back** to the current directory, as today.

The decision is written into `codegen.config.mjs`, so it is made once,
visible forever, and never re-asked. `--out` overrides everything.

## 4. Wiring registration into the app (2 lines, additive only)

Generated files do nothing until the app calls `registerAllTools()` once at
startup. We do this edit for them:

- **Next.js (app router):** generate a small client component
  (`webmcp/register.tsx` with `"use client"`), then add one import and one
  `<WebMCPRegister />` line to the root layout.
- **Vite/React:** add `import { registerAllTools }` + one call in `main.tsx`.
- **Entry not found confidently:** print the exact two lines and where to put
  them. Never guess-edit.

Edits only ever **add** lines, never change existing ones, and the report says
exactly what was added where and how to undo it. No question is asked for this;
it is safe, additive, and reversible. (Questions only when detection is
genuinely ambiguous, per §3.)

## 5. Naming cleanup

Strip a shared API version prefix from tool names: when almost every path
starts with `/v1/`, names become `list-trips` instead of `get-v1-trips`.
The report notes that the prefix was stripped.

## 6. The final report

After a successful run, print: where files went, the risk counts, what was
skipped and why, what was edited, what needs review, and the one "try it"
instruction. No jargon like "execute" or "marker" in this output; name actual
file paths.

**How the "try it" line is personalized.** The report already has the full
tool list with risk labels. From it we pick one safe read tool as the
suggestion. Selection order: (1) a name containing list/get/search/read/
find/recent; (2) if none, any read tool; (3) if none, skip the example
entirely and just print the setup steps. The example echoes the tool's
description, which comes from the spec's summary, so it sounds like the
developer's own product ("list my trips" in beenthere, "search photos" in
Immich, "list orders" for a shop). It costs about ten lines and is the
difference between the CLI feeling like a generic installer and a tool that
understands your API.

## 7. The tools dashboard (new, needs your sign-off)

Your proposal, with a design for how to build it. The problem it solves is
real: after generation, 73 files are invisible inside the app. There is no
way to see them, tune them, or try them without first learning Chrome flags
and extensions.

**Recommendation: a local dev server (`npx @webmcp-stack/codegen dev`), not a
generated page, not a shipped React package.** Reasons:

- A generated page in the app inherits the app's auth and routing, and ships
  to production unless the developer guards it. One leaked route is how a
  dev tool becomes a production backdoor.
- A React component package assumes React (excludes Nuxt/Svelte/plain apps),
  doubles the maintenance surface, and duplicates the config file's job.
- A localhost server works for every framework, can never reach production,
  and gives full control over the UI. It opens on demand, same idiom as
  Drizzle Studio, Prisma Studio, and the Storybook UI.

**What it shows.**

- *Tool list*: name, description, risk label, source endpoint, enabled or
  disabled. Searchable, grouped by tag.
- *Edit*: description and display name, editable in place. **How:** edits
  are written to `codegen.config.mjs` as overrides (the config already has
  an `override` mechanism planned), so they survive regeneration. The
  dashboard never edits generated files; it edits the source of truth.
  `runtime.webmcp.ts` never appears here — it is plumbing, not a tool.
- *Enable/disable*: toggles that write to the same overrides. The source of
  truth stays in code.
- *Try it*: the part you said you couldn't fully articulate. Two honest
  levels. **Direct test (ships first):** each tool page has a "run it"
  panel. It renders a form from the tool's input schema, runs the tool's
  execute function, shows the raw result. This is how the developer checks
  their own wiring. **Agent test (after the foundation works):** a panel
  that connects a local model (Ollama) or the user's own API key, gives the
  model the tools, and lets the developer watch it choose and call them.
  This answers the question every developer actually has ("will an agent
  pick the right tool?") but it needs model plumbing, so it lands second.

**How it works technically.** The CLI already walks sources and builds a
candidate list with descriptions, risk tiers, and schemas (that is what
`--dry-run` prints). The dev server reuses that walk instead of re-implementing
anything, serves a small single-page UI (no framework dependency), and opens
the browser. It runs only while the developer has it open. For the direct
"run it" test, the server can also execute the endpoint server-side using
the same schema, so tools can be tried even before the app is running.

**Design bar: this is a product surface, not a terminal helper.** The UI must
feel like Storybook's UI, Mintlify, or Scalar's local API explorer: a real
left sidebar with grouped, searchable tools; a detail pane with breathing
room; keyboard navigation (up/down through tools, ⌘K to jump); visible focus
states; careful typography (system sans for prose, mono for names and code);
dark theme matching the site's design tokens (same accent blue, same
hairline borders, same text scale). No default browser styling anywhere, no
bare <select>, no unstyled buttons. Plain HTML/CSS/JS does not mean plain-
looking: Scalar and early Storybook prove a hand-built UI can look sharp.
The rule from the site work applies here too: nothing on this page may look
generated.

**Deliberately not included:** editing input schemas (changing the contract
is the spec's job, not a UI's), and editing generated code by hand (that
breaks the regeneration promise).

## 8. Docs that must ship with this

Every thing we expect the user to do gets a page, in plain language:

- **Quickstart** rewritten around the new first run (command → working tools
  → see them in the browser).
- **Enabling and refining tools**: what a disabled tool looks like, how to
  enable it, how to swap `fetch` for your own client.
- **How registration works**: what got added to your entry file and why,
  how to do it by hand, how to undo it.
- **Seeing your tools**: the Chrome flag, the inspector extension, the
  polyfill for other browsers.
- **Monorepos**: where files go and how to override.

## Not in this round

tRPC source, React-hook generator, framework plugins beyond Next/Vite
detection, the standalone `audit` CI command, bundling the polyfill.
The design doc's phases still stand for those; this spec deliberately cuts
across them because the first-run story matters more than the order.

## 8. Open questions for your review

1. **Server URL**: default `fetch` uses a relative path (works when app and
   API share a host). If the spec lists a server URL, prefer it? My leaning:
   relative first, spec URL as fallback comment.
2. **Disabled tools**: register them anyway, so an agent that calls one gets
   back "this tool is disabled; uncomment it in <file>" (agent can relay that
   to the human)? Or don't register them at all (invisible until enabled)?
   My leaning: register-and-report, because it makes disabled tools
   discoverable instead of silently absent.
3. **Session cookies on fetch**: include them by default
   (`credentials: "include"`)? Needed for most real apps; slightly wider than
   the browser default. My leaning: yes, include.
4. **Dashboard scope**: build `npx @webmcp-stack/codegen dev` as described in §7?
   My leaning: yes, and in two drops — list + edit + enable/disable + direct
   "run it" first, the agent panel second. The alternative (a React component
   package) is in §7 with reasons against; overrule if you disagree.
