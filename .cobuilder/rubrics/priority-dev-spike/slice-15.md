# Rubric: Slice 15 — Labelled fixture set

Feature: priority-dev-spike
Epic: E5
Slice goal: `uv run priority fixtures check` passes on 10 real sessions and about 50 stops. Every stop has an engineer-confirmed label. The split is by session. Git ignores the real files.
Test command: `uv run --project priority-dev pytest priority-dev/tests -q`

## Criteria

### C1 — Every stop has a confirmed label [CRITICAL] [CRITICAL]
**Must be true:** each stop in the manifest has a label with `confirmed_by` and `confirmed_on` set to the engineer. An unconfirmed draft is not counted. The check fails when one is missing.
**Evidence to check:**
- Run `priority fixtures check`.
- Delete one confirmation in a copy and run it again.
**Scoring:**
- 1.0 — it passes on the set and fails on the copy
- 0.5 — it passes, but it also passes on the copy
- 0.0 — no check of confirmation

### C2 — The split is by session and has no overlap [CRITICAL] [CRITICAL]
**Must be true:** the manifest lists the train sessions and the held-out sessions. No session is in both. Every stop belongs to the part of its session. The held-out part holds at least 3 sessions.
**Evidence to check:**
- Read the split and recompute the overlap by script.
**Scoring:**
- 1.0 — no overlap, and every stop is assigned
- 0.5 — no overlap, but a stop is unassigned
- 0.0 — a session is in both parts

### C3 — The set is the size and the spread that the epic names
**Must be true:** 10 sessions, from at least 3 projects, with at least 40 labelled stops. At least 4 sessions hold 3 or more labelled stops. The `notify` kind is in use for done stops.
**Evidence to check:**
- Count sessions, stops, and projects from the manifest.
**Scoring:**
- 1.0 — all four counts hold
- 0.5 — one count is short
- 0.0 — two or more are short

### C4 — Real text stays out of Git
**Must be true:** the real sessions, briefs, drafts, and labels are ignored by Git, and no tracked file holds a 60-character string from a real session. `fixtures check` tests the ignore rule.
**Evidence to check:**
- Run `git check-ignore` on each real path.
- Search tracked files for strings from the real briefs.
**Scoring:**
- 1.0 — all ignored and no hit
- 0.5 — ignored, but one tracked file has a hit
- 0.0 — a real file is tracked

### C5 — Ambiguous stops are marked and the draft process is on record
**Must be true:** each label carries an `ambiguous` flag. A short note states how the drafts were made (blind readers) and that the engineer corrected them.
**Evidence to check:**
- Read the manifest and the note.
**Scoring:**
- 1.0 — both present
- 0.5 — one present
- 0.0 — neither

## Regression check
- All tests that passed before this slice must still pass.
- Files outside `priority-dev/` must remain unchanged, except the committed reports named in the slice.

## Out of scope — do not penalise
- Behaviour that belongs to a later slice of the plan.
- The policy, the actuator, the attention queue, and the notifier.
- Real transcript text is private. A report that quotes none of it is correct.
