# Rubric: Slice 12 — the ledger and its projection

Feature: cobuilder-family
Epic: plugin-split/E6
Slice goal: Append, fold, and project, with no server involved.
Test command: `uv run --with pytest pytest tests/ -v`

## Criteria

### C1 — A read never deletes [CRITICAL]
**Must be true:** Reading the ledger, folding a thread, and building the projection all leave the file byte-identical.
**Evidence to check:** The test that hashes the ledger before and after each read path.
**Scoring:** 1.0 — identical after all three. 0.0 — any read changes it. No half credit; this is the whole reason the record exists.

### C2 — An append never rewrites an earlier line [CRITICAL]
**Must be true:** Appending leaves every earlier line untouched, and two appends that race both survive intact.
**Evidence to check:** The concurrency test, and a diff of the earlier lines.
**Scoring:** 1.0 — both survive, earlier lines untouched. 0.5 — sequential appends are safe and the concurrent case interleaves. 0.0 — a line is lost or rewritten.

### C3 — The current state is a lookup, and the history is still there
**Must be true:** The projection gives a thread's state in one lookup, and it records who moved it and when. The transitions remain readable in the ledger.
**Evidence to check:** The projection test, plus a read of a thread with two transitions.
**Scoring:** 1.0 — the lookup is correct and the history is intact. 0.5 — the lookup works and the actor or the time is missing. 0.0 — the state is only recoverable by folding.

### C4 — The projection is disposable
**Must be true:** Deleting the projection and appending once rebuilds it correctly from the ledger.
**Evidence to check:** The matching test.
**Scoring:** 1.0 — rebuilt and identical. 0.5 — rebuilt and incomplete. 0.0 — it does not rebuild.

### C5 — A comment falls under the guard that protects irreplaceable content
**Must be true:** The migration guard covers the ledger from this slice onward, so no migration can regenerate over it.
**Evidence to check:** The guard test with a migration that tries to touch the ledger.
**Scoring:** 1.0 — refused before writing. 0.5 — warned. 0.0 — allowed.

### C6 — An agent reply is a record, not a chat message
**Must be true:** A reply carries an author of agent and names the thread it answers, and folding places it under that thread in append order.
**Evidence to check:** The matching test.
**Scoring:** 1.0 — both fields present and the fold is ordered. 0.5 — present, unordered. 0.0 — a reply cannot be told from a root comment.

## Regression check
- Every bundle still verifies.
- The view server is unchanged in this slice.

## Out of scope — do not penalise
- The write endpoint, the click-to-anchor drawer, and the background wake command. Those are slices 13 and 14.
- Rendering replies as a conversation. That is E7, a backlog epic. A flat list is correct here.
