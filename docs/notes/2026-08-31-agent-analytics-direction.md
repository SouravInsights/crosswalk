# Direction: agent analytics, merged with audit

**Date:** 2026-08-31. Seed: user's rough idea (visits, tool calls, success rate, latency), the open-core sketch in `docs/specs/codegen-design.md` (telemetry client, self-hostable dashboard), and the standalone-audit idea from the repo review. Post-hackathon project. Money is secondary; ship something genuinely useful, open-core like PostHog.

## One line

**PostHog for agent traffic: see what agents actually do with your tools.**

## Audit and analytics are one product

They are the same rule engine pointed at two data sources:

- **Audit = pre-flight.** Static checks on tool definitions before you ship (what codegen's `generate` already does: risk classification, PII warnings, webhook/admin/auth role rules).
- **Analytics = post-flight.** What actually happens after you ship. Every audit rule gets a live counterpart: a tool that throws in production, an endpoint agents abandon, a schema agents keep failing.

The funnel writes itself: paste a URL, get an audit report (free, no signup) → "keep watching this live" → install the client → cloud dashboard.

## What to capture

The client is a tiny wrapper around tool registration (one import by hand, or emitted automatically by codegen). Four event types:

1. `tool_registered` — which tools exist on the page, with schema versions. Detects drift between what you shipped and what's live.
2. `tool_called` — tool name, caller origin, agent identity when detectable, whether args passed schema validation.
3. `tool_result` — success / validation error / runtime error, latency.
4. Session grouping — the sequence of calls in one agent session, so funnels exist.

## The metrics that make it useful (not vanity)

1. **Validation failures per tool.** Agents inventing arguments means your schema or descriptions are unclear. This is the killer metric because it closes the loop: it tells you exactly what to regenerate in codegen. Nobody else can do this, because nobody else owns the generator.
2. **Never-called tools.** Registered but never invoked: prune them, they cost context on every page load (the spec community's known pain, nobody tools for it).
3. **Live error rate per tool.** Tool rot in production, caught the day a refactor ships. This is `doctor` from the old SDK, reborn as a live check.
4. **Agent breakdown.** Which agents call you (Claude, ChatGPT, Gemini-in-Chrome). When native consumers ship, users watch the shift on their own dashboard.
5. **Agent-assisted conversion.** Sessions where a tool call preceded the business event (purchase, booking, export). This is the number that justifies WebMCP investment to a whole team, and the one that makes the product legible to non-engineers.

Latency percentiles and call volumes are table stakes; they ship anyway, but they are not the pitch.

## The moat

Codegen already knows every tool's schema, risk tier, and description. So: instrumentation is emitted for free at generation time (zero config), and the analytics side validates live traffic against the known schema. A generic analytics bolt-on cannot do either. The two products compound: analytics findings become codegen regeneration suggestions.

## Money, PostHog-style (secondary, per the user)

- Everything MIT: the client, the dashboard, self-hosting. Full product, no crippled community edition.
- Paid = hosted cloud, priced on event volume with a genuinely useful free tier (PostHog's 1M events/mo is the reference). Retention extensions and team features (alerts, shared dashboards) are the upgrade levers.
- The audit stays free forever. It is the top of funnel, not a SKU.

## Timing

Build order after the hackathon: (1) the client + local-first dashboard, cheap and composable with codegen; (2) the standalone audit page as the funnel; (3) the hosted cloud only once real origin-trial traffic exists. Do not build cloud infrastructure before ten sites ask for it.

## Later, same monorepo

- **Conformance checker**: does your live site still match the current spec draft (spec churn is constant; the old SDK's adapter idea becomes a checker).
- **Skills authoring** (spec issue #161: tools say what a site can do, skills say how to do it well): unoccupied, and codegen's descriptions are half the artifact already.
