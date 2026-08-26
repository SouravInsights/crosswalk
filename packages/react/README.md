# @groundstate/react

React/Next.js integration for [Groundstate](https://www.npmjs.com/package/groundstate):
hooks for component-scoped tools, and one-line auto-derived observables for Zustand and
TanStack Query.

## Install

```bash
npm install groundstate @groundstate/react
```

## Auto-derived observables (the fast path)

```ts
import { observeStore, observeQueries } from "@groundstate/react";

// Zustand: live `getCheckoutState` + flight-recorded transitions (`getStateHistory`).
// Action functions are stripped automatically; pass `select` to curate the shape.
observeStore("checkout", useCheckoutStore, {
  select: (s) => ({ items: s.items, paymentStatus: s.paymentStatus }),
});

// TanStack Query: `getQueriesState` — every cached query's key, status, and error.
observeQueries(queryClient);
```

Both are plain functions — call them next to `groundstate.init()` in your dev-only setup.
`observeStore` works with any store shaped like `{ getState, subscribe }`; there is no
dependency on zustand itself.

## Hooks (component-scoped tools)

Tools that should only exist while a component is mounted:

```tsx
import { useObservable, useAction, useFixture } from "@groundstate/react";

function CheckoutForm() {
  useObservable("checkoutForm", () => ({ errors: form.errors, dirty: form.dirty }));
  useAction("fillCheckoutForm", (args) => form.setValues(args));
  useFixture("form_with_invalid_email", () => form.setValues({ email: "not-an-email" }));
  // ...
}
```

Hooks register on mount, unregister on unmount, and always execute the freshest closure —
no stale props, no re-registration churn.

## Next.js

See the [Next.js section in the core README](https://www.npmjs.com/package/groundstate):
initialize from a `"use client"` component behind a `process.env.NODE_ENV === "development"`
gate with a dynamic import.
