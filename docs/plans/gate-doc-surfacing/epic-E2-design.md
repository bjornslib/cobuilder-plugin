# Epic Technical Solution Design: E2 — Surface gate docs in the Builds view

Feature: gate-doc-surfacing
Epic ID: E2

## Scope and Intent
Make the Builds view's Gate Rail cards and epic design chips clickable,
opening a read-only sheet that shows a `program_design` or `epic_design`
entity's content. Depends on E1 shipping the entities first — this epic
reads `window.INDEX.entities.program_design`/`.epic_design`, both empty
arrays until E1 lands, so E2's tracer bullet is safe to build against a
fixture even before E1 slice 2 completes.

## Files Touched
- `plugins/artifact/viewer/index.html` — new sheet markup block (sibling of
  `#adr-sheet`, ~line 1022), new functions `openGateDocSheet(kind, id)`,
  `closeGateDocSheet()`, `renderGateDocSheet()`; extend
  `closeAnyOpenSheet()` (~line 4003) and `renderSheetVisibility()`
  (~line 3960) for mutual exclusivity; wire click handlers into
  `renderBuildsMainContent()`'s `gate-rail-grid` (~line 3249) and
  `renderEpicCard()` (~line 3282).

## Types & Signatures

```javascript
// state additions, alongside existing state.adrOpen / state.activeAdrId
state.gateDocOpen = false;
state.activeGateDocKind = null; // 'program' | 'epic'
state.activeGateDocId = null;   // matches program_design/epic_design id

function openGateDocSheet(kind, id){
  if (state.commentsOpen) state.commentsOpen = false;
  if (state.adrOpen) state.adrOpen = false;
  if (state.assessmentOpen) state.assessmentOpen = false;
  if (state.audioDialogOpen) stopAudio();
  state.gateDocOpen = true;
  state.activeGateDocKind = kind;
  state.activeGateDocId = id;
  renderGateDocSheet();
  renderSheetVisibility();
}
function closeGateDocSheet(){
  state.gateDocOpen = false;
  renderSheetVisibility();
}
function renderGateDocSheet(){
  const index = window.INDEX || {};
  const entities = index.entities || {};
  const table = state.activeGateDocKind === 'program'
    ? (entities.program_design || {})
    : (entities.epic_design || {});
  const record = table[state.activeGateDocId];
  // ... title/meta/body, reusing renderMarkdown() for record.body_md,
  // and the "record not captured" empty-card fallback openAdrSheet uses
  // when id/record is missing.
}
```

**Resolved during Gate 4b:** every existing `window.INDEX.entities.<type>`
is array-shaped (confirmed against `entities.adr`/`entities.epic` in the
current `data/index.json`), unlike the separate dict-shaped `window.ADRS`.
`program_design`/`epic_design` follow the same array convention as every
other entity, for consistency. `renderGateDocSheet` looks a record up with
`(entities.program_design || []).find(r => r.id === id)` (or the
`epic_design` equivalent) rather than a dict key access.

## Slice Decomposition
1. **Slice 4 (tracer bullet).** Sheet markup + `openGateDocSheet`/
   `closeGateDocSheet`/`renderSheetVisibility` wiring, gate-rail-grid card
   click handler. Renders title only, empty body — proves the plumbing
   without depending on E1's real content.
2. **Slice 5 (real content).** `renderGateDocSheet` renders `body_md` via
   `renderMarkdown()`. Epic card design-doc chip added to `renderEpicCard`.
   Depends on E1 slice 2 (real entities) for a meaningful demo, but the
   render code itself only depends on slice 4's plumbing.
3. **Slice 6 (edge cases).** No-`doc` gate card stays non-interactive
   (no click handler attached at all, not a handler that no-ops); mutual
   exclusivity with `#adr-sheet`/`#assessment-sheet`/comments drawer/audio
   dialog, both directions.

## Test Plan
No JS test harness exists in this repo for the viewer (it is one static
HTML file with no build step, per ADR-0001/ADR-0020). Verification is
manual, via the `run` skill or a direct `python3 -m http.server` serve of
`.cobuilder-architect/self/`, exercising:
- a Gate Rail card with a `doc` opens the sheet and shows body content
  (slice 4+5)
- a Gate Rail card with no `doc` has no click affordance (slice 6)
- opening the gate-doc sheet while the ADR sheet is open closes the ADR
  sheet, and vice versa (slice 6)
- an epic card with `design_doc` shows a chip; clicking it opens the sheet
  scoped to that epic's doc (slice 5)

## Risks & Open Questions
- No JS test harness means slices 4-6 lean on manual dogfood verification
  more than the repo's usual pytest-backed rigor. Rubric criteria for this
  epic's slices are written as concrete manual-check steps, not automated
  assertions, for this reason.
