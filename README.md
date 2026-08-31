<div align="center">
  <a href="https://webmcp-stack.vercel.app">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="./brand/logo-mark.svg">
      <source media="(prefers-color-scheme: light)" srcset="./brand/logo-mark-light.svg">
      <img alt="webmcp-stack" src="./brand/logo-mark.svg" width="88" height="88">
    </picture>
  </a>
  <h1>webmcp-stack</h1>
  <p><strong>The open-source developer stack for WebMCP.</strong></p>
  <p>Generate → Understand → Review → Test → Control → Observe → Secure</p>
  <p>
    <a href="https://www.npmjs.com/package/@webmcp-stack/codegen"><img alt="npm version" src="https://img.shields.io/npm/v/@webmcp-stack/codegen?style=flat-square&labelColor=0a0b0f&color=58a6ff"></a>
    <a href="./LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-blue?style=flat-square&labelColor=0a0b0f&color=58a6ff"></a>
  </p>
  <p>
    <a href="https://webmcp-stack.vercel.app/docs">Docs</a> |
    <a href="https://www.npmjs.com/package/@webmcp-stack/codegen">npm</a> |
    <a href="https://webmcp-stack.vercel.app/brand">Brand</a> |
    <a href="./docs/about.md">About</a>
  </p>
</div>

---

[WebMCP](https://github.com/webmachinelearning/webmcp) lets websites expose typed tools that AI agents can call directly in the browser. webmcp-stack is the tooling layer around it: build, secure, and eventually operate WebMCP surfaces on real applications, without losing visibility or control over what agents can actually do.

## Today: codegen

**[@webmcp-stack/codegen](./packages/codegen)** takes the API contract you already have (OpenAPI today, more sources coming) and generates WebMCP tools into your own codebase. No install, no config:

```bash
npx @webmcp-stack/codegen generate
```

This is not a dumb API → WebMCP converter. Giving agents access to application actions is a new security surface, so safety is part of generation itself: every endpoint is classified read/write/destructive, webhooks are skipped, auth and admin endpoints are flagged, and higher-risk tools are generated disabled. You decide which write capabilities agents get, not the generator.

The generated code belongs to you. Real files in your repo, no runtime dependency on this package, regeneration that never clobbers your edits. And `npx @webmcp-stack/codegen dev` opens a local dashboard to browse, edit, toggle, and test your tools, so you never have to stare at a pile of unfamiliar generated files.

## The stack

| Package | Status | What it does |
|---|---|---|
| [`@webmcp-stack/codegen`](./packages/codegen) | Available | Generate safe, typed WebMCP tools from API contracts, plus a local tools dashboard |
| `@webmcp-stack/audit` | Planned | Point it at a URL, get a WebMCP audit report |
| `@webmcp-stack/telemetry` | Planned | Understand how agents actually use your tools |

The goal is a comprehensive stack, not a pile of unrelated utilities: each tool covers one stage of the lifecycle, and they compound.

## Principles

- **The generated code belongs to you.** Inspect it, modify it, delete the generator, keep the files. shadcn-style energy, not a runtime you rent.
- **Safety first.** An agent-facing surface is a security surface. The tools help you decide what to expose, then enforce the decision.
- **Open-source first.** Everything here is genuinely useful on its own and self-hostable. Any future cloud offering adds convenience, never a gate.

## Repository layout

| Path | npm name | What it is |
|---|---|---|
| `packages/codegen` | `@webmcp-stack/codegen` | The CLI and the generation pipeline: sources (OpenAPI today), generators, the safety audit, the dev dashboard. |
| `examples/openapi-petstore` | private | Example app with tools generated from the Petstore OpenAPI spec. |
| `site/` | private | Landing page and documentation (Next.js + Fumadocs). |
| `docs/` | — | Design specs (`specs/`), decision notes (`notes/`), and [what this project is](./docs/about.md). |
| `brand/` | — | Logo and brand assets. |

## Development

```bash
pnpm install
pnpm build        # turbo run build
pnpm test         # turbo run test
pnpm typecheck
pnpm lint:fix
```

```bash
pnpm --filter openapi-petstore dev   # example app
pnpm --filter site dev               # landing page & docs on :3001
```

## License

MIT
