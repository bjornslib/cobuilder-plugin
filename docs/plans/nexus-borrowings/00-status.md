# Status: Nexus borrowings — runtime architecture diagram, draft reviewer, contracts doc

- Gate 1 — Product: APPROVED 2026-09-29
  view: #/work/nexus-borrowings/build/plan/product
- Gate 2 — Architecture: APPROVED 2026-09-29
  view: #/work/nexus-borrowings/build/plan/architecture
- Gate 2b — Interaction design: n/a (no new interaction — the runtime tile and contracts section render through the existing read-only tile and section components; the only visual change is tile order inside the existing architecture level) — Screens: "No new screens. The design route (#/work/<name>/intent) and the plan pages gain content only."
- Gate 3 — Program Design: APPROVED 2026-09-29
  view: #/work/nexus-borrowings/build/plan/program
- Gate 4 — Slice plan, epic designs, and rubrics: pending
  view: #/work/nexus-borrowings/build/epics
  - 4a Slice plan: pending
  - 4b Epic technical solution designs: pending
  - 4c Blind rubrics: pending

Design mode: nexus-borrowings
Hindsight: yes

## Slices
- Gate 4 not yet approved; the slice plan (04-slices.md), per-epic designs, and blind rubrics are the next work after this status snapshot.

## Escalated
<none>

## Notes for a fresh session
- Approvals on Gates 1-3 were session-directed: the user instructed work to proceed
  independently through architecture and program design and named the scope
  (runtime-architecture diagram as a named slot, validate + re-explore reviewer,
  contracts.md, marketplace version bumps). Any of the three approvals may be
  re-opened by the engineer; do not proceed past Gate 4 without fresh approval.
- Design: docs/architecture/designs/nexus-borrowings/ (ADR-0035). Branch:
  design/nexus-borrowings/runtime-arch-diagram.
- Standing directive: subagent spawns use model glm-5.3-flash:cloud.
- The marketplace version bumps are recorded in 03-program-design.md and are
  executed in the first build slice after Gate 4 approval, not before.
- Gate 2b was resolved as n/a with the engineer free to overrule: no new
  interaction is introduced; both viewer changes reuse existing components.