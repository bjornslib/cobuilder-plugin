# Branch design-gate-doc-surfacing

## Problem

Gate 3 program-design docs and Gate 4b epic technical-design docs live at docs/plans/<slug>/*.md, but the viewer's index tracks only adr, design, epic, slice, and pull_request entities. A reviewer who wants to watch a build's Gate 3 progress in the viewer sees nothing: the Gate Rail already shows approval state from 00-status.md, but never the document content behind it. A prior session's workaround was publishing the doc as a one-off Claude Artifact, disconnected from docs/plans/ with no rebuild hook and undiscoverable from the viewer.

The gap surfaced live when an engineer asked to see a Gate 3 design in the viewer and the agent found no entity for it. The Builds view (renderBuildsMainContent) already renders a Gate Rail and epic cards, which are the natural attachment point for a doc link, so the fix slots into an existing surface rather than adding a new one.

## Why this approach

Extend shared/build_index.py with discover_plan_gate_docs()/project_program_design()/project_epic_design(), following the existing GOAL_FIELDS/project_fields(source, fields) pattern, to project docs/plans/<slug>/03-program-design.md and epic-<id>-design.md into two new index entities, program_design and epic_design (ADR-0022). resolve_feature_gates() now attaches a doc reference to a feature's Gate 3 entry when a program-design doc exists. In the viewer, Gate Rail cards became clickable, opening a sheet modeled on the existing ADR sheet, and epic cards with an approved Gate 4b design gained a design-doc chip. Both entities and the viewer change are covered by tests/test_build_index_gate_docs.py (10 cases). Separately, while using this plugin's implement workflow in an unrelated sister repo, two defects surfaced in plugins/implement/skills/build/workflows/slice-loop.js: it invoked the Workflow tool with `name: "slice-loop"`, which only resolves built-in or .claude/workflows/-registered workflows and never finds a plugin-shipped script, and it imported node:fs and called existsSync() for a Gate 4b check, which workflow scripts cannot do because they run with no filesystem access at all (and the import also violated the requirement that `export const meta` be the script's first statement). Both are fixed here: the SKILL.md and reference doc now say to invoke with `scriptPath`, and the existence check moves to the orchestrating session (e.g. via verify_gate.py), which passes the result in as each slice's new `epicDesignExists` field.

## Alternatives considered

- **Add a new top-level 'Plans' or 'Gate Docs' tab in the viewer** — rejected because ADR-0018 decided one lifecycle surface with a derived record index precisely to stop the reading surface count from growing per artifact type. A gate doc is scoped to a build already living in the viewer's Builds view (district: viewer), a sibling tab duplicates that context instead of joining it.
- **Parse gate docs ad hoc in the viewer's client-side JS at render time, skipping the index** — rejected because ADR-0018's whole point is that joins get resolved once, in build_index.py, not scattered across client fetches. The viewer is also a single committed HTML file with no direct filesystem access model beyond its bundled data/ scripts (district: viewer): it cannot read docs/plans/ at render time at all.
- **Split viewer/index.html into parts now, and add gate docs to the new module structure** — rejected because ADR-0020 decided the viewer-parts split but is explicitly not executed yet. Starting that execution as a side effect of this design is scope creep this design does not own.
- **Keep publishing gate docs as one-off Claude Artifacts** — rejected because This is the workaround that exposed the gap: no rebuild hook ties it to docs/plans/, so it drifts, and it is not discoverable from the viewer itself.
- **For the slice-loop fix, have the orchestrating session poll or retry existsSync inside the workflow script** — rejected because Workflow scripts have no filesystem or Node.js API access at all (confirmed against the tool's own authoring reference), so no retry inside the script can make the check work. The only place the check can run is the orchestrating session, before it invokes the workflow.

## Out of scope

- a new top-level viewer tab for plans or gate docs
- editing a gate doc from the viewer, read-only sheet only
- changing how 00-status.md's approval state is parsed or displayed
- PDF or standalone-artifact export of a gate doc
- executing ADR-0020's viewer-parts split, this design writes into the current monolithic viewer/index.html
- re-scoring or re-running any slice that already ran under the old, broken slice-loop.js invocation

## Risks

- a gate doc grows long enough that the sheet reading UX (built for ADR text, a few hundred lines) degrades
- program_design/epic_design entity ids collide with, or get confused with, the existing epic entity's <design>/<epic-id> scoping
- the sheet becomes stale between build_index.py runs the same way the pre-fix Artifact was, if a future gate step forgets to rebuild
- a future edit to slice-loop.js reintroduces a Node.js API call (fs, path, etc.) above the meta literal, which fails the same two ways this fix corrects

## How this was tested

tests/test_build_index_gate_docs.py (10 cases) covers discover_plan_gate_docs, project_program_design, project_epic_design, and the Gate 3 doc-reference attachment in resolve_feature_gates. E2 was verified live in-browser against the running viewer (see commit 651b07a). The slice-loop.js fix was verified by reading the workflow-authoring reference's constraints (no filesystem access, meta must be the first statement) and by running the full pytest suite (322 passed, 4 pre-existing unrelated Pillow/webp failures from an arch-mismatched local Pillow install) after the change; no automated test exercises the Workflow tool invocation itself, since that requires the tool's runtime.

## Where to focus

- whether program_design/epic_design entity ids collide with the epic entity's own id scheme
- whether the sheet UX holds up for a long program-design doc
- whether the Gate Rail card / epic chip is discoverable without extra instruction
- whether bundling the unrelated slice-loop.js fix into this design's PR, rather than a separate PR, is acceptable given it was found while dogfooding this same plugin

The author flagged these parts as not fully understood:

- how large a typical 03-program-design.md or epic-<id>-design.md gets across real features, and whether the sheet needs pagination or truncation
- whether a design with no docs/plans/<slug>/ directory at all (a design never taken to implement mode) should render an empty Gate Rail or hide it entirely

---

_Intent inferred from the PR body, the commit messages, and the branch name. Not stated by the author._
_Authorship: agent-assisted._
