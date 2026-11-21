# Rubric: Slice 16 — One name for each review mode

Feature: structure-coaching
Epic: E9
Slice goal: see row 16 of docs/plans/structure-coaching/04-slices.md
Test command: uv run pytest tests -q

## Criteria

### C1 — Two qualified glossary entries [CRITICAL]
**Must be true:** `DDD-VOCABULARY.md` holds one entry for the `/architect:review` audit and one for the `/pr:review` narration. Each names the other in its avoid list, and the glossary tests pass.
**Evidence to check:**
- Read the glossary.
- Run the glossary tests.
**Scoring:**
- 1.0 — both entries, cross-referenced, tests pass
- 0.5 — one entry is missing its cross-reference
- 0.0 — the collision remains

### C2 — The architect prose uses the audit name [CRITICAL]
**Must be true:** No architect skill or reference, and no structure entry of the glossary, calls the audit by the narration name.
**Evidence to check:**
- grep the architect plugin and the glossary for 'review mode' and read each hit.
**Scoring:**
- 1.0 — no hit means the narration
- 0.0 — a hit still calls the audit by the narration name

### C3 — No other change
**Must be true:** The slice changes names only, and no procedure step changes.
**Evidence to check:**
- Read the diff.
**Scoring:**
- 1.0 — names only
- 0.0 — a step changed
