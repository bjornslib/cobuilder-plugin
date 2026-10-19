Kind: behavioral

# Rubric: Slice 18 — E5 spike: claim flags, exit codes, lease expiry

Feature: beads-storage
Epic: beads-storage/E5
Slice goal: The spike records each claim flag set, its exit code, and its lease result, with the command that produced each. The spike changes no adapter flag.
Test command: `uv run pytest tests/test_tracker_beads.py -q` (regression only. The spike has no suite test.)

## Criteria

### C1 — Every flag set has its command, exit code, and transcript [CRITICAL]

**Must be true:** The spike notes in `shared/tracker-adapter-beads.md` list each flag set tried for `bd update --claim` and for `--if-assignee`. Each row gives the command, the observed exit code, and a transcript path.

**Evidence to check:** Read the spike section of `shared/tracker-adapter-beads.md`. For each row, open the transcript path under `tests/fixtures/tracker/beads/transcripts/`. The `--if-assignee` mismatch row must record exit 13.

**Scoring:**
- 1.0: every row has a command, an exit code, and a transcript that exists.
- 0.5: the rows exist, but one row lacks an exit code or a transcript.
- 0.0: no rows, or the exit codes come from the design text with no run behind them.

### C2 — Each lease result is observed or marked unverified [CRITICAL]

**Must be true:** The notes state each lease expiry result as observed or as unverified. The design records that lease expiry is not verified. A result that the spike did not observe must say "unverified" and must give no outcome.

**Evidence to check:** Find the lease section of the spike notes. An observed result cites a command and a transcript. An unobserved result carries the word "unverified".

**Scoring:**
- 1.0: every lease claim cites evidence, or carries the word "unverified".
- 0.5: one lease claim lacks both evidence and the word "unverified".
- 0.0: lease expiry is stated as fact with no evidence.

### C3 — The spike changes no adapter flag

**Must be true:** The slice changes no file under `shared/tracker_port/`. It changes no capability flag and no argv builder in `tests/test_tracker_beads.py`.

**Evidence to check:** List the files this slice changed. Only docs, the spike notes, and fixtures may appear.

**Scoring:**
- 1.0: no adapter, flag, or argv file changed.
- 0.5: a comment-only change under `shared/tracker_port/`.
- 0.0: a capability flag or an argv builder changed.

## Regression check

- `uv run pytest tests/test_tracker_beads.py -q` passes with the same result as before the slice.
- The spike notes name the bd version used. The design records bd 1.3.0.

## Out of scope — do not penalise

- The atomic claim itself. That belongs to slice 19.
- Native ready and the pull request gate. Those belong to slices 20 and 21.
- The formula. That belongs to slice 22.
- Wording of the notes, when the rows carry the evidence.
