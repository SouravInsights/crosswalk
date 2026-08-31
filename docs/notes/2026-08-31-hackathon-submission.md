# Hackathon submission: WebMCP Challenge

**Date:** 2026-08-31. Deadline: **Sep 3, 1:00pm PDT** (aim to submit Sep 2). Rules: https://webmcp.devpost.com/rules

## What we submit

**webmcp-codegen as a WebMCP-native site.** A page on the Crosswalk site where the codegen pipeline itself is exposed as WebMCP tools, callable by the judge's agent:

- `analyze-spec` — spec URL or pasted text → operation count, read/write/destructive breakdown, skipped endpoints
- `audit-spec` — the safety report: webhook/admin/auth endpoints flagged, PII warnings
- `generate-tools` — the generated file contents, ready to review and copy
- `preview-tool` — one operation's generated tool, for inspection

The judging flow: judge opens the live URL in ChatGPT's in-app browser, pastes a spec (or picks a bundled sample), and watches ChatGPT run the whole pipeline through the page's tools, including the audit catching an endpoint that must not become a tool. The repo tells the same story in code.

Why this fits the rules where alternatives do not: the challenge requires a **WebMCP-powered web app** at a live URL. The CLI alone has no URL. The planned analytics/audit apps are dashboards *about* WebMCP but do not register tools, so they are not WebMCP-powered. This page is codegen itself, agent-consumable — no bending, and it seeds the cloud roadmap (hosted codegen, audit service).

Feasibility (checked Aug 31): the pipeline stages are already pure functions (parse, naming, safety, templates); only the edges touch the filesystem. The browser build is a thin entry point — spec text in, `{files, report}` out. CORS blocks fetching arbitrary spec URLs from a page, so: bundled sample specs + paste are the reliable inputs, URL fetch is best-effort.

## Submission checklist

- [ ] Live URL working in ChatGPT's in-app browser first (the default judging environment), then Chrome 149+ with `#enable-webmcp-testing`
- [ ] Public repo with the license detectable in the About section (LICENSE is on main; flip the repo public)
- [ ] Text description answering the four required questions (below)
- [ ] YouTube video under 3 minutes, audio narration, no third-party trademarks or copyrighted music
- [ ] Check the eligibility section (age, country) on the rules page
- [ ] Submit Sep 2, not at the deadline

## Judging criteria, mapped

1. **WebMCP leverage** (thorough, skillful, non-trivial): the site's tools run the real pipeline — parse, classify, audit, generate — with structured inputs and outputs. Not hello-world.
2. **Real problem, real audience**: WebMCP adoption has an authoring bottleneck — someone has to write safe tools on every site, and naive exposure ships webhooks and admin endpoints as agent tools. Audience: every developer making their app agent-native.
3. **Creativity / novelty**: WebMCP tools that generate WebMCP tools. The agent uses the page to author the surfaces other agents will use. Self-referential, memorable, and nobody else in the ecosystem tells the safety story.

## Prizes (rules section 9)

One tier: the **top 10** submissions each get the full sponsor bundle. No per-sponsor categories, so there is nothing to shape the product around — winning means being in the top 10, period.

| Sponsor | Per winner |
|---|---|
| OpenAI | **$3,000 cash** + @OpenAIDevs spotlight + Codex swag + 1-year Pro (up to 3 members) |
| Netlify | **$500 cash** |
| Cloudflare | $10,000 credits |
| Vercel | $300/mo + $50/mo Gateway credits for 12 months ($4,200 value) |
| Render | $300 credits |
| Shopify | $250 gear |
| Google Chrome | 3 months Google AI Ultra (~$300/member) |

**Cash: $3,500 per winning submission.** Everything else is credits, gear, and subscriptions. There is exactly one cash-maximizing strategy: place top 10.

## How to maximize the odds

In rough order of leverage:

1. **The demo must be flawless in ChatGPT's in-app browser.** That is the default judging environment named in the rules. Test every build there first, not in Chrome.
2. **Engineer the audit-catch moment.** The bundled sample spec includes a webhook and an admin endpoint, so the judge (and the video) always hits the beat where the agent reports "this endpoint must not become a tool, and here's why." That is the differentiator and the memory hook.
3. **Freeze the demo path after recording.** The rules require the project to "function as depicted in the video" during judging (Sep 4-21). No breaking changes to the page in that window; the sample specs and flows shown in the video must keep working.
4. **Answer the four required questions explicitly in the description.** Judges may use automated AI-driven screening, so the text should name the criteria in plain words: why the use case fits WebMCP, the better UX, what people and agents can do together that was impossible before (an agent authoring your app's agent surface, reviewed by you, in one conversation), and how WebMCP was implemented.
5. **The video's first 20 seconds carry the submission.** Open with the agent already calling the tools and producing files; narrate the what and the why; land the audit catch before minute two. Under 3 minutes is a hard cap — judges are not required to watch beyond it.
6. **Repo hygiene is scored.** The README leads with the product; the code judges see is the code that runs the demo. Keep substantive commits inside the submission window (Aug 25 - Sep 3): pre-existing work is judged only on what was added in-window, and codegen's public life began Aug 29.
7. **Sponsor alignment, natural only:** demo in ChatGPT's in-app browser (OpenAI), host on Vercel (a sponsor, already the plan). Say each once in the video. Do not bend the product toward any sponsor.

## Build plan for the remaining days

1. Browser-safe pipeline entry point in codegen (spec text in → `{files, report}` out; no fs). Keep it exported from the package so the site imports the real thing.
2. The tools page on the site: spec input (samples + paste + best-effort URL), registers the four tools client-side, shows a human-readable report alongside for the non-agent view.
3. Land the field-report P0s that the demo depends on: role-based audit rules (webhook → error, admin → error, auth → warning). The audit catch is the demo's punchline; it must be real.
4. Video + description + submission form. Demo credentials are not needed (no auth on the page).
