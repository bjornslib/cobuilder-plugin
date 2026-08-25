---
# --- doc-gardener required frontmatter ---
title: "ADR-0013 — Design mode and cobuilder-implement: split the first gate, join through a file"
status: active
type: architecture
last_verified: "2026-08-19"
owner: bjoerns
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0013
name: "Design mode and cobuilder-implement: split the first gate, join through a file"
state: approved
groups: [workflow]
approved_by: bjoerns
problem: "Design mode and cobuilder-implement both capture intent before code exists. Left alone, each grows a weaker copy of the other: design mode grows a planning tier, and the build workflow grows an architecture interview. ADR-0011 also joins a design to its pull request through the branch name, and that join is one to one, which a Business Spec with several epics cannot express."
decision: "Split the first gate. Design mode owns framing, exploration, and the challenge, and produces the ADR and intent.json. cobuilder-implement owns epic decomposition and everything downstream. The two join through docs/architecture/designs/<name>/intent.json, a file contract and not a code dependency, and goal.json carries an epics array so one design can track many pull requests."
alternatives:
- option: "Design mode replaces the whole first gate, including epic decomposition"
  rejected_because: "Design mode would grow a second, weaker planning tier. Decomposition into testable epics feeds the rubrics, and it is the build workflow's competence."
- option: "cobuilder-implement authors its own Business Spec and ignores design mode"
  rejected_because: "It rebuilds the interview, the corpus, the divergent exploration, and the challenge stage that design mode already has."
- option: "Make design mode a hard dependency of cobuilder-implement"
  rejected_because: "The build workflow must run in any harness. A dependency on this plugin and its corpus ends that."
- option: "Join the two through a code call, such as a skill invocation"
  rejected_because: "A code call couples release cycles. A file on disk lets either side run alone, and lets a third tool read the same contract."
- option: "Keep the scalar branch field in goal.json and accept one pull request per design"
  rejected_because: "An initiative with several epics produces several pull requests, and a one-to-one branch join cannot express that."
forces:
- "ADR-0011 is amendable rather than superseded, because no pull request has merged it"
- "story.json keys on an integer pr, so a design never enters the timeline until a pull request exists"
- "cobuilder-implement must carry no dependency on this plugin"
- "ADR-0014 moved authored source into docs/, so the design directory is the contract's home"
- "design mode's challenge stage contests the approach, and never the epic decomposition, because it does not produce one"
related_decisions:
- {type: is-related-to, target: ADR-0011}
- {type: is-related-to, target: ADR-0012}
- {type: is-related-to, target: ADR-0014}
related_concerns: []
history:
- {state: decided, date: "2026-08-19", note: "Recorded from the cobuilder-implement design. Amends ADR-0011's one-design-to-one-pull-request assumption. Chosen on this branch; not approved until a human merges."}
- {state: approved, date: "2026-08-19", by: bjoerns, note: "Approved in the design review session, before merge."}
maps_to:
  district: skills
  unanchored: true
  modules:
  - skills
  - docs
  rule: "The two plugins join through docs/architecture/designs/<name>/intent.json and never through a code call. Design mode does no epic decomposition; cobuilder-implement does no architecture interview."
delivers:
  capability: "An engineer designs a change in cobuilder-architect, builds it with cobuilder-implement, and each epic's pull request points back at the design that produced it."
  benefit: "Neither tool carries a weaker copy of the other's job, and drift is measured per epic against that epic's slice of the design rather than against a whole record no single pull request was going to satisfy."
  beneficiary: [developer, reviewer, the-business]
related:
- "docs/architecture/designs/cobuilder-implement/intent.json"
---

# ADR-0013 — Design mode and cobuilder-implement: split the first gate, join through a file

## Context

ADR-0011 added `/cobuilder-architect:design`, a seven-stage interview-led design
mode. It grounds itself in the bundle, interviews the engineer, explores
divergent options, challenges the stated approach, and drafts a record with
diagrams and an `intent.json`.

ADR-0012 added cobuilder-implement, whose first gate writes a Business Spec,
challenges it, and decomposes it into testable epics.

Both capture intent before the code exists. The overlap is real, and it is not
accidental. Without a decision, each one grows a weaker copy of the other half.

Two further facts shape the answer. Design mode's challenge stage contests
**the approach**, and it never contests an epic decomposition, because it does
not produce one. And ADR-0011 joins a design to its pull request through the
branch name, one to one. A Business Spec with several epics produces several
pull requests, so a scalar branch field cannot express the result.

## Options considered

1. **Design mode replaces the whole first gate.** Rejected. Decomposition into
   testable epics feeds the rubrics, and it belongs to the workflow that writes
   them. Moving it here grows a second planning tier.

2. **cobuilder-implement ignores design mode.** Rejected. It rebuilds an
   interview, a corpus, a divergent exploration, and a challenge stage that
   already exist.

3. **Split the first gate, and join through a file (chosen).** Design mode runs
   its seven stages. cobuilder-implement reads the result and decomposes it.
   Neither imports the other.

## Decision

### The first gate splits in two

**Design (optional), supplied by this plugin.** It produces the record, the
diagrams, and `intent.json`. Its last stage asks only whether the change is one
pull request or several, captures the epic slugs when the answer is several,
and creates the first branch. **Design mode does no epic decomposition.**

**Decomposition, always run by cobuilder-implement.** It turns the design into
ordered epics, each with testable acceptance criteria, declared dependencies,
and named cross-epic contracts. It writes the epics back into `goal.json`.

cobuilder-implement asks once whether design mode is available and wanted, and
records the answer. When the answer is no, it drafts the Business Spec itself.

### The challenge retargets rather than repeats

Design mode's challenge stage contests the approach. cobuilder-implement's
refute panel therefore contests what that stage never saw: whether the epics
are genuinely independent, whether each one is testable, whether one is
missing, and whether the declared cross-epic contracts hold. No signal is paid
for twice.

### The join is one file

```
docs/architecture/designs/<name>/intent.json
```

cobuilder-implement reads it. Design mode writes it. Neither side calls the
other, so either runs alone, and a third tool can read the same file.

### goal.json carries an epics array

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

Design mode writes the slugs. cobuilder-implement writes `outcome`, because
only decomposition knows the testable criterion.

### Branch convention

`design/<design-name>/<epic-slug>`. Git allows a slash, so the join is a prefix
parse. Submit mode removes `design/`, reads the first segment as the design
name, and reads the rest as the epic slug. A single-epic design keeps the plain
`design/<name>` form with one entry and no second segment, so the common case
adds nothing to remember. The authoritative fallback stays a scan of every
`goal.json` for a matching `epics[].branch`.

### Submit mode records the design

Submit mode writes `intent.design = {name, epic}` onto the timeline entry, so a
pull request points back at its design and the viewer can group several pull
requests under one. Drift is measured per epic, against that epic's slice of
the design. `goal.stage` gains `partially-delivered` and `delivered`, and a
design is delivered when every epic has a merged pull request.

## Consequences

- **Positive.** Neither tool duplicates the other. Design mode keeps its corpus
  and its interview. cobuilder-implement keeps its harness independence.

- **Positive.** Drift becomes measurable per epic. A per-epic baseline is
  fairer than a whole record that no single pull request was going to satisfy.

- **Constraint introduced.** The two plugins join through
  `docs/architecture/designs/<name>/intent.json` and never through a code call.
  Design mode does no epic decomposition, and cobuilder-implement does no
  architecture interview.

- **Constraint introduced.** The contract path appears in two plans. **A change
  to the path in one plan must change the other in the same commit, or the
  contract breaks silently.** The failure mode is not an error. The reader
  finds no file and falls back to drafting a Business Spec from scratch, which
  looks like normal operation. A reader that finds no file must report that it
  looked and found nothing.

- **Amends ADR-0011.** That record is not approved, so this one amends it
  rather than superseding it. The amended parts are the scalar `branch` field,
  the one-design-to-one-pull-request assumption, and the addition of the
  one-or-several question at the last stage.

- **Constraint introduced.** A branch may carry more than one design. The
  `epics` array models one design across many pull requests. It does not model
  many designs inside one pull request, and the branch parse returns the first
  match. Submit mode therefore treats design resolution as a judgment, not a
  lookup. When a branch matches one design but the diff also touches a second
  design's declared modules, submit mode names both and asks the author which
  designs this pull request delivers. It never picks silently.

- **Risk carried.** The split depends on design mode never growing a
  decomposition step. A future session that adds one recreates the duplication
  this record exists to prevent.

## Value delivered

- **New capability.** An engineer designs a change in cobuilder-architect,
  builds it with cobuilder-implement, and every epic's pull request points back
  at the design.
- **Benefit.** One design tracks to completion across many pull requests, and
  neither tool carries a weaker copy of the other's job.
- **Beneficiary.** The developer designing and building, the reviewer tracing a
  pull request to its design, and the business reading a delivered design.

## Maps to

Districts `skills` and `docs` from `.cobuilder-architect/self/inventory.yaml`.
