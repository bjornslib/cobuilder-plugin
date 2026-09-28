---
# --- doc-gardener required frontmatter ---
title: "ADR-0030 — A change is checked against the program it implements"
status: active
type: architecture
last_verified: 2026-09-25
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0030
source_pr: null
name: "A change is checked against the program it implements"
state: decided
groups: [workflow, review, records]
approved_by: ""
problem: "A pull request that implements a program is assessed as a change on its own. The assessment compares the pull request's own pre-stage `intent` against its merged diff, and it reports the differences in a `drift` array. That is a comparison inside one pull request. Nothing compares the change against the program that produced it, so no reader learns from the assessment whether the change met the program's targets or where it did something different. The program's records exist. They are its intent, its problem and its solution, its architecture level, its epic list, and its slice rubrics. Three reference files already carry half an instruction to read them, and none of the three has a consumer."
decision: "A pull request that belongs to a program is checked against that program's records, and every difference between what the program targeted and what the change did is stated in what the generating agent and the reviewing agent write. The check reads the program's intent, its problem and its solution, its architecture level, its epic list, and its slice rubrics, reached from the pull request through the record index. It measures against the epic that carries the pull request, never against a whole multi-epic design. A pull request that belongs to no program says so in one sentence, instead of reporting no difference."
alternatives:
  - option: "Extend the existing `drift` array to read the program's records too"
    rejected_because: "The `drift` array is a comparison inside one pull request, between what its author said before the merge and what the merge did. Its four kinds, `out_of_scope`, `unaddressed_risk`, `adopted_alternative`, and `delta_shift`, all read the pull request's own `intent` block. The program's records are a different corpus. One array holds one comparison, or a reader cannot tell which corpus a claim came from."
  - option: "Attach the whole design to every pull request and measure the pull request against all of it"
    rejected_because: "`review-mode.md` §7 forbids this in one sentence. No single pull request was going to satisfy all of a multi-epic design. The epic is the join, so the check measures against the epic that carries the pull request."
  - option: "Report the difference into the `assessment` block alone, and let the narrative read from it"
    rejected_because: "A reader of the story reads the narrative levels, not the assessment JSON. `story-mode.md` states that the author's account and the code's account can disagree, and it points that disagreement at the post stage. A computed field with no reader reports nothing."
  - option: "Decide nothing, and leave the three existing half-instructions to carry it"
    rejected_because: "None of the three has a mechanical consumer, and CLAUDE.md states the outcome of that shape: a step with no mechanical consumer gets skipped, however well it is documented. `review-mode.md` §7, `interview-guide.md` §2, and `story-mode.md` each already carry part of this rule, and no artifact records that any of the three ran."
  - option: "Make the check a gate that refuses a pull request whose change departed from the program"
    rejected_because: "`review-mode.md` §9 settles this. No gate. Nothing in the assessment blocks a merge or refuses to open a pull request. The engineer asked for a statement of the difference, not a refusal."
  - option: "Read the program's records by naming them from the pull request, by hand"
    rejected_because: "That is the work the join already does. The record index resolves 32 epics to a pull request, across 6 designs, so a hand-written list repeats a resolution the index holds and drifts from it on the next design."
forces:
  - "The engineer asked for it, in these words: the agent that creates and reviews a pull request should read the original intent, problem and solution, architecture design, epics and rubrics, then check it against what was implemented, and state in what it writes out wherever something different was done than originally targeted."
  - "The join exists and it resolves. `joins.epic_to_pull_request` in `.cobuilder-architect/self/data/index.json` maps 32 epics to a pull request, across 6 designs. `joins.adr_to_pull_request` resolves all 29 records, 15 through a direct `source_pr` and 14 through an epic."
  - "The second join path is thinner, and it disagrees with the first. `intent.design` is set on 4 of the 17 timeline entries, and it names 3 designs. `plugin-split`, `design-mode`, and `cobuilder-implement` each reach a pull request through an epic, and no timeline entry names them."
  - "An epic's promise is prose. 73 epic entities carry 0 `outcome` values and 72 `note` values. The design-mode schema calls `epics[].outcome` a testable criterion, and no record holds one."
  - "The rubrics are the sharpest gap. 47 rubric files sit under `.cobuilder/rubrics/<plan-slug>/`, committed and reachable by no entity in the record index. The plan slug is not the design name. `cobuilder-family` holds the rubrics, and `plugin-split` is the design."
  - "The nearest projection is the slice. `joins.slice_to_epic` resolves 45 slices, and all 45 carry an `ends_with` and a `score`. That is the rubric's result, not the rubric's criteria."
  - "Three references already carry part of this rule, and none of them has a consumer. `review-mode.md` §7 says to measure drift per epic against that epic's slice of the design. `interview-guide.md` §2 says a set `intent.design` makes the design's intent block the hypothesis. `story-mode.md` says the two accounts can disagree, and points that disagreement at the post stage."
  - "CLAUDE.md states the rule this record answers. A process step with no mechanical consumer gets skipped, however well it is documented. Gate 4b is the recorded example of that failure."
  - "The assessment is judgment work, not a defect hunt. `review-mode.md` §9 keeps commodity findings out of it, because a review that mixes them with judgment buries the judgment."
  - "A design's records already carry four levels, and a bundle can hold seventeen timeline entries. Eight of the 15 designs carry an `intent.json`, a `narrative.json`, and an `assessment.json`. The other seven carry a `goal.json` only, so a check must survive a program whose records are sparse."
related_decisions:
  - { type: depends-on, target: ADR-0013 }
  - { type: depends-on, target: ADR-0018 }
  - { type: is-related-to, target: ADR-0029 }
  - { type: is-related-to, target: ADR-0011 }
  - { type: is-related-to, target: ADR-0009 }
  - { type: is-related-to, target: ADR-0022 }
related_concerns: []
history:
  - { state: decided, date: 2026-09-25, by: bjornslib, note: "Decided while the engineer recorded the gap in a work item. Design stage 0 and stage 1 grounding ran for the design that carries this record, at docs/architecture/designs/implementation-conformance/. Stages 2 through 7 are deliberately deferred, so the options above are the shapes the corpus rules out and not the output of a challenge gate. An agent wrote this record, so the state is decided and never approved." }
maps_to:
  context: cobuilder-packaging
  modules: [plugins/pr, shared]
  rule: "A pull request that belongs to a program is assessed against that program's own records, reached through the record index and measured against the epic that carries the pull request. Every difference between what the program targeted and what the change did is stated in the assessment the pull request carries and in the narrative a reader reads. A pull request that belongs to no program says so in one sentence, and the assessment never claims a target it did not read."
delivers:
  capability: "A reader of a pull request learns which of its program's targets the change met, and where the change did something different."
  benefit: "The program's records stop being a document a reader has to hold in mind beside the assessment. The difference is stated where the change is reviewed, instead of being reconstructed long after the merge."
  beneficiary: [developer, reviewer]
  enables: ["A program's own assessment can measure what its epics delivered against what it targeted", "A decision record extracted after the merge can name a departure instead of rediscovering it"]
  addresses_problem: P1
provenance: authored
related:
  - "docs/architecture/designs/implementation-conformance/goal.json"
  - "plugins/pr/skills/odyssey/references/review-mode.md"
  - "plugins/pr/skills/odyssey/references/interview-guide.md"
  - "plugins/pr/skills/odyssey/references/story-mode.md"
  - "shared/build_index.py"
---

# ADR-0030 — A change is checked against the program it implements

## Context

The plugin narrates a pull request as a change. It interviews the author,
assesses the change against the bundle, and writes a story a reader opens. The
program that the change implements is a separate set of records, under
`docs/architecture/designs/<name>/`. It holds an intent, a problem and a
solution, an architecture level, an epic list, and a set of slice rubrics.

The two record sets never meet. The assessment compares the pull request's own
pre-stage `intent` against its merged diff. `review-mode.md` §7 calls that array
`drift`, and it fixes four kinds, `out_of_scope`, `unaddressed_risk`,
`adopted_alternative`, and `delta_shift`. Each kind reads the pull request's own
`intent` block. That is one comparison, inside one pull request.

The engineer names the missing one. An agent that generates or reviews a pull
request ought to read the program's records: its intent, its problem and its
solution, its architecture, its epics, and its rubrics. It ought to check those
records against the implementation, and to state wherever the implementation did
something different from what was targeted.

**Three reference files already write half of that rule, and none has a
consumer.** `review-mode.md` §7 says to measure drift per epic against that
epic's slice of the design. `interview-guide.md` §2 says a set `intent.design`
makes the design's intent block the hypothesis, so the five design topics need
no re-interview. `story-mode.md` says the author's account and the code's
account can disagree, and it points that disagreement at the post stage. No
artifact records that any of the three ran. CLAUDE.md states the rule this
record answers: a process step with no mechanical consumer gets skipped,
however well it is documented.

**The join resolves, and one path is thinner than the other.** The record index
carries `joins.epic_to_pull_request`, which maps 32 epics to a pull request
across 6 designs. The timeline carries a second path, `intent.design`, which
names 3 designs and appears on 4 of the 17 entries. Three of those designs
resolve through an epic, and no timeline entry names them. So a reader who
arrives at a pull request can reach its program through the epic, and not always
through `intent.design`.

**The program's targets are the weak part of the join.** 73 epic entities carry
0 `outcome` values and 72 `note` values, so the target an epic promised is
prose. The rubrics are sharper still: 47 rubric files sit under
`.cobuilder/rubrics/<plan-slug>/`, committed and reachable by no entity, and the
plan slug is not the design name. `cobuilder-family` holds the rubrics, and
`plugin-split` is the design. The nearest projection is the slice, and all 45
slices carry an `ends_with` and a `score`. That is the rubric's result, not the
rubric's criteria.

## Options considered

1. **Extend the existing `drift` array.** Rejected. Its four kinds read the
   pull request's own `intent`. The program's records are a different corpus,
   and one array holds one comparison.
2. **Measure the pull request against the whole design.** Rejected.
   `review-mode.md` §7 already forbids it. No single pull request satisfies a
   multi-epic design.
3. **Report into the `assessment` block alone.** Rejected. A reader reads the
   narrative. A computed field with no reader reports nothing.
4. **Decide nothing, and leave the three half-instructions in place.**
   Rejected. None has a consumer, and this repository records what happens
   next.
5. **Make it a gate.** Rejected. `review-mode.md` §9 keeps the assessment out
   of the merge path. The engineer asked for a statement, not a refusal.
6. **Name the program's records from the pull request, by hand.** Rejected. The
   index already resolves 32 epics to a pull request. A hand-written list
   repeats that work and drifts from it.
7. **Check a pull request against the program it implements, and state every
   difference where a reader finds it.** Chosen.

## Decision

**A change is checked against the program that produced it.** The generating
agent and the reviewing agent each read the program's own records. Those records
are its intent, its problem and its solution, its architecture level, its epic
list, and its slice rubrics. Each agent states the differences between what the
program targeted and what the change did.

**The join is the record index, and the epic is the measure.** A pull request
reaches its program through `joins.epic_to_pull_request`. The check measures
against the epic that carries the pull request, never against a whole
multi-epic design. This keeps `review-mode.md` §7's existing bound and gives it
its first consumer.

**A pull request that belongs to no program says so.** `intent.design` is the
discriminator, and 13 of the 17 timeline entries carry no design. One sentence
states that, and the check does not report the absence as a clean result
against a program it never read.

**The difference reaches the output, not only a field.** It belongs in the
assessment the pull request carries and in the narrative a reader reads. E4 of
the design that carries this record owns the placement, the order, and the
wording.

**The program's targets must become readable before the check can cite them.**
An epic's promise is a `note`, and a rubric is unprojected. The design that
carries this record gives that gap its own epic, and it allows the nearest
available stand-in only if the epic states which stand-in it used.

**The check is a report.** It writes no gate, blocks no merge, and opens no pull
request. It is a fourth thing the assessment answers, beside the three questions
`review-mode.md` §3 already asks.

## Consequences

- **Positive:** a reader learns what the program targeted and where the change
  departed from it, at the place the change is reviewed.
- **Positive:** the three half-instructions in `review-mode.md` §7,
  `interview-guide.md` §2, and `story-mode.md` gain one consumer each.
- **Positive:** the check survives a sparse program. Seven of the 15 designs
  carry a `goal.json` only.
- **Constraint introduced:** a pull request that belongs to a program is
  assessed against that program's records, reached through the record index and
  measured against the epic that carries the pull request. Every difference is
  stated in the assessment and in the narrative. A pull request that belongs to
  no program says so, and the assessment never claims a target it did not read.
- **Negative:** the check reads a corpus larger than the diff. A design can
  carry an intent, a narrative, an assessment, diagrams, and a draft, so the
  read grows with the program.
- **Negative:** the two join paths disagree today. Three designs resolve through
  an epic and no timeline entry names them, so a check that trusts
  `intent.design` alone silently skips them.
- **Negative:** an epic's target is prose in a `note`, so the check compares a
  change against a sentence. Until the index projects the target, the comparison
  rests on a reading rather than on a record.

## Not decided

Two matters stay open. No epic may read them as settled.

**Which join path is authoritative.** The epic path resolves 32 epics across 6
designs. `intent.design` resolves 3 designs and is set on 4 entries. The check
needs one answer. E1 of `docs/architecture/designs/implementation-conformance/`
owns that decision, and it may choose the epic path, the `intent.design` path
with a fallback, or both with a stated precedence.

**How a program stores its target, so a check can cite it.** This record leaves
three shapes open. A design can fill the epic's `outcome` field. The record
index can project each rubric as an entity of its own. The slice's existing
`ends_with` and `score` can serve as the target. E2 of the same design owns that
decision, and this record invents none of them.

## Value delivered

- **New capability:** a reader of a pull request learns which of its program's
  targets the change met, and where the change did something different.
- **Benefit:** the program's records no longer live beside the assessment, in a
  document a reader must hold in mind. The assessment states the difference
  where the change is reviewed, so it records a departure from the plan instead
  of reconstructing the departure long after the merge.
- **Beneficiary:** a developer reading a pull request, and a reviewer who wants
  to know whether the change did what the program asked.

## Maps to

Context `cobuilder-packaging`. Modules `plugins/pr` and `shared`.

The rule this record establishes is the one the boundary record carries for the
assessment. A pull request that belongs to a program is assessed against that
program's own records, reached through the record index and measured against the
epic that carries the pull request. Every difference between what the program
targeted and what the change did is stated in the assessment and in the
narrative. A pull request that belongs to no program says so in one sentence.
