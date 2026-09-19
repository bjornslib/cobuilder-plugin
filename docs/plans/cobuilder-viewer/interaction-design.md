# Work board: Interaction Design Specification

**Version:** 1.0
**Date:** 2026-09-18
**Author:** design session with bjornslib
**Product document:** `01-product.md` (not yet written — this design is still at design mode, so the product intent currently lives in `docs/architecture/designs/cobuilder-viewer/goal.json`)

---

## 1. Overview

The Work board is the first surface a reader meets when they open a bundle. It answers one question: what work exists, and where has it got to. It lists every design the bundle holds. It opens one design into its records, and it lets a reader walk from a design down to a single slice.

This document describes what the board does over time. A static mockup shows the board at rest. It cannot show which state a control starts in. It cannot show what happens while data loads, which controls are absent rather than disabled, or what the board does when a record is missing. Those are the questions below.

The board reads the record index and computes no joins of its own. Every number on the board comes from `data/index.json`.

### 1.1 Core Design Principles

1. **The board renders. It never computes.** Every count, state, and join comes from `data/index.json`. A surface that derives its own join will disagree with the index, and the disagreement will be silent.
2. **Absence is a first-class state.** The board shows a record that does not exist, and names it. It is never hidden and never rendered as a blank box. A backlog design with one record is a deliberate state, not a loading failure.
3. **One name for one thing.** The state words come from the record schema. The board does not invent a synonym for a state the data already names.
4. **Progressive disclosure.** The board shows the overview first. A design opens into its lenses. An epic expands into its slices. A diagram shows its source until a reader asks for the render.
5. **State never depends on colour alone.** Every state carries a word and a shape beside its colour. The board then survives a colour-blind reader and a monochrome print.

---

## 2. Information Architecture

### 2.1 Navigation Structure

```
Work board
├── board                      (default. Lane tabs filter the design list.)
└── design/:designId
    ├── lens/:lensId           (intent | problem-and-solution | architecture |
    │                           risks-and-verdict | build | pull-requests)
    ├── epic/:epicId           (expands the epic, lists its slices)
    └── slice/:sliceId         (selects one slice inside its epic)
FlightDeck                     (separate surface, not this document)
Reference                      (separate surface, not this document)
```

The lane is a query parameter, not a route segment, so a lane survives a trip into a design and back.

### 2.2 Data Model

The board reads `data/index.json`. It reads nothing else for structure, and `data/designs.js` for record bodies.

| Entity | Key fields read | Source |
|---|---|---|
| design | `id`, `name`, `outcome`, `stage` | `entities.design` |
| epic | `id`, `epic_id`, `design`, `branch`, `pr`, `state`, `note` | `entities.epic` |
| slice | `id`, `n`, `title`, `ends_with`, `score`, `state`, `attempts`, `feature` | `entities.slice` |
| adr | `id`, `title`, `state` | `entities.adr` |
| pull request | `id`, `title`, `state` | `entities.pull_request` |
| design records | `goal`, `intent`, `narrative`, `assessment`, `pr_draft`, diagrams | `data/designs.js` |

| Join | What it answers |
|---|---|
| `epic_status` | the real state of each epic |
| `epic_to_pull_request` | which pull request carries an epic |
| `slice_to_epic` | which epic owns a slice |
| `slice_to_epic_unresolved` | slices that belong to no epic |
| `adr_to_pull_request` | which pull request carries a decision |
| `adr_to_context`, `adr_to_district` | where a decision lands |
| `feature_gates` | gate state per feature (currently empty) |
| `district_uncovered` | districts no context verifies |

**Declared state vocabularies.** The board renders these words. The current corpus carries only some of them, and the board marks the difference rather than inventing data.

| Kind | Vocabulary | Carried today |
|---|---|---|
| design `stage` | `backlog`, `decided`, `approved`, `review`, `implemented`, `superseded` | all six |
| epic `state` | `planned`, `in-progress`, `blocked`, `in-review`, `merged`, `superseded` | `planned` 56, `open` 12, `completed` 3, `merged` 1 |
| slice `state` | `planned`, `red`, `green`, `validated`, `completed`, `failed`, `skipped` | `completed` 29 |
| adr `state` | `idea`, `tentative`, `decided`, `approved`, `challenged`, `rejected`, `discarded` | `approved` 17, `decided` 7, `rejected` 3 |

`open` and `completed` are the current epic words. The wider vocabulary names the states the build loop already produces. The schema must reconcile the two before the wider vocabulary can render real data.

### 2.3 Declared Defaults

| Setting | Default value | Alternatives | Declared where |
|---|---|---|---|
| Theme | **light** | dark | theme store, applied as `data-theme` on the root |
| Theme storage | none (session only) | persisted per reader | not implemented. The published file cannot persist |
| Lane tab | `All` | needs a decision, ready to build, in review, shipped | route query parameter |
| Open design | none | `design/:designId` | route |
| Lens within a design | `intent` | the other five | route. The intent lens leads because a design's intent is its first record |
| Epic expansion | collapsed | expanded | component state |
| Selected slice | none | one `slice/:sliceId` | route |
| Diagram rendering | source shown as code | rendered | component state, per diagram |
| Motion | follows `prefers-reduced-motion` | forced off | media query, honoured in every animated component |

Two defaults deserve a note. **Theme is light.** It does not follow the operating-system preference, because the engineer declared light as the default on 2026-09-18. **Diagram rendering is off.** A Mermaid runtime is a large dependency, and a reader who wants one diagram should not pay for it on first paint.

---

## 3. States

### 3.1 Screen States

| State | Trigger | What the person sees |
|---|---|---|
| Loading | the board mounts and the index has not resolved | a skeleton of the design grid at the real card size. No spinner alone, because a skeleton shows what is coming |
| Empty | the index resolved and holds no designs | one message naming the bundle path that was read, plus the command that writes a bundle |
| Populated | the index resolved and holds designs | the lane tabs and the design grid |
| Lane empty | a lane tab is selected and no design matches it | the tabs stay visible and the panel states which lane is empty and how many designs the other lanes hold. The tab set never disappears, or the reader cannot leave |
| Error | the index request failed | the failed path, the reason, and a retry control |
| Partial | the index resolved but a design's record body failed to load | the design still renders from the index. The affected tile carries its own error state. One failed body never blanks the board |

### 3.2 Component States

#### Lane tab

| State | Visual treatment | Initial | Timer arming |
|---|---|---|---|
| Default | muted label, no rule beneath | Yes (the `All` tab) | Not applicable |
| Hover | label darkens, a faint rule appears beneath | No | Not applicable |
| Focus-visible | 2 px ring at a 2 px offset, in the accent colour | No | Not applicable |
| Pressed | background tints toward the accent wash | No | Held while the pointer is down |
| Selected | label in accent colour, a solid 2 px rule beneath, count chip filled | No | Not applicable |
| Disabled | opacity 45 percent, cursor default | No | Not applicable. A lane with zero designs stays enabled, because its empty state names the other lanes |

#### Design card

| State | Visual treatment | Initial | Timer arming |
|---|---|---|---|
| Default | surface fill, 1 px border, stage badge, epic progress | Yes | Not applicable |
| Hover | lifts 2 px, shadow deepens, name underlines | No | Not applicable |
| Focus-visible | ring, plus the underline | No | Not applicable |
| Pressed | lifts 1 px, not 2 | No | Held while the pointer is down |
| Selected | not applicable — the card navigates rather than selecting | No | Not applicable |
| Disabled | not applicable — every design opens, including a superseded one | No | Not applicable |
| Loading | a skeleton card at the same size | Yes, while the index resolves | Starts on mount, ends when the index settles |
| Error | the card carries the failure reason in place of its counts | No | Not applicable |
| Empty | not applicable — a design always carries at least `goal.json` | No | Not applicable |
| Transient | not applicable | No | Not applicable |

#### Epic row

| State | Visual treatment | Initial | Timer arming |
|---|---|---|---|
| Default | title, state badge, slice count, chevron in the collapsed position | Yes | Not applicable |
| Hover | row background tints, chevron shifts 2 px toward the reader | No | Not applicable |
| Focus-visible | ring around the whole row | No | Not applicable |
| Pressed | background tints further | No | Held while the pointer is down |
| Selected | accent-coloured left rule and a tinted background | No | Not applicable |
| Disabled | not applicable | No | Not applicable |
| Loading | the row renders from the index, so it has no loading state | No | Not applicable |
| Error | not applicable | No | Not applicable |
| Empty | the row states that the epic carries no slices | Yes, when an epic carries none | Not applicable |
| Transient | not applicable | No | Not applicable |

#### Slice row

| State | Visual treatment | Initial | Timer arming |
|---|---|---|---|
| Default | number, title, score, attempts, state badge | Yes | Not applicable |
| Hover | background tints, title underlines | No | Not applicable |
| Focus-visible | ring around the row | No | Not applicable |
| Pressed | background tints further | No | Held while the pointer is down |
| Selected | accent left rule, tinted background, its detail panel opens | No | Not applicable |
| Disabled | not applicable | No | Not applicable |
| Loading | not applicable | No | Not applicable |
| Error | not applicable | No | Not applicable |
| Empty | not applicable — a slice always carries its row fields | No | Not applicable |
| Transient | not applicable | No | Not applicable |

#### Lens tile

| State | Visual treatment | Initial | Timer arming |
|---|---|---|---|
| Default | heading, a one-line summary of the record, sized to its content weight | Yes | Not applicable |
| Hover | lifts 2 px when the tile is openable | No | Not applicable |
| Focus-visible | ring | No | Not applicable |
| Pressed | lifts 1 px | No | Held while the pointer is down |
| Selected | the tile is the active lens, marked by a rule and a filled heading marker | Yes, for the `intent` tile | Not applicable |
| Disabled | 45 percent opacity, a lock icon, and the reason stated in the tile. The tile stays in place so the reader sees what the design lacks | No | Not applicable |
| Loading | a skeleton at the tile's own size | No | Not applicable |
| Error | the reason, in place of the summary | No | Not applicable |
| **Empty** | **the governing state for this surface.** The tile keeps its size, greys its heading, and states the missing record by name | No | Not applicable |
| Transient | a brief highlight when a jump lands on this tile | No | Starts on arrival, resets after 1200 ms |

#### State badge

| State | Visual treatment | Initial | Timer arming |
|---|---|---|---|
| Default | a pill carrying a word, a colour, and a shape marker | Yes | Not applicable |
| Hover | a tooltip glosses the state in one sentence | No | Not applicable |
| Focus-visible | ring | No | Not applicable |
| Pressed | not applicable — a badge is not a control | No | Not applicable |
| Selected | not applicable | No | Not applicable |
| Disabled | not applicable | No | Not applicable |
| Loading | not applicable | No | Not applicable |
| Error | the badge reads `unknown` in the neutral colour when the state word is outside the vocabulary | No | Not applicable |
| Empty | not applicable | No | Not applicable |
| Transient | not applicable | No | Not applicable |

#### Diagram tile

| State | Visual treatment | Initial | Timer arming |
|---|---|---|---|
| Default | the Mermaid source in a code block, with a control that says Render | **Yes** | Not applicable |
| Hover | the render control lifts | No | Not applicable |
| Focus-visible | ring on the render control | No | Not applicable |
| Pressed | the control tints | No | Held while the pointer is down |
| Selected | not applicable | No | Not applicable |
| Disabled | not applicable | No | Not applicable |
| **Loading** | the rendered diagram is announced as rendering, with a skeleton at the diagram's aspect ratio | No | **Starts when the reader presses Render, never on mount.** The runtime is loaded on that press |
| Error | the source stays visible and the tile states that rendering failed, plus the reason | No | Not applicable |
| Empty | the tile names the missing diagram level | Yes, for a design with no diagrams | Not applicable |
| Transient | the rendered diagram fades in over 200 ms | No | Ends when the render settles |

#### Theme switcher

| State | Visual treatment | Initial | Timer arming |
|---|---|---|---|
| Default | one lucide icon, `Sun` in light and `Moon` in dark, with an accessible name that states the action | Yes | Not applicable |
| Hover | the icon's container tints | No | Not applicable |
| Focus-visible | ring | No | Not applicable |
| Pressed | the container tints further | No | Held while the pointer is down |
| Selected | not applicable — this is a toggle, and its icon states the current theme | No | Not applicable |
| Disabled | not applicable | No | Not applicable |
| Loading | not applicable | No | Not applicable |
| Error | not applicable | No | Not applicable |
| Empty | not applicable | No | Not applicable |
| Transient | the icon crossfades to its counterpart over 150 ms | No | Starts on press, ends when the fade finishes |

#### Row affordance (link and disclosure marker)

| State | Visual treatment | Initial | Timer arming |
|---|---|---|---|
| Default | an `ExternalLink` or `ChevronRight` lucide icon at 40 percent opacity, plus an underline on text that reads as a link | Yes | Not applicable |
| Hover | the icon reaches full opacity and moves 2 px along its axis | No | Not applicable |
| Focus-visible | ring | No | Not applicable |
| Pressed | the icon returns to its resting position | No | Held while the pointer is down |
| Selected | not applicable | No | Not applicable |
| Disabled | not applicable | No | Not applicable |
| Loading | not applicable | No | Not applicable |
| Error | not applicable | No | Not applicable |
| Empty | not applicable | No | Not applicable |
| Transient | not applicable | No | Not applicable |

### 3.3 Visibility Gating

Gating is not disabling. A gated control is absent. A disabled control is visible and inert. The board uses each deliberately.

| Control | Renders when | Removed when |
|---|---|---|
| Retry (board) | the index request failed | a retry starts |
| Lane tabs | always, including when a lane is empty | never — the reader needs a way out of an empty lane |
| Slice list | the reader expands its epic | the reader collapses its epic |
| Slice detail panel | the reader selects a slice | the selection clears, the epic collapses, or the reader leaves the design |
| Render control (diagram) | the reader has not rendered the diagram | the reader has rendered it |
| "Intended states" legend | the board is showing a design whose corpus carries only part of the wider vocabulary | never within this design. The reconciling schema change removes it. |
| Empty-tile reason | the tile's record is absent | the record exists |
| Unresolved-slices tile | `slice_to_epic_unresolved` holds at least one slice | the join is empty |
| Gate tile content | `feature_gates` holds a record for the feature | the join is empty. The tile then states that no gate record exists, because an empty tile would read as a pass |

Two of these deserve a plain statement. **A disabled lens keeps its place.** Removing it would hide the gap, and the gap is what a reader needs to see. **The unresolved-slices tile disappears when empty.** It reports an anomaly, and an absent anomaly needs no report.

---

## 4. Transitions

### 4.1 Transition Table

| Trigger | Source state | Target state | Timing | Reset condition |
|---|---|---|---|---|
| Board mounts | — | Loading | immediate | the index settles |
| Index resolves with designs | Loading | Populated | 200 ms crossfade | — |
| Index resolves with no designs | Loading | Empty | 200 ms crossfade | a bundle is written |
| Index request fails | Loading | Error | immediate | the reader presses retry |
| Reader selects a lane tab | Populated | Populated, filtered | 150 ms panel fade | the reader selects `All` |
| Reader selects a lane with no designs | Populated | Lane empty | 150 ms panel fade | the reader selects another lane |
| Reader opens a design | Populated | design route | 250 ms shared-element lift | the reader navigates back |
| Reader expands an epic | collapsed | expanded | 220 ms height and opacity | the epic collapses, or the reader leaves |
| Reader selects a slice | none or another slice | that slice selected | 180 ms panel slide | the selection clears |
| Reader selects a lens | current lens | that lens | 180 ms content crossfade | another lens is selected |
| Reader presses Render | source shown | rendering | immediate | the render settles or fails |
| Render settles | rendering | rendered | 200 ms fade in | — |
| Render fails | rendering | error | immediate | the reader presses Render again |
| Reader toggles the theme | light or dark | the other | 150 ms icon crossfade, 200 ms token fade | the reader toggles back |
| Reader arrives from a deep link | Loading | Populated, with the target selected | 250 ms lift, then a 1200 ms highlight | the highlight elapses |
| Deep link names a design that does not exist | Loading | Error, naming the missing id | immediate | the reader returns to the board |
| Body of a record fails to load | Populated | Partial | immediate | the body loads |

No transition in this table is armed by a timer. Every timing above is a duration, not a countdown. The one delayed state, the deep-link highlight, starts on arrival and resets when it elapses.

### 4.2 Timing Tokens

| Token | Value | Used for |
|---|---|---|
| `--dur-instant` | 0 ms | error states, so a failure is never animated away from the reader |
| `--dur-fast` | 150 ms | hover tints, tab fades, theme icon crossfade |
| `--dur-base` | 200 ms | content crossfades, render fade in, theme token fade |
| `--dur-slow` | 250 ms | shared-element lifts, route changes |
| `--dur-expand` | 220 ms | epic expand and collapse |
| `--dur-highlight` | 1200 ms | the deep-link arrival highlight |
| `--ease-out` | `cubic-bezier(0.22, 0.75, 0.3, 1)` | every entrance |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | every reversible toggle |

Every duration in Section 4.1 names a token from this table. Under `prefers-reduced-motion: reduce`, every token resolves to `--dur-instant` except `--dur-highlight`, which keeps its 1200 ms because it marks a location rather than moving anything.

---

## 5. Interaction Flows

### 5.1 Land on the board and open one design

Entry condition: the reader opens the viewer with no route.

1. The board enters Loading and renders a skeleton of the design grid.
2. The index resolves. The board enters Populated and renders one card per design, in the `All` lane.
3. The reader moves the pointer over a card. It lifts. The reader's keyboard reaches the same card and a ring appears.
4. The reader activates the card. The board navigates to `design/:id` and the card lifts into the design header.
5. The design opens on the `intent` lens.

Edge cases:
- The index holds no designs: step 2 becomes Empty, naming the bundle path.
- The index fails: step 2 becomes Error, with a retry.
- The reader's deep link names a design the index does not hold: Error, naming the id.
- The reader arrives with `prefers-reduced-motion: reduce`: every step keeps its order and loses its movement.

### 5.2 Walk from a design down to one slice

Entry condition: a design is open.

1. The reader reaches the Build lens, by tab or by deep link.
2. The Build tile lists every epic for the design, each collapsed.
3. The reader activates an epic. It expands over `--dur-expand` and lists its slices, each with its number, title, score, attempts, and state.
4. The reader activates a slice. It becomes Selected and its detail panel opens beside the list.
5. The reader reads the slice's `ends_with`, and its `score` and `attempts` when the loop has run.

Edge cases:
- The epic carries no slices: the row states that, and no chevron renders.
- A slice belongs to no epic: it appears in the unresolved-slices tile, which names the join it came from.
- The epic's design document is absent: the epic detail names the missing document rather than showing an empty panel.
- The reader collapses the epic while a slice is selected: the selection clears, and the panel goes with it.

### 5.3 Read a design's completeness at a glance

Entry condition: the reader wants to know which records exist before reading any of them.

1. The design opens and the mosaic renders.
2. Every tile is present, whether its record exists or not.
3. A tile whose record exists shows a summary. A tile whose record is absent greys its heading and names the missing record.
4. The reader reads the mosaic as a completeness map and opens only the tiles they need.

Edge case: a design at `stage: backlog` carries `goal.json` alone, so most tiles are absent. That is the designed state, and the mosaic must read as a deliberate record rather than as a failure.

---

## 6. Component Specifications

### 6.1 Lane tabs

Built on the shadcn `Tabs` primitive over Radix. The trigger list stays mounted in every panel state, including empty and error. Each trigger carries its count as a chip so the reader can choose a lane without visiting it.

### 6.2 Design card

One shadcn `Card` per design. It carries the name, the `outcome` in one line, a `StageBadge`, and the epic progress. Progress reads `joins.epic_status`, and the bar is the SmoothUI `animated-progress-bar` so a change animates rather than jumps.

### 6.3 Epic row

A `Collapsible` over Radix. The trigger is the whole row, so the hit target is the full width rather than the chevron. The content is the slice list.

### 6.4 Slice row

A button, not a div, so it is focusable by default. It carries `score` and `attempts` as small chips. Both fields exist in the index today and no surface reads them.

### 6.5 Lens tile and mosaic

The bento arrangement is the subject of three variations under review (`src/variations/`). The tile's *states* are fixed by Section 3.2 regardless of which arrangement is chosen.

### 6.6 State badge

A shadcn `Badge` with a variant per state family. It carries a word, a colour, and a shape marker, so it survives greyscale. Its tooltip glosses the state in one sentence.

### 6.7 Diagram tile

A `ScrollArea` holding the Mermaid source in a code block, with a `Button` that renders it on press. The runtime loads on that press and not before.

---

## 7. Error States and Edge Cases

### 7.1 Index request fails

The board names the path it read and the reason it failed, and offers one retry. It does not fall back to a cached index, because a stale index presented as current is worse than a stated failure.

### 7.2 Cases to Check

| Case | Required behaviour |
|---|---|
| A design's `stage` is outside the declared vocabulary | the badge reads `unknown` in the neutral colour, and the raw word is kept in the tooltip |
| An epic carries no slices | the row states it. No chevron renders. |
| A slice belongs to no epic | it appears in the unresolved-slices tile |
| `feature_gates` is empty | the gate tile states that no gate record exists. It must not read as a pass |
| A design carries only `goal.json` | the mosaic reads as a complete record of a sparse design, not as a failure |
| A superseded design | the card names what superseded it, read from the `supersedes` field |
| A design names an ADR that does not exist | the decisions tile names the dangling reference |
| Two designs share a name | the id disambiguates, and both render |
| The index resolves but a record body fails | that tile alone shows the error. The board stays populated. |
| A diagram level is absent | the tile names the missing level |
| `slice_to_epic_unresolved` is non-empty | those slices are shown, and the tile names the join |
| `district_uncovered` is non-empty | the map coverage tile states the count, for the Reference surface to detail |

---

## 8. Accessibility

### 8.1 Keyboard Navigation

Every control is reachable by `Tab` in reading order. A card, an epic row, and a slice row are buttons, so each is focusable without added `tabindex`. The expand control is `Enter` or `Space`. `Escape` closes an open slice panel and returns focus to the slice row. A skip link leads from the top of the page to the design grid.

### 8.2 Screen Reader Support

Each lane tab announces its name and its count. An epic announces its state and its slice count, then its expanded state. A slice announces its number, title, state, and score. An absent record announces itself as absent, with the record named, so a reader who cannot see the grey still learns the gap.

### 8.3 Colour Independence

Every state carries a word. No state relies on colour alone. The stage badge, the epic state, and the slice state each pair a colour with a distinct shape marker. The mosaic then survives greyscale and a colour-blind reader.

### 8.4 Focus Management

Opening a design moves focus to the design heading. Expanding an epic leaves focus on the epic row, so the reader keeps their place. Selecting a slice leaves focus on the slice row and announces the panel. Closing a panel returns focus to the row that opened it. A deep link moves focus to the target element and scrolls it into view, honouring reduced motion.

---

## 9. Responsive Considerations

### 9.1 Desktop (over 1200 px)

The mosaic shows its full bento arrangement. The epic and slice list sits beside the lens tiles. The design grid runs to four columns.

### 9.2 Tablet (768 px to 1200 px)

The mosaic collapses to two columns, and the widest tile spans both. The epic and slice list moves above the lens tiles rather than beside them. The design grid runs to two columns.

### 9.3 Mobile (under 768 px)

The mosaic becomes a single column in reading order. The lane tabs scroll horizontally rather than wrapping, and the active tab scrolls into view. The slice list and its detail panel become two screens rather than two panes. The design grid is one column. Font sizes hold. Only the layout narrows.

---

## 10. Animation Specifications

| Element | Animation | Token |
|---|---|---|
| Design card entrance | fade and 8 px rise, staggered 30 ms per card, capped at 300 ms total | `--dur-slow` |
| Card hover | 2 px lift with a deepening shadow | `--dur-fast` |
| Epic expand | height and opacity together | `--dur-expand` |
| Slice panel | 12 px slide with a fade | `--dur-base` |
| Lens change | content crossfade, no slide | `--dur-base` |
| Theme change | icon crossfade, then a token fade across the page | `--dur-fast`, then `--dur-base` |
| Arrival highlight | a background pulse on the target element | `--dur-highlight` |
| Diagram render | fade in at the diagram's own aspect ratio | `--dur-base` |

No element animates on scroll. Nothing parallaxes. Depth is expressed through card elevation and hover lift, not through a 3D scene.

---

## 11. Layering, Hit Targets, and Scroll Ownership

### 11.1 Layering

One scale, named once, used everywhere.

| Layer | Token | Holds |
|---|---|---|
| 0 | `--layer-base` | the page and every tile |
| 1 | `--layer-raised` | a hovered or selected card |
| 2 | `--layer-sticky` | the lane tab bar and the design header when stuck |
| 3 | `--layer-panel` | a tooltip |
| 4 | `--layer-modal` | not used on this surface |

### 11.2 Hit Targets

| Control | Hit target element | Bounds |
|---|---|---|
| Lane tab | the whole tab trigger | at least 44 px tall, at least 88 px wide |
| Design card | the whole card | the card's full area. No inner link competes. |
| Epic row | the whole row, not the chevron | full width, at least 48 px tall |
| Slice row | the whole row | full width, at least 44 px tall |
| Lens tile | the whole tile when openable | the tile's full area |
| State badge | the badge, for its tooltip | at least 24 px tall. The tooltip opens on hover and on focus. |
| Theme switcher | the icon button | 44 px square |
| Render control | the button | at least 44 px tall |
| Row affordance icon | the row, never the icon alone | the row's full area |

An icon is never the sole hit target. Every icon sits inside a target at least 44 px in each direction.

### 11.3 Scroll Ownership

| Region | Owns the scroll | Why |
|---|---|---|
| The page | the document | one scroll for the whole board, so a reader never loses their place between panes |
| The design grid | the document | it is the page's main content |
| The epic and slice list | itself, once the list exceeds the viewport | it must stay usable while the lens tiles scroll beside it |
| The slice detail panel | itself | its content is independent of the list |
| The lane tab bar | itself, horizontally, and only under 768 px | the tabs must not wrap |
| A diagram tile | itself, both axes | a rendered diagram is often wider than its tile |
| A tooltip | none | it is transient and never scrolls |

Where two regions could claim a gesture, the innermost region that owns a scroll wins, and the outer region does not move. A wheel event over the slice list scrolls the slice list and never the page.

---

## 12. Future Considerations

1. **The epic and slice state vocabulary needs a schema change.** The board declares states the corpus cannot yet carry. Until `build_index.py` and the slice table emit them, the board shows the gap honestly.
2. **`feature_gates` is empty.** The Build lens has no gate data. When gates populate, they join this surface.
3. **Per-epic design documents exist for 11 epics.** The board should link them, and it does not yet.
4. **The mosaic arrangement is under review.** Three variations exist under `src/variations/`. This document fixes the states. It does not choose the arrangement.
5. **The theme switcher persists nothing.** A published file cannot store a preference, so the default is declared rather than remembered.

---

## Document Validation Checklist

- [x] Every interactive component has a state table in Section 3.2.
- [x] Every component marks exactly one initial state.
- [x] Every timer names its arming event and its reset event. No countdown exists on this surface. The one delayed state names its start and its reset.
- [x] Every control with a conditional existence appears in Section 3.3.
- [x] Every multi-valued setting appears in Section 2.3 with a default.
- [x] Every state change appears in Section 4.1 with a source and target state.
- [x] Every duration in Section 4.1 names a token from Section 4.2.
- [x] Every flow names its entry condition and its edge cases.
- [x] Every floating surface names a layer from Section 11.1.
- [x] Every control names its hit target element and its clickable bounds.
- [x] Every overlapping region names the surface that owns the gesture.
- [x] No section depends on the mockup for an answer.
