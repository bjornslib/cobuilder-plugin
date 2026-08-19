---
title: "Archkit: Decisions"
status: active
type: command
last_verified: 2026-08-04
---

# Archkit: Decisions

Authors new decision records or retro-extracts them from existing code and
history, following the ISO/IEC/IEEE 42010 decision-record standard: a
state machine per record and a mandatory `delivers` value block (the benefit,
not just the cost). Also refreshes the three generated viewpoint files that
index decisions across the project.

Output lands under a configurable `{doc_root}`, defaulting to
`docs/architecture/`. Pass `--repo <path>` to author or extract decisions
for any local checkout rather than the current repo, and `--store
local|central` to override where output lands.

Where the records land depends on what's being analyzed: self-analysis (no
`--repo`, or `--repo` pointing at this same repo) writes them into the
target's own `{doc_root}`, as above, while a foreign repo passed via
`--repo` writes instead to a per-hub cache at `<hub>/.archkit/<repo-slug>/`,
so foreign checkouts are never written into. `--store local` overrides that
and writes into the target repo itself.

Invoke the `architecture` skill in decisions mode, forwarding any arguments
the user supplied after `/archkit:decisions`:

```
Skill("architecture", args="decisions $ARGUMENTS")
```
