## Problem

Gate 3 program-design docs (`03-program-design.md`) and Gate 4b epic
technical-design docs (`epic-<id>-design.md`) live under
`docs/plans/<slug>/`, but the viewer's index tracks only five entity
types — `adr`, `design`, `epic`, `slice`, `pull_request`. A build's Gate
Rail in the Builds view already shows approval state, read from
`00-status.md`, but the document behind each gate never appears. A
colleague session mid-Gate-3 hit this directly: asked the viewer to show
the design, found nothing indexed, and worked around it by publishing the
doc as a one-off Claude Artifact.

## Why this approach

Add two new index entities, `program_design` and `epic_design`, projected
from `docs/plans/<slug>/*.md` by `shared/build_index.py`, following the
same `project_fields(source, fields)` pattern every other entity already
uses (`GOAL_FIELDS`, `EPIC_FIELDS`, `INTENT_FIELDS`, `ASSESSMENT_FIELDS`).
Key `program_design` on `feature_slug`, matching `joins.feature_gates`.
Key `epic_design` on epic id, matching `entities.epic`. No new join table.

In the viewer, make the Gate Rail cards in `renderBuildsMainContent`
clickable, opening a read-only sheet modeled on the existing
`openAdrSheet`. Add a design-doc chip to an epic card that has an approved
4b design, opening the same sheet type scoped to that epic.

## Alternatives considered

- **A new top-level Plans tab** — rejected because ADR-0018 decided one
  lifecycle surface with a derived record index specifically to stop the
  reading-surface count growing per artifact type. A gate doc is scoped to
  a build already shown in the Builds view.
- **Parse gate docs client-side at render time, skipping the index** —
  rejected because the viewer is one committed HTML file with no
  filesystem access beyond its bundled `data/*.js` scripts, and because
  ADR-0018's whole point is resolving joins once, in `build_index.py`.
- **Execute ADR-0020's viewer-parts split as part of this design** —
  rejected because ADR-0020 is decided but explicitly not executed yet.
  Starting that execution as a side effect here is scope this design does
  not own.
- **Keep publishing gate docs as one-off Claude Artifacts** — rejected
  because it is the workaround that exposed the gap: no rebuild hook ties
  it to `docs/plans/`, so it drifts, and it is not discoverable from the
  viewer itself.

## Out of scope

- A new top-level viewer tab.
- Editing a gate doc from the viewer — read-only sheet only.
- Changing how `00-status.md`'s approval state is parsed or displayed.
- PDF or standalone-artifact export of a gate doc.
- Executing ADR-0020's viewer-parts split.

## Risks

- A gate doc can run considerably longer than the ADR text the sheet
  pattern was built for. Untested whether the same sheet component reads
  well at that length.
- `program_design`/`epic_design` entity ids could be confused with the
  existing epic entity's `<design>/<epic-id>` scoping if not kept
  distinct.
- The sheet goes stale if a future gate step skips the bundle rebuild —
  mitigated by the viewer-rebuild-per-gate step already added to
  `implement/skills/build/SKILL.md`'s approval protocol.

## How this was tested

No code changes yet; this design writes `docs/` artifacts only.
Verification for this pass: `goal.json` parses, `build_index.py` runs
clean and picks up the new backlog design, and the existing 312-test
packaging suite passes unaffected. Implementation-time verification is
described in `goal.json.done_when`.

## Where to focus

- Whether the sheet UX holds up for a real, long program-design doc — try
  it against this repo's own `docs/plans/cobuilder-family/03-program-design.md`.
- Whether `program_design`/`epic_design` entity ids collide with, or read
  as confusable with, the epic entity's own id scheme.
- Whether the Gate Rail's current hardcoded four-gate fallback for a
  design with no `docs/plans/<slug>/` directory still makes sense once
  real per-design gate data exists for designs other than
  `cobuilder-family`.

The author flagged these parts as not fully understood:
- How large a typical gate doc gets across real features in practice —
  unverified beyond this repo's own examples.

---

Authorship: agent-generated.
