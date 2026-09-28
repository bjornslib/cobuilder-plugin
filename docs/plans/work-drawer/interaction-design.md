# Interaction design: Work drawer

Feature: `work-drawer`. One screen changes: the Work drawer over any shell
surface. The reader's own surface beneath the drawer is unchanged.

## 1. Vocabulary

| Word | Meaning |
|---|---|
| Drawer | The vaul bottom sheet holding the Work board. Snap points 0.6 and 0.95 of the viewport. |
| Deck | The board inside the drawer: five lanes, one vertical read. |
| Lane | One state of work. Five lanes: needs a decision, ready to build, in review, shipped, superseded. Each folds. |
| Filter chip | One control of the state strip: `All` plus one per lane. One chip is active at a time. |
| Row | One work item on the deck: one design, one line. |
| Pane | The detail pane beside the deck, showing the selected row's record. |

## 2. Information Architecture

The drawer is an overlay, not a route. It holds no address and writes no
history entry; the shell's address stays whatever the reader's surface names.
The deck's structure is flat: header, search, filter strip, lanes, footer.
The pane sits beside the lanes, not above them, so the record and the board
compare without a scroll.

### 2.3 Declared Defaults

| State | Default |
|---|---|
| Drawer open | Snap 0.6. Never opens tall. |
| Search field | Focused on open, empty. |
| State filter | `All`. |
| Lanes | All five unfolded. |
| Selection | None. The pane shows nothing when no row is selected. |
| Search needle | Cleared when the drawer closes. |

## 3. Controls

### 3.1 Inventory

| Control | Kind | Behaviour |
|---|---|---|
| Work icon (top-left) | Button | Opens the drawer. |
| Search field | Text input | Refines the rows as the reader types. Typing any character resets the state filter to `All`. A result set of exactly one selects that row. |
| Filter chip | Button ×6 | Sets the active lane set. `All` restores the whole board. |
| Lane header | Collapsible trigger ×5 | Folds and unfolds the lane's rows. A folded lane leaves the walk and the counts. |
| Row | Button | Selects. Pressing the selected row again closes the pane and drops the drawer to 0.6. |
| Pane: Open work item | Link | Opens the shell's address for the selected design. |
| Pane: Close | Button | Clears the selection and drops the drawer to 0.6. |

### 3.2 Component States

| Component | Rest | Hover | Active | Focus |
|---|---|---|---|---|
| Work icon | surface + line | accent wash, primary border | — | visible ring |
| Search field | line, placeholder ink-faint | — | caret | visible ring on the field's container |
| Filter chip, inactive | line, ink-mid | primary/60 border | — | visible ring |
| Filter chip, active | primary border, accent wash, accent-deep ink | — | pressed | visible ring |
| Lane header | line underline | surface-2 wash | — | visible ring |
| Row, unselected | transparent border-left | surface-2 wash | — | visible ring |
| Row, selected | primary border-left, accent wash | — | pressed | visible ring |
| Pane buttons | card + line | surface-2 wash | — | visible ring |

### 3.3 Visibility Gating

| Thing | Visible when |
|---|---|
| Detail pane | Exactly while a row is selected. The pane follows the walk. |
| Search clear button | While the field holds a needle. |
| Lane body | While the lane is unfolded. |
| Lane empty state | While the lane is unfolded and holds no row: "no match" under a needle, the lane's own empty sentence otherwise. |
| Board empty state | While no visible lane holds a row: the sentence names the cause (a needle, or every lane folded). |
| Held-out counts | In the footer, always. The header carries no held-out text. |

## 4. Motion

### 4.1 Transition Table

| From | To | Motion |
|---|---|---|
| Drawer closed | Drawer open at 0.6 | vaul's spring, the drawer's own |
| Drawer 0.6 | Drawer 0.95 (Enter reads a record tall) | vaul's snap spring |
| Rows entering the deck | Settled | 160 ms, 6px sideways, stagger capped at 100 ms |
| Fold | Unfold | Radix Collapsible's own, 150 ms |
| Selection moved | New row | no transition; the row scrolls itself minimally into view |

### 4.2 Timing Tokens

| Token | Value | Used by |
|---|---|---|
| `--ease` | cubic-bezier(0.22, 0.75, 0.3, 1) | every transition on this surface |
| Row enter | 160 ms | deck rows |
| Stagger cap | 100 ms | deck rows, `min(index * 8ms, 100ms)` |
| Chip / fold | 150 ms | filter chips, lane folds |
| Reduced motion | off whole | `useReducedMotion` turns every entrance off |

## 5. The keyboard contract

The contract says what the machine does, and the machine's Escape is Radix's:
the dismissable layer listens in the capture phase, so a bubble-phase handler
never sees Escape.

| Key | Where | Effect |
|---|---|---|
| `/` | anywhere in the open drawer | Cursor moves into the search field. From the field itself, no-op. |
| `←` / `→` | the filter strip (and nowhere else) | The previous / next chip becomes active. The walk stops at the ends. |
| `↑` / `↓`, `k` / `j` | the deck (and the field: the arrows only) | The previous / next visible row selects. The pane follows. |
| `Enter` | the field | The first visible result reads tall at 0.95. Again stays tall. |
| `Enter` | the deck | The selected row reads tall. The selected row again closes the pane and drops the deck to 0.6. |
| `Escape` | anywhere | Radix closes the drawer. The drawer's close resets the search, the filter, the fold, and the selection. |

The arrows walk the filter from the strip and the rows from the deck, and
neither steals the other's key: left and right mean lanes, up and down mean
rows.

## 11. Layout

### 11.2 Hit Targets

Every control on this surface carries at least a 36px hit floor, and the
pointer-only controls 44px: the Work icon and the row buttons are 36px+,
the chips 28px within a 32px+ row, and the pane's buttons 36px+. The search
field is 36px tall inside its frame.

### 11.3 Scroll Ownership

The drawer owns one scroll: the deck's vertical read. The pane scrolls its
own overflow when the record runs taller than the drawer. The lane bodies
scroll nothing — the deck scrolls, the lanes do not — and the document behind
the drawer never scrolls, because the shell owns that rule and the drawer
inherits it.

The horizontal rule applies to the header and the strip: both wrap, neither
pushes the drawer wider than its host.

## 12. Accessibility

- The drawer is a `dialog` named Work, with a description stating the drag and
  the search.
- The filter strip is one group labelled "Filter the lanes by state"; chips
  carry `aria-pressed`.
- The refinement count is a polite live region.
- The search-hit mark is decoration on the visible name; the row's accessible
  name is the plain design name and stage.
- The record marks state their verdict twice: visibly as a mark and word, and
  invisibly as a full sentence naming what a partial record misses.