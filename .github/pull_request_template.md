## What

<!-- One or two sentences: what does this PR do, for someone reading it cold?
     Write for a person, not a compiler. If it helps, show a before/after. -->

## Why

<!-- The problem this solves, in user terms. Link the issue, spec, or
     discussion if there is one. -->

## How to verify

<!-- The exact commands to run and what good output looks like. A reviewer
     should be able to confirm this PR without asking you anything. -->

```bash
# e.g. pnpm test
```

## Breaking changes

<!-- "None", or: what breaks and the exact migration steps. -->

None

## Checklist

- [ ] `pnpm test` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] User-facing changes have a changeset (`pnpm changeset`) written in user
      language: what changed for them, not which files moved
- [ ] Docs updated if behavior changed (README, `site/content/docs`, or the
      relevant spec in `docs/specs`)
