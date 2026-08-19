---
title: "Archkit: Describe"
status: active
type: command
last_verified: 2026-08-04
---

# Archkit: Describe

Documents a bounded context: a ddd-crew canvas, C4 diagrams, and a
machine-diffable `boundary.yaml`. Every claim in the resulting documentation
is verified against real import edges in the codebase before it is written,
so the description can't silently drift from the code it describes.

Output lands under a configurable `{doc_root}`, defaulting to
`docs/architecture/`. Pass `--repo <path>` to document any local checkout
rather than the current repo, and `--store local|central` to override
where output lands.

Where the documentation lands depends on what's being analyzed:
self-analysis (no `--repo`, or `--repo` pointing at this same repo) writes
it into the target's own `{doc_root}`, as above, while a foreign repo
passed via `--repo` writes instead to a per-hub cache at
`<hub>/.archkit/<repo-slug>/`, so foreign checkouts are never written into.
`--store local` overrides that and writes into the target repo itself.

Invoke the `architecture` skill in describe mode, forwarding any arguments
the user supplied after `/archkit:describe`:

```
Skill("architecture", args="describe $ARGUMENTS")
```
