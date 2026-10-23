Kind: behavioral

# Rubric: Slice 18 — E5 spike: claim flags, exit codes, lease expiry

Feature: beads-storage
Epic: beads-storage/E5
Slice goal: The spike records each claim flag set, its exit code, and its lease result, with the command that produced each. The spike changes no adapter flag. The slice changes only docs and transcripts.
Test command: `uv run pytest tests/test_tracker_beads.py -q` (regression only. The spike has no suite test.)

## Criteria

### C1 — Every flag set has its command, exit code, and transcript [CRITICAL]

**Must be true:** The spike notes in `shared/tracker-adapter-beads.md` list each flag set tried for `bd update --claim` and for `--if-assignee`. Each row gives the command, the observed exit code, and a transcript path. The row for `--claim` with `--if-assignee` records what the spike observed: bd refuses the two flags together and exits 1, not 13. Exit 13 appears only on rows for a guarded plain update.

**Evidence to check:** Read the spike section of `shared/tracker-adapter-beads.md`. For each row, open the transcript path under `tests/fixtures/tracker/beads/transcripts/`. Compare the exit code in the row with the exit code in the transcript. The `--claim --if-assignee` row must show exit 1. A row with exit 13 must use `--status` and `--assignee` with `--if-assignee`, and no `--claim`.

**Scoring:**
- 1.0: every row has a command, an exit code that matches its transcript, and a transcript that exists.
- 0.5: the rows exist, but one row lacks an exit code or a transcript, or one exit code differs from its transcript.
- 0.0: no rows, or the exit codes come from the design text with no run behind them (for example, a row that gives exit 13 for `--claim --if-assignee`).

### C2 — Each lease result is observed, with a transcript [CRITICAL]

**Must be true:** The notes state each lease result as observed, with the command and a transcript. The results are: the lease lasts 5 minutes, an expired lease alone does not free a claim, and `bd reclaim` frees it. A result that the spike did not observe must say "unverified" and must give no outcome.

**Evidence to check:** Find the lease rows and the Findings in the spike notes. Each lease claim cites a command and a transcript (`claim-lease-reclaim.json`, `claim-lease-expiry.json`). Open the transcripts. The claim attempt after the lease expiry must exit 1. The `bd reclaim` step must leave the issue open with no assignee. Any claim without a transcript must carry the word "unverified".

**Scoring:**
- 1.0: every lease claim cites a transcript that supports it, or carries the word "unverified".
- 0.5: one lease claim lacks both a transcript and the word "unverified".
- 0.0: a lease result is stated as fact with no transcript behind it.

### C3 — The spike changes no adapter flag

**Must be true:** The slice changes only docs, the spike notes, and transcripts. It changes no file under `shared/tracker_port/`. It changes no capability flag and no argv builder.

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
