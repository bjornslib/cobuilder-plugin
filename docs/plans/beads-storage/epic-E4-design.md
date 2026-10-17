# Epic Technical Solution Design: E4 — The write model

Feature: beads-storage
Epic ID: E4

## Scope and Intent

E4 makes the four main skills write program state through
`shared/tracker.py`. The skills are architect, implement, pr, and artifact.
E4 retires the hand-written epic state in `goal.json` and the sync step in
`goal-sync.md`. E4 also adds one test that guards the docs.

E4 starts after E3 slice 12 closes. E4 changes no port, no adapter, no
projector, and no viewer source. E4 ends when slices 13 to 17 pass their
rubrics.

E4 does not write the beads adapter (E2). E4 does not change the read model
(E3). E4 does not write the usage reference (E1 slice 5). E4 only links to it.

## Files Touched

`03-program-design.md` lists every file with the slice that adds or changes
it. In short:

- Slice 13 changes the implement build skill: `plugins/implement/skills/build/SKILL.md`,
  `references/slice-loop.md`, and `references/validation-scoring.md`.
  It also changes `commands/start.md`, `commands/install.md`, `commands/debug.md`,
  the implement `plugin.json`, and `.claude-plugin/marketplace.json`.
  It deletes `references/goal-sync.md`.
  It adds the `shared/tracker.py` allow rule to the `cobuilder-setup` skill.
  Locate that skill with glob before the edit.
  It adds `tests/test_implement_tracker_state.py` and the fixture tree
  `tests/fixtures/tracker/write-model/`.

- Slice 14 changes: `plugins/architect/skills/architecture/SKILL.md`,
  `references/design-mode.md`, the architect `plugin.json`, and
  `marketplace.json`. It adds `tests/test_architect_tracker_state.py`.

- Slice 15 changes: `plugins/pr/skills/odyssey/SKILL.md`, the pr `plugin.json`,
  and `marketplace.json`. It adds `tests/test_pr_tracker_state.py`.

- Slice 16 changes: `plugins/artifact/skills/cobuilder-artifacts/SKILL.md`,
  the artifact `plugin.json`, and `marketplace.json`.
  `docs/architecture/designs/beads-storage/goal.json` loses `branch`, `pr`,
  and `state`. `shared/build_index.py` stops reading those three keys
  (`EPIC_FIELDS` and the epic record) and takes the three joins from the
  tracker records. `shared/_bundle_meta.py` bumps `CURRENT_BUNDLE_FORMAT`.
  `shared/migrate_bundle.py` gains one ladder step. It adds
  `tests/test_bundle_goal_migration.py`.

- Slice 17 changes: `tests/test_prose_budget.py` (adds the usage reference to
  `AUTHORING_REFERENCES`). It adds `tests/test_tracker_docs.py`.

Each of the four skills adds one short "Workflow state" section.
The section links `shared/tracker-usage.md`.
It names the commands that the procedure runs.
It does not copy the moment table.

## Types & Signatures

`03-program-design.md` § Types & signatures is the contract for this epic.
E4 calls the CLI only. E4 defines no Python symbol.

The call form in every skill:

```
uv run "${CLAUDE_PLUGIN_ROOT}/shared/tracker.py" <operation> [args]
```

Operations that E4 calls, with the slice that calls each:

| Operation | Called by | Slice |
|---|---|---|
| `claim-slice <id> --claimant <login>` | implement loop | 13 |
| `record-attempt <id> --score <s> [--note]` | implement loop | 13 |
| `set-slice-state <id> --state <s> [--score] [--attempts]` | implement loop | 13 |
| `escalate <slice> --score <s> --reason <text>` | implement loop | 13 |
| `regenerate-status-files <program>` | implement loop, session end | 13 |
| `set-gate-value <program> --gate <g> --value <v>` | architect | 14 |
| `set-program-stage <program> --stage <st>` | architect | 14 |
| `set-epic-state <id> --state <s> [--branch <b>]` | architect (stage 7) | 14 |
| `add-note <id> --text <t>` | architect, implement | 14 |
| `open-pull-request --ref <r> --epics <id,...>` | pr generate | 15 |
| `set-pull-request-state --ref <r> --merged {true,false}` | pr review, human step | 15 |
| `next-ready`, `list-epics`, `get-slice <id>` | every mode (read) | 13–15 |

Exit codes: 0 ok, 2 refused (no adapter, no write), 3 adapter error, 4 bad
arguments. Output is JSON on stdout and the message on stderr. A skill
branches on the exit code, and it never parses the message.

The goal-file contract after slice 16: `epics[]` entries keep `id`, `slug`,
and `outcome`. The keys `branch`, `pr`, and `state` leave the schema.

## Slice Decomposition

The `Depends on` values below are E4 choices. `04-slices.md` has no dependency
column.

| Slice | Ends with | Depends on |
|---|---|---|
| 13 | A fixture slice run writes its claim, attempts, score, and state through `tracker.py`, and the status file shows the new score | E3 slice 12 |
| 14 | A fixture program records each gate value and the program stage through `tracker.py`, and the status file shows each approval date | 13, because it reuses the write-model fixture and the regenerate step |
| 15 | A pr record blocks two fixture epics until its state is merged, and then both epics show as ready | 13, because it reuses the write-model fixture |
| 16 | `goal.json` holds no `branch`, `pr`, or `state` key after the migration, and the artifact view lists the same epics | 15, because the pr state moves to the port before the goal keys leave |
| 17 | `tests/test_tracker_docs.py` passes on this repo, and it fails when a `bd` call appears outside `shared/tracker_port/` | 13 to 16, because it scans every file that those slices change |

Slice details:

- **13.** The implement loop replaces every hand write to `00-status.md` score
  and state lines with the CLI calls. `start.md`, `install.md`, and `debug.md`
  call the CLI only. The PASS branch in `slice-loop.md` calls
  `set-slice-state`, then `regenerate-status-files`. The ESCALATION branch calls
  `escalate`. It replaces the `## Escalated` write in `00-status.md`.
  Slice 13 deletes `goal-sync.md` and removes its pointers.

- **14.** Design mode calls `set-gate-value` for each gate approval, then
  `add-note`. Stage 7 calls `set-epic-state --branch`. Design mode calls
  `set-program-stage` when the human decides or approves the design.

- **15.** `generate` runs `gh pr create`, then `open-pull-request`. `review`
  reads state with `list-epics`. After a human merge, the procedure runs
  `set-pull-request-state`, then `set-epic-state`. The procedure never merges.

- **16.** `cobuilder-artifacts` reads epic state through the port. The
  migration drops `branch`, `pr`, and `state` from each `goal.json` `epics[]`
  entry, and it bumps the bundle format.

- **17.** The docs test reads the files that the Files Touched list names and
  checks structure and effect. It never checks prose wording.

## Test Plan

Run each test file for its slice. The main session runs them after all
subagents land. The worker runs none of them.

Slice 13. File: `tests/test_implement_tracker_state.py`. Fixture:
`tests/fixtures/tracker/write-model/` (`program.json`, `epics.json`,
`slices.json`, and `plans/` with one slice file and `00-status.md`).
Assertions:

1. `claim-slice` on the open fixture slice exits 0, and `get-slice` shows the
   claimant as assignee.
2. `record-attempt` increments the attempt count and exits 0.
3. `set-slice-state --state passed --score 0.93` exits 0. After
   `regenerate-status-files`, the status file shows score 0.93.
4. A second identical `set-slice-state` exits 0 and changes no file (hash
   equal).
5. With no `.cobuilder/tracker.yaml`, the same write exits 2, and no file
   changes.
6. The implement `plugin.json` and `marketplace.json` versions match.

Slice 14. File: `tests/test_architect_tracker_state.py`. Fixture: the
write-model program with gates 1 and 2 absent and gate 2b `n/a`. Assertions:

1. `set-gate-value --gate gate1 --value 2026-10-17` exits 0. The status file
   shows the date after regeneration.
2. `set-program-stage` writes a stage that `_bundle_meta.DESIGN_STAGES` lists.
   A stage outside the list exits 4.
3. `set-epic-state --branch` writes the branch to the epic record. `list-epics`
   shows it.
4. The architect `plugin.json` and `marketplace.json` versions match.

Slice 15. File: `tests/test_pr_tracker_state.py`. Fixture: two write-model
epics `E-a` and `E-b`, and one pr record `pr/1` that blocks both. Assertions:

1. Before the merge, `next-ready` returns neither epic.
2. `open-pull-request --ref pr/1 --epics E-a,E-b` exits 0. A second identical
   call changes no file.
3. `set-pull-request-state --ref pr/1 --merged true` exits 0. Then `next-ready`
   returns both epics.
4. `next-ready` never returns the pr record.
5. The pr `plugin.json` and `marketplace.json` versions match.

Slice 16. File: `tests/test_bundle_goal_migration.py`. Fixture: a bundle copy
with an old `goal.json` that holds `branch`, `pr`, and `state` in `epics[]`.
Assertions:

1. After the migration step, no `epics[]` entry holds `branch`, `pr`, or
   `state`.
2. `CURRENT_BUNDLE_FORMAT` is one higher than before.
3. The list of epic ids in `data/index.json` equals the list before the
   migration.
4. The migration never calls `extract_story.py`.
5. The artifact `plugin.json` and `marketplace.json` versions match.

Slice 17. File: `tests/test_tracker_docs.py`. Assertions:

1. `shared/tracker-usage.md` exists. The main SKILL.md of architect, implement,
   pr, and artifact names it.
2. Every `tracker.py <operation>` in a skill, command, or reference names an
   operation that `tracker.py --help` lists.
3. No file outside `shared/tracker_port/` and `shared/tracker-adapter-beads.md`
   names a `bd` command. The test skips its own file and the fixtures.
4. `tests/test_prose_budget.py` lists `shared/tracker-usage.md` in
   `AUTHORING_REFERENCES`.

Behavioral checks (slices 13, 14, 15, and the SKILL.md part of 16) run on a
real transcript. A fresh agent gets only the changed file and the task.
The slice evidence keeps the transcript. Git ignores `.cobuilder/rubrics/*/evidence/`.

## Risks & Open Questions

1. **Rubric path (conflict with 04).** `04-slices.md` line 7 names
   `docs/architecture/designs/beads-storage/rubrics/`. The assignment and the
   verify_gate default use `.cobuilder/rubrics/beads-storage/`. This design
   follows the assignment. Main decides.

2. **`ref` key (conflict between 03 and ADR-0040).** ADR-0040 gives
   `set_pull_request_state(ref, merged)` with no key. 03 adds `ref`. This design uses
   `--ref`. The ADR needs an amendment.

3. **Epic fields in the bundle index (possible gap).** `shared/build_index.py`
   names `branch`, `pr`, and `state` in `EPIC_FIELDS` (line 255). It copies
   them from `goal.json` into the record (lines 513–515). 03 lists no change to
   `build_index.py` in E4. If 03 keeps that file unchanged, slice 16 cannot pass
   as written. Main decides whether slice 16 adds the change or 03 adds a
   slice.

4. **Stale status file mid-session.** ADR-0040 places `regenerate-status-files`
   at session end. Slice 13 requires the status file to show the new score after
   a slice pass. This design runs the regenerate step after each slice pass.
   That adds one step to the moment table. Main decides.

5. **Claim atomicity.** Nothing verifies the beads `bd claim` atomicity (ADR-0040
   Consequences). Slice 13 tests the fake adapter only. E2 slice 7 covers the
   beads read-back.

6. **Kind line.** The behavioral rubrics put `Kind: behavioral` on line 1, as
   the assignment asks. The title line follows.

7. **Least-confident decisions.** The four skill edits are prose. Slices 13
   to 15 need a behavioral rubric. The wording rule for each edit goes in the
   rubric, not in this design.
