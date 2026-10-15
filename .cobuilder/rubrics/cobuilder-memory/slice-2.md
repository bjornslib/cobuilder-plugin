# Rubric: Slice 2 — A knowledge page joins the run

Feature: cobuilder-memory
Epic: E1
Slice goal: `search_knowledge_base` runs beside recall. Haiku's second call may pick one page, `get_knowledge_page` reads it, and the result shows its name, update date, and body. An empty or still-generating page is never shown, and a page id the search did not return is refused.
Test command: `claude plugin test plugins/cobuilder-memory && uv run pytest tests -q`

## Criteria

### C1 — Recall and the page search run side by side [CRITICAL]
**Must be true:** both calls start before either one ends, and both use the recall query and the bank.
**Evidence to check:**
- `claude plugin test`: a case whose stubbed MCP answers record the call order, or whose stubs hold one answer until the other call has started.
**Scoring:**
- 1.0 — the test proves both start before either ends.
- 0.5 — both run, but in sequence.
- 0.0 — the page search does not run.

### C2 — Empty pages never reach Haiku or the result
**Must be true:** a search result whose snippet is empty or reads `Generating content...` is dropped, and a picked page with an empty body writes `Knowledge page: <name> is empty.` in place of the page.
**Evidence to check:**
- `claude plugin test`: one case for each of the three inputs.
**Scoring:**
- 1.0 — all three cases pass.
- 0.5 — two pass.
- 0.0 — an empty page reaches the result.

### C3 — Only a searched page can be read [CRITICAL]
**Must be true:** when Haiku names a page id that the search did not return, the module reads no page and the result says no page was picked.
**Evidence to check:**
- `claude plugin test`: a case where Haiku's reply names an unknown id, and the stubbed MCP shows no `get_knowledge_page` call.
**Scoring:**
- 1.0 — the case passes.
- 0.0 — the unknown id is read.

### C4 — The result shows the page
**Must be true:** with a picked page, the result holds its name, its update date, and its body cut to 6,000 characters, after the recall section. With no page, it says `Knowledge page: none picked.`
**Evidence to check:**
- `claude plugin test`: a case with a 7,000-character body and a case with no pick.
**Scoring:**
- 1.0 — both cases pass.
- 0.5 — the page shows but is not cut, or the no-pick line is missing.
- 0.0 — the page does not show.

## Regression check
- Slice 1's tests still pass, and the judging rules still come first.
- Files outside `plugins/cobuilder-memory` stay unchanged.

## Out of scope — do not penalise
- Reflect questions and answers (slice 3). Haiku's second call may already return them, but the result need not show them yet.
- The memory pane (slice 4).
