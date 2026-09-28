# Status: Work drawer

**Feature:** `work-drawer`
**Epics:** E1 — the search owns the result set · E2 — labels and the filter walk
**Slices:** 2

## Gates

- Gate 1 — Product (no tech talk): APPROVED 2026-09-28
  view: `#/work-drawer/build/plan/product`
- Gate 2 — Architecture: APPROVED 2026-09-28
  view: `#/work-drawer/build/plan/architecture`
- Gate 2b — Interaction design: APPROVED 2026-09-28
  view: n/a (no page — the engineer gets the file path)
- Gate 3 — Program design: APPROVED 2026-09-28
  view: `#/work-drawer/build/plan/program`
- Gate 4 — Slice plan, epic designs, and rubrics: APPROVED 2026-09-28
  view: `#/work-drawer/build/plan/epics`
  - 4a Slice plan: APPROVED 2026-09-28
  - 4b Epic technical solution designs: n/a (one slice per epic)
  - 4c Blind rubrics: APPROVED 2026-09-28

Design mode: docs/architecture/designs/work-drawer/ (ADR-0034)
Hindsight: available — initiative page kp-b6fe94648e5b4e74830dbd5516b02872

## Slices

- [ ] Slice 1 — the search owns the result set: score: pending
- [ ] Slice 2 — labels and the filter walk: score: pending

## Notes for a fresh session

This plan refines the day-deck drawer prototype
(`plugins/artifact/viewer/src/variations/work-drawer-deck/`). It changes no
shipped file: `src/shell/` is untouched, because the port that retires the
full-page board route is the design's next epic and is deliberately not in
this plan.

Slice 1 owns the drawer's search behaviour and the single-result rule in
`work-drawer-deck/index.tsx`. Slice 2 owns the labels in
`work-drawer-deck/detail.tsx`, the header line in `index.tsx`, and the
arrow-key walk over the filter strip. The two slices share no criterion, and
neither owns the other's file alone.

The keyboard contract on this surface is written to what the machine does:
Radix's dismissable layer listens for Escape in the capture phase, so Escape
closes the drawer and Enter toggles the detail. The interaction design states
the contract and the hint line states it again.

## Verification record

(filled by the slice loop; see the tail of this file after the slices close)