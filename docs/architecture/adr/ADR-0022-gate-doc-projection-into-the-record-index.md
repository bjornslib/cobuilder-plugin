---
# --- doc-gardener required frontmatter ---
title: "ADR-0022 — Gate documents projected into the record index"
status: active
type: architecture
last_verified: 2026-09-01
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0022
name: "Gate documents projected into the record index"
state: decided
groups: [viewer, data-model]
approved_by: ""
problem: "Gate 3 program-design docs and Gate 4b epic technical-design docs live under docs/plans/<slug>/, but the viewer's index (ADR-0018) tracks only adr, design, epic, slice, and pull_request entities. A reviewer watching a build's progress in the viewer sees the Gate Rail's approval state but never the document behind a gate, and the workaround — a one-off Claude Artifact publish — drifts from the source and is undiscoverable from the viewer itself."
decision: "Add two new index entities, program_design and epic_design, projected from docs/plans/<slug>/03-program-design.md and epic-<id>-design.md by shared/build_index.py, and surface them as a clickable state on the Builds view's existing Gate Rail cards and epic cards, rather than as a new viewer tab or a continued ad hoc Artifact-publish workflow."
alternatives:
  - option: "A new top-level Plans or Gate Docs tab in the viewer"
    rejected_because: "ADR-0018 decided one lifecycle surface with a derived record index specifically to stop the reading-surface count growing per artifact type. A gate doc is scoped to a build already shown in the Builds view."
  - option: "Parse gate docs client-side in the viewer at render time, skipping the index"
    rejected_because: "The viewer is one committed HTML file with no filesystem access beyond its bundled data/*.js scripts. ADR-0018's record index exists to resolve joins once, not to be bypassed per artifact type."
  - option: "Execute ADR-0020's viewer-parts split as part of this change"
    rejected_because: "ADR-0020 is decided but explicitly not executed yet. Starting that execution as a side effect of this narrower change is scope it does not own."
  - option: "Keep publishing gate docs as one-off Claude Artifacts"
    rejected_because: "This is the workaround that exposed the gap: no rebuild hook ties it to docs/plans/, so it drifts, and it is not discoverable from the viewer itself."
forces:
  - "The Builds view (renderBuildsMainContent) already renders a Gate Rail keyed on feature_slug and epic cards keyed on epic id — both keys a gate doc can reuse without a new join table."
  - "shared/build_index.py already has a field-projection pattern (GOAL_FIELDS/EPIC_FIELDS/INTENT_FIELDS/ASSESSMENT_FIELDS plus project_fields) that a new entity type should extend, not replace."
  - "The viewer ships as one self-contained file today (ADR-0001, narrowed by ADR-0020), so any UI change lands in plugins/artifact/viewer/index.html directly."
related_decisions:
  - { type: depends-on, target: ADR-0018 }
  - { type: is-related-to, target: ADR-0020 }
history:
  - { state: decided, date: 2026-09-01 }
maps_to:
  context: viewer
  modules: [shared/build_index.py, plugins/artifact/viewer/index.html]
  rule: "A gate document is indexed and read-only from the viewer, joined to its build by the same key (feature_slug or epic id) the build's own Gate Rail or epic card already carries. Never a new top-level reading surface for it."
delivers:
  capability: "A reviewer reads a build's Gate 3 program design or Gate 4b epic design from inside the odyssey viewer, without leaving it for a one-off Artifact or a raw file."
  benefit: "The gate doc a reviewer reads is always the current one, rebuilt with the rest of the index, instead of a snapshot that can silently drift from docs/plans/."
  beneficiary: [operator, developer]
related:
  - "docs/architecture/designs/gate-doc-surfacing/goal.json"
---

# ADR-0022 — Gate documents projected into the record index

## Context

`implement`'s build skill produces two authored documents per feature
that the viewer never reads: `docs/plans/<slug>/03-program-design.md`
(Gate 3, one per feature) and `docs/plans/<slug>/epic-<id>-design.md`
(Gate 4b, one per multi-slice epic). `shared/build_index.py`'s
`resolve_feature_gates()` already parses `00-status.md` to show each
gate's approval state on the Builds view's Gate Rail, but it has never
read the gate document's content. A colleague session approving Gate 3
asked to see the program design in the viewer and found nothing indexed
for it — a real gap, not a bug, because the index's five entity types
(`adr`, `design`, `epic`, `slice`, `pull_request`) have no sixth for a
gate document. The immediate fix was publishing the doc as a standalone
Claude Artifact, which reads well once but has no rebuild hook back to
`docs/plans/` and is not discoverable from the viewer itself.

## Options considered

1. **A new top-level viewer tab for plans or gate docs.** Rejected.
   ADR-0018 decided one lifecycle surface precisely to stop the reading
   surface count growing with every new artifact type. A gate doc has no
   independent existence — it is always scoped to one build, which the
   Builds view already renders.
2. **Client-side parsing in the viewer at render time.** Rejected. The
   viewer is one committed HTML file with access only to its bundled
   `data/*.js` scripts, never the raw repository tree, so this option is
   not mechanically available even before weighing it against ADR-0018.
3. **Execute ADR-0020's viewer-parts split now, and add gate docs to the
   new structure.** Rejected. ADR-0020 is decided, not executed — CLAUDE.md
   is explicit that `viewer/src/` does not exist yet and the viewer is
   still one committed file. Bundling that execution into this narrower
   change would make this decision own scope it did not ask for.
4. **Two new index entities, surfaced on the existing Gate Rail and epic
   cards (chosen).** `program_design` keys on `feature_slug`, matching
   `joins.feature_gates`. `epic_design` keys on epic id, matching
   `entities.epic`. Both follow the existing `project_fields(source,
   fields)` pattern. The viewer makes a Gate Rail card and, where an
   approved 4b design exists, an epic card, clickable — opening a
   read-only sheet modeled on the existing `openAdrSheet`.

## Decision

Add `program_design` and `epic_design` as index entities in
`shared/build_index.py`, projected from `docs/plans/<slug>/*.md`. Surface
them as a clickable state on `plugins/artifact/viewer/index.html`'s
existing Gate Rail cards and epic cards, in `renderBuildsMainContent`.
No new join table: both entities key on values the Builds view already
carries. Out of scope: a new viewer tab, editing a gate doc from the
viewer, and any change to how `00-status.md`'s own approval-state line is
parsed or displayed.

## Consequences

- **Positive:** A gate document becomes readable from the one surface
  already built to show a build's progress, kept current by the same
  `build_index.py` rebuild every other entity relies on.
- **Constraint introduced:** A gate document is indexed and read-only from
  the viewer, joined to its build by the key the build's own Gate Rail or
  epic card already carries. It never gets a new top-level reading
  surface.
- **Negative / accepted:** The sheet pattern (`openAdrSheet`) was built for
  ADR-length text. A long program-design doc may not read as well in the
  same component; this is deferred to implementation-time verification
  against a real doc, not resolved here.

## Value delivered

- **New capability:** A reviewer reads a build's Gate 3 or Gate 4b document
  from inside the odyssey viewer.
- **Benefit:** The document a reviewer sees is always the current one,
  rebuilt with the index, rather than a one-off Artifact snapshot that can
  drift from `docs/plans/` with no warning.
- **Beneficiary:** operator, developer.

## Maps to

Context `viewer`, module(s) `shared/build_index.py`,
`plugins/artifact/viewer/index.html`. See the boundary record's rule and
the context canvas.
