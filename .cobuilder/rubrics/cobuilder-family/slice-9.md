# Rubric: Slice 9 — the index resolves the joins

Feature: cobuilder-family
Epic: plugin-split/E4
Slice goal: Every join resolves, freshness is recorded, and uncovered districts are listed.
Test command: `uv run --with pytest pytest tests/ -v`

## Criteria

### C1 — A decision reaches its pull request by both paths [CRITICAL]
**Must be true:** A record that names its source pull request resolves directly. A record that does not resolves through its design, its epic, and that epic's branch.
**Evidence to check:** The two tests, plus the resolved join for a real record in this repo.
**Scoring:** 1.0 — both paths work and the result records which one was used. 0.5 — the direct path only. 0.0 — neither resolves, or the indirect one guesses from touched files.

### C2 — An unstarted epic is reported unstarted, not missing [CRITICAL]
**Must be true:** An epic with no branch produces no pull request and no error, and the index says it has not started.
**Evidence to check:** The matching test, against the nine epics in this repo, eight of which have no branch.
**Scoring:** 1.0 — reported as unstarted. 0.5 — silently absent. 0.0 — an error, or a wrong pull request attached.

### C3 — A district reaches a context, and an uncovered one is listed
**Must be true:** A boundary record's declared districts resolve both ways, and every district no context covers appears in the uncovered list.
**Evidence to check:** The two tests, plus the real list for this repo.
**Scoring:** 1.0 — both directions resolve and the uncovered list is correct. 0.5 — one direction. 0.0 — no join.

### C4 — A slice reaches its epic
**Must be true:** Every slice declares an epic and the join resolves.
**Evidence to check:** The test that every slice line names an epic that exists.
**Scoring:** 1.0 — every slice joins. 0.5 — the join exists but a slice is unassigned. 0.0 — no join.

### C4b — No join is resolved by a heuristic [CRITICAL]
**Must be true:** Every join reads an identifier the source states. No join guesses, scores, or matches on prose similarity. When a source is ambiguous, the builder reports the join as unresolved and names the ambiguity.
**Evidence to check:** Read the resolution code for each join. Look for any comparison of words, any similarity score, and any fallback that picks the most likely candidate. Feed the builder a slice whose epic id is bare rather than scoped, and confirm it refuses rather than choosing.
**Scoring:**
- 1.0 — every join reads a stated identifier, and an ambiguous source produces an unresolved join with a named reason.
- 0.5 — the joins resolve correctly today, and one path falls back to a guess when the identifier is missing.
- 0.0 — a join resolves by matching prose.

*Added during the build, on 2026-08-22. The epic-first restructure of `04-slices.md` dropped the scoped epic id and left a bare `E1`, which three designs share. That ambiguity forced the first implementation into a word-overlap match. The source is now fixed to carry the scoped id, and this criterion exists so the guess does not survive the fix.*

### C5 — Staleness is detected on both signals
**Must be true:** Changing an authored document marks the index stale. Moving the git head does too.
**Evidence to check:** The two tests.
**Scoring:** 1.0 — both. 0.5 — one. 0.0 — neither.

## Regression check
- Every entity from slice 8 is still present with the same id.
- The build is still a full rebuild.

## Out of scope — do not penalise
- Rendering any of this. That is slice 10.
