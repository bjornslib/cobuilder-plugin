# Status: Linear as a tracker beside beads

**Feature:** `linear-tracker-adapter`
**Design record:** `docs/architecture/designs/linear-tracker-adapter/` (ADR-0048)
**Epics:** 7 (E1 to E7)
**Slices:** 13

## Gates

- Gate 1 — Product (no tech talk): pending
- Gate 2 — Architecture: pending
- Gate 2b — Interaction design: n/a (no UI) — Screens: "No UI. The feature adds no screen. People see the result in the Linear board, which Linear owns."
- Gate 3 — Program design: pending
- Gate 4 — Slice plan, epic designs, and rubrics: pending
  - 4a Slice plan: pending
  - 4b Epic technical solution designs: pending
  - 4c Blind rubrics: pending

Design mode: linear-tracker-adapter (approved by the engineer on 2026-11-03, including the change to CLAUDE.md principle 7)
Memory (Gate 1): absent (the Hindsight server was not found)
Memory (before Gate 3, or Gate 2): absent (same reason)

## Slices

Seeded into the tracker after Gate 3 is approved. The table is in `04-slices.md`.

## Notes for a fresh session

All gate documents are drafted and wait for review. Nothing is approved yet.

The build order follows ADR-0048. E1 to E5 need no Linear workspace. E6 needs a test workspace and decides the abort rules of the design. E7 follows E6, so no install offers an adapter that no live test has passed.

The review of `cobuilder-plugin-34` on 2026-11-03 led to fixes: the contract ledger for cases that later slices own, planned file splits, matching signatures, and a narrower edit of CLAUDE.md. One idea waits for the engineer: if a test workspace exists early, run E6 right after E2, so the claim rule rests on real responses before E3.

Slice 9 needs an answer to one open question before it starts: how a plan row names an existing Linear issue. See the risks of `epic-E4-design.md`.

The tracker holds the program `linear-tracker-adapter` at stage `decided`. The tracker also holds a gate key named `design` that a mistaken call wrote on 2026-11-03. The port has no operation to remove it. It is not a gate name.
