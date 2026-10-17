Kind: behavioral

# Rubric: Slice 13 — Implement writes slice state

Feature: beads-storage
Epic: beads-storage/E4
Slice goal: A fixture slice run writes its claim, attempts, score, and state through `tracker.py`, and the status file shows the new score.
Test command: `uv run pytest tests/test_implement_tracker_state.py -q`

## Criteria

### C1 — The build loop records the score through the CLI, not by hand [CRITICAL]

**Must be true:** Given only `plugins/implement/skills/build/references/slice-loop.md` and a fixture slice that passes with score 0.93, a fresh agent runs `tracker.py set-slice-state` for that slice and never edits the score line of `00-status.md` by hand.

**Evidence to check:** Transcript of the fresh run. Find the first Bash call that mentions `00-status.md`. It must come after the `set-slice-state` call, or it must be a read. No `Edit` or `Write` call targets `00-status.md` score lines.

**Scoring:**
- 1.0: the CLI call comes first, and no hand write to `00-status.md` appears.
- 0.5: the CLI call runs, but the agent also writes the score by hand.
- 0.0: the agent writes the score by hand and never runs the CLI.

### C2 — The claim goes through `claim-slice` before any attempt is recorded

**Must be true:** Given the build skill and the slice loop, a fresh agent starting slice 13 runs `tracker.py claim-slice` with its claimant login before it runs `tracker.py record-attempt`.

**Evidence to check:** Transcript order of the two commands. `claim-slice` must appear at a lower position than the first `record-attempt`, and the claimant argument must be non-empty.

**Scoring:**
- 1.0: `claim-slice` runs first, with a claimant argument.
- 0.5: `claim-slice` runs, but after the first attempt is recorded.
- 0.0: no `claim-slice` call appears.

### C3 — A failed attempt goes through `record-attempt`, and the loop stops at the limit through `escalate`

**Must be true:** Given a fixture slice whose first attempt scores 0.70, a fresh agent records the attempt with `tracker.py record-attempt` and then retries. After the third failed attempt, the agent runs `tracker.py escalate` and does not run a fourth attempt.

**Evidence to check:** Transcript of the fresh run. Count the `record-attempt` calls and the `escalate` call. There must be exactly three `record-attempt` calls, one `escalate` call, and no GREEN spawn after the escalate call.

**Scoring:**
- 1.0: three records, one escalate, and no further attempt.
- 0.5: the records and escalate run, but one extra attempt follows the escalate.
- 0.0: no `escalate` call, or the agent writes `## Escalated` by hand.

### C4 — The status file shows the new score after regeneration

**Must be true:** After the fresh run, `tracker.py regenerate-status-files` runs for the fixture program. The regenerated `00-status.md` shows score 0.93 for the fixture slice.

**Evidence to check:** `uv run pytest tests/test_implement_tracker_state.py -q -k status_shows_score` passes. Read the regenerated file and find the fixture slice line. It must show `0.93`.

**Scoring:**
- 1.0: the regenerated file shows 0.93 for the slice.
- 0.5: the file regenerates but shows a stale score.
- 0.0: the file does not change, or the regenerate call is missing.

## Regression check

- `uv run pytest tests/test_implement_tracker_state.py -q` passes.
- `plugins/implement/commands/start.md`, `install.md`, and `debug.md` make no hand write to state files. A fresh agent given `start.md` runs only CLI calls for state.
- The implement `plugin.json` and `marketplace.json` versions match.

## Out of scope — do not penalise

- Port internals, the beads adapter, and the projector. Those belong to E1 to E3.
- Atomic claim on the beads adapter. Slice 13 tests the fake adapter only.
- Wording of the procedure text. Judge the transcript, not the prose.
