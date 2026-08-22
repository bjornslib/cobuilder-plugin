# Rubric: Slice 13 — the anchor and the write endpoint

Feature: cobuilder-family
Epic: plugin-split/E6
Slice goal: Click to anchor a sentence, `POST /feedback` appends, and the drawer keeps the text in view.
Test command: `uv run --with pytest pytest tests/ -v`

## Criteria

### C1 — A reader points at one sentence, not a whole section [CRITICAL]
**Must be true:** Clicking an element, or selecting part of one, produces an anchor holding a selector, the selection range, and the quoted text. Nothing was tagged when the page was built.
**Evidence to check:** Comment on a mid-paragraph selection in a served bundle and read the stored record.
**Scoring:** 1.0 — all three parts stored and the quote matches the selection. 0.5 — element-level only, with no partial selection. 0.0 — still whole-section, or the page needed build-time tags.

### C2 — The reader sees the text while writing about it [CRITICAL]
**Must be true:** The drawer opens on the click with the target already anchored, and the page shifts rather than being covered.
**Evidence to check:** Open a bundle, click a paragraph, and confirm the drawer and that paragraph are visible together.
**Scoring:** 1.0 — opens on the click and the text stays visible. 0.5 — opens on the click and covers the text. 0.0 — still a keyboard-only mode.

### C3 — The server accepts exactly one write and nothing else [CRITICAL]
**Must be true:** The feedback route appends. Every other write route is rejected. The server binds the loopback address only.
**Evidence to check:** The route tests and the bind test.
**Scoring:** 1.0 — one route, everything else rejected, loopback only. 0.5 — correct routes, binds a routable address. 0.0 — another write route exists.

### C4 — A comment survives with no server
**Must be true:** With writes disabled the reader still gets local persistence and the markdown hand-off, and is told the thread is local.
**Evidence to check:** Serve read-only and comment.
**Scoring:** 1.0 — falls back and says so. 0.5 — falls back silently. 0.0 — the comment is lost.

### C5 — A stale selector recovers through the quote
**Must be true:** When a regenerated page moves the anchored element, the comment still shows what it referred to.
**Evidence to check:** Regenerate a page so the selector no longer matches, then open the thread.
**Scoring:** 1.0 — the quote is shown and the thread is marked as needing re-anchoring. 0.5 — the quote is shown with no marking. 0.0 — the comment shows nothing.

## Regression check
- The ledger guarantees from slice 12 hold under the server.
- Serving for reading works with writes disabled, which stays the default.

## Out of scope — do not penalise
- The background wake command and the end-to-end run. Those are slice 14.
- Rendering replies as a conversation. That is E7.
