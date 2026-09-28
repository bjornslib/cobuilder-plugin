# Pull request draft: the Work drawer

**Design:** `work-drawer` (ADR-0034)
**Epic:** `work-drawer/E1` — the day-deck drawer holds the Work board
**Branch:** `design/work-drawer`
**Stage:** decided — this draft stays off the timeline until generate mode files it under a real pull request number.

## Title

`viewer: the Work board is a drawer — day deck, state filter, incremental search`

## Summary

The Work board stops being a page the reader travels to and becomes a drawer
over whatever Build or Review surface they were reading. One press on the Work
icon opens a vaul drawer at sixty percent of the viewport; a second snap point
at ninety-five percent reads a record tall. Inside, the board is the day deck:
five collapsible lanes in one vertical read, a state filter strip whose chips
the arrow keys step, an incremental search that marks its match and resets the
filter the moment it has a needle, and a detail pane beside the board that
follows the selection.

Decision records and unfinished pull requests are held out of the board by
rule — a settled decision is read in the Architecture level, and an
unmerged pull request is a change in flight, not work. The rule is pure,
unit-tested, and stated in the drawer's footer with the counts it held out.

## Epics

| Epic | Outcome | State |
|---|---|---|
| `work-drawer/E1` | the day-deck drawer holds the Work board: five collapsible lanes, a state filter the arrow keys step, an incremental search that resets the filter and auto-reads a single result, and a detail pane that follows the walk | open |

## Files

| File | Change |
|---|---|
| `plugins/artifact/viewer/package.json` | Add `vaul`, the engine under shadcn's Drawer. |
| `plugins/artifact/viewer/src/variations/work-drawer/` | Prototype A: the house kanban — five lane columns, incremental search, the corrected exclusion rule. The comparison. |
| `plugins/artifact/viewer/src/variations/work-drawer-deck/` | Prototype B: the day deck — the arrangement this design takes forward. |
| `docs/architecture/adr/ADR-0034-*.md` | The decision record. |
| `docs/plans/work-drawer/` | The implement plan: product, interaction design, ui-spec, program design, slices. |
| `.cobuilder/rubrics/work-drawer/` | The blind acceptance rubrics for the plan's slices. |

The shipped shell's `src/shell/Board.tsx` and the rail's board row are **not**
in this pull request. The port that retires the full-page board route is
`work-drawer`'s next epic, so the shipped surface never regresses while the
drawer is under review.

## Done when

`goal.json`'s `done_when` list, verbatim. The two abort conditions are the
height budget (no second scrollbar at 1280×800) and the pane's cost (the rows
stay readable below 900px with the pane open).