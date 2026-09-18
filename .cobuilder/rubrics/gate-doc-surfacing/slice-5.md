# Rubric: Slice 5 — E2 real content: render body, add epic chip

Feature: gate-doc-surfacing
Epic: E2
Slice goal: The sheet renders `body_md` through the existing `renderMarkdown()`; an epic card with a `design_doc` shows a chip that opens the same sheet scoped to that epic
Test command: manual browser check via the run skill (no JS test harness in this repo)

## Criteria

### C1 — the gate doc sheet renders real markdown content [CRITICAL]
**Must be true:** Opening the Gate 3 sheet for `gate-doc-surfacing` (this
feature's own real `03-program-design.md`, once E1 has projected it) shows
its actual headings and body text, rendered as HTML (headings as `<h*>`,
lists as `<ul>/<ol>`, not raw markdown syntax visible on the page).
**Evidence to check:** browser check — open the sheet, confirm "Files",
"Types & signatures", "Call stack" etc. render as headings, and no literal
`##` or `**` characters are visible in the rendered text.
**Scoring:**
- 1.0 — headings, lists, and inline formatting all render correctly via `renderMarkdown()`.
- 0.5 — text appears but as raw unrendered markdown (e.g. visible `##`).
- 0.0 — sheet body stays empty or shows an error.

### C2 — an epic card with an approved 4b design shows a chip [CRITICAL]
**Must be true:** In the Builds view's Backlog Lane, an epic card for
`gate-doc-surfacing/E1` or `.../E2` (both have approved epic-*-design.md
files) shows a small chip distinct from the existing Planned/Deferred
badge.
**Evidence to check:** browser check — locate the `gate-doc-surfacing`
program group in the Backlog Lane, confirm E1 and E2's cards show a
design-doc chip.
**Scoring:**
- 1.0 — chip visible on both epics that have an approved 4b design.
- 0.5 — chip visible but visually indistinguishable from existing badges (no clear affordance).
- 0.0 — no chip appears on either card.

### C3 — clicking the chip opens the sheet scoped to that epic
**Must be true:** Clicking E1's chip shows E1's `epic-E1-design.md`
content; clicking E2's chip shows E2's `epic-E2-design.md` content —
different content per epic, not the same record for both.
**Evidence to check:** browser check — click each chip in turn, confirm
the sheet body differs and matches the corresponding file's real content
(e.g. E1's sheet mentions "PROGRAM_DESIGN_FIELDS", E2's mentions
"openGateDocSheet").
**Scoring:**
- 1.0 — each chip opens its own epic's correct content.
- 0.5 — chip opens a sheet but shows the wrong epic's content, or always the same content.
- 0.0 — chip has no effect.

## Regression check
- Slice 4's criteria (click-to-open, close control, no-doc card stays
  inert) still hold.
- `python3 -m pytest tests/ -q` still passes (this slice is viewer-only,
  so should be a no-op on the suite, but confirm no accidental Python edits).

## Out of scope — do not penalise
- An epic with no approved 4b design (single-slice epics, marked `n/a`
  for 4b elsewhere in the repo) showing no chip — that is correct, not a defect.
- Mutual exclusivity with other sheets (slice 6).
