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

## Packages

| Package | What it is |
|---|---|
| [`groundstate`](packages/core) | Core SDK: `observe` / `act` / `fixture` / `reset`. Zero dependencies, dev/preview only. |
| [`@groundstate/react`](packages/react) | React hooks: `useObservable`, `useAction`, `useFixture`. |
| [`@groundstate/bridge`](packages/bridge) | Local MCP server connecting a running page's tools to Claude Code / Codex / Cursor via CDP. |

## Quick start

```ts
// app startup, dev builds only
import * as groundstate from "groundstate";

if (import.meta.env.DEV) {
  groundstate.init({ appName: "my-app" });
  groundstate.observe("checkout", () => store.getState().checkout);
  groundstate.act("submitCheckoutWithCard", ({ cardToken }) => checkout.submit(cardToken));
  groundstate.fixture("cart_with_declined_card", () => seedDeclinedCardState());
}
```

```bash
# 1. run your app, and Chrome with a debugging port
chrome --remote-debugging-port=9222 --user-data-dir=/tmp/groundstate-profile http://localhost:5173

# 2. connect your agent
claude mcp add groundstate -- npx @groundstate/bridge --page localhost:5173
```

Your agent now has `getCheckoutState`, `submitCheckoutWithCard`, `loadFixture`, `listFixtures`,
and `resetToGroundState` — live against the running app.

## Development

```bash
pnpm install
pnpm build && pnpm test
pnpm --filter demo-app dev   # example app in examples/demo-app
```

See `groundstate.md` for the product plan and `AGENTS.md` for contributor/agent guidance.

## Security

Groundstate exposes internal state and mutating actions. `init()` refuses to run in production
builds — there is deliberately no override. Never ship it enabled to real users.
