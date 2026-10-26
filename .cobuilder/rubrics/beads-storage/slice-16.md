Kind: mixed

# Rubric: Slice 16 — Goal file drops epic state fields

Feature: beads-storage
Epic: beads-storage/E4
Slice goal: `goal.json` holds no `branch`, `pr`, or `state` key after the migration, and the artifact view lists the same epics.
Test command: `uv run pytest tests/test_bundle_goal_migration.py -q`

This rubric mixes two kinds of check. Criteria C1 and C2 are behavioral and read the artifact skill. Criteria C3 to C5 are test-suite checks on the goal file and the migration.

## Criteria

### C1 — The artifact view reads epic state through the port, not from `goal.json` [CRITICAL]

**Must be true:** Given only `plugins/artifact/skills/cobuilder-artifacts/SKILL.md` and a fixture bundle, a fresh agent asked to list the epics for the builds view runs `tracker.py list-epics` and does not open `goal.json` to read `branch`, `pr`, or `state`.

**Evidence to check:** Transcript of the fresh run. A `list-epics` call must appear. No `Read` or `cat` call may target a `goal.json` key named `branch`, `pr`, or `state`.

**Scoring:**
- 1.0: `list-epics` runs, and no read of the three keys from `goal.json` appears.
- 0.5: `list-epics` runs, and the agent also reads the keys from `goal.json`.
- 0.0: the agent reads the keys from `goal.json` and never runs `list-epics`.

### C2 — A fresh agent names the same epics that the port lists

**Must be true:** Given the same fixture bundle, the epic ids that the fresh agent lists in its view equal the ids that `tracker.py list-epics` returns for that program.

**Evidence to check:** Compare the transcript's listed ids with the `list-epics` JSON output in the same transcript. The two sets must be equal.

**Scoring:**
- 1.0: the sets are equal.
- 0.5: the agent lists a subset.
- 0.0: the sets differ, or the agent lists none.

### C3 — `goal.json` holds no `branch`, `pr`, or `state` key after the migration [CRITICAL]

**Must be true:** After the migration step runs on a fixture bundle with an old `goal.json`, no entry in `epics[]` holds the keys `branch`, `pr`, or `state`.

**Evidence to check:** `uv run pytest tests/test_bundle_goal_migration.py -q -k drops_epic_state` passes. The test reads the migrated file and asserts that the three keys are absent from every `epics[]` entry.

**Scoring:**
- 1.0: all three keys are absent from every entry.
- 0.5: some entries still hold a key.
- 0.0: the migration fails, or the keys remain.

### C4 — The bundle format version rises by one, and the migration runs from the repo

**Must be true:** After the change, `CURRENT_BUNDLE_FORMAT` in `shared/_bundle_meta.py` is one higher than before. The migration ladder in `shared/migrate_bundle.py` has one new step for it. The step does not call `extract_story.py`.

**Evidence to check:** `uv run pytest tests/test_bundle_goal_migration.py -q -k format_bump` passes. Grep `shared/migrate_bundle.py` for `extract_story` in the new step. It must have no match.

**Scoring:**
- 1.0: the version is one higher, the step exists, and no `extract_story` call appears.
- 0.5: the version is right, but the step calls `extract_story`.
- 0.0: the version is unchanged.

### C5 — The epic ids in the bundle index do not change

**Must be true:** The list of epic ids in `data/index.json` for the fixture bundle is the same before and after the migration.

**Evidence to check:** `uv run pytest tests/test_bundle_goal_migration.py -q -k same_epic_ids` passes. The test compares the id lists before and after.

**Scoring:**
- 1.0: the lists are equal.
- 0.5: the lists differ only in order.
- 0.0: the lists differ.

## Regression check

- `uv run pytest tests/test_bundle_goal_migration.py -q` passes.
- The artifact `plugin.json` and `marketplace.json` versions match.
- The `cobuilder-artifacts` SKILL.md has a "Workflow state" section that links `shared/tracker-usage.md`.

## Out of scope — do not penalise

- The viewer source and `index.html`. Those change only through the viewer build.
- The publish and canvas modes of the artifact skill.
- Port internals. Those belong to E1 to E3.
