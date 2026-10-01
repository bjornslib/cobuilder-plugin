# Status: Nexus borrowings — runtime architecture diagram, draft reviewer, contracts doc

- Gate 1 — Product: APPROVED 2026-09-29
  view: #/work/nexus-borrowings/build/plan/product
- Gate 2 — Architecture: APPROVED 2026-09-29
  view: #/work/nexus-borrowings/build/plan/architecture
- Gate 2b — Interaction design: n/a (no new interaction — the runtime tile and contracts section render through the existing read-only tile and section components; the only visual change is tile order inside the existing architecture level) — Screens: "No new screens. The design route (#/work/<name>/intent) and the plan pages gain content only."
- Gate 3 — Program Design: APPROVED 2026-09-29
  view: #/work/nexus-borrowings/build/plan/program
- Gate 4 — Slice plan, epic designs, and blind rubrics: APPROVED 2026-10-01
  view: #/work/nexus-borrowings/build/epics
  - 4a Slice plan: APPROVED 2026-10-01 (eight slices across four epics)
  - 4b Epic technical solution designs: APPROVED 2026-10-01
  - 4c Blind rubrics: APPROVED 2026-10-01 (behavioral for slices 4, 6, 7)

Design mode: nexus-borrowings
Hindsight: yes

## Slices
- 2026-10-01: eight slices built across four epics on this branch, ending
  with the marketplace bumps and a full-suite run. E1-S1..S3 and E4-S8 are
  test-scored (tests/test_design_svg.py · 12, viewer suite · 198 vitest +
  tsc, tests/test_build_index.py · 35, full pytest 701 passed with only the
  6 pre-existing test_board_pr_alone failures that fail identically on
  master). E2-S4, E4-S6, E4-S7 are prose-verified; their behavioral criteria
  score on the first real design runs (see 04-slices.md's rubric note).

## Escalated
- Pre-existing on master, not this branch's slices: six
  `tests/test_board_pr_alone.py` failures (they name a missing
  `plugins/artifact/viewer/src/shell/Board.tsx`) and
  `test_viewer_modes.py::test_viewer_contains_all_five_mode_buttons`'s
  minified-literal anchors, which a fresh viewer build on master also trips
  (the committed artifact was built by an older toolchain that inlined
  `tooltip:"Work"`). The viewer conformance case was rewritten against
  stable anchors in this branch; the board failures need their own slice.

## Notes for a fresh session
- Round 2 (2026-10-01): reconciled with merged PR-26 — ADR renumbered 0035 →
  0036 (the merged options-mode ADR owns 0035), the runtime slot moved from
  mermaid to authored inline SVG (ADR-0035 precedent + the engineer's stated
  preference), survivors routing through stage 4's intent.alternatives made
  explicit, and the vocabulary-bootstrap leg (E4) joined with the engineer's
  exception: review reports absence as a P1 finding and offers the fix at
  run end. Gate 1-3 approvals carried over; Gate 4 approved in chat.
- Approvals on Gates 1-4 were session-directed: the user instructed work to
  proceed independently through design and build and named the scope
  (runtime-architecture diagram as a named slot, validate + re-explore
  reviewer, contracts.md, vocabulary bootstrap, marketplace version bumps).
  Any approval may be re-opened by the engineer.
- Design: docs/architecture/designs/nexus-borrowings/ (ADR-0036). Branch:
  design/nexus-borrowings/runtime-arch-diagram (rebased on master at PR-26 merge).
- Standing directive: subagent spawns use model glm-5.3-flash:cloud.
- The marketplace version bumps are recorded in 03-program-design.md and are
  executed in the final build slice, not before.
- Gate 2b was resolved as n/a with the engineer free to overrule: no new
  interaction is introduced; both viewer changes reuse existing components.