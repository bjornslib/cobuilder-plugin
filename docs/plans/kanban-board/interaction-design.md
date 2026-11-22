# Kanban board: Interaction Design Specification

**Version:** 1.0
**Date:** 2026-11-21
**Author:** CoBuilder build
**Product document:** `docs/architecture/designs/kanban-board/contracts.md`
**Design source:** `docs/architecture/designs/kanban-board/prototypes/option-d-program-drilldown.html`, approved by the engineer
**Decision record:** `docs/architecture/adr/ADR-0050-the-kanban-board-is-a-full-page-beside-the-work-drawer.md`

---

## 1. Overview

The viewer gains one board page beside the Work drawer. The page has two levels.
The program board shows each program as a card in the column of its stage. A
card opens the epic board of that program, which shows each epic in the column
of its status. A switch shows the slices in place of the epics. A third board
holds the slices that belong to no program.

This document fixes what the page does over time. It names each state, each
transition, each gating rule, and each default. It also fixes the three
contracts that cross component boundaries: layering, hit targets, and scroll
ownership.

The board is read only. It computes no status of its own. It writes no workflow
state. Every column, count, and mark comes from the record index through the
data layer (ADR-0050, decision 12).

### 1.1 Core Design Principles

1. **One shape for each level.** The program board has five stage columns. The
   epic board has three status columns. A level never changes its shape.
2. **The address is the state.** The search, the sort, the card switch, the
   hidden columns, and the opened program are in the address. A reload, a
   shared link, and the back button restore the same board.
3. **A count states its own scope.** The header shows the count the board shows
   and the count the index holds. A column count sits next to the column's own
   label. A hidden column keeps its count on its rail.
4. **A card holds one target, and the name holds the second.** The card body
   opens the next level. The name opens the record. The copy icon copies a
   prompt. Each of the three is its own control.
5. **The board adds no state.** The reader never loses work on this page,
   because the page holds no work. No confirmation, undo, or save exists.

### 1.2 What the board does not carry from the prototype

The prototype holds code for an option that the engineer removed on 2026-11-14.
These parts are dead and are not part of this specification:

- The program checkbox, the multi-selection, and the pivot view.
- The vertical swim lanes, the row collapse control, and the summary row.
- The in-page detail panel. `contracts.md` gives every card a page target, so
  the board opens no panel of its own.
- The theme switch in the board's own bar. The shell's top bar owns the theme.

`contracts.md` wins where it differs from the prototype. Two cases matter here.
The address is `#/board?program=<id>`, not the prototype's `#program=`. The
column control is named `Hide`, not `Fold` or `Collapse`.

### 1.3 What the board never does

- **No drag.** A card moves only by its own target. There is no drag handle, no
  drop zone, and no reorder. A column's order is the index's status, not the
  reader's choice.
- **No edit.** No field on this page is editable. The search and the sort are
  views, and they write the address only.
- **No status of its own.** The board computes no stage, status, count, or mark.
  Each one comes from `data/index.json` through the data layer. The board joins
  nothing itself.
- **No write to the tracker.** The board calls `tracker.py` from no path. The
  only text it writes is a start prompt, and that text goes to the clipboard.
- **No second store.** The board keeps no record of state. A reload rebuilds the
  page from the address and the index.
- **No dialog and no panel of its own.** The Work drawer is the only surface that
  opens over the board, and the board does not change it.

---

## 2. Information Architecture

### 2.1 Navigation Structure

```
Viewer shell
├── Work drawer (vaul bottom sheet, ADR-0034), open over every surface
├── Work board (#/, the landing rows)
├── Kanban board (#/board)
│   ├── Program board (#/board)                         five stage columns
│   ├── Epic board (#/board?program=<id>)               three status columns
│   │   └── Cards: epics (default) or slices
│   └── No program board (#/board?orphans=1)            three status columns
├── Program level (#/<program>/intent)                  the name on a card
├── Epic level (#/<program>/build/epics/<epic>)          an epic card
└── Epic level, slice (#/<program>/build/epics/<epic>/<n>)  a slice card
```

The query of the board holds these keys. An unknown key or value is ignored.

| Key | Values | Board | Meaning |
|-----|--------|-------|---------|
| `program` | one design id | epic board | Opens that program. A value the index does not hold shows the program board and a notice. |
| `orphans` | `1` | No program board | Selects the orphan slices. `program` wins when both are set. |
| `q` | text | each | The search. The address holds the raw text. |
| `sort` | `name`, `open`, `progress` | program board | The order inside each column. `name` is the default. |
| `hide` | column keys, comma separated | each | The hidden columns. The program board hides `superseded` when the key is absent. |
| `cards` | `epics`, `slices` | epic board | The card grain. `epics` is the default. |

History: the search writes with a replace. A change of board, sort, card grain,
or hidden column pushes one entry. The `hide` list is written in column order,
not in click order, so one board state has one address.

### 2.2 Data Model

The board reads the record index only. `shared/build_index.py` writes it, and
the data layer resolves it. A component reads no DOM and makes no join.

| Record | Fields the board reads | Used by |
|--------|------------------------|---------|
| design (program) | `id`, `name`, `outcome`, `stage` | Program card, column, count, prompt |
| epic | `id`, `design`, `epic_id`, `title`, `branch`, `pr`, `state`, `note` | Epic card, column, count, prompt, mark |
| slice | `id`, `feature`, `n`, `title`, `ends_with`, `score`, `attempts`, `state` | Slice card, pips, count, next ready slice |
| join `epic_status` | one status per epic | Epic column |
| index key `built_at` | an ISO 8601 time in UTC | Heading band |

`title` and `built_at` are optional for a reader. An index without them shows
the epic id in place of the title and the sentence "No build time in this
index". `schema_version` does not change.

The board model that the data layer returns for one board:

| Field | Meaning |
|-------|---------|
| `columns[]` | One entry per column: key, label, cards, count, hidden flag |
| `columns[].emptyReason` | `no-record` or `search` |
| `shown`, `total` | The records the board shows, and the records the index holds |
| `orphans` | The count of slices that belong to no program |

A count invariant holds on every board: the header count equals the sum of the
visible column counts. The VALIDATE agent checks it.

### 2.3 Declared Defaults

| Setting | Default value | Alternatives | Declared where |
|---------|---------------|--------------|----------------|
| Board | Program board (`#/board`) | Epic board, No program board | the board address codec in `shell/board` |
| Search text | empty | any text | the address `q` |
| Sort (program board) | `name` | `open`, `progress` | the address `sort` |
| Cards (epic board) | `epics` | `slices` | the address `cards` |
| Hidden columns (program board) | `superseded` | any subset that keeps one column visible | the address `hide` |
| Hidden columns (epic board and No program board) | none | any subset that keeps one column visible | the address `hide` |
| Epic slice list | collapsed | expanded | component state |
| Orphan slice card | collapsed | expanded, one card at a time | component state |
| Column scroll position | 0 on every board change | any | the column body |
| Notice | none | Prompt copied, Copy failed, unknown program | component state |
| Theme | light | dark | the shell's own theme state |
| Work drawer | closed | open at 0.6 or 0.95 | ADR-0034 |

---

## 3. States

### 3.1 Screen States

The page appears in one of these states. The shell renders the top bar and the
rail from the address before the index resolves, so the page frame exists at
first paint.

| State | Trigger | What the person sees |
|-------|---------|----------------------|
| Loading | The index request is in flight | Heading band with the title, the counts as "—", no build time. The command row with Find disabled. A skeleton of five columns (three on an address that carries `program` or `orphans`), two skeleton cards each, `aria-busy="true"` on the board region. |
| Populated | The index resolved | The board named by the address |
| Empty column, no record | A column holds no record before the search | Column head with count 0, and the sentence for that board: "No program is in this stage.", "No epic has this status.", "No slice has this state." |
| Empty column, search | The search hides each record of a column that held one | Column head with count 0, and the sentence "No program matches “<q>”.", "No epic matches “<q>”.", or "No slice matches “<q>”." |
| No match on the board | Every column of the board is empty because of the search | The columns stay, and one board sentence replaces the column bodies: "No program, epic, or slice matches “<q>”.", "No epic or slice of <program> matches “<q>”.", or "No slice that belongs to no program matches “<q>”." A "Clear the search" button. |
| Unknown program | The address holds a `program` value the index lacks | The program board, and a notice: "The record index holds no program named “<value>”. This is the program board." A "Close" button. |
| Index failed | The index request failed | The shell's own failure card: "The record index did not load", the message, the path, and Retry. The board is not drawn. |
| No index records | The index holds no design | The shell's own empty card. The board is not drawn. |
| Index without `built_at` | The index has no build time | The band reads "No build time in this index" where the time stands. |
| Index without epic titles | An epic entity has no `title` | The epic card shows `epic_id` in place of the title. A slice group head shows it too. |

Two board-level states are impossible by construction. Every column hidden cannot
occur, because the Hide control of the last visible column is disabled. A program
with no epic is a normal populated board with three empty columns.

### 3.2 Component States

Vocabulary: `default`, `hover`, `focus-visible`, `pressed`, `selected`,
`disabled`, `loading`, `error`, `empty`, `transient`. A row marked "not
applicable" is absent from this component, and the reason is given.

The board holds no countdown except two: the success notice, which starts on the
copy action, and the skeleton pulse. No timer starts on mount.

#### Find field

| State | Visual treatment | Initial | Timer arming |
|-------|------------------|---------|--------------|
| Default | `bg-surface` field, 1px `--line`, `placeholder:text-ink-faint`, 32 px tall | Yes | Not applicable |
| Hover | `border-line` to `border-ink-faint` | No | Not applicable |
| Focus-visible | 2 px `--teal` outline, offset 2 px | No | Not applicable |
| Pressed | not applicable (a text field) | No | Not applicable |
| Selected | not applicable | No | Not applicable |
| Disabled | 45 % opacity, `cursor-not-allowed`, while the index loads | No | Not applicable |
| Loading | not applicable (the board region states the load) | No | Not applicable |
| Error | not applicable (the search cannot fail) | No | Not applicable |
| Empty | placeholder text shown | No | Not applicable |
| Transient | not applicable | No | Not applicable |

#### Order select

| State | Visual treatment | Initial | Timer arming |
|-------|------------------|---------|--------------|
| Default | native `select`, `bg-surface`, 1px `--line`, 10.5 px label "Order" before it | Yes | Not applicable |
| Hover | `bg-surface-2` | No | Not applicable |
| Focus-visible | 2 px `--teal` outline, offset 2 px | No | Not applicable |
| Pressed | the platform's own open state | No | Not applicable |
| Selected | the chosen option is the control's value | No | Not applicable |
| Disabled | not applicable (it is gated instead) | No | Not applicable |
| Loading | not applicable | No | Not applicable |
| Error | not applicable | No | Not applicable |
| Empty | not applicable (three fixed options) | No | Not applicable |
| Transient | not applicable | No | Not applicable |

#### Cards switch

| State | Visual treatment | Initial | Timer arming |
|-------|------------------|---------|--------------|
| Default | two buttons in a bordered pill, `bg-surface`, `text-ink-mid` | Yes, "Epics" | Not applicable |
| Hover | `bg-surface-2`, `text-ink` | No | Not applicable |
| Focus-visible | 2 px `--teal` outline, offset 2 px | No | Not applicable |
| Pressed | 1 px downward shift | No | Not applicable |
| Selected | `bg-accent-wash text-accent-deep border-primary`, `aria-pressed="true"` | No | Not applicable |
| Disabled | not applicable (it is gated instead) | No | Not applicable |
| Loading | not applicable | No | Not applicable |
| Error | not applicable | No | Not applicable |
| Empty | not applicable | No | Not applicable |
| Transient | not applicable | No | Not applicable |

#### Hide button (one per column head)

| State | Visual treatment | Initial | Timer arming |
|-------|------------------|---------|--------------|
| Default | `text-ink-mid`, 1 px `--line` box, 28 px tall, word "Hide" | Yes | Not applicable |
| Hover | `bg-surface-2 text-ink` | No | Not applicable |
| Focus-visible | 2 px `--teal` outline, offset 2 px | No | Not applicable |
| Pressed | 1 px downward shift | No | Not applicable |
| Selected | not applicable (the column is visible or hidden) | No | Not applicable |
| Disabled | on the last visible column: 45 % opacity, `cursor-not-allowed`, `title="One column stays visible"` | No | Not applicable |
| Loading | not applicable | No | Not applicable |
| Error | not applicable | No | Not applicable |
| Empty | not applicable (visible with count 0) | No | Not applicable |
| Transient | not applicable | No | Not applicable |

#### Hidden column rail

| State | Visual treatment | Initial | Timer arming |
|-------|------------------|---------|--------------|
| Default | 44 px wide, full column height, `bg-surface-2`, `text-ink-dim`, vertical label and count | Yes | Not applicable |
| Hover | `bg-accent-wash text-accent-deep` | No | Not applicable |
| Focus-visible | 2 px `--teal` outline, offset -2 px | No | Not applicable |
| Pressed | `bg-tint` | No | Not applicable |
| Selected | not applicable | No | Not applicable |
| Disabled | not applicable | No | Not applicable |
| Loading | not applicable | No | Not applicable |
| Error | not applicable | No | Not applicable |
| Empty | shows the count 0 | No | Not applicable |
| Transient | not applicable | No | Not applicable |

#### Program card

| State | Visual treatment | Initial | Timer arming |
|-------|------------------|---------|--------------|
| Default | `bg-surface`, 1 px `--line`, `radius-lg`, `--shadow-1`, 10 px padding | Yes | Not applicable |
| Hover | `border-primary`, `--shadow-2` (the card target link is hovered) | No | Not applicable |
| Focus-visible | the card target link draws a 2 px `--teal` outline around the card | No | Not applicable |
| Pressed | `bg-surface-2` | No | Not applicable |
| Selected | not applicable (the board selects nothing) | No | Not applicable |
| Disabled | not applicable | No | Not applicable |
| Loading | not applicable (the skeleton column covers it) | No | Not applicable |
| Error | not applicable | No | Not applicable |
| Empty | not applicable (a card exists only with a program) | No | Not applicable |
| Transient | not applicable | No | Not applicable |

#### Program name link

| State | Visual treatment | Initial | Timer arming |
|-------|------------------|---------|--------------|
| Default | `font-mono 13 px bold text-ink`, underline in `--line`, offset 3 px | Yes | Not applicable |
| Hover | underline in `--teal`, `text-accent-deep` | No | Not applicable |
| Focus-visible | 2 px `--teal` outline, offset 2 px | No | Not applicable |
| Pressed | `text-accent-deep` | No | Not applicable |
| Selected | not applicable | No | Not applicable |
| Disabled | not applicable | No | Not applicable |
| Loading | not applicable | No | Not applicable |
| Error | not applicable | No | Not applicable |
| Empty | not applicable | No | Not applicable |
| Transient | not applicable | No | Not applicable |

#### Epic card

| State | Visual treatment | Initial | Timer arming |
|-------|------------------|---------|--------------|
| Default | `bg-surface`, 1 px `--line-soft`, 3 px left border in the status colour, `radius-lg` | Yes | Not applicable |
| Hover | the head target link sets `bg-surface-2` on the head block | No | Not applicable |
| Focus-visible | the head target link draws a 2 px `--teal` outline around the head block | No | Not applicable |
| Pressed | `bg-surface-2` | No | Not applicable |
| Selected | not applicable (the board selects nothing) | No | Not applicable |
| Disabled | not applicable | No | Not applicable |
| Loading | not applicable | No | Not applicable |
| Error | not applicable | No | Not applicable |
| Empty | an epic with no slice shows no pips row and no slice list | No | Not applicable |
| Transient | not applicable | No | Not applicable |

The left border colour states the status a second time. The status pill states it
in words, so the colour is never the only signal.

#### Slice pips toggle

| State | Visual treatment | Initial | Timer arming |
|-------|------------------|---------|--------------|
| Default | full-width row under the head, `border-t` dashed `--line`, pips, "3/6 done", caret | Yes (collapsed) | Not applicable |
| Hover | `bg-surface-2` | No | Not applicable |
| Focus-visible | 2 px `--teal` outline, offset -2 px | No | Not applicable |
| Pressed | `bg-surface-3` | No | Not applicable |
| Selected | `aria-expanded="true"`, caret turned up | No | Not applicable |
| Disabled | not applicable | No | Not applicable |
| Loading | not applicable | No | Not applicable |
| Error | not applicable | No | Not applicable |
| Empty | not applicable (gated when the epic has no slice) | No | Not applicable |
| Transient | not applicable | No | Not applicable |

#### Copy prompt button

| State | Visual treatment | Initial | Timer arming |
|-------|------------------|---------|--------------|
| Default | 32 by 32 px, `text-ink-faint`, lucide `Copy` at 14 px, `radius-md` | Yes | Not applicable |
| Hover | `bg-surface-2 text-ink` | No | Not applicable |
| Focus-visible | 2 px `--teal` outline, offset 2 px | No | Not applicable |
| Pressed | `bg-surface-3` | No | Not applicable |
| Selected | not applicable (the notice states the result) | No | Not applicable |
| Disabled | not applicable (it is gated instead) | No | Not applicable |
| Loading | not applicable (the clipboard write is one frame) | No | Not applicable |
| Error | not applicable (the failure shows in the notice, not on the icon) | No | Not applicable |
| Empty | not applicable | No | Not applicable |
| Transient | not applicable (the icon does not change) | No | Not applicable |

#### Copy notice

| State | Visual treatment | Initial | Timer arming |
|-------|------------------|---------|--------------|
| Default | absent | Yes | Not applicable |
| Hover | not applicable (a notice holds no hover style) | No | Not applicable |
| Focus-visible | the Close button of a failure notice draws the ring | No | Not applicable |
| Pressed | the Close button shifts 1 px | No | Not applicable |
| Selected | not applicable | No | Not applicable |
| Disabled | not applicable | No | Not applicable |
| Loading | not applicable | No | Not applicable |
| Error | "Copy failed": `bg-danger-wash`, `text-destructive`, a 1 px `border-destructive` line, the prompt in a selectable `code` block, a Close button | No | Not applicable |
| Empty | not applicable | No | Not applicable |
| Transient | "Prompt copied": `bg-good-wash`, `text-good`, one line | No | Starts on the copy action, resets after `--hold-ack` |

#### Orphan slice card

| State | Visual treatment | Initial | Timer arming |
|-------|------------------|---------|--------------|
| Default | `bg-surface`, 1 px `--line-soft`, 3 px left border in the state colour | Yes (collapsed) | Not applicable |
| Hover | `bg-surface-2` | No | Not applicable |
| Focus-visible | 2 px `--teal` outline, offset 2 px | No | Not applicable |
| Pressed | `bg-surface-3` | No | Not applicable |
| Selected | `aria-expanded="true"`, panel shown below the row | No | Not applicable |
| Disabled | not applicable | No | Not applicable |
| Loading | not applicable | No | Not applicable |
| Error | not applicable | No | Not applicable |
| Empty | a slice with no score shows "Not scored" in its panel | No | Not applicable |
| Transient | not applicable | No | Not applicable |

#### Slice card (epic board and No program board group head)

| State | Visual treatment | Initial | Timer arming |
|-------|------------------|---------|--------------|
| Default | `bg-surface`, 1 px `--line-soft`, `radius-lg`, 8 px padding | Yes | Not applicable |
| Hover | `bg-surface-2` | No | Not applicable |
| Focus-visible | 2 px `--teal` outline, offset 2 px | No | Not applicable |
| Pressed | `bg-surface-3` | No | Not applicable |
| Selected | not applicable | No | Not applicable |
| Disabled | not applicable | No | Not applicable |
| Loading | not applicable | No | Not applicable |
| Error | not applicable | No | Not applicable |
| Empty | "No slices here." in the column body | No | Not applicable |
| Transient | not applicable | No | Not applicable |

#### Back link and top bar link

| State | Visual treatment | Initial | Timer arming |
|-------|------------------|---------|--------------|
| Default | back: "← All programs" in `text-band-ink` on the band. Top bar: 44 by 44 px icon button, `text-ink-mid` | Yes | Not applicable |
| Hover | back: underline. Top bar: `bg-surface-2 text-foreground` | No | Not applicable |
| Focus-visible | 2 px `--teal` outline, offset 2 px | No | Not applicable |
| Pressed | 1 px downward shift | No | Not applicable |
| Selected | top bar link on the board: `aria-current="page"`, `bg-accent-wash text-accent-deep` | No | Not applicable |
| Disabled | not applicable | No | Not applicable |
| Loading | not applicable | No | Not applicable |
| Error | not applicable | No | Not applicable |
| Empty | not applicable | No | Not applicable |
| Transient | not applicable | No | Not applicable |

#### No program card

| State | Visual treatment | Initial | Timer arming |
|-------|------------------|---------|--------------|
| Default | full-width strip, `bg-surface`, 1 px `--line`, dashed left edge, 44 px tall | Yes | Not applicable |
| Hover | `border-primary`, `bg-surface-2` | No | Not applicable |
| Focus-visible | 2 px `--teal` outline, offset 2 px | No | Not applicable |
| Pressed | `bg-surface-2` | No | Not applicable |
| Selected | not applicable | No | Not applicable |
| Disabled | not applicable | No | Not applicable |
| Loading | not applicable | No | Not applicable |
| Error | not applicable | No | Not applicable |
| Empty | not applicable (gated when the count is 0) | No | Not applicable |
| Transient | not applicable | No | Not applicable |

### 3.3 Visibility Gating

A gated control is absent from the DOM. A disabled control is visible and inert.
The board uses both, and each row below says which one applies.

| Control | Renders when | Removed when |
|---------|--------------|--------------|
| Order select | The board is the program board | Any other board |
| Cards switch | The board is the epic board | Any other board |
| Hide button | Its column is visible | Its column is hidden |
| Hide button, disabled | — | — (it stays visible and inert on the last visible column) |
| Hidden column rail | Its column is hidden | Its column is visible |
| Copy prompt button | The record has a next workflow (`contracts.md` table) | The record has no next workflow: program `implemented` or `superseded`, epic with a closed lifecycle, slice card |
| "Slices done" mark | The epic's lifecycle is open and every slice is done | Any other epic |
| Slice pips toggle | The epic holds at least one slice | The epic holds no slice |
| No program card | `orphans > 0` and at least one orphan slice matches the search | `orphans` is 0, or the search hides each orphan slice |
| Board no-match sentence | Every column of the board is empty because of the search | The search is empty, or one column holds a card |
| "Clear the search" button | The same condition as the sentence | The search is empty |
| Unknown program notice | The address `program` value is not in the index | Any address write, or the notice's Close |
| "Prompt copied" notice | A clipboard write resolved | `--hold-ack` elapses |
| "Copy failed" notice | A clipboard write rejected | The notice's Close, or Escape |
| Find field | Always on the board. It is disabled, not gated, while the index loads | Never |
| Back link | The board is the epic board or the No program board | The board is the program board |
| Top bar board link | Always | Never |

---

## 4. Transitions

### 4.1 Transition Table

One row per edge. "Column" means the width from card to rail, or the reverse.
Every duration names a token from 4.2. `--ease` is the house
`cubic-bezier(0.22, 0.75, 0.3, 1)`.

| Trigger | From | To | Duration | Easing | Guard or reset |
|---------|------|----|----------|--------|----------------|
| The index resolves | Loading | Populated | `--motion-notice` | `--ease` | Reduced motion removes the fade |
| Hide is pressed | Column visible | Column hidden | `--motion-panel` | `--ease` | The last visible column refuses, and its Hide is disabled |
| A rail is pressed | Column hidden | Column visible | `--motion-panel` | `--ease` | None |
| The pips toggle is pressed | Slice list collapsed | Slice list expanded | `--motion-panel` | `--ease` | Reduced motion sets 0 |
| The pips toggle is pressed again | Slice list expanded | Slice list collapsed | `--motion-panel` | `--ease` | A board change collapses every list |
| An orphan slice card is pressed | Card collapsed | Card expanded | `--motion-panel` | `--ease` | One card at a time. Another card's press closes this one |
| The same orphan card is pressed | Card expanded | Card collapsed | `--motion-panel` | `--ease` | A search change closes it |
| A program card target is pressed | Program board | Epic board | none | — | The board region scrolls to 0 |
| The back link is pressed | Epic board or No program board | Program board | none | — | The board region scrolls to 0 |
| The No program card is pressed | Program board | No program board | none | — | The board region scrolls to 0 |
| A column key changes in the address, or a reload | Any board | The board the address names | none | — | Scroll positions go to 0 |
| A clipboard write resolves | Notice absent | "Prompt copied" | `--motion-notice` | `--ease` | Resets after `--hold-ack` |
| A clipboard write rejects | Notice absent | "Copy failed" | `--motion-notice` | `--ease` | The notice holds until Close or Escape |
| Close or Escape on a notice | "Prompt copied" or "Copy failed" | Notice absent | `--motion-notice` | `--ease` | None |
| A key is typed in Find | Search empty or other | Search holds the text | none | — | The address is replaced, not pushed |
| The pointer enters a control | Default | Hover | `--motion-hover` | `--ease` | The pointer leaves |
| A control takes keyboard focus | Default | Focus-visible | none | — | The ring is drawn at once, never faded |

### 4.2 Timing Tokens

| Token | Value | Used for |
|-------|-------|----------|
| `--motion-hover` | 150 ms | Hover and press colour changes on every control |
| `--motion-panel` | 180 ms | Column hide and show, slice list expand and collapse |
| `--motion-notice` | 140 ms | Notice enter and leave, board region first paint |
| `--hold-ack` | 1800 ms | Dwell of the "Prompt copied" notice |
| `--motion-skeleton` | 2000 ms | Skeleton pulse. It is the duration of shadcn `animate-pulse` |

Reduced motion: `prefers-reduced-motion: reduce`, or the shell's own `reduce`
flag, sets every token above to 0 ms, and stops the skeleton pulse. The notice
then appears and leaves at once.

---

## 5. Interaction Flows

### 5.1 Open the board from the top bar

**Goal:** Reach the board from any surface.

**Entry condition:** The shell is on screen. The index may still be loading.

1. The reader presses the top bar's "Kanban board" link.
2. The address becomes `#/board`. The link takes `aria-current="page"`.
3. The board page replaces the level in the pane. Focus moves to the pane, as it
   does on every shell navigation.
4. The board shows the state that its own load has.

**Edge cases:**

- If the index is loading, the board shows the skeleton. The board fills in
  without a second navigation.
- If the index failed, the shell's failure card shows, and the board does not
  draw.
- If a design carries the id `board`, the board wins the address. ADR-0050
  accepted this risk, and the shell states it in a comment.

### 5.2 Search a board

**Goal:** Narrow the board to the programs, epics, or slices that match a word.

**Entry condition:** The board is populated.

1. The reader presses `/`, or clicks the Find field.
2. The field takes focus and the reader types.
3. Each key press replaces the address `q` and re-renders the board. The focus
   stays in the field.
4. A program matches when its name matches, or when an epic or a slice under it
   matches. An epic matches on its title, its epic id, or a slice title. A slice
   matches on its title, the epic title or id, or the plan slug.
5. Each column count and the header counts follow the search. A column that the
   search empties states why it is empty.

**Edge cases:**

- If no record matches, the board sentence shows with "Clear the search".
- If the field holds text and the reader changes the board, the search carries to
  the next board through the address.
- If the reader presses `/` while the Work drawer is open, the drawer keeps the
  key. The board yields to any `[role="dialog"]`.
- If the reader presses `/` inside a field, select, or textarea, the browser
  keeps the character. The board does not steal the key.

### 5.3 Open a program, and go back

**Goal:** See the epics and slices of one program.

**Entry condition:** The program board shows at least one card.

1. The reader presses the body of a program card.
2. The address pushes `#/board?program=<id>` and any `q`.
3. The epic board shows its three columns, the program name in the band, and
   "All programs" at the band's left. Focus moves to the program name, and the
   board region scrolls to 0.
4. The reader presses "All programs".
5. The address pushes `#/board` with the search kept, and the program board
   returns. Focus moves to the title, and the board region scrolls to 0.

**Edge cases:**

- If the address names a program the index lacks, the program board shows with
  the notice. The board never shows an empty epic board for a missing program.
- If the reader presses the browser back button, the previous board returns
  exactly, because every board change pushed one entry.
- If the program holds no epic, the epic board shows three empty columns with
  "No epic has this status."

### 5.4 Switch the card grain

**Goal:** See slices instead of epics on the epic board.

**Entry condition:** The board is the epic board.

1. The reader presses "Slices" in the Cards switch.
2. The address pushes `cards=slices`. "Slices" takes `aria-pressed="true"`.
3. Each column shows the program's slices, grouped under an epic head.
4. Each column body scrolls to 0.

**Edge cases:**

- If the program holds no slice, each column shows "No slice has this state."
- If the reader presses "Epics", the address returns to `cards=epics`, which is
  the default and therefore absent from the address.
- If the reader changes the grain with a search active, the search stays.

### 5.5 Hide a column, and show it again

**Goal:** Give the width of a column to the columns that hold work.

**Entry condition:** The board holds at least two visible columns.

1. The reader presses "Hide" on a column head.
2. The address pushes the new `hide` list. The column shrinks to a 44 px rail
   over `--motion-panel`.
3. The rail shows the column label vertically and the column's count.
4. The remaining columns take the free width.
5. The reader presses the rail. The column returns over `--motion-panel`.

**Edge cases:**

- If one column is visible, its Hide button is disabled.
- If the program board's `hide` key is absent, `superseded` is hidden. The first
  Hide press writes the full list, in column order.
- If the reader reloads, the hidden set restores from the address.

### 5.6 Open a record from a card

**Goal:** Reach the page of a program, an epic, or a slice.

**Entry condition:** The card exists on the board.

1. The reader presses the name on a program card. The address becomes
   `#/<program>/intent`.
2. The reader presses an epic card head. The address becomes
   `#/<program>/build/epics/<epic>`.
3. The reader presses a slice card of an epic. The address becomes
   `#/<program>/build/epics/<epic>/<n>`. That page brings the slice row into view
   and marks it.
4. The reader presses the browser back button to return to the board. The board
   restores from the address.

**Edge cases:**

- If the slice belongs to no program, no page exists. The card opens in place
  instead, and shows its end state, score, and attempts.
- If the reader presses the pips toggle, no navigation happens. The toggle is a
  separate button, and it is never inside the card's target link.

### 5.7 Copy a start prompt

**Goal:** Take the next workflow command to the clipboard.

**Entry condition:** The record has a next workflow, and its card shows the copy
button.

1. The reader presses the copy icon.
2. The board writes one line of text to the clipboard, using the rule in 5.8.
3. On success, the notice "Prompt copied" appears in the board's top right for
   `--hold-ack`. Focus does not move.
4. On failure, the notice "Copy failed" appears with the prompt in a selectable
   block and a Close button. Focus does not move.
5. The reader presses Close, or Escape, to dismiss the failure.

**Edge cases:**

- If `navigator.clipboard` is absent, the board treats it as a refused write. A
  page from `file://` needs this path.
- If the reader presses Escape while the Work drawer is open, the drawer closes.
  The failure notice stays.
- If the reader presses the copy icon twice, the dwell restarts.

### 5.8 The prompt rule

The rule module applies these rows in order. The first match wins. It reads the
lifecycle and the slice states, never the column (ADR-0050, decision 11).

| Record | Condition | Prompt |
|--------|-----------|--------|
| Program | stage `backlog`, `decided`, or `review` | `/architect:design <program>` |
| Program | stage `approved` | `/implement:start <program>` |
| Program | stage `implemented` or `superseded` | No icon |
| Epic | lifecycle closed | No icon |
| Epic | status Planned or In progress, with a slice that is not done or with no slice | `/implement:start <program> <epic>` |
| Epic | every slice done, no pull request | `/pr:generate <branch>` |
| Epic | a pull request, or status `merged` | `Check that pull request <pr> of <epic> merged, then record it with tracker.py set-pull-request-state and close the epic with tracker.py set-epic-state` |

`<program>` is the design id. `<epic>` is the epic id. `<branch>` is the epic's
branch name. `<pr>` is the pull request number.

### 5.9 Open the No program board

**Goal:** See the slices that belong to no program.

**Entry condition:** `orphans > 0`. The program board shows the No program card.

1. The reader presses the No program card.
2. The address pushes `#/board?orphans=1`.
3. The board shows the slices in the three status columns, grouped under a head
   that names the plan slug. Focus moves to the subject heading "No program".
4. The reader presses a slice card.
5. The card expands in place, and shows the end state, the score, and the attempts.

**Edge cases:**

- If the card is pressed again, it collapses. A second card's press closes the
  first.
- If the search hides every orphan slice, the board sentence shows. The columns
  state "No slice matches “<q>”.".
- If `program` and `orphans=1` are both in the address, `program` wins.

### 5.10 Open the Work drawer over the board

**Goal:** Read the work list without leaving the board.

**Entry condition:** The board is on screen.

1. The reader presses the top bar's Work board button.
2. The drawer opens at snap 0.6 over the board, on the ADR-0034 rules. The
   overlay dims the board.
3. The drawer keeps focus. The board does not scroll, and its shortcuts yield.
4. Escape closes the drawer. The board is as the reader left it, because the
   board's state is in the address and in the columns' own scroll.

**Edge cases:**

- If the reader reopens the drawer, it opens at 0.6 with an empty search, as
  ADR-0034 decides.
- If the drawer covers the board's notice, the notice is still there when the
  drawer closes. The notice outranks no dialog.

---

## 6. Component Specifications

### 6.1 Program board

**Dimensions:** Five columns share the pane width. Each column is at least 176 px
wide, and each column is `minmax(0, 1fr)`. A hidden column is 44 px.

**Position:** The board region under the command row.

**Layout at 1280 by 800 and 1440 by 900:**

| Region | 1280 × 800 | 1440 × 900 |
|--------|------------|------------|
| Top bar | 60 px | 60 px |
| Heading band | 56 px | 56 px |
| Command row | 48 px | 48 px |
| No program card, when present | 44 px | 44 px |
| Column region | 636 px, or 592 px with the No program card | 736 px, or 692 px |
| Rail width | 256 px | 256 px |
| Pane width | 1024 px | 1184 px |
| Board padding and gaps | 32 px and 4 × 12 px | 32 px and 4 × 12 px |
| Each of five columns | 188.8 px | 220.8 px |

```
┌──────────────────────────────────────────────────────────────┐
│ Kanban board            PROGRAMS 22 of 26  EPICS 61 of 112   │  band
│                         SLICES 130 of 172                    │
│                         Index built 21 Nov 2026, 09:41       │
├──────────────────────────────────────────────────────────────┤
│ FIND [ program, epic, or slice…    ] │ ORDER [ Name ▾ ]       │
├──────────────────────────────────────────────────────────────┤
│ ┄ No program · 42 slices in 4 plans ┄                       │  44 px, when present
├────────────┬────────────┬────────────┬────────────┬─────────┤
│ Needs a    │ Ready to   │ In review  │ Shipped  1 │ Super…  │  column
│ decision 5 │ build 3    │ 2       ⓘ  │            │ rail 4  │  heads
│ ┌────────┐ │ ┌────────┐ │ …          │ …          │         │
│ │ card   │ │ │ card   │ │            │            │         │  each column
│ │        │ │ │        │ │            │            │         │  scrolls
│ └────────┘ │ └────────┘ │            │            │         │  inside
└────────────┴────────────┴────────────┴────────────┴─────────┘
```

**Behaviour:**

- The five columns are the stage columns. Their order is fixed: Needs a
  decision, Ready to build, In review, Shipped, Superseded. Both surfaces read
  one lane list (`shell/workDeck.ts`), which already holds all five entries.
- Each column head holds the stage badge, then the count, then "Hide" at the end.
- The count sits 6 px after the badge, on the same line, in tabular numerals.
- The sort orders the cards inside each column. The columns themselves never
  reorder.
- No column scrolls the page. Each column body scrolls its own cards, with
  `overscroll-contain`.
- The board region scrolls sideways only when the pane is narrower than 960 px.
  Then the columns keep their 176 px floor and the board region scrolls, never
  the page.

**Card contents, top to bottom:** the name, the outcome (two-line clamp), the
epic bar, the three epic counts, and the footer. The footer reads
"3 of 6 slices done" or "No slices yet", then " · next #4" when a next ready
slice exists. A next ready slice is the first slice in state `planned`, in epic
order, then the lowest slice number.

### 6.2 Epic board

**Dimensions:** Three columns share the pane width, each at least 176 px. A
hidden column is 44 px.

**Layout:** The heading band adds the back link and the program name. The
command row shows Find and Cards. The three columns hold epics or slices.

```
┌──────────────────────────────────────────────────────────────┐
│ ← All programs │ Kanban board │ kanban-board  [Ready to build]│
│                        EPICS 3 of 112  SLICES 9 of 172        │
│                        Index built 21 Nov 2026, 09:41         │
├──────────────────────────────────────────────────────────────┤
│ FIND [ … ] │ CARDS [ Epics ][ Slices ]                       │
├──────────────────────────────────────────────────────────────┤
│ ○ Planned 4   Hide │ ◐ In progress 2  Hide │ ● Done 13  Hide │
│ ┌────────────────┐ │ ┌────────────────┐    │ …               │
│ │ e3 title    ⧉  │ │ │ …              │    │                 │
│ │ ◐ in_progress  │ │ │                │    │                 │
│ │ ▫▫▪ 2/3 done ▾ │ │ │                │    │                 │
│ └────────────────┘ │ └────────────────┘    │                 │
└──────────────────────────────────────────────────────────────┘
```

**Behaviour:**

- The column head holds the status pill (shape glyph, then label), the count, and
  "Hide". The card shows the raw status word, so the column label is a grouping
  and the card keeps the index's own word.
- The address maps each status to a column. A value that no row names goes to In
  progress, and the card shows the raw word. A missing status shows the word "no
  status" and goes to In progress.
- An epic card holds the epic id, the label, the status pill, the pull request
  badge, the "Slices done" mark, the copy button, and the pips toggle. The label
  is `title`, or `epic_id` when the index holds no title. The branch tail is not
  used as a label, because `contracts.md` names the title and the epic id.
- The pips row holds one pip for each slice, then "2/3 done", then the caret. It
  is a button with `aria-expanded` and `aria-controls`. The slice list below it
  holds one row for each slice, and each row opens the slice page.
- The Done column in the Slices grain uses a compact card: the number, the title
  on one line, and the score. It omits the state pill, because the column states
  the state.

### 6.3 No program board

**Dimensions:** Three columns, on the epic board's rules. No Cards switch and no
Order.

**Layout:** The band shows the back link, the title "Kanban board", and the
subject "No program". The counts block shows only Slices, for example
"SLICES 42 of 42".

**Behaviour:**

- Slices group under a head that names the plan slug and the count of that plan's
  matching slices.
- A slice card is a button. It expands in place and shows "Ends with", "Score",
  "Attempts", and the raw state. One card is open at a time.
- The card is never a link. No page exists for a slice with no program.

### 6.4 Heading band, counts, and command row

**Dimensions:** The band is 56 px tall, `bg-band text-band-ink px-4`. The command
row is 48 px tall, `bg-surface`, and carries a bottom border.

**Behaviour:**

- The band holds `h1` "Kanban board", the subject (`h2`) on the epic board and the
  No program board, the counts, and the build time.
- The counts are a `dl` with the label in the `dt` and "22 of 26" in the `dd`. The
  unit lives in the label, so a screen reader reads "Programs, 22 of 26".
- The build time is a `time` element with `dateTime` set to `built_at`, and it
  reads "Index built 21 Nov 2026, 09:41" in the reader's own time zone.
- The command row groups its controls with a 1 px `--line` divider. Find takes
  the free width. The field is at most 340 px wide.
- The band and the command row never scroll and never move.

### 6.5 Component sources, and the research substitution

The design-to-code skill names optional research tools. Four were unavailable or
unnecessary in this session, and local evidence replaced each one.

| Skill step | Tool | Substitution |
|------------|------|--------------|
| 2a. Existing patterns | Explore agent | The board folder does not exist yet. I read `shell/App.tsx`, `shell/TopBar.tsx`, `shell/topBar/buttons.tsx`, `shell/WorkDrawer.tsx`, `shell/drawer/deckChrome.tsx`, `shell/drawer/deckKeys.ts`, `shell/hooks/indexLoad.ts`, `shell/app/states.tsx`, and `src/index.css` directly. |
| 2b. Magic UI | Magic UI MCP tools | Absent in this session. No Magic UI component is needed: every control is a plain button, link, input, or select, and the motion is one width and one height transition. |
| 2c. shadcn availability | `mcp__shadcn` | Absent. I read `src/components/ui/`: badge, button, card, collapsible, input, scroll-area, separator, sheet, sidebar, skeleton, tabs, tooltip. No `select`, `toggle-group`, or `dialog` is installed. |
| 2d. UI patterns | Perplexity tools | Available and not used. The house holds one pattern for each control, and the pattern is already decided by the Work drawer. |
| 2e. Framework docs | context7 | Available and not used. The viewer's own code answers the React and Tailwind questions, and `src/index.css` answers the token questions. |

Component source for each control:

| Control | Source | Note |
|---------|--------|------|
| Find field | `existing` (`Input`, `ui/input.tsx`) | Styled with the board's 32 px height |
| Order select | `custom` (native `select`) | `ui/select` is not installed, and the prototype uses a native select. `npx shadcn@latest add select` is not needed |
| Hide, back, rail, copy | `shadcn` (`Button`, variant `ghost` or `outline`, sizes `xs` to `icon-sm`) | Never variant `default`, whose hover fills with `--primary` and breaks the house rule |
| Cards switch | `custom` (two `Button` elements in a bordered group) | No `toggle-group` is installed. `aria-pressed` states the choice |
| Stage badge, status pill, "Slices done" | `shadcn` (`Badge`, variant `outline` or `secondary`) with a house wash class | The wash comes from the token table |
| Epic card, program card, slice card | `custom` (`article`, `a`, `ul`) | The card is a container with two or three controls, so it is not a `Card` |
| Slice list expand | `existing` (`Collapsible`, `ui/collapsible.tsx`) | Radix supplies the height transition |
| Skeleton column | `existing` (`Skeleton`) | `animate-pulse` gives the declared duration |
| Notice | `custom` | Radix has no sonner. A `div` with `role="status"` is enough for one line of text |
| Top bar board link | `custom` (`a` with the icon-button class) | It navigates, so it is a link, not a button |

---

## 7. Error States and Edge Cases

### 7.1 The clipboard refuses the write

**Scenario:** The browser blocks `navigator.clipboard.writeText`, or the page runs
from `file://` and the API is absent.

**Handling:** The notice reads "Copy failed", and it holds the prompt in a
selectable `code` block. The reader selects and copies the text by hand. The
notice stays until Close or Escape, because it holds text that the reader needs.
The board keeps the copy button in place, so a second press retries.

### 7.2 The address names an unknown program

**Scenario:** A shared link holds a `program` value that the index no longer
holds.

**Handling:** The program board shows, and the notice names the value. The notice
clears on any address write, or on its Close button, which replaces the address
with `#/board`.

### 7.3 The index holds no build time, or no epic title

**Scenario:** The bundle was built before `built_at` or `title` existed.

**Handling:** The band reads "No build time in this index", in the place and the
type of the time. Each epic card shows `epic_id` in place of the title. Nothing
else changes. A reader never sees an empty gap or the word "undefined".

### 7.4 An epic holds a status that no column row names

**Scenario:** The tracker writes a status that `contracts.md` does not list.

**Handling:** The epic goes to In progress, and its card shows the raw word. The
column count includes it. `contracts.md` requires a test that lists each value the
current index emits.

### 7.5 A missing status value

**Scenario:** An epic entity carries no `state`, or an empty one.

**Handling:** The card shows "no status" and the epic goes to In progress. The
word is a stated fact, not a guess.

### 7.6 A record with no work at all

**Scenario:** A program holds no epic. An epic holds no slice.

**Handling:** The program's epic board shows three columns with "No epic has this
status." Its card footer reads "No slices yet". An epic with no slice shows no
pips row and no slice list, and it still holds a copy button when a prompt
exists.

### 7.7 Hiding every column

**Scenario:** The reader presses Hide on the last visible column.

**Handling:** The press does nothing, because the button is disabled. The header
count never reads 0 for a board that holds records, and the count invariant still
holds.

### 7.8 Cases to check

- No data: the shell's empty card, not the board.
- Partial data: an index without `built_at`, without epic titles, or without a
  join status.
- More data than the layout holds: 26 program cards in one column, and 172
  slices. The column scrolls.
- Network failure: the shell's failure card with Retry.
- Timeout: the same card, because the loader has no separate timeout.
- Concurrent editing: impossible. The viewer is static.
- Permission denied: the board reads one file from its own origin. A refused read
  is the failure card.
- Duplicate ids: the data layer joins by id. A duplicate slice id is a data
  fault, not a board state.
- Maximum limits: the layout holds 26 programs and 172 slices without a change of
  shape, because the columns scroll.

---

## 8. Accessibility

### 8.1 Keyboard Navigation

Tab order on the program board: skip link, top bar controls, rail, the heading
band's links, the Find field, the Order select, then each column in turn. Inside
a column: the Hide button, then each card's controls in DOM order, which is the
card target link, the name link, and the copy button. A hidden column's rail
button falls in its own column position.

The epic board adds the Cards switch after the Find field. The No program board
has no Order and no Cards. An orphan slice card is one button, and its expanded
panel holds no focusable content, so focus stays on the button.

| Key | Where | Effect |
|-----|-------|--------|
| `Tab` | everywhere | Moves through the order above, forwards. `Shift+Tab` moves back. |
| `/` | the board, when no dialog is open and focus is not in a field, select, or textarea | Moves focus into Find, selects its text, and prevents the browser's quick-find |
| `Enter` | on a link or button | Activates that control, as the platform does |
| `Space` | on a button | Activates that button |
| `Escape` | with a notice on screen, and no dialog open | Dismisses the notice and takes no other action |
| `Escape` | with the Work drawer open | The drawer closes, on vaul's capture-phase handler. The board's notice stays |

Arrow keys are not bound on the board. The columns are lists of controls, so Tab
is the walk. The Work drawer keeps its own arrows while it is open.

### 8.2 Screen Reader Support

- The pane's accessible name is "Kanban board", "Kanban board, <program>", or
  "Kanban board, No program".
- The page holds one `h1`, which reads "Kanban board". The epic board's program
  name is an `h2`.
- Each column is a `section` with `aria-labelledby` pointing at its heading and
  its count, so it reads "Planned 4".
- Each column holds a `ul`, and each card is an `li`.
- The counts are a `dl` named "Shown counts".
- The board region carries `aria-busy="true"` while the index loads, and one
  polite live region states "Loading the record index".
- The notice is one `role="status"` region with `aria-live="polite"` and
  `aria-atomic="true"`. It announces "Prompt copied", "Copy failed", or the
  unknown program sentence.
- The epic bar is `aria-hidden`, because the counts line beside it states the same
  numbers in text.
- The pips toggle's name is "Show the 3 slices of <label>" and, when open, "Hide
  the 3 slices of <label>".
- A hidden rail's name is "Show Superseded, 4 programs", or "…, 12 epics" or
  "…, 12 slices" on the lower boards.
- A Hide button's visible word is "Hide" and its accessible name is "Hide
  Superseded".
- A copy button's name is "Copy the start prompt for <name>".
- A card's target name is "Open the epic board of <name>", "Open epic <label>",
  or "Open slice 3 of <epic label>".
- A slice that belongs to no program: "Show the end state, score, and attempts of
  <title>".

### 8.3 Colour Independence

| Signal | Colour | Second signal |
|--------|--------|---------------|
| Stage | each stage badge's own hue | the stage's words on the badge |
| Status | good, warn, or ink | the shape glyph (○, ◐, ●) and the raw word |
| Epic progress | three bar colours | the counts line under the bar |
| "Slices done" | good wash | the words and a check icon |
| Hidden column | a lighter fill | the vertical label and the count |
| Copy success or failure | good or danger wash | the words "Prompt copied" or "Copy failed" |
| Focus | teal ring | a 2 px outline, not a colour-only glow |

### 8.4 Focus Management

- Entry: the shell moves focus to the pane when it opens a work item. The board is
  not a work item, so the board moves focus itself on its first render, and on
  every level change.
- A level change (program card, back link, No program card) moves focus to the
  band's subject heading. That heading is the `h1` on the program board, and the
  `h2` on the epic board and the No program board. Each carries `tabIndex={-1}`,
  and the move uses `preventScroll: true`. The shell's route effect cannot do
  this, because a query change keeps `readRoute()` unchanged. So the board states
  the new level to a screen reader and gives the reader a known place to start.
- A search, a sort, a card grain change, or a hide keeps focus where it was. The
  pressed control stays in the DOM.
- No container traps focus. The Work drawer traps focus while it is open, as vaul
  does for a modal.
- The copy notice never takes focus.
- The failure notice's Close button is in the tab order while the notice exists.
  Focus returns to the copy button that produced it when the notice closes.

---

## 9. Responsive Considerations

### 9.1 Desktop (over 1200 px)

Five stage columns at all widths above 1200 px. At 1280 × 800 the pane gives 1024
px, so each column is 188.8 px and no page-level scroll appears. At 1440 × 900 it
is 220.8 px. Hover states exist here only, and they are the rows in 3.2.

### 9.2 Tablet (768 px to 1200 px)

The rail stays open at 256 px until the shell collapses it. The pane is then
narrower than 960 px, so the board region scrolls sideways inside itself. The
columns keep their 176 px floor, so a card never crushes. Hiding a column is the
one action that restores the fit. A card holds a 44 px target at every width. The
Hide, copy, and rail controls are 32 px, and 44 px under `(pointer: coarse)`.

### 9.3 Mobile (under 768 px)

The rail becomes a drawer, so the pane takes the full width. The board keeps its
column shape and scrolls sideways inside its own region. The columns never stack,
because a level never changes its shape. The tap target rule of 9.2 applies
unchanged, so every control clears 44 px on a touch screen.

---

## 10. Animation Specifications

| Animation | Where | Duration | Easing |
|-----------|-------|----------|--------|
| Skeleton pulse | Loading columns | `--motion-skeleton` | linear, the utility's own |
| Board region first paint | The board after the index resolves | `--motion-notice` | `--ease` |
| Notice enter | "Prompt copied" or "Copy failed" | `--motion-notice` | `--ease` |
| Notice leave | A dismissed notice | `--motion-notice` | `--ease` |

**Animation principles:** No motion states a fact that the layout does not. The
level change has no animation, because the whole page changes. A column hide and
a slice list expand are the only width and height changes, and both explain where
the content went. Reduced motion removes every one of them, and stops the
skeleton pulse.

---

## 11. Layering, Hit Targets, and Scroll Ownership

### 11.1 Layering

The scale is `src/index.css`'s own. The board adds no layer.

| Layer | Token | Surfaces | Collision rule |
|-------|-------|----------|----------------|
| Chrome | `--layer-fixed` (20) | Top bar, rail | Yields to any panel or dialog |
| Raised | `--layer-raised` (10) | Column heads, the column head's shadow | Cards scroll under a column head, never over it |
| Panel | `--layer-panel` (30) | The copy notice | Floats over the board's top right corner. The Close button yields to a dialog |
| Modal | `--layer-modal` (50) | The Work drawer's panel and its overlay | Above the board and above the notice. The board does not scroll while it is open |

The board page itself sits at `--layer-base` (0). No board element portals to
`document.body`.

### 11.2 Hit Targets

| Control | Element that receives the event | Clickable bounds | Ancestor pointer-events |
|---------|--------------------------------|------------------|-------------------------|
| Program card body | The card's own `a`, stretched by `::after` at `inset: 0` | The whole card except the name and the copy button | The card sets `auto`. The overlay carries `auto`. |
| Program name | The `a` around the name text | The text box, including its underline | The card sets `auto`. The name sits at `z-10`, above the overlay. |
| Copy button | The button, 32 by 32 px | The button box, which holds a 14 px icon | The card sets `auto`. The button sits at `relative z-10`, above the overlay. |
| Epic card head | The head block's `a`, stretched by `::after` over the head only | The head block, not the pips row and not the slice list | The head sets `auto`. The overlay stops at the head's `inset: 0`. |
| Epic copy button | The button, 32 by 32 px | The button box | The head sets `auto`. The button sits at `relative z-10`. |
| Slice pips toggle | The whole pips row button | The full row width, 22 px tall | The card sets `auto`. |
| Slice card | The `a` around the whole card | The whole card | The card sets `auto`. |
| Orphan slice card | The button around the whole row | The whole row | The card sets `auto`. |
| Hide button | The button, 28 px tall | The button box, and not the column head | The column sets `auto`. |
| Hidden column rail | The rail button | The full 44 px width and the full column height | The column sets `auto`. |
| Find field | The `input` | The input box, 32 px tall and up to 340 px wide. The `label` "Find" focuses it | The command row sets `auto`. |
| Order select | The `select` | The control box, 32 px tall | The command row sets `auto`. |
| Cards switch button | Each button | The button box, 32 px tall | The group sets `auto`. |
| Back link | The `a` | The label text and the arrow | The band sets `auto`. |
| Board notice Close | The button | The button box, 28 px tall | The notice sets `auto`. The notice is the only floating region, and it restores `auto` on itself. |
| Top bar board link | The `a` | 44 by 44 px | The top bar sets `auto`. |

Two rules keep these targets honest. A card's overlay is a pseudo-element, so a
synthetic `.click()` on the card's text does nothing, and a real pointer on the
card body navigates. VALIDATE presses the card with a real pointer at a point
inside the card's padding, away from the name and the copy icon.

### 11.3 Scroll Ownership

| Region | Owns the wheel and drag | Other surface |
|--------|------------------------|---------------|
| The document | Nothing. `html` and `body` carry no overflow | The shell fills its host, as `shell/App.tsx` states |
| The shell pane (`SidebarInset`) | The pane, on both axes, as the shell's contract says. On the board route the board fits the pane, so the pane never overflows | The board page never grows past the pane |
| Each column body | The column, vertically, with `overscroll-contain` | The column head stays still. The other columns do not move |
| The board row of columns | The board row, horizontally, and only when the pane is narrower than 960 px | The page never scrolls sideways. The board's own `overflow-x: auto` keeps the gesture here |
| The epic slice list | Nothing. The list grows on `--motion-panel`, and the column scrolls | The card never nests a scroller |
| The card corner | Nothing, `overflow: clip`, not `hidden` | The clip keeps the radius and claims no gesture |
| The Work drawer | The drawer, as ADR-0034 decides | The board behind it does not scroll |

`overflow: clip` is used on the card root, the column head, and the notice. None
of the three claims a scroll gesture.

---

## 12. Future Considerations

1. **Multi-selection and swim lanes.** The engineer removed both on 2026-11-14.
   They return only with a new decision, and they would add a second board shape.
2. **A sort by date or priority.** The index holds no such field today.
3. **A page for one slice.** A slice of a program opens the epic page with a
   fifth segment. A slice with no program has no page. A page per slice would end
   the in-place card.
4. **The Done column as a fold.** The prototype folds Done into a narrow rail
   inside each program's band. The two-level board hides columns instead, so the
   fold is not needed.
5. **A copy icon on slice cards.** `contracts.md` gives prompts to programs and
   epics only. A slice prompt would need a tracker rule.
6. **A build time in every bundle.** Until `build_index.py` writes `built_at`
   every time, the board states its absence.

---

## Document Validation Checklist

- [x] Every interactive component has a state table in Section 3.2.
- [x] Every component marks exactly one initial state.
- [x] Every timer names its arming event and its reset event. The success notice
      starts on the copy action and resets after `--hold-ack`. The skeleton starts
      on the request and stops on settle.
- [x] Every control with a conditional existence appears in Section 3.3.
- [x] Every multi-valued setting appears in Section 2.3 with a default.
- [x] Every state change appears in Section 4.1 with a source and target state.
- [x] Every duration in Section 4.1 names a token from Section 4.2.
- [x] Every flow names its entry condition and its edge cases.
- [x] Every floating surface names a layer from Section 11.1.
- [x] Every control names its hit target element and its clickable bounds.
- [x] Every overlapping region names the surface that owns the gesture.
- [x] No section depends on the mockup for an answer.
