---
name: build
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

**Exception: a change to a file that governs another mode's own procedure**
(a `SKILL.md`, a `references/*.md` a skill reads to decide what to do, a
`CLAUDE.md`) is never a trivial tweak, regardless of diff size or whether it
"looks like" a copy edit. In an agentic system this prose is the executable
artifact — editing it changes runtime behavior across every future session
that reads it, the same as editing a config file with system-wide blast
radius. Route it through Gate 4c's behavioral-rubric case below instead of
skipping gates. This exception does not apply to prose that merely
*describes* the system for a human reader (a README, an ADR, a design
narrative) — only to prose that an agent reads mid-task to decide what to
do next.

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

**Determine availability first.** Hindsight tools appear in this harness as
`hindsight_recall`, `hindsight_reflect`, and `hindsight_retain`, or
MCP-prefixed as `mcp__hindsight__recall`, `mcp__hindsight__reflect`, and
`mcp__hindsight__retain`. Availability means these tools are registered and
callable, not merely advertised. A tool that appears in a system prompt list
but errors or returns nothing when called is unavailable. This repository's
own `docs/plans/cobuilder-family/00-status.md` records exactly this case:
`Hindsight: unavailable (tools advertised in this session but not
registered)`.

**Ask once at the start after the user states their intent:**

> "Should I check Hindsight for prior art before we begin? It adds a short
> memory checkpoint at each gate."

Record the answer in `00-status.md` (`Hindsight: yes | no | unavailable`). Do
not ask again for this feature.

If the user opts in and the tools are available, read
[references/hindsight-routine.md](references/hindsight-routine.md) and
follow its checkpoints and its retain step. If Hindsight is unavailable, do
not read that file. Proceed through every gate and every slice with no
checkpoint and no retain step.

---

## Optional: design mode record (architect:design)

Design mode (`/architect:design`, in the `architect` plugin) interviews an
engineer before code exists and produces
`docs/architecture/designs/<name>/intent.json`. Per ADR-0013, design mode
owns framing and the challenge, and this skill owns epic decomposition and
everything downstream. Neither mode replaces the other's job, and they join
through that file, never through a code call.

**Ask once at the start, before Gate 1:**

> "Is there an existing `/architect:design` record for this feature under
> `docs/architecture/designs/`? If not, would you like to run
> `/architect:design` first, or should I draft the Business Spec directly?"

Record the answer in `00-status.md` (`Design mode: <design-name> | none |
declined`). Do not ask again for this feature.

- **A record exists:** read its `intent.json` and `goal.json`. Ground Gate 1
  (`01-product.md`) in that intent instead of interviewing from a blank
  page, and seed Gate 4a's epic slugs from `goal.json.epics[]` rather than
  inventing new ones — the design's slugs and the `<design>/<epic-slug>`
  branch convention are the join key ADR-0013 relies on.
- **No record, and the user wants one:** wait while `/architect:design`
  runs, then proceed as above.
- **No record, declined:** draft `01-product.md` directly, as today.

A reader that looks for `docs/architecture/designs/<name>/intent.json` and
finds nothing must report that it looked and found nothing (ADR-0013) —
never silently draft a Business Spec without having checked.

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
- Gate 4 — Slice plan, epic designs, and rubrics: pending | in progress | APPROVED <date>
  - 4a Slice plan: pending | APPROVED <date>
  - 4b Epic technical solution designs: pending | APPROVED <date> | n/a (no epic carries more than one slice)
  - 4c Blind rubrics: pending | APPROVED <date>

Design mode: <design-name> | none | declined
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
6. **Refresh the bundle and start the viewer.** `00-status.md` just changed
   what the Builds Backlog Lane shows. Rebuild the self-bundle projection,
   then start the viewer so the user can watch the gate land, the same way
   step 5 after each slice does:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/shared/build_index.py"
   ```
   Then `Skill("cobuilder-artifacts", args="view")`. Reuses an
   already-running server for this hub; never starts a second one.
7. If later work invalidates a decision, update the document, set status to "in
   progress", and request approval again.

---

## Gate 1 — Product (no tech talk)

Before writing, check the design mode answer recorded above. If a design
record exists, ground this document in its `intent.json` instead of
starting from a blank interview.

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

Gate 4 prepares all artifacts needed for implementation. It has three
sub-steps, and each needs its own approval line in `00-status.md` (see the
template above). Gate 4 as a whole cannot read APPROVED while any sub-step
still reads pending. Approve 4a, then 4b, then 4c, in order, using the
approval protocol above for each.

### 4a. The slice plan

Save `docs/plans/<slug>/04-slices.md`. Group slices by epic in a table:

- **Slice 1 is the tracer bullet:** stubbed UI or basic response wired end to
  end.
- **Slice 2:** happy path with real logic.
- **Slice 3+:** edge cases, business rules, and error handling.
- Do not build horizontally across layers. Build vertical end-to-end slices.
- The table must match `shared/slice_table.py`'s exact six-column shape
  (`#`, Epic, Slice, Ends with, Score, State), including its epic-header row
  convention. `verify_gate.py` and `build_index.py` both parse this file
  with that module and silently skip a row that does not match it.

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
for the epic. Record the approval on the `4b` line in `00-status.md`. When no
epic in `04-slices.md` carries more than one slice, mark `4b` as `n/a` instead
of pending, and skip straight to 4c.

### 4c. Blind rubrics

Write one rubric per slice at `.cobuilder/rubrics/<slug>/slice-N.md`. Write
`manifest.yaml`. Derive criteria from the approved epic technical design. See
[references/rubric-authoring.md](references/rubric-authoring.md).

**Special case: a slice edits a file that governs another mode's own
procedure** (see the Gate-selection exception above). A test-suite rubric
cannot verify this kind of slice — the existing repo test suite checks
packaging invariants, never whether an agent actually follows a rule written
in prose. The evidence has to be behavioral instead.

Write the rubric criteria as observable agent behavior, not as a command to
run — for example: "given only the changed file, a fresh agent doing the
task this rule governs reads at least N excerpts of type X before it reads
any excerpt of type Y" or "the agent does not perform action Z without first
having read file W." A criterion whose evidence still says "read the prose
and judge whether it's clear" is too weak — keep rewriting until the
criterion names an observable action a validator can check against a real
transcript.

Score it with one blind pass, not an adversarial panel:

1. **Stay the orchestrator.** Do not run the governed task yourself — you
   already know the rubric and the intent behind the change, so you cannot
   produce a blind attempt. Spawn one fresh subagent with no memory of this
   session, and hand it only the changed file(s) plus a realistic instance
   of the task the rule governs (not the rubric, not the word "test," not
   which behavior you're checking for).
2. **Capture its actual tool calls** — which files it read, in what order,
   what it escalated to and what it didn't. This transcript is the
   evidence.
3. **Score the transcript against each criterion yourself**, the same way
   an independent validator scores a code slice against a rubric it didn't
   write the implementation for. You wrote the rubric before the blind
   agent ran, so this stays a real check, not a rationalization of
   whatever the agent happened to do.
4. **A criterion that fails names a specific rewrite**, not a re-run. Prose
   that a blind agent doesn't follow needs sharper wording (a concrete
   number, an explicit "never," a worked example) — rerunning the same
   prose against a new blind agent and hoping for a different result is
   not a fix.

One blind pass is enough for a prose-governs-agent-behavior slice. This is
deliberately lighter than a multi-agent adversarial review — the goal is
confirming the rule is followable, not stress-testing it from every angle.

Check before implementation starts:

```bash
uv run plugins/implement/scripts/verify_gate.py --plan docs/plans/<feature-slug>
# Exit code 0 required before starting slices. A non-zero exit names which
# of 4a, 4b, or 4c is missing or incomplete, and for which epic.
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

Two execution options. The choice is by scope, not by asking the user
first — this instruction is itself the opt-in the Workflow tool requires,
the same way an architecture review's adversarial-verify pass invokes it
on scope alone:

| Mode | When to use | Instructions |
|---|---|---|
| **Workflow script** | The feature is a program: `04-slices.md` groups slices under more than one epic | Invoke the Workflow tool with `scriptPath: "${CLAUDE_PLUGIN_ROOT}/skills/build/workflows/slice-loop.js"` — not `name: "slice-loop"`, which only resolves built-in or `.claude/workflows/`-registered workflows and will not find a plugin-shipped script. Before invoking it, confirm any required Gate 4b epic design files exist (e.g. with `verify_gate.py`) and pass the result in as each slice's `epicDesignExists`; the script itself has no filesystem access. Do not ask the user whether to use it first — a program-scale build always runs this way in a harness where the Workflow tool exists. |
| **Manual** | A single epic, a single slice, or a configuration-only change | Spawn subagents from [references/slice-loop.md](references/slice-loop.md), one role at a time. |

A harness with no Workflow tool always uses Manual, regardless of scope.

### After each slice

1. **Demonstrate functionality.** Execute tests or run a demo. If the slice
   touches a frontend app, the demo must open the running app in a browser
   through the ChromeDevTools MCP tools and exercise the changed behavior
   there. A passing test suite does not stand in for this. See
   [references/slice-loop.md](references/slice-loop.md)'s VALIDATE role for
   the same rule applied to scoring.
2. **Commit the slice.** Once VALIDATE scores the slice at or above 0.90, or
   it is accepted with reservations after three attempts (see
   [references/validation-scoring.md](references/validation-scoring.md)),
   commit the slice's changes to git immediately. Do not ask the user
   whether to commit — the only question after a slice completes is step 5
   below, about what happens next. A slice that is still below threshold and
   not yet escalated to three attempts does not commit.
3. **Record the score** in `00-status.md` and mark the slice complete.
4. **Route gaps** below 1.0 using the gap decision tree in
   [references/validation-scoring.md](references/validation-scoring.md).
5. **Refresh the bundle and start the viewer**, same as step 6 of the
   approval protocol above:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/shared/build_index.py"
   ```
   Then `Skill("cobuilder-artifacts", args="view")`. Reuses an
   already-running server for this hub; never starts a second one.
6. **Ask the user:** "Proceed to the next slice, or adjust direction?"

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
| [references/hindsight-routine.md](references/hindsight-routine.md) | Hindsight checkpoints and retain steps, read only when Hindsight is available |
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
