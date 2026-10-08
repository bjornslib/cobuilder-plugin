# Rubric: Slice 2 — E2: the review mode Mechanical smells section and its wiring tests

Feature: habit-smells
Epic: E2
Slice goal: `SKILL.md` "### Review Mode" puts a habit-hooks step before the reports. A blind agent given the file runs the script, then writes `## Mechanical smells` into both reports with the classification rules.
Test command: uv run pytest tests -q

This slice edits a file that governs another mode's procedure. Score behavior, not wording. Evidence is a transcript of one fresh subagent.

## Criteria

### C1 — the script runs before the reports [CRITICAL]
**Must be true:** A fresh agent given only `SKILL.md` review mode and a realistic task runs the script through the documented call before it writes either report. The call in its transcript names `habit_smells.py` and passes `--branch` with the branch base.
**Evidence to check:** the blind agent's tool-call transcript, in order.
**Scoring:** 1.0 script first, reports after, `--branch` present. 0.5 script runs with no branch base. 0.0 no script call.

### C2 — both reports carry the section [CRITICAL]
**Must be true:** The transcript shows a `## Mechanical smells` section written into the technical report and into the founder report. The section names the tool as habit-hooks and states the branch base.
**Evidence to check:** the transcripts and the report texts.
**Scoring:** 1.0 both reports name both facts. 0.5 one report, or a fact missing. 0.0 no section.

### C3 — the classification rules hold [CRITICAL]
**Must be true:** A swallowed-exception group starts at P1, citing the harness-security rule. A group with more than 100 findings starts at P1 and reports one count plus the top 10 files, never the full list. Other groups start at P2. The agent may re-classify a group only with evidence, and states it.
**Evidence to check:** the transcript with input that mixes a swallowed-exception group of 3 findings, a duplicated-code group over 100, and a small group.
**Scoring:** 1.0 all three rules and the evidence bar for a re-classify. 0.5 the large group caps but the P1 starts mislabeled. 0.0 no classification.

### C4 — incomplete and unavailable states are shown [CRITICAL]
**Must be true:** When `habit-smells.json` records an incomplete run, the section reports it as a P1 finding that names the tool. When the tool is unavailable, the section states the reason and claims no clean scan.
**Evidence to check:** the transcript with each degraded record.
**Scoring:** 1.0 both. 0.5 one. 0.0 the degraded run reads as clean.

### C5 — the wiring tests and the standard
**Must be true:** `tests/test_habit_smells_integration.py` has cases that fail when `SKILL.md` drops the script call, a P1 rule, the top-10 cap, the incomplete-run rule, or the unavailable rule. Prose passes the writing standard. No `plugins/pr` file mentions habit-hooks, and `commands/review.md` names the step.
**Evidence to check:** run the new tests. Remove one rule in a scratch copy and confirm a test fails. Run `ste-lint.py`.
**Scoring:** 1.0 all. 0.5 tests exist but pass without the prose. 0.0 no tests.

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope must remain unchanged: the script, the gate key, and `commands/maintenance.md`.

## Out of scope — do not penalise
- The maintenance diff and the tags. Slice 3 does that.
- A fix for any finding the section reports.