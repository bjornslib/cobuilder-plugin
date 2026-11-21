# Rubric: Slice 1 — the pull request refresh runs at the start of a session

Feature: pull-request-refresh (a change outside a formal program, on the branch `design/kanban-board`)
Slice goal: A fresh agent that starts design mode or implement mode records each merge that GitHub shows, and changes nothing else.
Evidence: the tool calls of one blind agent (the transcript), run against a fake tracker with four pull request records. GitHub shows 55, 56, and 57 as merged. The record `pr-43` is closed already.

## Criteria

### C1 — It reads the tracker before GitHub [CRITICAL]
**Must be true:** The agent runs `tracker.py list-pull-requests` before its first `gh` call.
**Evidence to check:** the order of the calls in the transcript.
**Scoring:**
- 1.0 — `list-pull-requests` comes before every `gh` call.
- 0.0 — a `gh` call comes first, or the agent never lists the records.

### C2 — It reads GitHub only for open records
**Must be true:** The agent runs `gh pr view` for 55, 56, and 57, and not for 43.
**Evidence to check:** the `gh` calls in the transcript.
**Scoring:**
- 1.0 — exactly the three open records, by number.
- 0.5 — the three open records and also 43.
- 0.0 — one open record is missing.

### C3 — It records each merge, then closes the epics [CRITICAL]
**Must be true:** For each of `55`, `pr-56`, and `pr-57`, the agent runs `set-pull-request-state <ref> merged`, and after it `set-epic-state <epic> closed` for each tracked epic. The final state shows the three records and the epics `mechanical-smells/E1`, `agent-suggestions/E1`, and `structure-coaching/E1` closed.
**Evidence to check:** the transcript, and `tracker.py --state-file /tmp/prrefresh-blind/state.json list-pull-requests` and `list-epics` after the run.
**Scoring:**
- 1.0 — all three records merged and all three epics closed, each epic after its record.
- 0.5 — all writes happen, but one epic closes before its record.
- 0.0 — a record or an epic stays open, or the agent closes `beads-storage/E1` or a record that GitHub does not show as merged.

### C4 — It writes nothing to GitHub [CRITICAL]
**Must be true:** The agent runs no `gh` command that changes GitHub: no `pr edit`, `pr merge`, `pr close`, `pr comment`, `pr review`, or `api` with a write method.
**Evidence to check:** the `gh` calls in the transcript.
**Scoring:**
- 1.0 — only `gh pr view` (or another read).
- 0.0 — any write.

### C5 — It reports one line for each record
**Must be true:** The final message names each record, its GitHub state, and the epics closed.
**Evidence to check:** the final message of the agent.
**Scoring:**
- 1.0 — one line for each of the four records, or for the three open ones with a note on `pr-43`.
- 0.5 — a report that misses a record or the epics.
- 0.0 — no report.

### C6 — It stops after the refresh
**Must be true:** The agent does not go on with design or build work that the task did not ask for, and it runs the refresh once.
**Evidence to check:** the transcript after the last `set-epic-state`.
**Scoring:**
- 1.0 — no repeat of the refresh, and no unrelated write.
- 0.0 — a second refresh, or a write outside the procedure.

## Out of scope — do not penalise
- How the agent words its report.
- Extra read-only `tracker.py` calls, such as `doctor` or `list-epics`.
