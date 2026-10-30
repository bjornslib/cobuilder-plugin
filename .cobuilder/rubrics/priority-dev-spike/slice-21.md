# Rubric: Slice 21 — Every stop reaches Pick and Fill

Feature: priority-dev-spike
Epic: E6
Slice goal: Triage no longer chooses a route. Every stop with a brief runs Pick. Pick may return no step. Each Fill call sees the triage facts and the steps filled before it. Saved programs still load and run.
Test command: `uv run --project priority-dev pytest priority-dev/tests -q`

## Criteria

### C1 — No route by status [CRITICAL]
**Must be true:** for each of the six statuses, with and without an unsure field, a stop with a brief runs Pick. The code-built notify of the done route and its `no_agent_reply` abstain are gone from the source. A done stop gets whatever steps Pick and Fill write. The one-call variant follows the same rule.
**Evidence to check:**
- Run the routing tests with a stub model for each status, chain and combined.
- Grep `module.py` for `done_outcome`, `ANSWER_DUE` used as a route, and `no_agent_reply`.
**Scoring:**
- 1.0 — Pick (or the combined call) runs for all six statuses in both variants, and the old route code is gone.
- 0.5 — the chain is fixed but the combined variant still routes by status, or dead route code remains.
- 0.0 — any status still skips Pick.

### C2 — Pick may return no step [CRITICAL]
**Must be true:** a Pick result of 0 steps gives an Interpretation with the facts and no advice, and no abstain. 1 to 3 steps still work. 4 or more steps still abstain with `invalid_output`. `to_prediction` gives `payloads: []` for the 0-step case, and the metric scores it 1 against a `[]` reference.
**Evidence to check:**
- Run the step-count tests with a stub Pick for 0, 1, 3, and 4 steps.
**Scoring:**
- 1.0 — all four counts behave as stated, and the 0-step case scores 1 against `[]`.
- 0.5 — 0 steps works but the metric path does not reach 1.
- 0.0 — 0 steps abstains, or 4 steps passes.

### C3 — Fill sees the facts and the earlier steps [CRITICAL]
**Must be true:** each Fill call receives the triage facts as JSON and the list of steps already filled in this proposal, in order, as JSON with `session_id`, `author`, `confidence`, and `evidence_quote` removed. The first Fill receives an empty list. The second Fill of a two-step proposal receives exactly the first step's payload.
**Evidence to check:**
- Run the Fill-input tests with a stub model that records each call's inputs.
**Scoring:**
- 1.0 — recorded inputs match for the first, second, and third Fill.
- 0.5 — facts arrive but the earlier steps are missing, wrong in order, or keep code-set fields.
- 0.0 — Fill inputs are unchanged.

### C4 — Saved programs still load and run
**Must be true:** each JSON program committed under `priority-dev/probes/programs/` loads into the new chain, and one stop runs end to end with a stub model, without an exception.
**Evidence to check:**
- Run the load test over every committed program file.
**Scoring:**
- 1.0 — every program loads and runs.
- 0.5 — loads, but one program fails to run.
- 0.0 — a program does not load.

### C5 — A live stop shows the new route
**Must be true:** one live `priority eval` run on stops that the old chain routed as done or continuing shows Pick and Fill rows in `calls.jsonl` for those stops, and the per-stop lines print.
**Evidence to check:**
- Read the call log of the live smoke run.
**Scoring:**
- 1.0 — Pick and Fill rows appear for a done or continuing stop.
- 0.0 — no live evidence.

## Regression check
- All tests that passed before this slice must still pass, except tests that pinned the removed done route or the 1-step minimum.
- No test makes a live model call.
- Files outside `priority-dev/` and `docs/plans/priority-dev-spike/` stay unchanged.

## Out of scope — do not penalise
- The question card, `WriteCard`, and its inputs.
- A switch to `WriteCombined`.
- Reference payloads and the live rescore, which belong to slice 20.
