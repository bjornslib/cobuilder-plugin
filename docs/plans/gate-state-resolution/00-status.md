# Status: Gate state resolution

**Feature:** `gate-state-resolution`
**Epic:** E1 — one predicate resolves a gate state
**Slices:** 2

## Gates

- Gate 1 — Product (no tech talk): APPROVED 2026-09-14
- Gate 2 — Architecture: APPROVED 2026-09-14
- Gate 2b — Interaction design: n/a (no new screen, no new interaction) — Screens: "No new screen. One existing screen changes its gate labels and its document selection."
- Gate 3 — Program design: APPROVED 2026-09-14
- Gate 4 — Slice plan, epic designs, and rubrics: APPROVED 2026-09-14
  - 4a Slice plan: APPROVED 2026-09-14
  - 4b Epic technical solution designs: APPROVED 2026-09-14
  - 4c Blind rubrics: APPROVED 2026-09-14

Design mode: none
Hindsight: unavailable

## Slices

- [x] Slice 1 — the static builds page resolves every gate state: score: 1.00
- [x] Slice 2 — the viewer gate rail resolves every gate state: score: 1.00

## Notes for a fresh session

This plan repairs two renderers. It adds no gate, no document type, and no
schema.

Slice 1 owns `plugins/artifact/scripts/build_builds_view.py` and the static
page that it writes. Slice 2 owns `plugins/artifact/viewer/index.html`. The
two slices share no file, so one agent can hold each of them.

Gate 2b reads `n/a` for this plan. The feature adds no screen, no control,
and no flow. `01-product.md` records that in its Screens section.

## Verification record

`uv run --with pytest pytest tests/ -v` reports `4 failed, 362 passed`. The
four failures are the pre-existing `PIL` WebP failures. No fifth failure
appeared.

`python3 plugins/implement/scripts/verify_gate.py --plan
docs/plans/gate-state-resolution --rubrics-dir
.cobuilder/rubrics/gate-state-resolution` reports `Overall: OK`.

Slice 1 was read in Chrome against four pages: `widget-demo`, `trailing-na`,
`skill-collision-fix`, and a `pending-2b` fixture. Slice 2 was read in Chrome
against the built index on a clean port, and the waiting branch was probed
with a synthetic rail.

The plan repairs five faults. Two of them are live in this repository today.

### The live faults

`skill-collision-fix` holds only `00-status.md`. Its page opens on
`04-slices.md`, a document that plan does not hold. The page prints the
approval prompt above an empty body.

A plan that holds `interaction-design.md` draws a rail button whose label
reads `undefined`. `TITLES` in the generator names no title for that file.

### The recorded faults

The static page treats an `n/a` gate as unfinished, and so does the viewer
rail. Both predate this feature. `skill-collision-fix` Gate 1 reads `n/a`,
and the rail prints "In progress" beside it.

The viewer rail header reads "5 Gates Approved" for a plan with one approved
gate. The count gathers every gate card, and the label names approval.

The two renderers also disagree about the word "current". The viewer marks
the last gate as current. The static page opens the first gate that still
needs an answer. That difference is recorded and left alone.
