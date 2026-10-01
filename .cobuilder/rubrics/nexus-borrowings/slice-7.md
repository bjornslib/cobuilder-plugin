# Rubric: Slice 7 — Options and review surface the check

Feature: nexus-borrowings
Epic: nexus-borrowings/E4
Slice goal: `options-mode.md` stage 1 checks the glossary and the report notes absence; the stage-6 hand-off offers the bootstrap. `SKILL.md` review section reports absence as a `P1` finding and offers the bootstrap at run end. Behavioral rubric (Gate 4c special case).
Test command: `uv run --with pytest pytest tests/ -q` + a blind transcript review.

Sources: `04-slices.md` row 7, `epic-E4-design.md`, ADR-0035, ADR-0036.

## Criteria

### C1 — Options mode checks at stage 1, offers at hand-off, writes nothing else [CRITICAL]
**Must be true:** `options-mode.md` stage 1 gains the glossary existence check; a missing glossary becomes an inquiry note in the report evidence; the stage-6 hand-off offers the bootstrap and writes the glossary only on the engineer's explicit yes — the one declared exception to ADR-0035's write surface, cross-referenced.
**Evidence to check (blind transcript):** a non-interactive run with the glossary absent notes the absence in the report and asks at hand-off; an interactive refusal writes nothing.
**Scoring:** 1.0 check + report note + consented offer; 0.5 offer present but the check or the exception note missing; 0.0 otherwise.

### C2 — Review reports absence as P1 and offers at run end [CRITICAL]
**Must be true:** The review-mode prose states: when `DDD-VOCABULARY.md` is absent, the ubiquitous-language check reports a `P1` finding (template: the generic-names row in `corpus-index.md`), the run's severity flow is unchanged, and the bootstrap is offered after the reports are written.
**Evidence to check:** read `SKILL.md`'s review section; the finding names P1 (not P0/P2) and the offer sits at run end, not mid-run.
**Scoring:** 1.0; 0.5 wrong severity or mid-run write; 0.0 absent.

### C3 — Other modes state presence, change nothing [IMPORTANT]
**Must be true:** The remaining architect modes (maintenance, decisions, describe, debug) gain only a load-if-present / state-the-absence line where they name districts or terms; no mode outside design/options/review writes the glossary.
**Evidence to check:** grep for the notice lines; the write-permission statement appears once, in ADR-0036 and the bootstrap reference.
**Scoring:** 1.0; 0.5 some modes loud, some silent; 0.0 otherwise.