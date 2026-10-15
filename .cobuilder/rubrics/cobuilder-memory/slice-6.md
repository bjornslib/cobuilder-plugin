# Rubric: Slice 6 — The value check in two repos

Feature: cobuilder-memory
Epic: E1
Slice goal: One design question in this repo and one in think-with-ai each get a run, and each run returns a dated record that the main agent uses or rejects with a reason. CLAUDE.md, README.md, and DDD-VOCABULARY.md name six plugins, and ADR-0025's history names ADR-0039.
Test command: `uv run pytest tests -q`

## Criteria

### C1 — Two live runs return judged records [CRITICAL]
**Must be true:** the evidence file holds one run transcript from each repo. Each shows a dated record and the main agent's use or rejection of it with a reason, and the engineer's mark for each run.
**Evidence to check:**
- The slice evidence file.
**Scoring:**
- 1.0 — both runs and both marks are present.
- 0.5 — one run is present.
- 0.0 — no live run.

### C2 — The top-level documents count six plugins
**Must be true:** every place in `CLAUDE.md`, `README.md`, and `DDD-VOCABULARY.md` that states the number of plugins says six, and CLAUDE.md principle 5 states the amended install rule.
**Evidence to check:**
- `grep -n -i "five" CLAUDE.md README.md DDD-VOCABULARY.md` and a read of each hit.
**Scoring:**
- 1.0 — no stale count, and principle 5 is amended.
- 0.0 — a stale count remains.

### C3 — ADR-0025 records the amendment
**Must be true:** ADR-0025's history holds an entry that names ADR-0039 and the amended rule.
**Evidence to check:**
- Read the ADR-0025 frontmatter history; `uv run shared/build_index.py` exits 0.
**Scoring:**
- 1.0 — the entry exists and the index builds.
- 0.0 — no entry.

## Regression check
- All tests pass.

## Out of scope — do not penalise
- The Jev gate (E2) and the call list (E3).
