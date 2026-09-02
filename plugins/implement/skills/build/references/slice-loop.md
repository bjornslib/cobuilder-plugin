---
title: "The Red-Green-Validate Slice Loop"
status: active
type: reference
---

# The slice loop

One slice uses three roles and one gate. The roles must execute as separate
agents with separate contexts. An agent that writes an implementation cannot
judge it objectively.

```
RED       write failing tests that define the slice contract
   ↓
GREEN     minimal implementation to make tests pass   ←──┐
   ↓                                                     │ feedback file
VALIDATE  independent scoring against the blind rubric ──┘
   ↓
score >= 0.90                → accept, next slice
score <  0.90, attempt < 3   → back to GREEN with the feedback
score <  0.90, attempt >= 3  → escalate: accept with reservations, record
                               the gap, move on
```

The escalation branch keeps the loop finite. Without this rule, a stuck slice
blocks all following work.

---

## State files

The loop coordinates through files on disk rather than conversation. This design
survives context compactions, lost sessions, or changes in harness:

```
.cobuilder/rubrics/<slug>/slice-N.md                  the blind rubric (input)
.cobuilder/rubrics/<slug>/evidence/
    slice-N-attempt-M.md                              validator findings (output)
    slice-N-feedback.md                               guidance for the next GREEN
docs/plans/<slug>/00-status.md                        scores and checkmarks
```

`slice-N-feedback.md` is append-only within a slice. Delete it when the slice is
accepted. The header count in this file determines the attempt number.

---

## Role 1 — RED

Spawn a subagent. Give it the slice description, the program design, and the
epic technical solution design. **Do not give it the rubric.**

**Before spawning, check the epic design document exists.** An epic that
carries more than one slice needed an approved Gate 4b design
(`docs/plans/<slug>/epic-<epic-id>-design.md`). If the slice's epic carries
more than one slice and that file is absent, stop the slice and report the
missing file. Do not fall back to `03-program-design.md` for that case —
that silent fallback is what let six epics ship with no Gate 4b design in
the `cobuilder-family` feature.
`plugins/implement/scripts/verify_gate.py` checks this before
implementation starts (see SKILL.md, Gate 4c). A single-slice epic never
needed a design, and falls through to `03-program-design.md` on purpose.

```
You are the RED role in a test-driven slice. Write failing tests. Write no
implementation.

SCOPE CONTRACT
Your scope is exactly one slice: slice <N>, "<slice name>".
Do not write tests for any later slice.
Do not modify or delete test files written for earlier slices.
Do not read anything under .cobuilder/ — it holds material you must not see.

Read first:
  docs/plans/<slug>/03-program-design.md   (the test plan section)
  docs/plans/<slug>/epic-<epic-id>-design.md (the epic technical design)
  docs/plans/<slug>/04-slices.md           (this slice and following slices)

Then:
1. Write tests that define the contract for slice <N> only. Every behavior the
   slice promises needs at least one test.
2. The tests must FAIL, and they must fail on assertions. Do not accept tests
   that fail on import errors, missing fixtures, or syntax errors.
3. Run the full test suite: <test_command>
   Tests from earlier slices must pass. Only your new tests fail.

Report: the test files created (full paths), the number of new failing tests,
the exact assertion each test fails on, and the pass count for pre-existing
tests.
```

**Check the work of RED before proceeding.** Run the suite yourself. Confirm the
new tests fail on assertions.

---

## Role 2 — GREEN

Spawn a fresh subagent. Give it the slice description and the test files from
RED. **Do not give it the rubric.** On a retry attempt, give it the feedback
file as well.

```
You are the GREEN role in a test-driven slice. Make the failing tests pass.

SCOPE CONTRACT
Your scope is exactly one slice: slice <N>, "<slice name>".
Do not implement capabilities belonging to later slices.
Do not refactor earlier slices beyond the minimum needed to integrate.
Do NOT modify any test file. The tests are the contract. Changing a test
changes the requirement.
Do not read anything under .cobuilder/ — it holds material you must not see.

Read first:
  docs/plans/<slug>/03-program-design.md
  docs/plans/<slug>/epic-<epic-id>-design.md (the epic technical design)
  the failing test files: <paths from RED>
  .cobuilder/rubrics/<slug>/evidence/slice-<N>-feedback.md  — ONLY IF IT EXISTS

  [If the feedback file exists this is a RETRY. Every gap listed in its
  "Actionable guidance" section must be addressed in this attempt. Do not
  repeat a mistake the feedback already named.]

Then:
1. Write the minimal code that makes the failing tests pass.
2. Run the full test suite: <test_command>
   All new tests pass. No existing tests break.
3. Before reporting, verify:
   - git diff --name-only shows only files in this slice scope
   - no TODO, FIXME, HACK, or XXX markers exist in modified files
   - no test file appears in your diff

Report: files created or modified, full test output with pass and fail counts,
and — if this was a retry — how you addressed each point of the feedback.
```

---

## Role 3 — VALIDATE

Spawn a fresh subagent that saw neither the RED reasoning nor the GREEN
reasoning. **This role is the only role that reads the rubric.**

```
You are the VALIDATOR. You are an independent auditor. You did not write this
code. You do not trust self-reports from authors.

SCOPE CONTRACT
Score only slice <N> against the criteria in its rubric. Do not penalise the
implementation for capabilities belonging to later slices. Check the "Out of
scope" section of the rubric.

Read:
  .cobuilder/rubrics/<slug>/slice-<N>.md          your criteria
  .cobuilder/rubrics/<slug>/manifest.yaml         thresholds and test command
  .cobuilder/rubrics/<slug>/evidence/slice-<N>-feedback.md   (if it exists —
      count the "## Validation Result" headers to get the attempt number)

Steps:
1. Run the test suite yourself: <test_command>. Capture the real output.
1a. If this slice touches a frontend app, also open it in a real browser
    through the ChromeDevTools MCP tools and exercise the behavior each
    criterion claims. A criterion about UI or user-visible behavior scores no
    higher than 0.5 on test output alone — cite the browser check too, for
    example a screenshot, a DOM snapshot, or a console-message read that
    shows no error. Skip this step only when the slice touches no frontend
    code, and say so in your findings.
2. Check for a false pass. Any of these items voids the run — report it and
   score the affected criterion 0.0:
   - a test file changed in this slice diff
   - a test was skipped, ignored, commented out, or weakened
   - a test that also passes against pre-change code
   - an assertion was removed or relaxed
3. Score each criterion in the rubric with its scoring guide:
     1.0 — fully met, evidence is clear
     0.5 — partially met, fragile, or happy path only
     0.0 — missing, wrong, or the test fails
   Every score requires cited evidence: a file path with a line number, a test
   name, or command output.
4. overall_score = the plain average of the criterion scores.
5. Check for regressions: tests passing before this slice must continue to pass.
6. Write your findings to
   .cobuilder/rubrics/<slug>/evidence/slice-<N>-attempt-<M>.md
   and append the same content to slice-<N>-feedback.md, in this format:

   ## Validation Result — <PASS|FAIL|ESCALATION>
   Slice: <N>  |  Attempt: <M>  |  Score: <overall_score>

   ### Per-criterion results
   - [PASS|PARTIAL|FAIL] <criterion id and claim>  score: <x>
     Evidence: <file:line, test name, or command output>
     Gap: <what is missing or wrong, if not full credit>

   ### Regression check
   <pre-existing tests still passing, or what broke>

   ### Actionable guidance for the next attempt
   <mandatory on FAIL or ESCALATION. Name specific file paths, function names,
   and required behaviors.>

7. Verdict:
   PASS       — overall_score >= 0.90 AND no CRITICAL criterion below 1.0
   FAIL       — otherwise, and attempt number < 3
   ESCALATION — otherwise, and attempt number >= 3. Name what could not be
                completed and the underlying reason.

Return: verdict, overall_score, and per-criterion scores.
```

---

## Handling the verdict

| Verdict | Action |
|---|---|
| **PASS** | Delete `slice-<N>-feedback.md`. Record the score in `00-status.md`, check the slice off. **Sync epic status to goal.json** (see `goal-sync.md`). **If Hindsight is available, retain the slice outcome** (see `hindsight-routine.md`, "Retain after every accepted slice"). Prove the slice works to the user with a test or demo. Ask whether to continue or adjust direction. |
| **FAIL** | Re-run GREEN with the feedback file. Do not re-run RED because the contract did not change. |
| **ESCALATION** | Do not loop again. Record the slice under `## Escalated` in `00-status.md` with the score and reason. Discuss with the user. See the gap decision tree in `validation-scoring.md`. |

**Do not lower the threshold to force a pass.** If 0.90 is unreachable, the
slice is too large, the rubric is flawed, or the design is wrong.

---

## Running the loop

**Manual (any harness).** Spawn three subagents in turn using the prompts
above. Read each report before spawning the next subagent. This is the default
mode.

**Scripted (multi-agent workflows).** `workflows/slice-loop.js` in this skill
runs the loop with deterministic control flow. The user must explicitly opt in
to multi-agent orchestration before running the script. Invoke it with
`Workflow({scriptPath: "${CLAUDE_PLUGIN_ROOT}/skills/build/workflows/slice-loop.js", args: {...}})`
— `name: "slice-loop"` will not resolve, since the Workflow tool's `name`
input only looks up built-in or `.claude/workflows/`-registered workflows,
not plugin-shipped scripts. The script also has no filesystem access, so
each slice's `epicDesignExists` must be computed and passed in by the
orchestrating session (see the script's own args comment).

---

## Anti-patterns

| Anti-pattern | Failure mode |
|---|---|
| One agent performs RED, GREEN, and VALIDATE | The agent scores its own intent rather than its code. |
| GREEN edits a test to pass | The requirement changes silently. |
| Skipping RED because a test plan exists | A test plan is a list of names. RED creates a failing contract. |
| Lowering the threshold after failure | Hides defects and invalidates the quality gate. |
| Looping GREEN more than three times | Slices that fail three targeted attempts require design changes. |
| The validator relies on the GREEN report | Scores must rely on real test execution. |
| Building future slices early | Violates scope boundaries and increases diff size. |
