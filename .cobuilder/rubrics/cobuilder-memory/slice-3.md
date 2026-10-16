# Rubric: Slice 3 — Reflect questions written from the records

Feature: cobuilder-memory
Epic: E1
Slice goal: Haiku writes a context and up to three reflect questions, each naming an ADR id or term of the kept records. The page read and the reflect calls run side by side through `$.mcp.call`. A reflect that fails or times out writes its reason, and the other answers still show.
Test command: `claude plugin test plugins/cobuilder-memory && uv run pytest tests -q`

## Criteria

### C1 — The questions come from the records [CRITICAL]
**Must be true:** Haiku's second call receives the kept recall records and the page snippets, and the module keeps one to three `Reflect:` lines and one `Context:` line from its reply. A fourth question is dropped.
**Evidence to check:**
- `claude plugin test`: a case that reads the stubbed model's prompt and finds a record's text in it; a case with four questions keeps three.
**Scoring:**
- 1.0 — both cases pass.
- 0.5 — the cap holds, but the prompt is not checked.
- 0.0 — the questions do not come from the reply, or no cap.

### C2 — Each reflect call follows the contract
**Must be true:** each reflect goes to server `hindsight`, tool `reflect`, with the question, the context, the bank, `budget: "low"`, and `max_tokens: 1500`, and the plugin adds no text of its own.
**Evidence to check:**
- `claude plugin test`: a case that reads the stubbed MCP arguments.
**Scoring:**
- 1.0 — every argument matches.
- 0.5 — one argument differs.
- 0.0 — reflect does not run through `$.mcp.call`.

### C3 — The page read and the reflects run side by side
**Must be true:** the page read and every reflect start before any one of them ends.
**Evidence to check:**
- `claude plugin test`: a case whose stubs record the call order.
**Scoring:**
- 1.0 — the case passes.
- 0.5 — they run, but in sequence.
- 0.0 — a call is missing.

### C4 — A failed reflect leaves the rest intact [CRITICAL]
**Must be true:** when one reflect fails or times out, its section writes the reason, and the recall section, the page, and the other answers still show.
**Evidence to check:**
- `claude plugin test`: three questions where the second stub throws or returns an error.
**Scoring:**
- 1.0 — the result holds the reason and both other answers.
- 0.5 — the reason shows, but another section is lost.
- 0.0 — the run fails or the result is empty.

## Regression check
- Slices 1 and 2 tests still pass.
- Files outside `plugins/cobuilder-memory` stay unchanged.

## Out of scope — do not penalise
- The memory pane (slice 4).
- How good the questions read. The live value check is slice 7.
