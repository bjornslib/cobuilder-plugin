# Slice plan: Work drawer

| # | Epic | Slice | Ends with | Score | State |
|---|---|---|---|---|---|
| | **`work-drawer/E1` — The search owns the result set.** Typing resets the filter to All, slash focuses the field from anywhere on the board, and a single-result search reads itself. | | | | |
| 1 | `work-drawer/E1` | The search owns the result set: the needle drives the filter, the focus, and the self-read | In Chrome with real key events: pressing `/` from any row moves the caret into the field; typing `gate` resets the filter to All, refines the rows, and marks each hit; a needle that resolves to one work item selects it and opens the pane with no second press, and a second character that widens the set past one clears it. The repository's typecheck, tests, and build hold. | — | pending |
| | **`work-drawer/E2` — Labels and the filter walk.** The header keeps the board's own fact, the pane's buttons say what they do, and the arrows step the filter. | | | | |
| 2 | `work-drawer/E2` | Labels and the filter walk: the renames, the header line, and the chip walk | The drawer's header carries the title, the design count, and the shown count, and no held-out text; the pane's buttons read "Open work item" and "Close"; pressing `←`/`→` while the strip holds the focus moves the active chip through the lanes' vocabulary and stops at the ends. The repository's typecheck, tests, and build hold. | — | pending |

Both slices end in a browser reading on the real bundle. The two slices share
no criterion; slice 1 owns the search behaviour, slice 2 owns the labels and
the chip walk.