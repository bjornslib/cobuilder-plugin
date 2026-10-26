Kind: behavioral

# Rubric: Slice 23 — E7 spike notes into the adapter notes

Feature: beads-storage
Epic: beads-storage/E7
Slice goal: The spike notes in `shared/tracker-adapter-beads.md` record each E7 finding with its command, its exit code, and a transcript or `/tmp` evidence path. The notes state bd 1.3.0, and they mark the obsolete E5 sections that ADR-0044 lists. The slice changes no adapter code.
Test command: `uv run pytest tests/test_tracker_beads.py -q` (regression only. The spike has no suite test.)

The slice mirrors slice 18. It changes docs and transcripts only.

## Criteria

### C1 — Every finding has a command, an exit code, and an evidence path [CRITICAL]

**Must be true:** Each finding in the E7 spike section names the exact bd command, the observed exit code, and a path to a transcript under `tests/fixtures/tracker/beads/transcripts/` or to a `/tmp` log (such as `/tmp/e7-spike.md`) with a line range. The areas are: retype, tree and ready, row shape, claim, lifecycle, dependencies, migration run, timing, foreign tasks, defer dates, row limits, and the exact filter `bd list --external-ref <id>` for a known and an unknown ref.

**Evidence to check:** Read the spike section. For each row, open the cited path and compare the exit code and the output with the row. Re-run one command that has a `/tmp` path in a scratch tracker, and compare. The `--external-ref` row must show the rows returned for a known ref and for an unknown ref.

**Scoring:**
- 1.0: every area has a row, every row has a command, an exit code that matches its evidence, and an evidence path that exists.
- 0.5: the rows exist, but one lacks an exit code or a path, or one exit code differs from its evidence.
- 0.0: a finding comes from the design text with no run behind it, or the `--external-ref` filter has no row.

### C2 — A result the spike did not observe is marked unverified [CRITICAL]

**Must be true:** A result that no command produced carries the word `unverified` and states no outcome. This holds for the two-machine claim race, the restore from `bd export`, and any bd version other than 1.3.0.

**Evidence to check:** Find each "Not verified" item. Check that no outcome is stated as fact for it. Check that the notes state the bd version 1.3.0.

**Scoring:**
- 1.0: every unobserved item is marked `unverified` with no outcome, and the version is stated.
- 0.5: one unobserved result is stated with no evidence and no `unverified` mark.
- 0.0: a race, restore, or other-version result is stated as fact with no run behind it.

### C3 — The notes mark the obsolete E5 sections

**Must be true:** The notes mark each obsolete section that ADR-0044 lists under "Obsolete after this ADR" as replaced, with a pointer to ADR-0044. Each section named there exists in the notes and carries the mark.

**Evidence to check:** Read the list in ADR-0044. Search the notes for each named section heading, and check the mark.

**Scoring:**
- 1.0: each listed section that exists in the notes carries the mark and the pointer.
- 0.5: one listed section lacks the mark.
- 0.0: no section is marked.

### C4 — The slice changes no adapter code [CRITICAL]

**Must be true:** The slice changes only docs, spike notes, and transcripts. No file under `shared/tracker_port/` and no capability flag changes.

**Evidence to check:** List the changed files. Only `shared/tracker-adapter-beads.md` and fixtures may appear.

**Scoring:**
- 1.0: no adapter, flag, or argv file changed.
- 0.5: a comment-only change under `shared/tracker_port/`.
- 0.0: a capability flag, an argv builder, or a mapping changed.

## Regression check

- `uv run pytest tests/test_tracker_beads.py -q` passes with the same result as before the slice.
- The notes state the bd version 1.3.0.

## Out of scope — do not penalise

- The type and title mapping. That belongs to slice 24.
- The edges. Those belong to slices 25 and 26.
- Native ready, `claim-next`, and the migration. Those belong to slices 27 to 29.
- Wording of the notes, when the rows carry the evidence.
