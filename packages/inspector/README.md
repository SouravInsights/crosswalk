# @groundstate/inspector

In-page dev overlay for [Groundstate](https://www.npmjs.com/package/groundstate): browse
every tool your app currently exposes to agents, invoke them with JSON arguments, and see
live results — without leaving the page.

Use it while authoring `observe` / `act` / `fixture` calls, and to debug why an agent run
didn't behave as expected.

## Install

```bash
npm install @groundstate/inspector
```

## Usage

```ts
if (import.meta.env.DEV) {
  groundstate.init({ appName: "my-app" });
  // ...observe/act/fixture registrations...
  import("@groundstate/inspector").then(({ mountInspector }) => mountInspector());
}
```

A small "GS" button appears in the corner. Click it to open the panel:

- every registered tool, with its description and a read/mutate badge
- a JSON args editor and Run button per tool
- pretty-printed live results (including error passthrough)

Rendered in a shadow root — it never collides with your app's styles.

## Options

```ts
mountInspector({ position: "bottom-left", open: true });
```

| Option | Default | Meaning |
|---|---|---|
| `position` | `"bottom-right"` | Corner for the toggle button |
| `open` | `false` | Start with the panel open |

`mountInspector` returns `{ unmount }`.
