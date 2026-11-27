# Rubric: Slice 17 — The scripted loop gives VALIDATE a slice base

Feature: structure-coaching
Epic: E9
Slice goal: see row 17 of docs/plans/structure-coaching/04-slices.md
Test command: uv run pytest tests -q

## Criteria

### C1 — RED reports the slice base [CRITICAL]
**Must be true:** `RED_SCHEMA` holds `sliceBase`, and the RED prompt asks for `git rev-parse HEAD` before RED writes a file.
**Evidence to check:**
- Read slice-loop.js.
- Run the slice 17 tests.
**Scoring:**
- 1.0 — both
- 0.0 — no base

### C2 — GREEN commits each attempt [CRITICAL]
**Must be true:** The GREEN prompt in `slice-loop.js` ends each attempt with a commit of the slice files on the feature branch.
**Evidence to check:**
- Read the GREEN prompt.
- Run the tests that read the prompt.
**Scoring:**
- 1.0 — a commit step that names the slice and the attempt
- 0.0 — no commit step

### C3 — VALIDATE and the vocabulary agent get the packet values [CRITICAL]
**Must be true:** Both prompts name the evidence script, `--base` with the base from RED, and `--out` with the packet path.
**Evidence to check:**
- Run the test with a fake agent() that captures the prompts.
**Scoring:**
- 1.0 — both prompts hold the three values
- 0.5 — one prompt lacks a value
- 0.0 — neither

### C4 — A second slice gives its own packet [CRITICAL]
**Must be true:** In a scratch run of two slices, the packet of slice 2 holds no file of slice 1.
**Evidence to check:**
- Read the scratch-run evidence.
**Scoring:**
- 1.0 — only slice 2 files
- 0.0 — slice 1 files appear, or no run

### C5 — The loop text matches
**Must be true:** The scripted-mode paragraph of `slice-loop.md` no longer names the missing packet as a limit, and it names the commit step.
**Evidence to check:**
- Read the paragraph.
**Scoring:**
- 1.0 — it matches
- 0.0 — it still names the old limit
