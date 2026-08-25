---
name: implement
title: "CoBuilder Implement"
version: 1.0.0
status: active
last_verified: 2026-08-22
description: >
  Build a feature one vertical slice at a time. Runs four approval gates
  before any implementation code exists, requires an epic technical solution
  design per epic, authors blind acceptance rubrics before each slice, and
  uses a red-green-validate loop where an independent validator scores the
  work against a threshold of 0.90.
---

# CoBuilder Implement

Two core concepts unite in this skill.

**From Software Factory:** make all architectural decisions before writing
implementation code. Changing a design in prose is inexpensive. Changing code
after implementation requires a rewrite. Four gates and explicit approvals
precede vertical slices.

**From CoBuilder Guardian:** never trust a self-report. Write an acceptance
rubric before the implementer starts. Keep the rubric hidden from the
implementer. Have an independent validator score the final result against the
blind rubric.

The join point is the slice. Each slice receives a rubric before implementation
and a score after. A slice is complete when an independent validator scores it at
0.90 or better.

This skill requires only a git repository, a test command, and the ability to
spawn a subagent.

## Implement mode

This mode runs the gate and slice workflow for a feature.

---

## When to run the gates

Run the full workflow when a task represents a complete feature. A feature
creates or changes multiple files, adds an endpoint or table, or produces a
large diff.

Skip the gates for small tasks when any of these conditions hold:

- Trivial tweak: a rename, typo fix, copy update, or small config edit.
- The user explicitly requests the fast version without gates.
- The code is throwaway prototyping.

When in doubt, ask the user: "This change looks substantial. Should we run the
gate workflow or the fast version?" Respect the choice.

---

## Skeptical disposition

Apply skeptical curiosity to every claim in the workflow:

- **Never trust a self-report.** Passing tests are unproven until you run the
  suite. A completed slice is unverified until an auditor scores it.
- **Investigate root causes.** Trace test failures to the underlying cause. Do
  not suppress errors.
- **Reject premature fallbacks.** Most blockers require simple fixes. Determine
  the true difficulty before abandoning a check.
- **Ask what remains.** When a test passes, verify what cases it misses.
- **Review easy slices.** If a slice felt easy, verify that it did not skip
  requirements.

---

## Optional: prior-art recall (Hindsight)

Hindsight memory stores lessons from past sessions in this repository. Use it
when available to avoid repeating documented mistakes.

**Ask once at the start after the user states their intent:**

> "Should I check Hindsight for prior art before we begin? It adds two short
> recall steps."

Record the answer in `00-status.md` (`Hindsight: yes | no | unavailable`).

If the user opts in, execute two checkpoints:

**Checkpoint H1 — after intent, before Gate 1.** Check past attempts in this
problem domain:

```
recall("<the feature domain>, prior attempts, related initiatives")
reflect("What should a <feature domain> effort account for here, given past
         sessions? What went wrong in similar prior work?")
```

**Checkpoint H2 — after Gate 1 approval, before Gate 2.** Check known technical
constraints:

```
recall("<the modules and services this will touch>, past design decisions,
        known constraints")
reflect("What has broken before in these modules? Which designs were tried and
         abandoned, and why?")
```

Three rules govern recall:

1. **Read results.** If output writes to a file, read that file completely.
2. **Write findings into the gate document.** Record insights in `01-product.md`
   or `02-architecture.md`.
3. **Skills override memories.** User instructions and skill rules take
   precedence over past memories.

At feature completion, store a short reflection describing the slices, any
escalations, and lessons learned.

---

## Files and state

Files live in two separate locations. This separation is required:

```
docs/plans/<feature-slug>/        VISIBLE — shared planning documents
  00-status.md                    gate approvals, slice checklist, and scores
  01-product.md                   Gate 1 product definition
  mockups/                        Gate 1 UI mockups in plain HTML
  02-architecture.md              Gate 2 architecture definition
  03-program-design.md            Gate 3 feature-level program design
  04-slices.md                    Gate 4 slice plan grouped by epic
  epic-<epic-id>-design.md        Per-epic technical solution design

.cobuilder/rubrics/<feature-slug>/   BLIND — hidden from implementers
  manifest.yaml                      slice weights and score thresholds
  slice-1.md … slice-N.md            per-slice blind acceptance rubrics
  evidence/slice-N-attempt-M.md      validator findings per attempt
```

**The blind rule.** The directory `.cobuilder/rubrics/` contains the answer key.
If an implementer reads it, the score becomes invalid:

1. Add this instruction to all implementer prompts: "Do not read anything under
   `.cobuilder/`."
2. Provide the implementer with the slice description, never the rubric.
3. If an implementer opens a rubric, discard the score, rewrite the rubric, and
   rerun the slice.

Commit rubrics to the repository. Add `.cobuilder/rubrics/*/evidence/` to
`.gitignore`.

**Resume rule.** When starting a session, check for
`docs/plans/<feature-slug>/00-status.md`. Read all documents in that directory.
Continue from the first unapproved gate or unbuilt slice. Do not repeat
approved gates unless requirements changed.

Template for `00-status.md`:

```markdown
# Status: <feature name>

- Gate 1 — Product: pending | in progress | APPROVED <date>
- Gate 2 — Architecture: pending | in progress | APPROVED <date>
- Gate 3 — Program Design: pending | in progress | APPROVED <date>
- Gate 4 — Slice plan + rubrics: pending | in progress | APPROVED <date>

Hindsight: yes | no | unavailable

## Slices
- [ ] Slice 1 — tracer bullet: <one line>   score: —
- [ ] Slice 2 — <one line>                  score: —

## Escalated
<slices accepted below threshold, with reasons and follow-up plans>

## Notes for a fresh session
<decisions from chat that future sessions need>
```

---

## The approval protocol

Run this protocol at every gate and before implementing an epic:

1. Write the document to disk.
2. Present a short summary of five to ten bullets to the user, with the file
   path.
3. Ask the user: **"Approve Gate N, or what should change?"**
4. The user must clearly approve before you proceed.
5. Record approval in `00-status.md`.
6. If later work invalidates a decision, update the document, set status to "in
   progress", and request approval again.

---

## Gate 1 — Product (no tech talk)

Write `01-product.md` with the user:

```markdown
# Product: <feature name>

## Problem
<the user problem in end-user terms>

## Success metric
<one measurable business metric and the measurement method>

## Announcement — the blog post before the feature
<3–6 sentences announcing this feature to users>

## Screens
<one line per mockup in ./mockups/ — or "no UI">
```

Rules:
- Do not include database details, schemas, or endpoints in Gate 1.
- For user interfaces, create plain HTML mockups in `mockups/`.
- Request user approval.

---

## Gate 2 — Architecture

Read existing code before authoring `02-architecture.md`:

```markdown
# Architecture: <feature name>

## Fit
<existing modules touched and their roles>

## Endpoints
<route + verb + purpose — or "none">

## Data
<tables or collections created or changed>

## Flow
<call sequence for the primary path>

## External
<external APIs, environment variable names, and webhooks>
```

Request user approval.

---

## Gate 3 — Program Design (feature level)

Define code structures in `03-program-design.md`:

```markdown
# Program Design: <feature name>

## Files
<files created or modified, with rationale>

## Types & signatures
<types and function signatures without bodies>

## Call stack
<top-to-bottom call hierarchy for main flows>

## Test plan
<test cases and assertions planned>

## Least confident decisions
<list of decisions with high uncertainty>
```

Request user approval.

---

## Gate 4 — Slice plan, epic technical solution designs, and blind rubrics

Gate 4 prepares all artifacts needed for implementation.

### 4a. The slice plan

Save `docs/plans/<slug>/04-slices.md`. Group slices by epic in a table:

- **Slice 1 is the tracer bullet:** stubbed UI or basic response wired end to
  end.
- **Slice 2:** happy path with real logic.
- **Slice 3+:** edge cases, business rules, and error handling.
- Do not build horizontally across layers. Build vertical end-to-end slices.

### 4b. Per-epic technical solution design

Gate 3 provides the program design for the whole feature. For an epic carrying
multiple slices, write a Technical Solution Design per epic before building its
slices.

Save each design as `docs/plans/<slug>/epic-<epic-id>-design.md`:

```markdown
# Epic Technical Solution Design: <epic-id> — <epic name>

Feature: <feature-slug>
Epic ID: <epic-id>

## Scope and Intent
<summary of what this epic achieves and its boundary>

## Files Touched
<exact files created or modified in this epic>

## Types & Signatures
<detailed interfaces and contracts for this epic>

## Slice Decomposition
<list of vertical slices in this epic with dependencies>

## Test Plan
<specific test files and assertions for each slice>

## Risks & Open Questions
<uncertainties and integration constraints>
```

Present this document to the user and obtain approval before authoring rubrics
for the epic.

### 4c. Blind rubrics

Write one rubric per slice at `.cobuilder/rubrics/<slug>/slice-N.md`. Write
`manifest.yaml`. Derive criteria from the approved epic technical design. See
[references/rubric-authoring.md](references/rubric-authoring.md).

Check before implementation starts:

```bash
ls .cobuilder/rubrics/<feature-slug>/slice-*.md 2>/dev/null | wc -l
# Must be greater than 0 before starting slices.
```

---

## Building a slice — the red-green-validate loop

Execute the three-role loop for each slice:

```
RED       write failing tests that define the slice contract
   ↓
GREEN     minimal implementation to make tests pass  ←──┐
   ↓                                                   │ feedback
VALIDATE  independent scoring against the blind rubric ┘
   ↓
score >= 0.90 → accept, proceed to next slice
score <  0.90 and attempt < 3 → return to GREEN with feedback
score <  0.90 and attempt >= 3 → escalate: accept with reservations
```

Two execution options:

| Mode | When to use | Instructions |
|---|---|---|
| **Workflow script** | Multi-agent execution enabled in harness | Run `workflows/slice-loop.js`. Obtain user opt-in first. |
| **Manual** | Single slices or standard harness | Spawn subagents from [references/slice-loop.md](references/slice-loop.md). |

### After each slice

1. **Demonstrate functionality.** Execute tests or run a demo.
2. **Record the score** in `00-status.md` and mark the slice complete.
3. **Route gaps** below 1.0 using the gap decision tree in
   [references/validation-scoring.md](references/validation-scoring.md).
4. **Ask the user:** "Proceed to the next slice, or adjust direction?"

---

## Standing rules

- **Compact context at boundaries.** Keep documents updated so sessions can
  restart cleanly.
- **Maintain small diffs.** Keep individual slices focused and reviewable.
- **Real tests only.** Do not write tests that pass before code changes. Never
  modify a test to force a pass.
- **Implementers do not edit tests.** Tests are the immutable contract written
  by the RED role.
- **Target threshold is 0.90.** A lower threshold allows defects into the
  codebase.

---

## Durable repository context

When a gate produces an architectural decision, record an ADR in
`docs/architecture/adr/ADR-NNNN-<slug>.md`. Record external environment details
in `docs/external/`.

---

## References

Load reference files as needed:

| Reference | Purpose |
|---|---|
| [references/hindsight-recall.md](references/hindsight-recall.md) | Prior-art recall instructions |
| [references/rubric-authoring.md](references/rubric-authoring.md) | Authoring blind rubrics and manifest files |
| [references/slice-loop.md](references/slice-loop.md) | Role prompts for RED, GREEN, and VALIDATE |
| [references/validation-scoring.md](references/validation-scoring.md) | Scoring criteria and gap routing |
| [references/goal-sync.md](references/goal-sync.md) | Sync epic status to goal.json after slice acceptance |
| [workflows/slice-loop.js](workflows/slice-loop.js) | Multi-agent workflow automation |

---

**Lineage (history):** Ported from the prototype `cobuilder-factory` skill.
Merges `software-factory` (gates, slice discipline, files-on-disk state) with
`cobuilder-guardian` (blind rubrics, gradient scoring, gap routing, skeptical
disposition) and `worker-superpowers` (TDD roles, verification checklist). The
pi SDK, DOT pipelines, beads, and external services from the original guardian
are left out. This skill runs in any standard coding harness.
