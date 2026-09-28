# Rubric: Slice 8 — E4 move: the CLAUDE.md table goes to the glossary

Feature: slice-agents-and-vocabulary
Epic: E4
Slice goal: The `CLAUDE.md` Vocabulary table moves into `DDD-VOCABULARY.md`, and `CLAUDE.md` keeps a pointer.
Test command: uv run --with pytest --with requests --with pyyaml --with pillow pytest tests/ -q

## Criteria

### C1 — no term lost [CRITICAL]
**Must be true:** Every bold term in the Vocabulary table of `CLAUDE.md` before this slice (`git show <commit before slice 8>:CLAUDE.md`) has an entry in `DDD-VOCABULARY.md`. Each "Not to confuse with" note survives as an `_Avoid_` item for a synonym or as a homonym note for a collision.
**Evidence to check:** compare the old table row by row against the glossary.
**Scoring:** 1.0 nothing lost. 0.5 a note lost. 0.0 a term lost.

### C2 — CLAUDE.md points, not copies [CRITICAL]
**Must be true:** `CLAUDE.md` has no `| Term | Meaning |` table. The Vocabulary section links to `DDD-VOCABULARY.md` and keeps the rule to resolve a collision in the glossary before it ships. The "A superseded gazetteer" subsection now names `DDD-VOCABULARY.md` as the source of truth.
**Evidence to check:** read `CLAUDE.md`. A test asserts the table is absent and the link present.
**Scoring:** 1.0 all. 0.5 a stale reference. 0.0 the table remains.

### C3 — the glossary still parses
**Must be true:** Slice 6's format test still passes with the new entries.
**Evidence to check:** run the suite.
**Scoring:** 1.0 pass. 0.0 fail.

## Regression check
- `uv run --with pytest --with requests --with pyyaml --with pillow pytest tests/ -q` shows no new failure. Baseline: 365 passed, 1 pre-existing failure in `test_generate_prompts_webp.py`.
- `uv run plugins/implement/scripts/verify_gate.py --plan docs/plans/interaction-design-gate` still reports `Overall: OK`.

## Out of scope — do not penalise
- Wording changes to terms beyond the move, unless a term was lost.
