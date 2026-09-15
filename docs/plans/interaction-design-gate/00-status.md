# Status: Interaction design gate

- Gate 1 — Product: APPROVED 2026-09-14
- Gate 2 — Architecture: APPROVED 2026-09-14
- Gate 2b — Interaction design: n/a (no UI) — Screens: "none — no new screen"
- Gate 3 — Program Design: APPROVED 2026-09-14
- Gate 4 — Slice plan, epic designs, and rubrics: APPROVED 2026-09-14
  - 4a Slice plan: APPROVED 2026-09-14
  - 4b Epic technical solution designs: APPROVED 2026-09-14
  - 4c Blind rubrics: APPROVED 2026-09-14

Design mode: none
Hindsight: unavailable

## Slices

Seven slices across three epics. See `04-slices.md`.

- [x] Slice 1 — E1 tracer bullet: the skill exists with three steps    score: 1.00
- [x] Slice 2 — E1 real content and edge cases: the four concepts       score: 1.00
- [x] Slice 3 — E2 tracer bullet: the gate line and its section        score: 1.00
- [x] Slice 4 — E2 real content and edge cases: the three paths         score: 1.00
- [x] Slice 5 — E3 tracer bullet: the 2b group in verify_gate.py       score: 1.00
- [x] Slice 6 — E3 real content: the index and the Builds view rail    score: 1.00
- [x] Slice 7 — E3 edge cases: the three integer-only assumptions      score: 1.00

## Escalated

none yet

## Notes for a fresh session

- ADR-0024 is approved. It holds the decision: vendor a trimmed `design-to-code`
  into the implement plugin, and add a conditional Gate 2b between Gate 2 and
  Gate 3.
- Gate 2b is its own tracked line in `00-status.md`. It is not a sub-step of
  Gate 2. Gate 3 must not begin until the 2b line reads APPROVED or n/a.
- Gate 2b is `n/a` for this feature. The reason is in `01-product.md`'s
  `## Screens` section, and the 2b line quotes it. The `n/a` path is
  self-reported, so this plan is also the first test of that escape hatch.
- The artifact filename carries no number prefix. `02b-view-designs.md` already
  means "the second Gate 2 sub-document", and `GATE_DOCS["2"]` lists it. A file
  named `02d-interaction-design.md` would collide with that meaning.
- Epic E3 carries the viewer projection. It is the epic to cut if the reviewer
  wants a smaller change. Three hardcoded assumptions make it larger than it
  looks. `epic-E3-design.md` names them.
- **This plan declares its three epics in a design record.** Epic identity comes
  only from `docs/architecture/designs/<name>/goal.json`, never from
  `04-slices.md`. `docs/architecture/designs/interaction-design-gate/goal.json`
  declares `E1`, `E2`, and `E3`, so all seven slices join to their epics and
  `uv run shared/build_index.py` prints no warnings. `gate-doc-surfacing` has the
  same shape. `cobuilder-family` has no design record of its own, and it resolves
  instead by naming `plugin-split/E1..E6`, an existing design's epics.

  Design mode did not run for this feature, so the record was written by hand. It
  holds the minimum the index and the Builds view read: the outcome, the epic
  registry, and `stage: decided`. The four companion files design mode writes are
  absent on purpose, and `min_work.note` records that. The challenge stage ran as
  ADR-0024's eight-alternative analysis and the reviewer's two corrections.

## Verification record

- **Slice 6's rubric was amended on 2026-09-14, after implementation.** C3
  named the plan `interaction-design-gate` and required a 2b card that opens its
  document. That plan's 2b line is an approved `n/a (no UI)`, so it carries no
  `interaction-design.md`. Its card correctly holds no document, so the criterion
  was unsatisfiable. It also asked for a document the approved designs do not
  contain, which section 4 of `rubric-authoring.md` forbids.
- **The amended sheet holds six criteria, three of them critical.** C3 now
  requires a seeded plan that carries the file. A new C4 covers the `n/a` card.
  The earlier C4 and C5 are now C5 and C6. The amendment changed the acceptance
  sheet only, and no implementation file changed with it. Slice 6 scores 1.00
  against the amended sheet.
- **Two findings are recorded and not fixed.** Slice 6 C6's evidence line names
  `discover_plan_gate_docs()` as the shape to match. That function returns a
  discovery record of five keys. The entity shape comes from
  `project_program_design()`.
- **A pre-existing fallback can name a missing document.** `current_doc()` in
  `plugins/artifact/scripts/build_builds_view.py` returns the last gate and its
  document when every gate is answered. A plan whose last gate reads `n/a`
  therefore opens on a document it does not hold. That fallback predates this
  feature, and this feature added one more route to it.
- **The rail and the static page disagree about `n/a`.** The static page counts
  `n/a` as answered. The rail paints an `n/a` gate with the `wait` pill and the
  words "In progress". No criterion covers the rail's `n/a` styling.
- **No commit exists for this work.** Every file is on disk and the suite passes
  with `4 failed, 351 passed`. The four failures are the pre-existing `PIL` WebP
  failures.
