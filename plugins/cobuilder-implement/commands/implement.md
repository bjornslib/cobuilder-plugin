---
title: "cobuilder-implement: Implement"
status: active
type: command
last_verified: 2026-08-22
---

# cobuilder-implement: Implement

Build a feature one vertical slice at a time. Run four approval gates before
any implementation code exists. Require a technical solution design for each
epic before building its slices. Author blind acceptance rubrics before each
slice. Evaluate slices with an independent validator that scores each slice
against a threshold of 0.90.

Invoke the `implement` skill in implement mode, forwarding any arguments the
user supplied after `/cobuilder-implement:implement`:

```
Skill("implement", args="implement $ARGUMENTS")
```

## What this writes

This command writes plan documents and blind rubrics to disk:

- `docs/plans/<feature-slug>/00-status.md`
- `docs/plans/<feature-slug>/01-product.md`
- `docs/plans/<feature-slug>/02-architecture.md`
- `docs/plans/<feature-slug>/03-program-design.md`
- `docs/plans/<feature-slug>/04-slices.md`
- `docs/plans/<feature-slug>/epic-<epic-id>-design.md`
- `.cobuilder/rubrics/<feature-slug>/manifest.yaml`
- `.cobuilder/rubrics/<feature-slug>/slice-<N>.md`
- `.cobuilder/rubrics/<feature-slug>/evidence/slice-<N>-attempt-<M>.md`
