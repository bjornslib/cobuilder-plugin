# Product: Work drawer

## Outcome

The Work board opens as a drawer over the surface the reader is on, holds the
bundle's work on five collapsible lanes, narrows by state and by search, and
reads a record beside the board without a navigation round trip.

## Screens

| Screen | Purpose |
|---|---|
| Work drawer (over any shell surface) | The one screen this plan changes. Opens from the Work icon in the top-left; closes with Escape, an overlay press, or the drawer's own drag. |

No new page. The shell surface beneath the drawer is the reader's own and is
not changed by this plan.

## The reader's questions, answered in place

1. **Where does the work stand?** The lanes: needs a decision, ready to build,
   in review, shipped, superseded — each with its count, each foldable.
2. **What should I work on next?** The first live lane is the first the board
   holds, and the state filter narrows the board to one answer.
3. **Where is that thing I half remember?** The search: a needle over names,
   ids, stages, outcomes, epics, branches, and pull request numbers, refined
   as the reader types.
4. **What is in it?** The detail pane: the outcome prose, the six authored
   record marks, the epics with their refined states, and the merged pull
   requests.

## What the board holds

Designs only. A decision record is settled and is read in the Architecture
level; a pull request that is not merged is a change in flight. Neither is a
work item. The drawer's footer states the rule with the counts it held out —
the footer, and no longer the header, so the header keeps the one number the
reader came for: what the board holds.