# Rubric: Slice 6 — The bootstrap reference and the design stage-1 fallback

Feature: nexus-borrowings
Epic: nexus-borrowings/E4
Slice goal: `references/vocabulary-bootstrap.md` exists (districts → grill → write; corpus cites only principles/ddd + scenarios/architecture_ddd; scenarios/ddd is README-only and named as such). `design-mode.md` stage 1 carries the symmetric fallback and the consent flow. Behavioral rubric (Gate 4c special case).
Test command: `uv run --with pytest pytest tests/ -q` + a blind transcript review.

Sources: `04-slices.md` row 6, `epic-E4-design.md`, ADR-0036.

## Criteria

### C1 — The reference holds the full procedure with the corpus limits [CRITICAL]
**Must be true:** `vocabulary-bootstrap.md` states: propose from baseline-verified districts + real symbols; annotate DDD kind from kind-matched `corpus/principles/ddd` cards under the corpus load cap; grill via AskUserQuestion (confirm/rename/reject + the inverted what-would-you-call-this question, `004_ubiquitous_language_naming.yaml` as the bank, `003_bounded_context_splitting.yaml` for scoping); write in the established entry format at the target root (self) or `<bundle-dir>/` (foreign). It states the corpus supplies questions, never terms, and notes `scenarios/ddd/` is README-only.
**Evidence to check:** read the reference; all parts present and the empty-dir note explicit.
**Scoring:** 1.0 all; 0.5 missing the scenarios/ddd note or the foreign-target surface; 0.0 otherwise.

### C2 — Design stage-1 fallback is symmetric to the baseline fallback [CRITICAL]
**Must be true:** `design-mode.md` stage 1 says: when `DDD-VOCABULARY.md` is absent, run the bootstrap (declared to the engineer, like the baseline run), then continue. Glossary terms come from districts and the interview only.
**Evidence to check (blind transcript):** a design run in a repo without the glossary declares the run, proposes grounded candidates, grills, writes once, then proceeds to draft the hypothesis.
**Scoring:** 1.0 declared + grounded + grilled + written; 0.5 runs but silently or proposes corpus-invented terms; 0.0 skips the bootstrap.

### C3 — Consent before any glossary write outside stage 5 [IMPORTANT]
**Must be true:** The reference and the stage-1 prose say the engineer's answers gate each write; a refusal or silence ends the bootstrap without writing.
**Evidence to check (blind transcript):** at least one AskUserQuestion round; no write before answers.
**Scoring:** 1.0; 0.0 any unconditional write.