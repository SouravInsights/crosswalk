# Groundstate

**Give your coding agent ground truth about your running app.**

Your agent writes your frontend, but it can't see inside it — it guesses from screenshots and
DOM dumps, and you burn round-trips correcting it. Groundstate is a dev-only SDK that exposes
your app's real state and actions as tools (via [WebMCP](https://developer.chrome.com/docs/ai/webmcp)),
so the agent you already use can:

- **Read the truth** — `getCheckoutState()` returns the actual store, not what the DOM implies.
- **Do real things** — `submitCheckoutWithCard("declined_test_card")`, defined by you, callable by it.
- **Jump to any state** — `loadFixture("cart_with_declined_card")` in one call, no clicking there.

> Chrome DevTools MCP tells the agent what the browser sees.
> **Groundstate tells it what the app knows.**

---

## Repository layout

| Path | npm name | What it is |
|---|---|---|
| `packages/core` | `groundstate` | Framework-agnostic runtime: `observe` / `act` / `fixture` / `reset` / `record` / `doctor`, transport adapter, production guard, internal registry. **Zero runtime dependencies.** |
| `packages/react` | `@groundstate/react` | React hooks (`useObservable`, `useAction`, `useFixture`) plus auto-derived observables: `observeStore` (Zustand) and `observeQueries` (TanStack Query). |
| `packages/bridge` | `@groundstate/bridge` | Local MCP server (stdio) that connects a running page's Groundstate registry to an MCP client via CDP. |
| `packages/inspector` | `@groundstate/inspector` | In-page dev overlay (shadow DOM, vanilla TS): browse/invoke registered tools. |
| `examples/demo-app` | private | Vite + React + Zustand cart/checkout demo app. |
| `site/` | private | Next.js + Fumadocs landing page and documentation. |

---

## Development

```bash
pnpm install
pnpm build        # turbo run build (respects dependency graph)
pnpm test         # turbo run test
pnpm typecheck
pnpm lint:fix
```

### Demo app

```bash
pnpm --filter demo-app dev   # Vite dev server on :5173
```

### Landing page & docs

```bash
pnpm --filter site dev       # Next.js dev server on :3000
```

Or build for production:

```bash
pnpm --filter site build
pnpm --filter site start     # serves on :3000
```

### Full E2E smoke test

```bash
# 1. start the demo app
pnpm --filter demo-app dev

# 2. start Chrome with a debugging port (new terminal)
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9223 --user-data-dir=/tmp/gs-profile \
  --no-first-run http://localhost:5173

# 3. test the bridge (new terminal)
node -e "
import('./packages/bridge/dist/index.js').then(async ({connectToPage}) => {
  const page = await connectToPage({browserUrl: 'http://127.0.0.1:9223', pageUrlContains: 'localhost:5173'});
  const tools = await page.listTools();
  console.log('tools:', tools.map(t => t.name).join(', '));
  const result = await page.callTool('getCheckoutState', {});
  console.log('state:', JSON.stringify(result, null, 2));
  await page.close();
});
"
```

---

## Onboarding for new contributors

### Prerequisites

- Node.js >= 20
- pnpm >= 10
- Chrome (for bridge testing)

### Setup

```bash
git clone <repo-url>
cd groundstate
pnpm install
pnpm build
```

### Key concepts

1. **Transport adapter order** — `document.modelContext` (spec current) → `navigator.modelContext` (deprecated, Chrome origin trial) → internal registry (bridge via `window.__GROUNDSTATE__`). Feature-detect only; never user-agent sniff.

2. **Production guard** — `init()` throws in production builds. There is no override flag. This is by design: Groundstate exposes internal state and mutating actions.

3. **Bridge is the primary transport today** — no mainstream agent client consumes WebMCP natively yet. The bridge works in any Chromium browser via CDP, no flags required.

4. **Tool naming contract** — observables → `get<Name>State`, actions → your chosen name, fixtures → `loadFixture`/`listFixtures`, recorder → `getStateHistory`, health → `getGroundstateHealth`.

### Making changes

1. Create a changeset: `pnpm exec changeset`
2. Write tests for new behavior
3. Update docs in `site/content/docs/` if user-facing
4. Update `AGENTS.md` if architecture changes

### Publishing

```bash
pnpm exec changeset version   # bumps versions, updates changelogs
pnpm release                  # publishes to npm
```

Or push to `main` — the release workflow opens a "Version Packages" PR automatically.

### Useful commands

| Command | What it does |
|---|---|
| `pnpm --filter demo-app dev` | Run the demo app |
| `pnpm --filter site dev` | Run the landing page + docs |
| `pnpm --filter groundstate test` | Test core SDK only |
| `pnpm --filter @groundstate/react test` | Test React adapter only |
| `pnpm exec biome check --write` | Lint + format |

---

## Deployment

### Landing page & docs (site/)

Deploy `site/` to any Next.js host. Vercel and Netlify are both hackathon sponsors, so either works.

**Vercel** (recommended — zero config):

```bash
# install Vercel CLI if needed
npm i -g vercel

# from repo root
cd site && vercel
```

Or connect the repo on [vercel.com](https://vercel.com) — it auto-detects Next.js.

**Netlify**:

```bash
npm i -g netlify-cli
cd site && netlify deploy --build
```

**Manual / self-hosted**:

```bash
cd site
pnpm build
pnpm start    # serves on :3000
```

Set these env vars if deploying publicly:
- `NEXT_PUBLIC_SITE_URL` — canonical URL for metadata (optional but recommended)

### npm packages

```bash
# bump versions and update changelogs
pnpm exec changeset version

# commit the version bump, tag, and push
git add -A && git commit -m "chore: release" && git push --tags

# publish to npm (requires NPM_TOKEN)
pnpm release
```

Or push to `main` — the GitHub Actions release workflow opens a "Version Packages" PR automatically. Merge it to publish.

---

## Security

Groundstate exposes internal state and mutating actions. `init()` refuses to run in production
builds — there is deliberately no override. Never ship it enabled to real users.

When testing with the bridge, always use a dedicated Chrome profile (`--user-data-dir`) — the
debugging port grants control over that browser instance to local processes.

---

## Links

- [groundstate.md](groundstate.md) — product plan and design rationale
- [AGENTS.md](AGENTS.md) — architecture invariants and contributor guidance
- [WebMCP](https://developer.chrome.com/docs/ai/webmcp) — the underlying standard
- [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp) — the complementary tool
