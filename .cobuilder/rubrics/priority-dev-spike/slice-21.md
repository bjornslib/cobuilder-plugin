# Rubric: Slice 21 — One typed call

Feature: priority-dev-spike
Epic: E6
Slice goal: One predictor, `ProposeStop`, reads the stop brief and returns the status, `needs_human`, 0 to 3 typed steps, and one priority for the whole payload. Schema validation is the only gate. Eval and GEPA score the same prediction object, GEPA tunes one component, and reference demos can seed the prompt. The chain, its routing, and its gates are gone. Design: `priority-dev/probes/program-flow-v2.svg`.
Test command: `uv run --project priority-dev pytest priority-dev/tests -q`

## Criteria

### C1 — One predictor with the designed signature [CRITICAL]
**Must be true:** `Interpreter.named_predictors()` yields exactly one predictor. Its signature has one input, `brief_text`, and the outputs `status` (six literals), `needs_human` (bool), `steps` (a list of at most 3, discriminated on `kind` over the 13 payload models that remain after `set_priority_hint` goes), and `priority` (`P1`, `P2`, `P3`). No step model in the output schema holds `session_id`, `author`, `confidence`, or `evidence_quote`. No card output exists.
**Evidence to check:**
- Run the signature tests. Read `signatures.py` and the output JSON schema that the adapter renders.
**Scoring:**
- 1.0 — one predictor, the exact fields, the union, the cap of 3, and no code-set fields in the schema.
- 0.5 — one predictor, but a field, the cap, or the union differs.
- 0.0 — more than one predictor, or the chain still runs.

### C2 — Schema validation is the only gate [CRITICAL]
**Must be true:** a reply that does not parse, a step with an unknown kind, a step with a missing required field, 4 steps, and a priority outside P1 to P3 each give an abstain with `invalid_output` and an error text that names the fault. That text reaches the metric feedback. `check_steps`, `check_fill_payload`, the routing by status, and `done_outcome` are gone from the source. 0 steps is valid.
**Evidence to check:**
- Run the gate tests with a stub model for each fault.
- Grep `src/priority` for the removed names.
**Scoring:**
- 1.0 — all five faults abstain with named text, 0 steps passes, and the removed names are gone.
- 0.5 — the faults abstain but one text is generic, or one removed name remains.
- 0.0 — a fault passes, or a fault raises.

### C3 — One prediction object for eval and GEPA [CRITICAL]
**Must be true:** `forward` returns a `dspy.Prediction` with `status`, `needs_human`, `priority`, `steps` (dicts with `session_id` and `author` set by code), and `abstain`. The runner and the GEPA metric score that object with no flattening step. The reference is built from the label fields `priority` and `payloads`. The judge is called for every stop. For an abstain it receives the raw reply and the error text. Code pins the score in four cases: an abstain 0, reference steps against no predicted steps 0, a `[]` reference against predicted steps 0, and both empty 1. In every other case the judge's clamped score is final. The feedback holds the pinned-case note, when one applies, followed by the judge's notes.
**Evidence to check:**
- Run the metric and runner tests with a stub model and a stub judge, and record the judge input.
- Grep the scoring path for `to_prediction`.
**Scoring:**
- 1.0 — the same object reaches the metric on both paths, the judge is called for every stop with `{priority, steps}` or the abstain on the predicted side, the four pins hold, and the feedback joins both notes.
- 0.5 — one path still converts the object, or priority does not reach the judge.
- 0.0 — the payload or the priority is lost on either path.

### C4 — GEPA tunes one component, and demos come from references
**Must be true:** the GEPA run has one component, the `propose` predictor, and no `BusyComponentSelector`. A demo option picks up to 4 train stops from the references, prints them by name, gives each its brief and its full reference, and removes those stops from the GEPA valset and the train rescore. No holdout stop becomes a demo.
**Evidence to check:**
- Run the optimise tests on made-up fixtures with a stub GEPA and a stub model.
**Scoring:**
- 1.0 — one component, demos printed, excluded, and train only.
- 0.5 — demos work but a demo stop stays in the valset or the rescore.
- 0.0 — the selector or several components remain, or a holdout stop becomes a demo.

### C5 — `judge-check` probes the priority
**Must be true:** the closed-field probe also makes a copy of each reference with the priority changed, and counts it like the other copies.
**Evidence to check:**
- Run the probe tests and check that the copies differ from the reference in exactly one field.
**Scoring:**
- 1.0 — priority copies exist and count.
- 0.0 — no priority copy.

### C6 — A live stop runs end to end
**Must be true:** one live `priority eval` run on a few referenced stops shows one model call per stop in `calls.jsonl`, the per-stop lines, the judge usage line, and a non-zero judge call count. At least one stop reaches the judge.
**Evidence to check:**
- Read the call log and the output of the live smoke run.
**Scoring:**
- 1.0 — one call per stop and a judged stop.
- 0.0 — no live evidence.

## Regression check
- All tests that passed before this slice must still pass, except tests that pinned the removed chain, its routing, its gates, its predictors, or the chain programs.
- No test makes a live model call.
- Files outside `priority-dev/` and `docs/plans/priority-dev-spike/` stay unchanged.

## Out of scope — do not penalise
- The UI digest of the human ask and the final reply.
- The slice 20 live runs: the agreement bar, the rescore, and the holdout duel.
- A judge model other than Mercury.
