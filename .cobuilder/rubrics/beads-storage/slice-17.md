Kind: test-suite

# Rubric: Slice 17 — Docs test guards the port and install asks first

Feature: beads-storage
Epic: beads-storage/E4
Slice goal: `tests/test_tracker_docs.py` passes on this repo, and it fails when a `bd` call appears outside `shared/tracker_port/`. Install runs the backfill dry run after adapter config, and it asks consent before any write. The cobuilder-full-lifecycle version matches in `plugin.json` and `marketplace.json`.
Test command: `uv run pytest tests/test_tracker_docs.py -q`

## Criteria

### C1 — The reference exists and the four main skills name it [CRITICAL]

**Must be true:** `shared/tracker-usage.md` exists. The main SKILL.md files of architect, implement, pr, and artifact each name that path.

**Evidence to check:** `uv run pytest tests/test_tracker_docs.py -q -k names_reference` passes. Grep the four SKILL.md files for `tracker-usage.md`. Each file must give at least one match.

**Scoring:**
- 1.0: the file exists, and all four SKILL.md files name it.
- 0.5: the file exists, and three of the four name it.
- 0.0: the file is missing, or two or more SKILL.md files do not name it.

### C2 — Every `tracker.py` operation named in the docs is a real subcommand

**Must be true:** Each `tracker.py <operation>` string in a skill, command, or reference names an operation that `tracker.py --help` lists.

**Evidence to check:** `uv run pytest tests/test_tracker_docs.py -q -k known_operations` passes. Run `uv run "${CLAUDE_PLUGIN_ROOT}/shared/tracker.py" --help` in the repo and compare its subcommand list with the operations the test extracts.

**Scoring:**
- 1.0: every named operation appears in the help output.
- 0.5: one named operation is missing from the help output.
- 0.0: two or more named operations are missing, or the help call fails.

### C3 — A `bd` call outside the adapter fails the test [CRITICAL]

**Must be true:** The test fails when a file outside `shared/tracker_port/` and `shared/tracker-adapter-beads.md` names a `bd` command. The test passes on the repo as it stands.

**Evidence to check:** `uv run pytest tests/test_tracker_docs.py -q -k no_bd_outside_adapter` passes on the repo. Then add one line `bd list` to a scratch copy of a skill file in a temporary fixture tree and run the same test. It must fail. Remove the scratch line after the check.

**Scoring:**
- 1.0: the test passes on the repo and fails on the scratch line.
- 0.5: the test passes on the repo, but the scratch check does not fail.
- 0.0: the test fails on the repo, or it never fails.

### C4 — The usage reference is in the prose-budget list

**Must be true:** `tests/test_prose_budget.py` lists `shared/tracker-usage.md` in `AUTHORING_REFERENCES`.

**Evidence to check:** `uv run pytest tests/test_prose_budget.py -q` passes. Grep `tests/test_prose_budget.py` for `tracker-usage.md`. It must give one match inside the `AUTHORING_REFERENCES` list.

**Scoring:**
- 1.0: the path is in the list, and the prose-budget test passes.
- 0.5: the path is in the list, but the prose-budget test fails.
- 0.0: the path is missing from the list.

### C5 — Install asks consent before any write [CRITICAL]

**Must be true:** `plugins/cobuilder-full-lifecycle/commands/install.md` and the `cobuilder-setup` skill run the backfill dry run after adapter config. Both ask for consent before any write. Both name `shared/tracker-backfill.md`.

**Evidence to check:** `uv run pytest tests/test_tracker_docs.py -q` passes, including the install check. Read `install.md` and the `cobuilder-setup` skill. The consent question must come before any write step. Behavioral check: a fresh agent runs `/cobuilder-full-lifecycle:install` on an empty tracker. The transcript shows the dry run and a consent question before any write.

**Scoring:**
- 1.0: the dry run follows adapter config, consent comes before any write, and both files name the reference.
- 0.5: both files name the reference, but the order or the consent is not checked.
- 0.0: any write precedes consent, or a file omits the reference.

### C6 — Versions and pointers match

**Must be true:** `plugins/cobuilder-full-lifecycle/.claude-plugin/plugin.json` and its `marketplace.json` entry name the same cobuilder-full-lifecycle version, bumped from the previous release. `plugins/implement/commands/start.md` names `shared/tracker-backfill.md` for an empty tracker.

**Evidence to check:** `uv run pytest tests/test_tracker_docs.py -q` passes. Compare the two version strings. Grep `start.md` for `tracker-backfill.md`.

**Scoring:**
- 1.0: the versions match and are bumped, and `start.md` names the reference.
- 0.5: the versions match, but the pointer is missing.
- 0.0: the versions differ.

## Regression check

- `uv run pytest tests/test_tracker_docs.py -q` passes.
- No file outside `shared/tracker_port/` and `shared/tracker-adapter-beads.md` names a `bd` command, except the test file itself and the fixtures.
- `uv run pytest tests/test_prose_budget.py -q` passes.

## Out of scope — do not penalise

- The wording of any doc. The test checks structure and references, not prose.
- The beads adapter code in `shared/tracker_port/`. Those belong to E2.
- The port internals and the projector. Those belong to E1 to E3.
- The wording of the `cobuilder-setup` allow rules.
