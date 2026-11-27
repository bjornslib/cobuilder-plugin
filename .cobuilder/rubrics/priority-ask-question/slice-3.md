# Rubric: Slice 3 — Open-question input

Feature: priority-ask-question
Epic: E2
Slice goal: `uv run priority interpret <transcript> --open-question q.json` builds a brief with an `OPEN QUESTION` section and prints a reading with `stop_kind: question`. Without the flag, the brief equals the stored snapshot and `stop_kind` is `turn_end`.
Test command: `uv run pytest priority-dev/tests -q`

## Criteria

### C1 — The flag adds the section and the kind [CRITICAL]
**Must be true:** with the flag, the brief text holds an `OPEN QUESTION` section with each question and its option labels, and the reading has `stop_kind: question`.
**Evidence to check:** a pytest case that builds the brief from a fixture and a questions file.
**Scoring:** 1.0 — tested and true. 0.5 — the section is tested, but not the kind. 0.0 — no test.

### C2 — Without the flag nothing changes [CRITICAL]
**Must be true:** the existing brief snapshot tests pass unchanged, and `stop_kind` is `turn_end`.
**Evidence to check:** run the suite, and `git diff` the snapshot files.
**Scoring:** 1.0 — no snapshot changed. 0.0 — a snapshot changed.

### C3 — A bad questions file is refused cleanly
**Must be true:** a file that is not a JSON list of questions exits non-zero with a one-line message, and no model call runs.
**Scoring:** 1.0 — tested. 0.0 — a traceback or a model call.
