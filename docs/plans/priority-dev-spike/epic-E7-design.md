# Epic Technical Solution Design: E7 — GEPA gaps

Feature: priority-dev-spike
Epic ID: E7

## Scope and Intent

Run C2 (5 November 2026) showed ten gaps in how the optimiser run works (`slice20-c2-holdout.md`, section "GEPA gaps"). E7 closes the gaps that stop the reflection model from doing its job. The reflection model must see every stop of a minibatch with its score, see a failed stop with its error text, use its own model, keep its whole proposal, and write general rules. The epic also tests a smaller stop brief, checks the changed optimiser run live on a minibatch of 3, and then runs arm C3.

E7 changes the optimiser run, the instruction proposer, the reflection model settings, the `ProposeStop` example, and the stop brief. It does not change the judge, the references, the metric value, or the test set.

The terms follow `DDD-VOCABULARY.md`: optimiser run, seed program, candidate, trainset, valset, test set, minibatch, rollout, mutation, task model, judge, reflection model, arm.

## Files Touched

- `priority-dev/src/priority/interpreter/module.py` (slice 22: a failed parse leaves a trace entry for `propose`)
- `priority-dev/src/priority/optimise.py` (slice 22: score in the feedback, GEPA `log_dir` and `track_stats`, candidate stats file; slice 23: reflection model from `REFLECTION_*`, printed model id; slice 24: blocked trainset details passed to the proposer; slice 27: sizes printed in glossary terms)
- `priority-dev/src/priority/gepa_proposer.py` (slice 22: each reflection call saved to the log dir; slice 23: no cut; slice 24: general-rule guidance and the trainset-detail check)
- `priority-dev/src/priority/config.py` (slice 23: `reflection_provider`, `reflection_model`, `reflection_base_url`, `reflection_temperature`, `reflection_key`)
- `priority-dev/src/priority/cli.py` (slice 22: `optimise --gepa-log-dir`; slice 25: `eval --brief full|compact`, `--digest-dir`)
- `priority-dev/src/priority/interpreter/signatures.py` (slice 24: the `ask_human` example carries a non-null `agent_recommendation`)
- `priority-dev/src/priority/brief/models.py` and `brief/builder.py` (slice 25: the compact render, and the `HUMAN ASKED:` fix if the builder causes it)
- `priority-dev/src/priority/evaluation/runner.py` (slice 25: the compact brief path, with digests cached per stop)
- `priority-dev/probes/digest_report.py` and `priority-dev/probes/compact-brief-report.md` (slice 25: numbers only, no private text)
- `priority-dev/tests/` (one test file per slice, made-up fixtures and stub models only)
- Start of slice 23: `.cobuilder/drafts/e7-slice23-draft.patch` (moved out of the working tree, see `04-slices.md` note 8)

## Types & Signatures

- Slice 22, failed-parse trace. When the `propose` call raises `AdapterParseError` or `ValidationError` and `dspy.settings.trace` is a list, `Interpreter._try_calls` appends `(self.propose, {"brief_text": text}, dspy.Prediction(raw_reply=<raw>, validation_error=<error text>))`. The abstain prediction that `forward` returns does not change. GEPA then builds a reflective example for that stop and calls the metric for its feedback.
- Slice 22, feedback with the score. `gepa_feedback` returns `Prediction(score=v, feedback=f"Score: {v:.2f} of 1.00. " + notes)`. The value of `score` does not change.
- Slice 22, logs. `run(..., gepa_log_dir: Path | None)`. Default: `probes/programs/<stem>-budget<b>-seed<s>-log/` (Git ignores `probes/programs/`). GEPA gets `log_dir=<dir>/gepa` and `track_stats=True`. The proposer writes `<dir>/reflection-<NNN>.json` per call: `{"component", "current_instruction", "reflective_dataset", "proposal"}`. After compile, the run writes `<dir>/candidates.json`: per candidate its instruction, parents, valset aggregate score, and the best index.
- Slice 23, reflection settings. `REFLECTION_PROVIDER` (default `nvidia_nim`), `REFLECTION_MODEL` (default `mistralai/mistral-large-4-1t-a52b`), `REFLECTION_BASE_URL`, `REFLECTION_API_KEY` (else the provider key). `_reflection_lm()` reads only these. The judge settings never move the reflection model. The run prints `reflection model: <id>`.
- Slice 23, whole proposals. The proposer returns `_strip_guard(text) + "\n\n" + schema_guard(name)` with no length cut.
- Slice 24, general rules. `InstructionProposer(additional_instructions=GENERAL_RULES)`, where `GENERAL_RULES` tells the reflection model to write rules that hold for any session and never to quote option labels, file names, commands, or session details from the examples.
- Slice 24, trainset-detail check. `blocked_details(examples) -> frozenset[str]`: each option label of 3 or more words and each file name with an extension in the trainset references, lower case. A proposal that contains one of them (case-insensitive) is rejected: the run prints `proposal rejected: quotes <n> trainset option labels and <m> file names` and the mutation ends with no new candidate. The printed reason holds counts only, because labels are private.
- Slice 25, compact brief. `StopBrief.for_model_compact(digest: RunDigest) -> str` renders `HUMAN ASKED:`, `RUN DIGEST:` (ran, result, open items, decisions), `FINAL REPLY:`, `CLIENT MESSAGE:`, and the human lines after the stop. `priority eval --brief compact --digest-dir DIR` makes one digest call per stop on the full brief and caches it in `DIR/<session>-<stop>.json`.
- Slice 27, sizes line. `optimise` prints `trainset: N stops (S sessions); valset: N stops (S sessions); minibatch: M`.

## Slice Decomposition

1. Slice 22, complete reflection evidence (gaps 2, 3, 7). Stub models. No dependency.
2. Slice 23, whole proposals from the reflection model (gaps 1, 6). Stub models. Starts from the draft patch as GREEN.
3. Slice 24, general instructions only (gaps 8, 9). Stub models. Changes the prompt of arm A.
4. Slice 25, compact stop brief (gap 10). Live calls on Mercury 3: the digest report (3 or more human-chat training sessions with 3 or more stops each, about 15 digest calls and one shrink call), then arm A on the 56 test-set stops with each brief form (about 56 digest calls and 2 eval runs). The report picks the brief form for slices 26 and 27.
5. Slice 26, live smoke run. One live optimiser run: a valset of 1 or 2 sessions, a minibatch of 3 trainset stops that scored low on C2 with at least one parse failure, and `max_metric_calls` that covers the seed score on the valset plus two minibatch runs. It fails if no reflection call shows.
6. Slice 27, optimiser run C3. Seed: a copy of the C2 program with its cut sentence finished and its null `agent_recommendation` example fixed. A larger valset (12 sessions) and minibatch (6). Arm A runs again on the test set, because slice 24 changed its prompt.

Order: 22, 23, 24, 25, 26, 27. Slices 22 to 24 touch the same files, so they run one after the other.

## Test Plan

- Slice 22, `tests/test_e7_reflection_evidence.py`: a stub task model that returns one unparseable reply and two valid replies, a stub judge, and a stub GEPA reflection. Assert that the reflective dataset holds 3 examples, that the failed one carries the raw reply and the error text in its outputs and `abstain` in its feedback, and that each feedback starts with `Score:`. Assert the log dir holds `reflection-001.json` and `candidates.json`.
- Slice 23, `tests/test_e7_reflection_model.py` plus `test_judge_model.py` updates: a stub reflection reply of 6000 characters is saved whole; `_reflection_lm()` reads `REFLECTION_*`; a judge set to `inception` leaves the reflection model on NVIDIA Mistral; `optimise` prints the reflection model id.
- Slice 24, `tests/test_e7_general_rules.py`: the rendered `ProposeStop` prompt has a non-null `agent_recommendation` in its example; the proposer passes the general-rule guidance; a stub proposal that quotes a 3-word trainset label is rejected with a counts-only printed reason; a proposal with no blocked detail passes.
- Slice 25, `tests/test_e7_compact_brief.py`: the compact render holds the four sections and none of the run items; `eval --brief compact` with a stub digest model caches one digest per stop and passes the compact text to the task model. The live part ends in `probes/compact-brief-report.md`.
- Slice 26 and 27: live runs; the evidence is the call logs, the log dir, and the reports.

## Risks & Open Questions

- The failed-parse trace depends on DSPy reading `dspy.settings.trace` during the GEPA rollout. If DSPy does not keep that list for an exception that the program catches, slice 22 must find another route, such as a custom adapter for the reflective dataset.
- The NVIDIA endpoint hung for the judge earlier. If the reflection model hangs, slice 26 fails. The 600-second timeout and the retries limit the wait.
- A whole minibatch of 3 full briefs can reach about 500K characters. The NVIDIA Mistral context limit is not known. Slice 25 may cut this.
- The trainset-detail check may reject a general rule that happens to contain a common 3-word label. The run prints the count, and slice 26 shows how often it fires.
- The digest open items and decisions vary between calls (seen twice). The compact brief may move the score for that reason alone.
- Gate 4f (this design and the rubrics) was not presented page by page. The engineer's instruction of 5 November 2026, "implement E7 end to end, slices 22 to 25, and report after the first live smoke run of slice 26", is recorded as the approval. The engineer may still reject this design.
