# Epic Technical Solution Design: E8 — Instruction proposer

Feature: priority-dev-spike
Epic ID: E8

## Scope and Intent

Run C3 (7 November 2026) gained on the training stops but not on the test set (C3 − C2 −0.025, interval −0.083 to +0.037). The reflection model rewrote the whole instruction each time, the instruction grew from 4,371 to 10,921 characters, and the dspy base prompt asks it to "include all niche and domain specific factual information". E8 changes what the reflection model reads, so that it edits the instruction in small, general steps, and it shows the reference answer of each stop. Then two arms that differ only in the proposer compare the change on the test set.

E8 changes the instruction proposer and the GEPA feedback. It does not change the task model prompt (arm A), the judge, the references, the metric value, the valset rule, or the test set. The valset fixes (stratified valset, repeated scoring) come in a later epic.

The terms follow `DDD-VOCABULARY.md`: optimiser run, seed program, candidate, trainset, valset, test set, minibatch, mutation, task model, judge, reflection model, arm.

## Files Touched

- `priority-dev/src/priority/gepa_proposer.py` (slice 28: the new base prompt, `GENERAL_RULES` as additional instructions, the skills text, `max_chars`, and the proposer choice)
- `priority-dev/src/priority/proposer_reference.py` (new, slice 28: builds the schema reference for the reflection model from the code)
- `priority-dev/src/priority/structure_diff.py` (new, slice 29: the structural diff of a reference and an output)
- `priority-dev/src/priority/optimise.py` (slice 29: `gepa_feedback` adds the reference and the diff; slice 28: one binding line for the proposer choice)
- `priority-dev/src/priority/cli.py` (slice 28: `optimise --proposer v1|v2`)
- `priority-dev/tests/` (one test file per slice, made-up fixtures and stub models only)
- `priority-dev/probes/proposer-report.md` (slice 31: numbers only)

## Types & Signatures

- Slice 28, proposer choice. `--proposer v1` keeps the E7 proposer unchanged. `--proposer v2` (the default after E8) builds `InstructionProposer(base_instructions=PROPOSER_BASE, additional_instructions=GENERAL_RULES, skills=[proposer_reference()], max_chars=MAX_INSTRUCTION_CHARS)`. The schema guard and the trainset-detail check stay for both. The run prints `proposer: v1` or `proposer: v2`, and each `reflection-NNN.json` records it.
- Slice 28, `PROPOSER_BASE`. It replaces the dspy `ProposeInstruction` text. It tells the reflection model to: keep the current instruction and change only what the examples show is wrong; change a rule only for a failure that shows in 2 or more examples; fix the lowest scores first and keep what scores 1.00; write general rules, never session detail; end with one line that states what changed and why. It drops the dspy sentence about niche facts.
- Slice 28, `proposer_reference() -> str`. Built from the code, not copied from `docs/`: the output fields of `ProposeStop` with their allowed values, each step kind with its payload fields from `interpreter/models.py`, and the priority rule text of the `ProposeStop` docstring, plus the text of `docs/design/dspy-modules.md`. It holds no example from the trainset.
- Slice 28, `MAX_INSTRUCTION_CHARS = 6000`. dspy asks the reflection model once to shorten a longer draft. It never cuts the text. Amended 10 November 2026: the engineer raised the cap to 18000. The cap is in the prompt, so it steers length: D2 proposals were 4,094 to 5,356 characters with no draft over the cap, against 6,538 to 15,271 for D1 with no cap.
- Slice 29, `structure_diff(reference: dict, prediction: object) -> list[str]`. It compares typed values only: `status`, `needs_human`, `priority`; the step kinds in order (missing, extra); for `ask_human` the role, the number of questions, and for each question the number of options, `multi_select`, `free_text`, whether `agent_recommendation` names one option, and the kinds of the helps; `proof.kind` of `continue_until`; `scope` of `approve_permission`; whether each required field is filled. It writes fixed schema values, counts, and yes or no only. It writes `structure: matches` when nothing differs, and `no output: the reply did not parse` for a parse failure.
- Slice 29, feedback. `gepa_feedback` returns `Score: X.XX of 1.00.`, then the judge notes, then `Structure:` with the diff lines, then `Reference:` with the reference `status`, `needs_human`, `priority`, and payloads as JSON. Only `--proposer v2` adds the two blocks; v1 keeps the E7 feedback. So D1 and D2 differ in one thing: what the reflection model reads. The score value does not change. `plain_score` and `priority eval` do not change.

## Slice Decomposition

1. Slice 28, proposer prompt and reference material. Stub models.
2. Slice 29, reference and structural diff in the feedback. Stub models.
3. Slice 30, live smoke run of the v2 proposer. The slice 26 setup (3 low-scoring trainset stops, a valset of 1 session, budget 3), seeded from the C3 seed. It counts the rejected proposals. If more than 1 in 4 proposals is rejected, the engineer decides before slice 31 whether to drop the `Reference:` block and keep the diff only.
4. Slice 31, arms D1 and D2. D1 is the completed C3s run: `--proposer v1`, seed program `probes/programs/seed-armC3-from-C2.json`, seed 7, stratified valset `--val-stops 40`, minibatch 6, budget 5, Muse Wonder as the reflection model. D2 reruns that setup with `--proposer v2`. Then D2, D1, and a same-day arm A run on the 56 test-set stops.

Order: 28, 29, 30, 31. Slices 30 and 31 make live calls and wait for the engineer's go.

## Test Plan

- Slice 28, `tests/test_e8_proposer.py`: with a stub `InstructionProposer`, v2 passes `base_instructions=PROPOSER_BASE`, `additional_instructions=GENERAL_RULES`, one skills text, and `max_chars=6000`; v1 passes only `additional_instructions`. `proposer_reference()` names every output field of `ProposeStop` and every step kind in `ACTION_KINDS`, and holds no option label from a made-up trainset. The run prints the proposer, and the reflection file records it.
- Slice 29, `tests/test_e8_structure_diff.py`: a table of made-up reference and output pairs with their expected diff lines; no text value of the reference payload appears in the diff; `gepa_feedback` holds the score line, the judge notes, `Structure:`, and `Reference:` in that order; `plain_score` is unchanged; with `--proposer v1` the feedback has neither block.
- Slices 30 and 31: live runs. The evidence is the run output, the call logs, the reflection files, and `probes/proposer-report.md`.

## Risks & Open Questions

- The `Reference:` block puts trainset option labels and file names in front of the reflection model. The trainset-detail check may reject more proposals. Slice 30 counts them.
- The valset is small and unlike the test set (`c3-train-val-report.html`). A difference between D1 and D2 smaller than about 0.08 on the test set is within the noise of one run per arm.
- `max_chars` of 6000 may lose rules from a longer instruction. The compress call is told to keep every rule.
- D1 and D2 run on different days from arm A's earlier runs, so the report compares them only with each other and with the arm A run of the same slice.
