# Rubric: Slice 4 — Stage 6 spawns the validate-and-re-explore reviewer

Feature: nexus-borrowings
Epic: nexus-borrowings/E2
Slice goal: `design-mode.md` §6 holds the spawn block. Behavioral rubric (Gate 4c special case).
Test command: `uv run --with pytest pytest tests/ -q` (static prose checks) + a blind transcript review.

Sources: `04-slices.md` row 4, `epic-E2-design.md`, ADR-0036, ADR-0005, ADR-0035.

## Criteria

### C1 — Blind rubric precedes the draft [CRITICAL]
**Must be true:** A transcript of design mode reaching stage 6 shows the reviewer reads `goal.json` and `intent.json` and states a rubric before opening the ADR draft, the diagrams, or the runtime SVG.
**Evidence to check (blind transcript):** the order of Read actions and the rubric's provenance.
**Scoring:** 1.0 rubric stated before any draft read; 0.0 draft read first.

### C2 — Both passes present; findings are cited predictions [CRITICAL]
**Must be true:** The reviewer's result contains (a) rubric-scored findings, each with a citation (ADR id, district, or boundary rule) and `kind: "prediction"`, and (b) at least one re-explore survivor or an argued none-found.
**Evidence to check (blind transcript):** both sections present; citation on every finding.
**Scoring:** 1.0 both; 0.5 one pass; 0.0 neither.

### C3 — The reviewer never writes intent, and survivors route through stage 4 [CRITICAL]
**Must be true:** The transcript shows no Write/Edit to `intent.json` by the reviewer path; an endorsed survivor, if any, is handed to the engineer for the stage-4 record.
**Evidence to check (blind transcript + tool log):** no write call from the reviewer; the routing line appears in the prose.
**Scoring:** 1.0; 0.0 any direct intent write.

### C4 — Spawn discipline and flag [CRITICAL]
**Must be true:** The spawn carries model `glm-5.3-flash:cloud` (or states the fallback when the harness cannot resolve it); the session-spawn is the dual-path form (no new agent file shipped); `goal.min_work.draft_review_run` flips true only on a returned round. The static prose in `design-mode.md` §6 states all of this.
**Evidence to check:** grep of the spawn block; no new files under any `plugins/*/agents/`; goal.json updated.
**Scoring:** 1.0 all; 0.5 missing flag or model line; 0.0 otherwise.