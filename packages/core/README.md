# groundstate

**Give your coding agent ground truth about your running app.**

Dev-only SDK that exposes your app's real state and actions as [WebMCP](https://developer.chrome.com/docs/ai/webmcp) tools, so an agent can ask the running app what actually happened — and put it into any state in one call — instead of guessing from screenshots or the DOM.

> Chrome DevTools MCP tells the agent what the browser sees.
> **Groundstate tells it what the app knows.**

## Install

```bash
npm install groundstate
```

## Usage

```ts
import * as groundstate from "groundstate";

if (import.meta.env.DEV) {
  groundstate.init({ appName: "my-app" });

  // Observable → agent tool `getCheckoutState` (live, read-only)
  groundstate.observe("checkout", () => ({
    cartItems: store.cart.items,
    validationErrors: form.errors,
    paymentStatus: store.payment.status,
  }));

  // Action → a developer-blessed operation the agent may perform
  groundstate.act(
    "submitCheckoutWithCard",
    ({ cardToken }) => checkout.submit(String(cardToken)),
    {
      description: 'Submit checkout with a test card token. "declined_test_card" simulates a decline.',
      inputSchema: {
        type: "object",
        properties: { cardToken: { type: "string" } },
        required: ["cardToken"],
      },
    },
  );

  // Fixture → one-call jump to a known app state (`loadFixture`)
  groundstate.fixture("cart_with_declined_card", async () => {
    store.reset();
    store.addItem(testItem);
    await checkout.submit("declined_test_card");
  });

  // Baseline → `resetToGroundState`
  groundstate.reset(() => store.reset());

  // Flight recorder → `getStateHistory` (the causal trace, not just snapshots)
  groundstate.record("checkout", {
    subscribe: (fn) => store.subscribe(fn),
    snapshot: () => store.getState(),
  });
}
```

Every app also gets `getGroundstateHealth` for free: it executes every read-only tool and
reports which ones still work — so a selector broken by a refactor fails loudly instead of
silently feeding an agent garbage. Call it from code as `groundstate.doctor()`.

## Registered tools

| Tool | From | Kind |
|---|---|---|
| `get<Name>State` | `observe(name, fn)` | read |
| *(your name)* | `act(name, fn, opts)` | mutate |
| `listFixtures` / `loadFixture` | `fixture(name, fn)` | read / mutate |
| `resetToGroundState` | `reset(fn)` | mutate |
| `getStateHistory` | `record(name, source)` | read |
| `getGroundstateHealth` | always | read |

## Connecting an agent

No mainstream agent client consumes WebMCP natively yet, so use
[`@groundstate/bridge`](https://www.npmjs.com/package/@groundstate/bridge) — a local MCP
server that connects the running page's tools to Claude Code, Codex, or Cursor via CDP.
When native WebMCP consumers ship, the same registrations work with zero changes:
Groundstate registers on `document.modelContext` (falling back to the deprecated
`navigator.modelContext`) whenever it's present.

## Next.js (App Router)

Initialize from a client component, gated to development:

```tsx
// app/groundstate-provider.tsx
"use client";
import { useEffect } from "react";

export function GroundstateProvider() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      import("./groundstate-setup").then((m) => m.setupGroundstate());
    }
  }, []);
  return null;
}
```

Render `<GroundstateProvider />` once in your root layout. The dynamic import keeps
Groundstate out of production bundles entirely; `init()` additionally refuses to run in
production builds as a second line of defense.

If you use Zustand or TanStack Query, see
[`@groundstate/react`](https://www.npmjs.com/package/@groundstate/react) for one-line
auto-derived observables.

## Security

Groundstate exposes internal state and **mutating** actions. `init()` throws in production
builds and there is deliberately no override. Only enable it in dev servers and preview
deployments you control.
