# Rubric: Slice 4 — renames inside today's single plugin

Feature: cobuilder-family
Epic: plugin-split/E1
Slice goal: Six architecture modes, `explore-design` deleted, and the pull-request modes rotated.
Test command: `uv run --with pytest pytest tests/ -v`

## Criteria

### C1 — Every command still dispatches to something that exists [CRITICAL]
**Must be true:** Every command file names a skill and a mode the skill actually handles.
**Evidence to check:** The test that reads each command file, extracts the skill and mode, and checks the skill declares it.
**Scoring:** 1.0 — all resolve and the test guards it. 0.5 — all resolve, no test. 0.0 — a command names a mode nothing handles.

### C2 — The duplicate command is gone and its behaviour is not [CRITICAL]
**Must be true:** `explore-design` no longer exists as a user-facing command, and divergent exploration still runs as a stage inside Design mode.
**Evidence to check:** The command file is deleted. Read Design mode's procedure for the exploration stage.
**Scoring:** 1.0 — deleted, and the stage is still named in the procedure. 0.5 — deleted, and the stage reference went with it. 0.0 — still a command.

### C3 — No document claims a count that is now wrong
**Must be true:** Every place that counts the architecture modes says six.
**Evidence to check:** Grep the repo for the mode counts in prose.
**Scoring:** 1.0 — every count correct. 0.5 — one stale count. 0.0 — several.

### C4b — The rename is a rotation and nothing is lost [CRITICAL]
**Must be true:** `submit` becomes `generate`, and the old `generate`, which narrates merged history, becomes `review`. The word `generate` therefore means one thing before the change and a different thing after it. Every procedure, command, and citation ends up pointing at the mode that does the work it describes.
**Evidence to check:** Open the new `generate` and confirm it interviews the author, assesses the change, writes the narrative, and opens the pull request. Open the new `review` and confirm it narrates merged history. Grep for every mention of both words and check each one against the meaning it now needs.
**Scoring:**
- 1.0 — both modes do the right work and every citation points at the right one.
- 0.5 — the modes are correct and at least one citation still means the old sense of `generate`, which is the exact trap this rotation sets.
- 0.0 — a mode was split, dropped, or renamed to something the plan does not name.

### C4 — A rename does not silently change behaviour
**Must be true:** A renamed mode does the same work it did before, and any behaviour change is deliberate and written down.
**Evidence to check:** Diff each renamed procedure against its previous version.
**Scoring:** 1.0 — renames only, or a change recorded in the plan. 0.5 — an undocumented small change. 0.0 — a behaviour change nobody recorded.

## Regression check
- The repo is still one plugin at the end of this slice.
- No path in `scripts/` changes.

## Out of scope — do not penalise
- The 33 cross-pillar references. That is slice 5.
- Any directory split.
