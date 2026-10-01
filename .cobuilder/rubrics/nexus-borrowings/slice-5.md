# Rubric: Slice 5 — contracts.md becomes a stage-5 artifact with a stated skip rule

Feature: nexus-borrowings
Epic: nexus-borrowings/E3
Slice goal: `design-mode.md` §5 carries the authoring + show-before-write rule and the skip rule; `build/SKILL.md` Gate 2/3 grounds in `contracts.md` when a design record exists.
Test command: `uv run --with pytest pytest tests/ -q`

Sources: `04-slices.md` row 5, `epic-E3-design.md`, ADR-0036.

## Criteria

### C1 — Stage-5 authoring rule with sections and skip rule [CRITICAL]
**Must be true:** `design-mode.md` stage 5 names `contracts.md`, its `## Endpoints` and `## Data models` sections, the show-before-write rule, the prediction marking, and the stated-skip rule for designs touching no public surface (a reason, Gate 2b style — never silence).
**Evidence to check:** read the stage-5 block; all four parts present.
**Scoring:** 1.0 all; 0.5 missing the skip rule; 0.0 otherwise.

### C2 — Implement grounding [IMPORTANT]
**Must be true:** `build/SKILL.md`'s Gate 2 and Gate 3 prose says, when a design record exists, ground in its `contracts.md` as well as `intent.json`; no gate lines change shape.
**Evidence to check:** grep the grounding lines; the surrounding gate prose is unchanged.
**Scoring:** 1.0; 0.5 mentioned only at one gate; 0.0 absent.