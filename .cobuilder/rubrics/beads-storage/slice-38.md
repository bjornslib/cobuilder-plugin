Kind: behavioral

# Rubric: Slice 38 — E8 live repair, docs, and install

Feature: beads-storage
Epic: beads-storage/E8
Slice goal: The usage guide, the adapter notes, and the install command describe the new operations and the three live steps in order. Each operation a doc names is a subcommand. The live steps ran on this repo with a snapshot first.
Test command: `uv run pytest tests/test_tracker_docs.py tests/test_tracker_usage_doc.py tests/test_install_command.py tests/test_plugin_manifests.py -q`

## Criteria

### C1 — Each operation a doc names is a subcommand [CRITICAL]

**Must be true:** Every `tracker.py` operation that `tracker-usage.md`, `install.md`, and the setup skill name appears in `uv run shared/tracker.py --help`, and this includes `repair-status`. The usage guide has the moments "A design is named" (`set-program-stage <program> backlog --plans-dir <dir>`) and "Records of finished designs are stale" (`repair-status`). It states the strip and its order. The usage examples run and match their output.

**Evidence to check:** Run `tracker.py --help`. Extract the names from the three texts. Run `tests/test_tracker_usage_doc.py`.

**Scoring:**
- 1.0: every name resolves, both moments exist, and the usage test passes.
- 0.5: the names resolve, but a moment row is missing.
- 0.0: a doc names an operation that is not a subcommand.

### C2 — The install order is snapshot, repair, strip [CRITICAL]

**Must be true:** `install.md` says that an existing tracker needs three steps in this order: a snapshot, then `repair-status --dry-run` and `repair-status`, then `strip_goal_stage.py --dry-run` and `strip_goal_stage.py`. The docs name no bd command outside the adapter notes (`tests/test_tracker_docs.py`). The word "consent" does not appear before a `--dry-run` step.

**Evidence to check:** Read the three steps in `install.md` and the setup skill. Run the install and docs tests.

**Scoring:**
- 1.0: the order is right and the tests pass.
- 0.5: the order is right, but the setup skill is missing a step.
- 0.0: a step is missing, or the strip runs before the repair.

### C3 — The live run left the tracker in the stated state [CRITICAL]

**Must be true:** The engineer ran, on this repo: a snapshot (`bd export` to a file outside the repo), `repair-status --dry-run`, `repair-status`, `sync`, an index rebuild, `strip_goal_stage.py --dry-run`, `strip_goal_stage.py`, and a second rebuild. After the first rebuild, no design shows a `stage drift` warning, and each `stage_source` reads `tracker`. After the strip, the stage of each design equals its stage before the strip, apart from stages the engineer changed.

**Evidence to check:** Read the snapshot file name, the dry-run list, and `data/index.json` (`design.stage_source` for each design). Run `uv run shared/tracker.py repair-status --dry-run ...` again and read an empty `changes`.

**Scoring:**
- 1.0: the snapshot exists, the second dry run is empty, and every `stage_source` is `tracker`.
- 0.5: the repair ran, but a design still shows a drift warning.
- 0.0: no snapshot, or a live design was closed.

### C4 — Plugin versions rise together

**Must be true:** The version of each changed plugin rises in `plugin.json` and in `marketplace.json`, and the two match.

**Evidence to check:** Run `tests/test_plugin_manifests.py`. Compare the versions with the base.

**Scoring:**
- 1.0: the versions rose and match.
- 0.0: a changed plugin keeps its version, or the two files differ.

## Regression check

- `uv run shared/build_index.py` exits 0. Another session's untracked folders may need to be set aside first.
- `ste-lint.py` scores each changed doc no worse than its base.

## Out of scope — do not penalise

- The code of the repair and the strip. Slices 34 and 37 own it.
- The same live steps on think-with-ai. The engineer runs them there.
