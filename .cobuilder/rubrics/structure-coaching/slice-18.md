# Rubric: Slice 18 — No duplicate vocabulary leads

Feature: structure-coaching
Epic: E9
Slice goal: see row 18 of docs/plans/structure-coaching/04-slices.md
Test command: uv run pytest tests -q

## Criteria

### C1 — One lead for each name [CRITICAL]
**Must be true:** A slice with `issue_invoice.py` that defines `issue_invoice` gives one entry for that name in `avoid_candidates` and in `defined_terms_used`, and one `invoice` in `new_tokens`.
**Evidence to check:**
- Run the new test, or run structure_evidence.py on a scratch repo.
**Scoring:**
- 1.0 — one entry in each list
- 0.0 — a duplicate remains

### C2 — No lost lead [CRITICAL]
**Must be true:** Two different names that hold one word still give two leads.
**Evidence to check:**
- Run the tests for slice 12 and slice 18.
**Scoring:**
- 1.0 — both leads
- 0.0 — a lead is lost
