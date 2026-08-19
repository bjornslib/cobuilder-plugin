---
# --- decision record (lite schema: skills/odyssey/references/decision-records-lite.md §1) ---
id: ADR-0013
title: "Design mode and CoBuilder Factory: split G1, and join through a file"
state: proposed
source_pr: null
design_name: cobuilder-factory
problem: "Design mode (ADR-0011) and CoBuilder Factory (ADR-0012) both capture intent before code exists. Left alone, each grows a weaker copy of the other: design mode grows a planning tier, and the factory grows an architecture interview."
decision: "Split the first gate. Design mode owns framing, exploration, and challenge, and produces the ADR and intent.json. CoBuilder Factory owns epic decomposition and everything downstream. The two join through docs/architecture/designs/<name>/intent.json, a file contract and not a code dependency."
alternatives:
  - option: "Design mode replaces G1 entirely, including epic decomposition"
    rejected_because: "Design mode would grow a second, weaker planning tier. Decomposition into testable epics is the factory's competence, and it feeds the rubrics."
  - option: "The factory authors its own Business Spec and ignores design mode"
    rejected_because: "It rebuilds the interview, the corpus, the divergent exploration, and the challenge stage that design mode already has."
  - option: "Make design mode a hard dependency of the factory"
    rejected_because: "The factory must run in any harness. A prodyssey dependency with a 3.1 MB corpus ends that."
  - option: "Join the two through a code call, such as a skill invocation"
    rejected_because: "A code call couples release cycles. A file on disk lets either side run alone, and lets a third tool read the same contract."
  - option: "Keep the scalar branch field in goal.json and accept one PR per design"
    rejected_because: "An initiative with N epics produces N pull requests. A 1:1 branch join cannot express that."
forces:
  - "ADR-0011 is state proposed, so it can be amended rather than superseded"
  - "story.json keys on an integer pr, so a design never enters the timeline until a PR exists"
  - "the factory must carry no prodyssey dependency"
  - "phase 4b moves the design directory out of exports/ and into docs/architecture/designs/"
  - "design mode's stage 4 challenges the approach, and never the epic decomposition"
delivers:
  capability: "An engineer designs a change in prodyssey, then builds it with the factory, and each epic's pull request points back at the design that produced it."
  benefit: "Neither tool duplicates the other. Drift is measured per epic against that epic's slice of the design, instead of against a whole ADR that no single pull request was going to satisfy."
  beneficiary: [developer, reviewer, the-business]
---

# ADR-0013 — Design mode and CoBuilder Factory: split G1, and join through a file

## Context

[ADR-0011](../architecture/designs/design-mode/adr-draft.md) adds
`/prodyssey:design`, a seven-stage interview-led design mode. It grounds itself
in the bundle, interviews the engineer, explores divergent options, challenges
the stated approach, and drafts an ADR with diagrams and an `intent.json`.

[ADR-0012](ADR-0012-cobuilder-factory.md) adds CoBuilder Factory, whose first
gate drafts a Business Spec, challenges it with a refute panel, and decomposes
it into testable epics.

Both capture intent before the code exists. The overlap is real and it is not
accidental. Without a decision, each one grows a weaker copy of the other half.

Two further facts shape the answer. First, design mode's challenge stage
contests **the approach**, and it never contests an epic decomposition, because
it does not produce one. Second, ADR-0011 joins a design to its pull request
through the branch name, and that join is one to one. A Business Spec with N
epics produces N pull requests, so a scalar branch cannot express the result.

## Options considered

1. **Design mode replaces G1 entirely.** Rejected. Decomposition into testable
   epics feeds the rubrics, and it is the factory's competence. Moving it into
   design mode grows a second planning tier there.

2. **The factory ignores design mode.** Rejected. It rebuilds an interview, a
   corpus, a divergent exploration, and a challenge stage that already exist.

3. **Split the first gate, and join through a file (chosen).** Design mode
   runs stages 0 to 7. The factory reads the result and does the decomposition.
   Neither imports the other.

## Decision

### G1 splits in two

**G1a — design.** Optional, and supplied by prodyssey design mode. It produces
the ADR, the diagrams, and `intent.json`. Its stage 7 asks only whether the
change is one pull request or several, captures the epic slugs when the answer
is several, and creates the first branch. **Design mode does no epic
decomposition.**

**G1b — decomposition.** Always run by the factory. It turns the design into
ordered epics, each with testable acceptance criteria, declared dependencies,
and named cross-epic contracts. It then writes the epics back into `goal.json`.

The factory asks once whether design mode is available and wanted, in the same
pattern it uses for Hindsight, and records the answer in `00-status.md`. When
the answer is no, the factory drafts the Business Spec itself as ADR-0012
describes.

### The refute panel retargets

Design mode's stage 4 challenges the approach. The factory's refute panel
therefore challenges what stage 4 never saw: are the epics genuinely
independent, is each one testable, is one missing, and do the declared
cross-epic contracts hold? No signal is paid for twice.

### The join is a file

```
docs/architecture/designs/<name>/intent.json
```

This is the contract. The factory reads it. Design mode writes it. Neither
side calls the other, so either one runs alone, and a third tool can read the
same file.

### goal.json gains an epics array

The scalar `branch` field retires.

```json
"epics": [
  {"id": "E1", "slug": "guest-checkout",
   "outcome": "<testable criterion>",
   "branch": "design/checkout/guest-checkout",
   "pr": 42, "state": "merged"},
  {"id": "E2", "slug": "saved-cards",
   "outcome": "<...>", "branch": null, "pr": null, "state": "planned"}
],
"stage": "partially-delivered"
```

Design mode writes the slugs at stage 7. The factory writes `outcome` at G1b,
because only decomposition knows the testable criterion.

### Branch convention

`design/<design-name>/<epic-slug>`. Git allows slashes, so the join becomes a
prefix parse. Submit mode strips `design/`, reads the first segment as the
design name, and reads the rest as the epic slug. A single-epic design keeps
the plain `design/<name>` form, with one `epics` entry and no second segment,
so the common case adds nothing to remember. That matches the factory's light
path. The authoritative fallback stays a scan of every `goal.json` for a
matching `epics[].branch`.

### Submit mode records the design

Submit mode writes `intent.design = {name, epic}` onto the timeline entry, so a
pull request points back at its design, and the viewer can group N pull
requests under one design. Drift is measured per epic, against that epic's
slice of the design.

`goal.stage` gains `partially-delivered` and `delivered`. A design is delivered
when every epic has a merged pull request. That is design-completion tracking,
and it is new.

## Consequences

- **Positive.** Neither tool duplicates the other. Design mode keeps its
  corpus and its interview. The factory keeps its harness independence.

- **Positive.** Drift becomes measurable per epic. ADR-0011 notes that
  `review-mode.md` §7 defines a `drift` array that never had a baseline. A
  per-epic baseline is a fairer one than a whole ADR that no single pull
  request was going to satisfy.

- **Constraint introduced.** The contract path
  `docs/architecture/designs/<name>/intent.json` is written in two plans. The
  design-mode plan moves the file there in phase 4b. **A change to the path in
  one plan must change the other in the same commit, or the contract breaks
  silently.** An earlier draft of the factory review named
  `exports/design-<name>/intent.json`, which is the pre-4b location and is
  wrong.

- **Constraint introduced.** A design still never enters the `story.json`
  timeline directly. It enters when submit mode files each epic under the real
  pull request number that `gh pr create` returns. ADR-0011 already states this
  rule, and N epics do not weaken it.

- **Amends ADR-0011.** ADR-0011 is `state: proposed`, so this record amends it
  rather than superseding it. The amended parts are the scalar `branch` field,
  the one-design-to-one-pull-request assumption, and the addition of stage 7's
  one-or-several question.

- **Risk carried.** The split depends on design mode never growing a
  decomposition step. A future session that adds one recreates the duplication
  this record exists to prevent.

## Value delivered

- **New capability.** An engineer designs a change in prodyssey, builds it with
  the factory, and every epic's pull request points back at the design.
- **Benefit.** One design tracks to completion across many pull requests, and
  neither tool carries a weaker copy of the other's job.
- **Beneficiary.** The developer designing and building, the reviewer tracing a
  pull request to its design, and the business reading a delivered design.

## Maps to

Districts `skills` and `viewer` from `.prodyssey/self/inventory.yaml`, plus the
external skill at `~/.claude/skills/cobuilder-factory/`.
