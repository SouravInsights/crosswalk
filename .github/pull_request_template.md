<!--
The standard (set by this repo's first PR):
  - Write for a cold reader. Plain language, no internal jargon.
  - Show, don't tell: a before/after beats a paragraph.
  - Breaking changes lead. Every claim is verifiable.
  - Anything structural gets a mermaid diagram, not three paragraphs.
  - Every dependency added is argued for; restraint is a feature.
A small PR needs only What, Why, Breaking changes, and the checklist.
The rest exists for when a PR earns it.
-->

## What

<!-- One or two sentences: what does this do, for someone reading it cold?
     Show a before/after when you can; it beats a paragraph. -->

## Why

<!-- The problem this solves, in user terms. Link the issue, spec, or
     discussion. -->

## What's in it

<!-- Optional for small PRs. Grouped by theme, ordered by how much the
     reader cares. Breaking changes always lead. -->

## Breaking changes

<!-- "None", or: what breaks and the exact migration. -->

None

## Verification

<!-- What you ran to prove this works (test counts, a real-world run),
     and the exact commands a reviewer can use to reproduce it. -->

```bash
pnpm test
```

## What to review

<!-- Optional for small PRs. For big ones: where a reviewer's time is best
     spent. The design doc, the most novel file, the risky change. -->

## Checklist

- [ ] `pnpm test` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] User-facing changes have a changeset (`pnpm changeset`) written in
      user language: what changed for them, not which files moved
- [ ] Docs updated if behavior changed (README, `site/content/docs`, or the
      relevant spec in `docs/specs`)
- [ ] Every dependency added is argued for in the PR or its commit
