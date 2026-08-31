# Repo review: what survives, what stops

**Date:** 2026-08-31. Trigger: webmcp-codegen 0.3.4 released; question was whether everything else in the repo still earns its place, and what to build next (analytics cloud vs one more consumer tool).

## Verdict up front

webmcp-codegen is the only product in the repo. The rest was exploration that produced one good product and good notes. Stop the SDK packages, clean the repo before the hackathon submission, and build depth on codegen next, not a second new thing.

## Per-project review

### webmcp-codegen (packages/codegen) — keep, this is the company

- Published and live: 0.3.4 on npm (first published Aug 29). Name is fully free and searchable.
- Validated against a real 73-operation production API (beenthere field report, Aug 30), with a concrete prioritized backlog that makes it better.
- Standalone: one runtime dep (`yaml`), zero coupling to the rest of the repo.
- The site, the landing page, the docs, and the last ~20 commits are all codegen. The repo already voted.

### core (groundstate SDK) — stop

The idea was honestly validated (see 2026-08-27-why-groundstate-exists.md), but as a product it fails on facts, not feelings:

1. **Unpublishable.** `groundstate` and the `@groundstate/*` scope are both taken by someone else's beta package (since Mar 2026). Every package in the SDK family collides.
2. **Wrong moment.** Its transport (the bridge) exists because no mainstream agent consumes WebMCP yet. That is a workaround with an expiry date, per our own audit.
3. **Second audience.** Codegen sells to developers shipping agent-facing tools. The SDK sells to developers debugging with coding agents. One person cannot market both, and the repo identity proves it: the README still leads with Groundstate and never mentions codegen.

The durable ideas (fixtures, state history, doctor, prod guard) live in docs/notes. If the dev-loop product becomes timely after native WebMCP ships, it deserves a fresh start under a free name, informed by those notes, not a resurrection of 1.7k lines.

### react — stops with core

The auto-derivation (observeStore, observeQueries) was the best idea in the SDK per the Aug 27 audit, but it is bound to core. Nothing to salvage independently.

### bridge — stop

Our own audit flagged it: chrome-devtools-mcp already ships experimental WebMCP support, so "Claude Code calls your page's tools" is becoming a Chrome feature. Shelf life, explicitly known since Aug 27.

### inspector — stop, first delete

Already conceded to Google's DevTools WebMCP panel and the ChromeLabs inspector extension. We deprioritized it in the Aug 27 audit and never touched it again.

### examples/demo-app — delete

Exists only to demo the SDK. Goes with it.

### examples/openapi-petstore — keep

Codegen's example. Part of the product's docs story.

### site — keep, trim

Already 100% codegen on the home page and docs. Remove `site/content/groundstate` (the legacy SDK docs section).

### docs — keep, trim

Keep `docs/notes` and `docs/specs` (the design history is the most reusable asset after codegen itself). Delete `docs/temp`. Move `groundstate.md` into `docs/notes` as history; it is a pitch for the SDK, not a root-level doc anymore.

## The strategy question: analytics cloud vs one more consumer tool

**Neither, right now. Depth on codegen is the next build, and the deadline forces it anyway.**

**On the analytics cloud:** this is the right *eventual* business layer. It is already sketched in codegen-design.md as the open-core phase: telemetry client, self-hostable dashboard, "which tools are agents actually calling, which fail validation, what fraction of conversions are agent-assisted." But it is gated on a fact we wrote down ourselves: no mainstream agent consumes WebMCP tools yet. Analytics for traffic that does not exist is infrastructure before need, which the design doc explicitly warns against. Build it when Chrome ships WebMCP stable (targeted 157) and origin-trial sites have real agent calls. The cheap precursor already exists: the local `npx webmcp-codegen dev` dashboard. Keep it local.

**On one more consumer-facing tool:** only one candidate compounds with codegen instead of diluting it: a standalone **audit** that checks any site's live WebMCP tools, not just ones we generated. The beenthere run proved the audit is the differentiator (it would have flagged a Razorpay webhook receiver becoming an agent tool). A "paste your URL, get a safety report" tool is top-of-funnel for codegen. Worth doing after the submission, not before.

**What the next two weeks actually are:**

1. **The submission (Sep 3, 1pm PDT).** The repo is still private (GitHub returns 404). The challenge requires a public repo with a visible license, a live URL, a <3min demo video, and the written description. Three days out, this is the only P0.
2. **The field-report backlog.** P0: role-based audit rules (webhook → error, admin → error, auth → warning). P1: strip shared `/v1` prefix from tool names. P2: `additionalProperties: false`, drop `readOnly` inputs. This is what makes 0.4.0 worth announcing alongside the submission.

## Cleanup plan

1. `git tag archive/groundstate-sdk` before deleting anything (history preserved either way, the tag makes it findable).
2. Delete: `packages/{core,react,bridge,inspector}`, `examples/demo-app`, `site/content/groundstate`, `docs/temp`.
3. Move `groundstate.md` → `docs/notes/groundstate-sdk-pitch.md`.
4. Rewrite `README.md` around webmcp-codegen (current one never mentions it; judges will land here).
5. Update `AGENTS.md` and `pnpm-workspace.yaml` (drop nothing, `packages/*` and `examples/*` globs still match what remains).
6. User action, GitHub settings: rename repo `groundstate` → `webmcp-codegen` (redirects preserve links, including the issues URL in cli.ts), then make it public with the MIT license visible. Do this before submitting.
