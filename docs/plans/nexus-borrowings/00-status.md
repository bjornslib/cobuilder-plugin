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
- Gate 4 not yet approved; the slice plan (04-slices.md), per-epic designs, and blind rubrics are the next work after this status snapshot.

## Escalated
<none>

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