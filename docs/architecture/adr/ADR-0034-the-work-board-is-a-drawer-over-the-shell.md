---
# --- doc-gardener required frontmatter ---
title: "ADR-0034 — The Work board is a drawer over the shell, and the board's rows are work only"
status: active
type: architecture
last_verified: 2026-09-28
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0034
source_pr: null
name: "The Work board is a drawer over the shell, and the board's rows are work only"
state: decided
groups: [viewer, work, interaction]
approved_by: "bjornslib"
problem: "The viewer's Work board is a page the reader must travel to, and it lists things that are not work. A reader on a Build or Review surface pays a navigation round trip for every item they survey or inspect. The board's filter groups offer statuses no reader asked for — including unfinished pull requests, which are a change in flight rather than a work item — and mix in rows that no design carries. It holds no search. The build and review surfaces read well; the board does not."
decision: "The Work board becomes a vaul bottom drawer (the engine under shadcn's Drawer) opened by the shell's own Work icon, at two snap points: 0.6, where it opens, and 0.95, where a record reads tall. The board inside is the day-deck arrangement, prototyped twice against the repository's real record index: five collapsible lanes in one vertical read, a state filter strip whose chips the arrow keys step, an incremental search that marks its match, resets the filter the moment it has a needle, and auto-reads a result set of exactly one, and a detail pane beside the board that follows the selection. A decision record and a pull request that is not merged are not work: a decision is settled the day it is filed and is read in the Architecture level, and an unmerged pull request is a change in flight that a design's own card reads as evidence. Both are held out by rule. The rule is pure, unit-tested, and stated in the drawer's footer with the counts it held out."
alternatives:
  - option: "Keep the full-page board; add the search and the corrected filters to it"
    rejected_because: "It fixes the filters and fixes nothing about the navigation round trip, which is the defect the engineer named first. The drawer arrangement was approved against two working prototypes, not described."
  - option: "A command palette over the shell"
    rejected_because: "It answers 'find this item' and cannot answer 'survey the work'. The lanes are the survey. The palette's speed survives in the drawer's keyboard walk: slash finds the field, the arrows walk rows and chips, Enter reads a record tall."
  - option: "A modal dialog at the same height"
    rejected_because: "The snap is the feature the prototypes measured. One reader opens at 0.6 and another drags to 0.95 for the whole board, and neither re-learns anything. A modal opens at one height or maintains two code paths."
  - option: "Five kanban lane columns inside the drawer (prototype A's arrangement)"
    rejected_because: "Built and compared. Five columns behind a sideways scroll spend the drawer's width on chrome and need a second scrollbar inside every lane body. The day deck's vertical read fits the 0.6 snap with one scroll, and the fold plus the state filter answer the depth."
consequences:
  - "The board's row vocabulary is designs only, by rule. A surface that wants to list decisions or unfinished pull requests must say so in its own words."
  - "The drawer adopts vaul as the viewer's drawer engine. The shadcn Sheet that opens ADRs stays the separate slide-over mechanism, and the Sidebar rail's mobile drawer is unchanged."
  - "The exclusion predicate lives beside the data layer's own readers and resolves no join of its own, per the C1 conformance criterion."
forces:
  - "A reader mid-read on a Build or Review surface loses the surface's scroll position when they travel to the board and back."
  - "The board's full page is a second navigation surface with its own filters, which multiplied the vocabularies a reader must hold."
  - "The keyboard walk a reader already holds on the rail (ArrowDown/ArrowUp) should keep working; a second walk that collides with it breaks both."
  - "A drawer is transient and the snap heights carry a reader from survey to tall-read without a page change."
history:
  - { state: proposed, date: 2026-09-28 }
  - { state: decided, date: 2026-09-28, by: bjornslib, note: "Decided against prototype B (the day deck) after prototype A (five kanban columns) was built and compared. Ported into the shipped shell the same day under docs/plans/work-drawer, and the bare route now opens the drawer over an empty landing." }
maps_to:
  context: cobuilder-packaging
  modules: [plugins/artifact/viewer/src/shell/WorkDrawer.tsx, plugins/artifact/viewer/src/shell/workDeck.ts, plugins/artifact/viewer/src/shell/App.tsx, plugins/artifact/viewer/src/shell/TopBar.tsx]
  rule: "A surface's read state stays where it is when the board is consulted; the drawer overlays it and the bare route opens the drawer over an empty landing, so no full-page board route remains."
delivers:
  capability: "A reader surveys every design in the bundle, filters by state, and searches as they type, over whatever surface they were reading — and one tap takes them into the record."
  benefit: "Surveying the work costs no navigation round trip, so review and build keep their place; every exclusion is stated with counts rather than silently dropped."
  beneficiary: [developer, operator]
notes: "The two prototypes at plugins/artifact/viewer/src/variations/work-drawer (A) and work-drawer-deck (B, the arrangement this record takes forward) are this record's evidence, built against the real bundle on 2026-09-28 and refined twice under the engineer's review the same day. Both prototypes were removed from the viewer source on 2026-10-08. Git history holds them."
related:
  - "docs/architecture/designs/work-drawer/goal.json"
  - "docs/plans/work-drawer/00-status.md"
---
