---
title: "implement: Start"
status: active
type: command
last_verified: 2026-08-22
---

# implement: Start

Build a feature one vertical slice at a time. Run four approval gates before
any implementation code exists. Require a technical solution design for each
epic before building its slices. Author blind acceptance rubrics before each
slice. Evaluate slices with an independent validator that scores each slice
against a threshold of 0.90.

Invoke the `build` skill in implement mode, forwarding any arguments the
user supplied after `/implement:start`:

```
Skill("build", args="implement $ARGUMENTS")
```

Run `/implement:install` first, if this repo has not run it yet. It sets up
habit-hooks, which the red-green-validate loop below relies on.

With the initial checks, before the first gate runs, check whether
`DDD-VOCABULARY.md` exists at the repository root, and state the result.
When it is absent, say that vocabulary checking will run against no
glossary, and that one is created with the vocabulary bootstrap in
`/architect:design` stage 1 (ADR-0036). Start never runs the bootstrap
itself, and it never interviews the engineer about terms mid-feature.

## What this writes

This command writes plan documents and blind rubrics to disk:

- `docs/plans/<feature-slug>/00-status.md`
- `docs/plans/<feature-slug>/01-product.md`
- `docs/plans/<feature-slug>/02-architecture.md`
- `docs/plans/<feature-slug>/interaction-design.md`
- `docs/plans/<feature-slug>/ui-spec.jsonc`
- `docs/plans/<feature-slug>/03-program-design.md`
- `docs/plans/<feature-slug>/04-slices.md`
- `docs/plans/<feature-slug>/epic-<epic-id>-design.md`
- `.cobuilder/rubrics/<feature-slug>/manifest.yaml`
- `.cobuilder/rubrics/<feature-slug>/slice-<N>.md`
- `.cobuilder/rubrics/<feature-slug>/evidence/slice-<N>-attempt-<M>.md`
