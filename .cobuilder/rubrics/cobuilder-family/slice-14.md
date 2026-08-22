# Rubric: Slice 14 — the wake command and the whole loop

Feature: cobuilder-family
Epic: plugin-split/E6
Slice goal: The background command blocks and returns new threads, and the loop runs once end to end.
Test command: `uv run --with pytest pytest tests/ -v`

## Criteria

### C1 — The command distinguishes new work from no work [CRITICAL]
**Must be true:** It blocks until the ledger grows, prints only the new lines, and exits with a different code on a timeout than on new content.
**Evidence to check:** Two tests, one appending and one timing out.
**Scoring:** 1.0 — distinct codes and only new lines printed. 0.5 — correct output, same exit code. 0.0 — it does not block, or it reprints the whole file.

### C2 — It never waits forever
**Must be true:** A timeout ends the wait, so a session does not hang on a reader who left.
**Evidence to check:** The timeout test, and a read of the default.
**Scoring:** 1.0 — a sane default and an override. 0.5 — a default with no override. 0.0 — it can block indefinitely.

### C3 — Each reader tracks its own place in the ledger
**Must be true:** Two readers at different offsets both receive the lines they have not seen, and neither consumes the other's.
**Evidence to check:** The two-reader test.
**Scoring:** 1.0 — both receive their own. 0.5 — the second must start from the beginning. 0.0 — one reader's read hides lines from the other.

### C4 — The whole loop runs once, by hand [CRITICAL]
**Must be true:** A comment made in the viewer reaches the wake command's output with its quote intact, an agent reply is appended, and the projection shows the new state.
**Evidence to check:** Do it once end to end and record the result, including the commands, in the status document.
**Scoring:** 1.0 — done and recorded. 0.5 — every part passes its own test and nobody ran the whole loop, which is the failure mode this criterion exists for. 0.0 — the loop does not complete.

## Regression check
- Every guarantee from slices 12 and 13 still holds.
- No plugin gained an agent, a hook, or an MCP server to make this work.

## Out of scope — do not penalise
- Rendering a thread as a conversation. That is E7.
- Merging these threads with a published page's own threads. Gate 3 records that this needs its own decision record.
