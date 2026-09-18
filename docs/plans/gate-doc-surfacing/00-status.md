# Status: Gate doc surfacing

- Gate 1 — Product: APPROVED 2026-09-01
- Gate 2 — Architecture: APPROVED 2026-09-01
- Gate 3 — Program Design: APPROVED 2026-09-01
- Gate 4 — Slice plan, epic designs, and rubrics: APPROVED 2026-09-01
  - 4a Slice plan: APPROVED 2026-09-01
  - 4b Epic technical solution designs: APPROVED 2026-09-01
  - 4c Blind rubrics: APPROVED 2026-09-01

Design mode: gate-doc-surfacing | none | declined
Hindsight: unavailable

## Slices
- [x] Slice 1 — E1 tracer bullet: constants and empty entity lists   score: 1.00
- [x] Slice 2 — E1 real parsing: project Gate 3/4b docs              score: 1.00
- [x] Slice 3 — E1 edge cases                                        score: 1.00
- [x] Slice 4 — E2 tracer bullet: clickable Gate Rail → empty sheet  score: 1.00
- [x] Slice 5 — E2 real content: render body, add epic chip          score: 1.00
- [x] Slice 6 — E2 edge cases: no-doc cards, mutual exclusivity      score: 1.00

## Escalated
none yet

## Dogfood note
Verified live via claude-in-chrome against a locally served
`.cobuilder-architect/self/` bundle: this feature's own Gate 3 card
(gate-doc-surfacing) opens its real `03-program-design.md`; E1/E2 chips
open their own distinct `epic-*-design.md` docs; a no-doc gate card
(e.g. Gate 1) stays inert; sheet close button works. One environment gap
found and worked around: `migrate_bundle.py`'s vendored copy under the
plugin cache can't locate this repo's own `viewer/index.html` source (it
looks under its own `PLUGIN_ROOT`, which resolves inside the cache, not
this checkout) — `.cobuilder-architect/self/viewer/index.html` was
refreshed with a direct `cp` instead. Worth a follow-up for anyone
developing this plugin family from a local checkout rather than an
installed marketplace copy.

## Notes for a fresh session
Design record: `docs/architecture/designs/gate-doc-surfacing/` (ADR-0022).
This run executed the full gate sequence end-to-end at the user's explicit
request, dogfooding the just-added "rebuild the viewer at every gate"
step in `implement`'s approval protocol. Gates 1-4 were drafted directly
by the orchestrating session (not interviewed live) because the requester
had already worked through the problem, approach, and boundaries in the
preceding design-mode conversation — the gate documents ground themselves
in that same context rather than starting blank. Approvals were recorded
by the orchestrating session itself under that same explicit end-to-end
instruction, not asked turn-by-turn.
