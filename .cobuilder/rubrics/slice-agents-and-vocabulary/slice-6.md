# Rubric: Slice 6 — E4 tracer bullet: the glossary file and its format

Feature: slice-agents-and-vocabulary
Epic: E4
Slice goal: `DDD-VOCABULARY.md` exists at the root with every canvas term, and each canvas links to it.
Test command: uv run --with pytest --with requests --with pyyaml --with pillow pytest tests/ -q

## Criteria

### C1 — the file and its header [CRITICAL]
**Must be true:** `DDD-VOCABULARY.md` exists at the repository root. Its header states its purpose in two sentences and a "How to use" list: one name per concept, one owning context per term, add a term when it is resolved, rejected synonyms under `_Avoid_`. It credits the glossary format to Matt Pocock's `domain-modeling` skill.
**Evidence to check:** read the file.
**Scoring:** 1.0 all. 0.5 one missing. 0.0 no file.

### C2 — every entry has the entry shape [CRITICAL]
**Must be true:** Every entry is `**Term** (\`context-id\`):` then one or two definition sentences, then an optional `_Avoid_:` line. Entries sit under a `## <context>` or `## Cross-cutting` heading. A test parses every entry and fails on a malformed one.
**Evidence to check:** the test and a read.
**Scoring:** 1.0 all parse and the test is strict. 0.5 the test is loose. 0.0 no test.

### C3 — canvas terms are covered and linked
**Must be true:** Every term in the "Ubiquitous language" table of every `docs/architecture/contexts/*/canvas.md` has an entry. Each canvas term cell links to `DDD-VOCABULARY.md`. The canvas template shows the link form. The test reads the canvases, not a hard-coded list.
**Evidence to check:** the test. Read `canvas-template.md`.
**Scoring:** 1.0 all. 0.5 covered but not linked, or the list is hard-coded. 0.0 terms missing.

## Regression check
- `uv run --with pytest --with requests --with pyyaml --with pillow pytest tests/ -q` shows no new failure. Baseline: 365 passed, 1 pre-existing failure in `test_generate_prompts_webp.py`.
- `uv run plugins/implement/scripts/verify_gate.py --plan docs/plans/interaction-design-gate` still reports `Overall: OK`.

## Out of scope — do not penalise
- The vocabulary agent and design mode (slice 7). The CLAUDE.md table (slice 8).
