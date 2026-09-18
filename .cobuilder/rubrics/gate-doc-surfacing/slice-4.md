# Rubric: Slice 4 — E2 tracer bullet: clickable Gate Rail card opens empty sheet

Feature: gate-doc-surfacing
Epic: E2
Slice goal: Clicking a Gate Rail card with a `doc` opens a sheet showing the gate's title and an empty body; a card with no `doc` stays non-interactive
Test command: manual browser check via the run skill (no JS test harness in this repo)

## Criteria

### C1 — a Gate Rail card with a `doc` opens a sheet on click [CRITICAL]
**Must be true:** Serving the rebuilt bundle and opening the Builds view,
clicking a Gate Rail card whose gate entry has a `doc` field opens a
visible sheet element showing at least the gate's name/title.
**Evidence to check:** browser check — serve `.cobuilder-architect/self/`
with `python3 -m http.server`, open the viewer, navigate to Builds, click
the Gate 3 card for `gate-doc-surfacing` (once E1 has produced its `doc`
field), confirm a sheet opens.
**Scoring:**
- 1.0 — sheet opens and shows a title on click.
- 0.5 — clicking does something (e.g. console log) but no visible sheet appears.
- 0.0 — no response to the click at all.

### C2 — a Gate Rail card with no `doc` has no click affordance
**Must be true:** A gate whose entry has no `doc` field is visually
distinguishable as non-interactive (e.g. no pointer cursor / no click
handler attached) and clicking it does nothing.
**Evidence to check:** browser check — click a gate card with no `doc`
(e.g. an approved gate before E1 attaches its doc reference, or any gate
number with no matching file); confirm nothing opens.
**Scoring:**
- 1.0 — no sheet opens, and the card shows no interactive affordance (cursor/hover state).
- 0.5 — no sheet opens, but the card still looks clickable (misleading affordance).
- 0.0 — clicking a no-doc card opens an empty or broken sheet.

### C3 — the sheet closes via its close control
**Must be true:** The opened sheet has a working close button/control that
hides it.
**Evidence to check:** browser check — after opening the sheet in C1,
click its close control; confirm it hides.
**Scoring:**
- 1.0 — closes cleanly.
- 0.0 — no close control, or clicking it does nothing.

## Regression check
- Existing ADR sheet, assessment sheet, and comments drawer still open and
  close correctly (manual spot check) — this slice adds a sibling, not a
  replacement.

## Out of scope — do not penalise
- Rendering the actual body_md content (slice 5).
- The epic card design-doc chip (slice 5).
- Mutual exclusivity with other sheets (slice 6).
