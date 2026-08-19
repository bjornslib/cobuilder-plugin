---
title: "Archkit: Explore Design"
status: active
type: command
last_verified: 2026-08-04
---

# Archkit: Explore Design

This command is the architecture skill's divergent-exploration design pass.
The new seven-stage `/design` mode (not yet written) will wrap it.

Produces an Architecture Decision Record (ADR) for a new or evolving system,
with component boundaries and interface contracts. Runs a divergent
exploration pass first, so rejected options are captured in the ADR alongside
the reasons they were rejected — not just the winning design.

Output lands under a configurable `{doc_root}`, defaulting to
`docs/architecture/`. Pass `--repo <path>` to analyse any local checkout
rather than the current repo, and `--store local|central` to override where
output lands.

Where the ADR lands depends on what's being analyzed: self-analysis (no
`--repo`, or `--repo` pointing at this same repo) writes it into the
target's own `{doc_root}`, as above, while a foreign repo passed via
`--repo` writes instead to a per-hub cache at `<hub>/.archkit/<repo-slug>/`,
so foreign checkouts are never written into. `--store local` overrides that
and writes into the target repo itself.

Invoke the `architecture` skill in design mode, forwarding any arguments the
user supplied after `/archkit:explore-design`:

```
Skill("architecture", args="design $ARGUMENTS")
```
