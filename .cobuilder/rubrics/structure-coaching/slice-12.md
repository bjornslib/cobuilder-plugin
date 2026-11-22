# Rubric: Slice 12 — The vocabulary leads

Feature: structure-coaching
Epic: E4
Slice goal: see row 12 of docs/plans/structure-coaching/04-slices.md
Test command: uv run pytest tests -q

## Criteria

### C1 — The glossary index [CRITICAL]
**Must be true:** `glossary_index` reads a synthetic glossary and gives each term, its context, and each `_Avoid_` word with the reason text of its entry.
**Evidence to check:**
- Run the unit tests for structure_vocabulary.py, or call the function on a synthetic glossary.
**Scoring:**
- 1.0 — all fields right
- 0.5 — one field wrong
- 0.0 — no index

### C2 — The leads in the packet [CRITICAL]
**Must be true:** A slice that adds a file whose name holds an avoided word gives an `avoid_candidates` entry with the entry, the reason, and `also_defined`. A name with a glossary term of another context gives `cross_context: true`.
**Evidence to check:**
- Run the script on a fixture repo with a synthetic glossary and read `evidence.vocabulary`.
**Scoring:**
- 1.0 — both hold
- 0.5 — one holds
- 0.0 — neither

### C3 — No glossary
**Must be true:** A repo with no DDD-VOCABULARY.md gives empty leads and a `not_analysed` line.
**Evidence to check:**
- Run the script on a fixture repo with no glossary.
**Scoring:**
- 1.0 — holds
- 0.5 — the line is missing
- 0.0 — the script fails

### C4 — The vocabulary agent judges the leads [CRITICAL]
**Must be true:** A blind vocabulary agent gets the packet path in its spawn message, reads the whole glossary, and tags AVOID only for a name that means the concept of the entry. It does not tag a lead whose word is another defined term used in that sense.
**Evidence to check:**
- Read the blind-pass transcript and the Vocabulary block. The fixture holds one true lead and one false lead.
**Scoring:**
- 1.0 — the true lead tagged, the false lead not tagged
- 0.5 — both tagged or both untagged
- 0.0 — the packet not read

### C5 — The coach shows no avoided word
**Must be true:** No coach message template or coach code path names an `_Avoid_` lead.
**Evidence to check:**
- Read shared/structure-messages.json and structure_runner.py.
**Scoring:**
- 1.0 — none
- 0.5 — —
- 0.0 — a lead reaches the coach

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope in the epic design must remain unchanged.

## Out of scope — do not penalise
- VALIDATE judgments of names, which belong to the vocabulary agent
