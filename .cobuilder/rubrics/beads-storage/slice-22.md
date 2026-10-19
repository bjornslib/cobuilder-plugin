Kind: test-suite

# Rubric: Slice 22 — E5 slice-loop formula on beads

Feature: beads-storage
Epic: beads-storage/E5
Slice goal: The slice loop is a TOML formula at `shared/tracker_port/formulas/slice-loop.toml`. It holds the red, green, and validate steps. A failed attempt adds a wisp. Squash keeps the children with `--keep-children`.
Test command: `uv run pytest tests/test_tracker_beads_formula.py -q`

The file `tests/test_tracker_beads_formula.py` is created by this slice. The command runs once the slice exists. The test skips without `bd`. A skip counts as no evidence for C1 and C2. This slice depends on E4 slice 13.

## Criteria

### C1 — The formula cooks and pours with three steps in order [CRITICAL]

**Must be true:** `shared/tracker_port/formulas/slice-loop.toml` holds three steps in this order: red, green, validate. `bd` cooks the formula and pours it into a test database.

**Evidence to check:** Run the formula test with `bd` on the path. Read the test body. It must cook and pour the file, then assert the three step names in order.

**Scoring:**
- 1.0: the test runs with `bd`, passes, and asserts three steps in order.
- 0.5: the test runs, but it does not assert the order.
- 0.0: the test skips with no transcript, fails, or does not exist.

### C2 — A failed attempt adds a wisp, and squash keeps the children [CRITICAL]

**Must be true:** A failed attempt creates a wisp under the slice. Squash runs with `--keep-children`, so the open wisp children survive. The design records that squash deletes open children without this flag.

**Evidence to check:** Read the test for the failed attempt and the squash argv. The test must assert that a wisp exists after the failed attempt. The squash argv must contain `--keep-children`.

**Scoring:**
- 1.0: both assertions appear, and the test passes with `bd`.
- 0.5: the wisp is asserted, but the squash argv is not.
- 0.0: squash runs without `--keep-children`, or no wisp test exists.

### C3 — `slice-loop.md` points to the formula, with no copy of the steps

**Must be true:** `plugins/implement/skills/build/references/slice-loop.md` names the formula path once. The file does not repeat the red, green, and validate steps as a second copy.

**Evidence to check:** Count the occurrences of `slice-loop.toml` in `slice-loop.md`. Read the file for any duplicate step list.

**Scoring:**
- 1.0: one pointer, and no duplicate step list.
- 0.5: one pointer, but a partial copy of the steps remains.
- 0.0: no pointer, or a full copy of the steps.

## Regression check

- `uv run pytest tests/test_tracker_beads.py -q` passes.
- The implement plugin version in `plugin.json` and `marketplace.json` matches, if this slice changes the plugin.

## Out of scope — do not penalise

- The claim, ready, and gate work. Those belong to slices 19 to 21.
- Live GREEN and RED agent runs. The formula test checks the file and the commands only.
- Wording of the formula step descriptions.
