# Architecture: Gate doc surfacing

## Fit
- `shared/build_index.py` — existing `collect_designs()` (build_index.py:342-457)
  and its `GOAL_FIELDS`/`EPIC_FIELDS`/`project_fields()` pattern
  (build_index.py:230-268) get two siblings: `PROGRAM_DESIGN_FIELDS`,
  `EPIC_DESIGN_FIELDS`, `project_program_design()`, `project_epic_design()`.
  `resolve_feature_gates()` (build_index.py:967-990) gains an optional
  `doc` key per gate entry.
- `plugins/artifact/viewer/index.html` — `renderBuildsMainContent()`
  (~line 3202), its `gate-rail-grid` cards (~line 3249) and
  `renderEpicCard()` (~line 3282) get click handlers. The existing
  `openAdrSheet`/`renderAdrSheet`/`renderMarkdown` (lines 3978-4082) give a
  ready-made sheet and markdown renderer to reuse for the new sheet, rather
  than building either from scratch.

## Endpoints
none — this is a static-bundle projection and client-side viewer change,
no server.

## Data
- `data/index.json` gains two entity arrays: `program_design` and
  `epic_design`.
  - `program_design`: `{feature_slug, gate: 3, title, body_md, approved_date, source_path}`
  - `epic_design`: `{epic_id, feature_slug, title, body_md, approved_date, source_path}`
- `joins.feature_gates[slug][n]` gains an optional `doc: <program_design id>`
  key when a matching doc exists for that feature+gate.
- `entities.epic[].design_doc` gains an optional `<epic_design id>` when a
  4b design exists for that epic.

## Flow
1. `build_index.py` walks `docs/plans/*/`. For each plan directory, it
   reads `03-program-design.md` if present and projects one
   `program_design` entity keyed on the directory's slug. It reads every
   `epic-*-design.md` and projects one `epic_design` entity per file, keyed
   on the epic id parsed from the filename.
2. `resolve_feature_gates()` looks up the `program_design` id for a
   feature's Gate 3 entry and attaches it as `doc`.
3. In the viewer, `renderBuildsMainContent()` reads `window.INDEX.entities.program_design`
   and `.epic_design` (falling back to empty objects if absent, so an older
   bundle degrades to today's non-clickable cards). A Gate Rail card with a
   `doc` becomes clickable; clicking calls `openGateDocSheet(id)`, which
   reuses `renderMarkdown()` to render `body_md` into the existing sheet
   markup pattern.
4. An epic card with a `design_doc` gets a small chip; clicking it opens
   the same sheet type, scoped to that epic's doc.

## External
none.
