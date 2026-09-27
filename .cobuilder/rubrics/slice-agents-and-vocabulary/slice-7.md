# Rubric: Slice 7 — E4 real content: the vocabulary agent and design mode

Feature: slice-agents-and-vocabulary
Epic: E4
Slice goal: `implement:vocabulary` runs beside VALIDATE in both loop paths, and design mode reads and writes the glossary.
Test command: uv run --with pytest --with requests --with pyyaml --with pillow pytest tests/ -q

## Criteria

### C1 — the agent definition [CRITICAL]
**Must be true:** `plugins/implement/agents/vocabulary.md` parses, has `name: vocabulary`, no `model` key, no ignored field, and no Edit tool. Its body checks district, directory, file, class, function, and method names and changed prose against `DDD-VOCABULARY.md`. It uses the tags `[AVOID]`, `[UNDEFINED]`, `[CONFLICT]`. It appends a `### Vocabulary` section with `CLEAN` or `FINDINGS` to the slice evidence file. It does not score and does not edit code.
**Evidence to check:** read the file and the test.
**Scoring:** 1.0 all. 0.5 one missing. 0.0 the agent scores or edits code.

### C2 — both loop paths run it beside VALIDATE [CRITICAL]
**Must be true:** `slice-loop.md` spawns `implement:vocabulary` in parallel with VALIDATE and states that its verdict is a separate axis, not part of the score, routed through the gap tree. `slice-loop.js` runs both in `parallel()` with `agentType: 'implement:vocabulary'` and reports the vocabulary verdict in the slice result.
**Evidence to check:** read both files.
**Scoring:** 1.0 both. 0.5 one. 0.0 neither.

### C3 — design mode reads and writes the glossary [CRITICAL]
**Must be true:** `design-mode.md` stage 1 (§4) loads `DDD-VOCABULARY.md` next to the districts. Stage 5 (§9) adds each resolved term in the entry shape and asks the engineer about a term that conflicts with an entry. The stage count and the five-topic interview cap do not change.
**Evidence to check:** read §4 and §9.
**Scoring:** 1.0 both. 0.5 one. 0.0 neither.

### C4 — a blind agent flags a seeded term (behavioural)
**Must be true:** A fresh subagent given only `agents/vocabulary.md`, `DDD-VOCABULARY.md`, and a small diff that names a class with a word from an `_Avoid_` list reports an `[AVOID]` finding that names the entry.
**Evidence to check:** the orchestrator's blind-pass record in the evidence file.
**Scoring:** 1.0 flagged with the entry. 0.5 flagged without the entry. 0.0 missed.

## Regression check
- `uv run --with pytest --with requests --with pyyaml --with pillow pytest tests/ -q` shows no new failure. Baseline: 365 passed, 1 pre-existing failure in `test_generate_prompts_webp.py`.
- `uv run plugins/implement/scripts/verify_gate.py --plan docs/plans/interaction-design-gate` still reports `Overall: OK`.

## Out of scope — do not penalise
- Moving the CLAUDE.md table (slice 8).
