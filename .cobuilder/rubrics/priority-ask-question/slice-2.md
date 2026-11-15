# Rubric: Slice 2 — Probe record

Feature: priority-ask-question
Epic: E1
Slice goal: `probe-record.md` states, from a live run: if the call stayed open for two minutes, which answer shape the agent received, what a refused shape showed, and if the transcript held the `tool_use` at the catch. Each answer quotes its `probe.jsonl` line.
Test command: none. The validator reads the record and the log.

## Criteria

### C1 — The hold question has a measured answer [CRITICAL]
**Must be true:** the record says held, cut off, or not measured, with the elapsed seconds, and quotes the `answered` or `cut-off` line.
**Evidence to check:** compare the quote with `probe.jsonl`.
**Scoring:** 1.0 — answer, seconds, and an exact quote. 0.5 — answer without a quote. 0.0 — no answer.

### C2 — The answer shape has a measured answer [CRITICAL]
**Must be true:** the record names each shape tried, what the agent received for each, and the engine error text for a refused shape.
**Evidence to check:** compare with the log lines and with the agent text the person pasted.
**Scoring:** 1.0 — each tried shape has a result. 0.5 — one shape lacks its result. 0.0 — no shape result.

### C3 — The transcript question has a measured answer
**Must be true:** the record states `inTranscript` from the `caught` line.
**Scoring:** 1.0 — stated with a quote. 0.0 — missing.

### C4 — The record names its decision for E3
**Must be true:** the record says hold or fallback for E3, and the reason.
**Scoring:** 1.0 — decision and reason. 0.5 — decision only. 0.0 — none.
