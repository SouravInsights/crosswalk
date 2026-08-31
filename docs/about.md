# WebMCP Stack - Project Context

**WebMCP Stack** is an open-source-first project/monorepo for building, developing, securing, and eventually operating WebMCP applications. The idea is to build an "all things WebMCP" developer stack rather than a single tool, with individual tools/packages living under the same umbrella.

The first tool is **`webmcp-codegen`**, a CLI that developers can run directly with `npx` without installing it as a dependency. It takes an existing API contract, such as an OpenAPI spec, automatically detects where it lives in the user's repo, and generates WebMCP tools for the API endpoints.

The generator isn't meant to be a dumb API → WebMCP converter. Safety is a core part of the design, especially because giving agents access to application actions introduces a new security surface. The generator analyzes the endpoints and determines what kind of actions they represent, for example, read-only, write, destructive, or potentially sensitive/PII-related operations. Based on that analysis, it flags the tools appropriately and comments out higher-risk generated actions so developers have to explicitly decide which write/destructive capabilities they actually want to expose to agents.

The goal is that developers remain in control of the agent-facing surface instead of blindly exposing every API endpoint.

After generation, `webmcp-codegen` creates the WebMCP tool files directly inside the user's own codebase, using files such as `tool-name.webmcp.ts`. It also handles the required registration/scaffolding automatically, for example, registering the generated tools in `layout.tsx` or a provider in Next.js, or the appropriate entry point in Vite. More frameworks will be supported over time. The tool automatically detects the appropriate web client/subdirectory where possible, or asks the developer when it can't confidently determine it.

This is intentionally very much **shadcn-style energy**: the tool generates real code into your application rather than hiding everything behind a package/runtime that developers don't control. The generated code belongs to the user. They can inspect it, modify it, remove it, commit it, and manage it however they want.

There is also a **dry-run mode** so developers can understand what the generator would do before actually changing their codebase.

Another important part of `webmcp-codegen` is its **local development server/dashboard**. Instead of developers having to stare at a bunch of unfamiliar generated files, the dev server gives them a visual playground for their WebMCP surface, somewhat like the role Scalar plays for APIs or Storybook plays for UI components.

Through the dashboard, developers can:

- See all registered WebMCP tools visually
- Inspect individual tool metadata
- Simulate tool runs
- Edit tool metadata
- Enable or disable tools
- Interact with the generated WebMCP surface during development

The playground is intentionally part of the developer experience. I could instead build small modular UI packages for React, Vue, etc. and make users assemble their own playground, but that adds both maintenance burden for me and implementation work for users. A built-in dev server can give them a useful experience out of the box while keeping the actual application code completely under their control.

The broader vision is bigger than code generation.

There are already ideas for other tools around the same ecosystem, including:

- **Telemetry / analytics**: understand how WebMCP tools are being used and how agents interact with them.
- **Auditing**: let users enter a URL and receive a WebMCP audit report with security, configuration, and implementation suggestions.
- **More developer tooling**: potentially testing, evaluation, debugging, observability, security, and other workflows around WebMCP as the ecosystem develops.

I'm actively looking for more useful problems to solve around WebMCP so that the monorepo can eventually grow into a comprehensive **WebMCP Stack** rather than just a collection of unrelated utilities.

The long-term idea is for WebMCP Stack to become an **open-source-first company/project around the WebMCP developer ecosystem**, with self-hosting as a first-class option and cloud/hosted services where they make sense. The open-source tools should remain genuinely useful on their own; a future cloud offering should add convenience, collaboration, hosted analytics, auditing, observability, or other capabilities rather than locking the core developer experience behind a service.

At its core, the project is about making WebMCP practical for real applications:

**Generate → Understand → Review → Test → Control → Observe → Secure**

The central philosophy is that developers should be able to give agents useful capabilities without losing visibility or control over what those agents can actually do.