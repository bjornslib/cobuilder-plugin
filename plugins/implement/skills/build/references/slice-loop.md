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

The loop passes its accept threshold and attempt limit to VALIDATE, and the values above are the defaults.

The beads adapter can model the three steps as a formula, in `shared/tracker_port/formulas/slice-loop.toml`. Each failed attempt is a child of the slice.

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

Spawn a subagent. Give it the slice description, the program design, the
epic technical solution design, and the interaction design with its UI
specification. **Do not give it the rubric.**

RED reads `03-program-design.md`, the epic design, the interaction design, and
`ui-spec.jsonc`. A front-end slice derives its failing contract from all four.

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

Spawn RED with the Agent tool, `subagent_type: "implement:red"`. The spawn
message must carry the slug, the slice number and name, the epic id, and
the exact test command. RED's own body (`plugins/implement/agents/red.md`)
holds the scope contract, the blind rule, the read-first list — including
`interaction-design.md` and `ui-spec.jsonc` for a front-end slice — the
steps, and the report format.

**Check the work of RED before proceeding.** Run the suite yourself. Confirm the
new tests fail on assertions.

---

## Role 2 — GREEN

Spawn GREEN with the Agent tool, `subagent_type: "implement:green"`. **Do not
give it the rubric.** The spawn message must carry the slug, the slice
number and name, the epic id, the exact test command, and RED's test file
paths. On a retry attempt (attempt > 1), the message must also say this is
a retry and point to the feedback file. GREEN's own body
(`plugins/implement/agents/green.md`) holds the scope contract, the blind
rule, the read-first list, the steps, and the report format.

---

## Role 3 — VALIDATE

Spawn VALIDATE with the Agent tool, `subagent_type: "implement:validate"`, as
a fresh subagent that saw neither the RED reasoning nor the GREEN reasoning.
**This role is the only role that reads the rubric.** The spawn message
must carry the slug, the slice number and name, and the exact test command.
VALIDATE's own body (`plugins/implement/agents/validate.md`) holds the
scope contract, the frontend/browser step, the false-pass checks, the
scoring guide, the evidence file format, and the verdict rules. That step
requires opening a frontend slice in a real browser: a component test that
calls `.click()` is not that check.

Spawn VALIDATE and VOCABULARY in parallel, not one after the other. VALIDATE
uses `subagent_type: "implement:validate"`. VOCABULARY uses `subagent_type:
"implement:vocabulary"`, and its spawn message carries the slug, the slice
number, and the exact diff command. Its own body
(`plugins/implement/agents/vocabulary.md`) holds the finding tags and the
evidence-file format. Running both agents in parallel costs no extra wall
time, because neither reads the other's output.

**The vocabulary verdict is a separate axis, not part of the score.** A
`CLEAN` or `FINDINGS` verdict never enters `overall_score`, and it never
turns a PASS into a FAIL by itself. A `FINDINGS` verdict routes through the
gap decision tree in `validation-scoring.md`, the same way any criterion
gap below 1.0 does: judge whether the finding blocks the slice or can wait.
On a VALIDATE `FAIL`, pass the vocabulary findings to the next GREEN
attempt alongside VALIDATE's own feedback, so a naming mistake gets fixed
in the same retry as everything else.

---

## Workflow state calls

Every call has the form `uv run "${CLAUDE_PLUGIN_ROOT}/shared/tracker.py" <operation> args`. Below, `tracker.py` stands for that full call. Before RED starts, claim the next slice. To work a named slice, use `claim-slice <id> <claimant>` instead.

```
tracker.py claim-next <claimant> [--under <epic or program>]
tracker.py record-attempt <id> <score> --note <text>
tracker.py set-slice-state <id> closed --score <score> --attempts <n>
tracker.py escalate <id> <score> <reason>
tracker.py regenerate-status-files <program> --plans-dir <dir>
```

Run `record-attempt` after each failed attempt. Run `set-slice-state` and then `regenerate-status-files` after a pass. Run `escalate` after an escalation.

After every call that changes a slice, an epic, or a program, rebuild the index with `uv run "${CLAUDE_PLUGIN_ROOT}/shared/build_index.py"`. The viewer reads the committed `data/index.json`, so it shows the old state until you rebuild. The rebuild takes about 30 seconds. Run it once at the end of a pass, an escalation, or a skip, and commit the new index with the slice.

Branch on the exit code only, and never parse the message. [shared/tracker-usage.md](../../../../../shared/tracker-usage.md) lists every operation, and its Failure and refusal section lists the exit codes.

## Handling the verdict

| Verdict | Action |
|---|---|
| **PASS** | Delete `slice-<N>-feedback.md`. Run `set-slice-state <id> closed --score <score> --attempts <n>`, then `regenerate-status-files <program> --plans-dir <dir>`, then rebuild the index. These calls record the score and the epic status. **Store the slice note** (see "Slice note to project memory" below). Prove the slice works to the user with a test or demo. Ask whether to continue or adjust direction. |
| **FAIL** | Run `record-attempt <id> <score> --note <text>`. Re-run GREEN with the feedback file. Do not re-run RED because the contract did not change. |
| **ESCALATION** | Do not loop again. Run `escalate <id> <score> <reason>`. Then run `regenerate-status-files <program> --plans-dir <dir>` and rebuild the index. Discuss with the user. See the gap decision tree in `validation-scoring.md`. When the engineer decides to move on, run `tracker.py skip-slice <id> --reason <text> --outcome escalated`, then rebuild the index again. For a delayed slice, use `--outcome skipped`. Closing the slice unblocks the later slices. |

## Slice note to project memory

On a PASS, store one short note in project memory while the cause is still
in view. The Hindsight Stop hook also stores the session transcript when the
session ends. A retry cause is hard to find in a long transcript.

If the session lists the `mcp__hindsight__retain` tool, call it once with
these fields:

- `bank_id`: the `bankIdTemplate` in `~/.hindsight/coding-agent.json`, with
  `{gitProject}` set to the folder name of the main worktree. The main
  worktree is the parent of `git rev-parse --path-format=absolute --git-common-dir`.
- `document_id`: `<feature-slug>-slice-<N>`. A second note for the same
  slice then replaces the first.
- `context`: `slice accepted`.
- `content`:

```
Slice <N> (<slice name>), epic <epic-id>, feature <feature-slug>.
Score: <overall_score>. Attempts: <attempt count>.
Retry cause: <cause, or 'none, passed on attempt 1'>.
Constraint the code does not show: <constraint, or 'none'>.
```

Then run `add-note <id> retained`. If the session does not list the tool, or the
call fails, run `add-note <id> absent` and continue.
A failed note never stops the loop.

**Do not lower the threshold to force a pass.** If 0.90 is unreachable, the
slice is too large, the rubric is flawed, or the design is wrong.

---

## Running the loop

**Manual (any harness).** Spawn the three named agents in turn — `implement:red`,
`implement:green`, `implement:validate` — with the Agent tool as described
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
