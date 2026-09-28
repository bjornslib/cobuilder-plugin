# Program design: Work drawer

## Scope and Intent

The day-deck drawer prototype (`plugins/artifact/viewer/src/variations/work-drawer-deck/`) takes the seven refinements the engineer reviewed into its behaviour. The drawer stays the prototype surface: no shipped file changes, because the port that retires the full-page board route is the design's next epic. The refinements are behavioural, so the program is small: the search owns the result set and the filter, the selection follows the result set, and the arrows walk the two structures without stealing each other's keys.

## Files Touched

| File | Change |
|---|---|
| `plugins/artifact/viewer/src/variations/work-drawer-deck/index.tsx` | The drawer body's behaviour: search typing resets the lane filter to `All`; slash focuses the field from anywhere in the open drawer; a single-result search selects the row; `←`/`→` step the active filter chip when the strip holds the focus. The header drops the held-out text. |
| `plugins/artifact/viewer/src/variations/work-drawer-deck/detail.tsx` | The pane's buttons read `Open work item` and `Close`. |
| `plugins/artifact/viewer/src/variations/work-drawer-deck/rules.test.ts` (new) | Unit tests beside the rules the drawer states: the filter reset, the search predicate, the single-result rule, and the chip walk, run pure against rows shaped like the real bundle. |

The shipped files (`src/shell/Board.tsx`, `src/shell/Rail.tsx`, `src/shell/model.ts`) are touched by nothing in this plan.

## Types & Signatures

```ts
// work-drawer-deck/deck.ts — already pure; unchanged in shape
export function matches(row: DesignRow, needle: string): boolean;
export function laneRows(lane: Lane, rows: DesignRow[], needle: string): DesignRow[];
export function walkedRows(lanes: Lane[], rows: DesignRow[], needle: string): DesignRow[];

// work-drawer-deck/index.tsx — the new pure rules the slices state
// Typing resets the filter: the search owns the result set, so the filter
// resets the moment the search has a needle.
export function filterForTyping(current: string): string; // → "all"
// A single result reads itself: the selection follows the result set.
export function soleOf(rows: DesignRow[]): DesignRow | null;
// The arrows step the filter strip through the lanes' vocabulary.
export function chipStepped(current: string, step: 1 | -1, chips: string[]): string;
```

## Slice Decomposition

| Epic | Slices | Rule |
|---|---|---|
| `work-drawer/E1` | 1 — the search owns the result set | The search, the filter reset, the focus rule, and the single-result read, in one slice, because the four effects share one state machine (needle → result set → selection). |
| `work-drawer/E2` | 1 — labels and the filter walk | The label renames, the header line's drop, and the chip walk, in one slice, because the label changes and the walk land on the same two files and score against the same reading. |

One slice per epic, so no epic technical solution design is required by Gate 4b.

## Test Plan

1. **Unit (beside the rules).** `works.test.tsx` runs the pure rules against fixture rows shaped like the real bundle: a needle resets to `all`; a predicate over name, id, stage, outcome, epics, branches, and pull request numbers; a sole of one and of many; a chip step that walks `All → lanes → back` and stops at the ends.
2. **Keyboard, in Chrome with real key events.** Open the drawer; press `/` from a row and read the caret in the field; type `gate` and read two lanes' rows refine; widen the filter and read the counts move; press `←` from `Ready to build` and read `All` active; press `↓` and read the row select and the pane open; press `Enter` on the deck and read the record tall; press it again and read the deck drop back.
3. **Repository gates.** `npm run typecheck`, `npm run test` (181 passing, none skipped), and `npm run build`, whose output rewrites the committed viewer unchanged in shape.

## Risks & Open Questions

- The single-result auto-read surprises a reader who keeps typing. The rule is written: the selection follows the result set, and a second character that widens the set past one clears it. The reading in the slice loop measures exactly this.
- The chip walk needs a focus home. The strip's group container takes `tabIndex={0}` and the arrows act while it holds the focus, so left and right never type into the search field by accident and never steal the row walk.
- The footer's rule sentence replaces the header's held-out text; the rule must stay stated somewhere, or a reader who expected a row finds no reason. The footer carries it permanently.