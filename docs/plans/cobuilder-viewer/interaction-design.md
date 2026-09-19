# Work board: Interaction Design Specification

**Version:** 2.0
**Date:** 2026-09-19
**Author:** design session with bjornslib
**Product document:** `01-product.md` (not yet written. The product intent currently lives in `docs/architecture/designs/cobuilder-viewer/goal.json`.)

Version 2.0 replaces the surface-first shape with an application shell and a
three-level content hierarchy. The three layout variations built on
2026-09-18 are inputs to this document, not candidates against it. Their tile
arrangements remain useful inside the scroll pane. Their page-scrolling frame
is superseded by section 2.1.

---

## 1. Overview

The viewer is an application, not a document. A reader opens it on one piece of
work and moves through that work without losing their place. The shell holds the
work item in a fixed top bar, the sections in a fixed left navigation, and every
piece of content in one scroll pane.

One piece of work has three faces. **Intent** states why the work exists and what
would make it done. **Problem and solution** states what was wrong, what answers
it, and what the answer costs. **Architecture** states the decisions, the
boundaries, and the diagrams. A reader moves between the three without leaving
the work item.

Build and pull requests extend the same three faces rather than replacing them.
A reader in Build still reaches the problem and the architecture, because those
answer questions that arrive while building.

### 1.1 Core Design Principles

1. **One work item, held in one place.** The top bar names the current work item
   and never scrolls away. Every section renders that item.
2. **The left navigation is the traverse.** Moving from design to build to pull
   request is one click in a fixed rail, never a trip back to a list.
3. **The page does not scroll. Only the content does.** The top bar and the left
   navigation stay in place. One scroll pane owns the rest.
4. **A section appears when the work reaches it.** A section the work cannot fill
   is absent, not empty. Build appears when the work has epics. Pull requests
   appear when a branch or a pull request exists.
5. **Absence is a first-class state.** A record that does not exist is named, not
   hidden and not rendered as a blank box.
6. **The shell renders. It never computes.** Every count, state, and join comes
   from `data/index.json`.

---

## 2. Information Architecture

### 2.1 Navigation Structure

The shell has three fixed regions and one scrolling region.

```
┌──────────────────────────────────────────────────────────────────┐
│ TOP BAR (fixed)   [ work item ] [ status ] [ search ] [ theme ]  │
├────────────────────┬─────────────────────────────────────────────┤
│ LEFT NAV (fixed)   │  SCROLL PANE (the only scrolling region)     │
│                    │                                              │
│ THE WORK           │                                              │
│   Intent           │                                              │
│   Problem & Sol.   │                                              │
│   Architecture     │                                              │
│ BUILD              │                                              │
│   Epics            │                                              │
│   Rubrics          │                                              │
│ PULL REQUESTS      │                                              │
│   This work's      │                                              │
│   FlightDeck       │                                              │
│ SHIPPED            │                                              │
└────────────────────┴─────────────────────────────────────────────┘
```

```
viewer
└── work/:workId                     the work item, held for every section
    ├── :section                     intent | problem-and-solution | architecture
    │                                | build | pull-requests | shipped
    ├── build/epics
    ├── build/epics/:epicId          opens one epic, and its slices with it
    ├── build/rubrics
    └── pull-requests/:prNumber      one pull request
```

The route carries the work item and the section. The nav renders from the route,
so a deep link lands on the same screen a reader reached by clicking.

**The rail lists sections, never records.** This is the rule that decides every
future argument about what belongs in the rail, and it has two reasons.

The first is meaning. A slice belongs to one epic and carries no meaning outside
it, so the rail never lists slices. The same holds for anything that exists only
as a row inside something else. A design document is different, and it is worth
stating where the line falls: a document is opened, read, and closed, so it has
meaning on its own. It still does not go in the rail, for the second reason.

The second is size, and it is the stronger one. A program's epic and slice count
is unbounded. `cobuilder-viewer` carries eighteen epics today, and the corpus
carries twenty-nine slices. A rail that lists records grows with the corpus,
overflows the viewport, and turns a fixed navigation into a scrolling one. The
rail's job is to say where a reader can go, not to enumerate what is there.

So the rail carries the three levels and the gated groups, and nothing else. An
epic's design document, its slices, its rubrics and its pull requests are reached
from the epic's own detail view.

**Section gating.** A section appears when the work can fill it. Sections are
gated, not disabled, because an empty section teaches nothing and costs a click.
Section 3.3 states each rule.

**The three levels persist.** Intent, Problem and solution, and Architecture sit
above the Build group in the rail, and they stay reachable from every other
section. A reader in Build who needs the constraint the architecture states
clicks it in the same rail, then clicks back.

### 2.2 Data Model

The shell reads `data/index.json`. It reads `data/designs.js` for record bodies.

| Entity | Key fields read | Source |
|---|---|---|
| design | `id`, `name`, `outcome`, `stage` | `entities.design` |
| epic | `id`, `epic_id`, `design`, `branch`, `pr`, `state`, `note` | `entities.epic` |
| slice | `id`, `n`, `title`, `ends_with`, `score`, `state`, `attempts`, `feature` | `entities.slice` |
| adr | `id`, `title`, `state`, plus `maps_to.rule` | `entities.adr` |
| boundary rule | `id`, `name`, `why` | `entities.boundary_rule` |
| district | `id`, `label`, `summary` | `entities.district` |
| pull request | `id`, `title`, `state` | `entities.pull_request` |
| publication | `id`, `target`, `url` | `entities.publication` |
| design records | `goal`, `intent`, `narrative`, `assessment`, `pr_draft`, diagrams | `data/designs.js` |

| Join | What it answers |
|---|---|
| `epic_status` | the real state of each epic |
| `epic_to_pull_request` | which pull request carries an epic |
| `slice_to_epic` | which epic owns a slice |
| `slice_to_epic_unresolved` | slices that belong to no epic |
| `adr_to_pull_request`, `adr_to_context`, `adr_to_district` | where a decision lands |
| `feature_gates` | gate state per feature |
| `context_verifies_district`, `district_uncovered` | map coverage |

**What each level reads, and which records back it.** A level is available when
at least one of its records exists. It is disabled only when every one of them is
absent. This rule matters because a sparse design still fills a level: `goal.json`
alone is enough for Intent and for Architecture, so `inflight-record-store` has
one disabled level, not three.

| Level | Records that back it | Fields |
|---|---|---|
| Intent | `goal.json` alone is enough. `intent.json` adds depth | `goal.outcome`, `goal.done_when`, `goal.abort_if`, `intent.out_of_scope`, plus identity: id, stage, branch, epic count |
| Problem and solution | `intent.json`, `narrative.json`, or `assessment.json` | `narrative.problem_solution` beats by kind, `intent.problem`, `intent.approach`, `intent.risks`, `intent.unknowns`, `assessment.verdict` and `assessment.findings`, `intent.alternatives` |
| Architecture | `goal.json`'s `adrs[]`, or the design's `diagrams/` | the linked ADRs with their `maps_to.rule`, `boundary_rule` entities, districts and contexts touched, diagrams by level, and for an epic the Gate 4b design's `Types & Signatures` |

**What the corpus cannot supply.** The shell names these rather than implying
them.

| Missing | Consequence |
|---|---|
| A deploy record | the Shipped section reports `stage: implemented` and the publication entities, and states that no deploy record exists |
| `feature_gates` is empty | the Rubrics section states that no gate record exists, and must not read as a pass |
| Epics carry four states | the intended six render as a marked prototype ladder beside the real value |
| All 29 slices are `completed` | the intended seven render the same way |
| An epic has no `outcome` in the index | the outcome comes from `goal.epics[]` in `designs.js`, and the Why line states which source it read |

### 2.3 Declared Defaults

| Setting | Default value | Alternatives | Declared where |
|---|---|---|---|
| Theme | **light** | dark | `data-theme` on the root |
| Theme persistence | none | per reader | not implemented. A published file cannot persist |
| Section | `intent` | the other sections | route |
| Work item | none | a design or an epic id | route |
| Left nav state | expanded | a group collapsed | component state |
| Rail collapse | expanded above 1200 px | collapsed | viewport |
| Diagram rendering | source as code | rendered | component state, per diagram |
| State ladder display | real value only | real plus intended | component state |
| Motion | follows `prefers-reduced-motion` | forced off | media query |

Two defaults deserve a plain statement. **Theme is light.** It does not follow
the operating-system preference, because the engineer declared light on
2026-09-18. **Diagram rendering is off.** A Mermaid runtime is a large
dependency, and a reader who wants one diagram should not pay for it on first
paint.

---

## 3. States

### 3.1 Screen States

| State | Trigger | What the person sees |
|---|---|---|
| Loading | the shell mounts and the index has not resolved | the top bar and the rail render from the route, and the scroll pane shows a skeleton at the real content size. The shell never waits, because the shell does not depend on the index |
| Empty | the index resolved and holds no work | the scroll pane names the bundle path it read, and the command that writes a bundle |
| Populated | the index resolved | the rail, the top bar, and the section |
| Section absent | the work cannot fill the section | the section is gated, so the route redirects to the nearest section the work can fill |
| Error | the index request failed | the failed path, the reason, and a retry |
| Partial | the index resolved and a record body failed | the section renders from the index, and the affected panel states its own error. One failed body never blanks a section |

### 3.2 Component States

#### Top bar

| State | Visual treatment | Initial | Timer arming |
|---|---|---|---|
| Default | fixed, one hairline rule beneath, the work item's name and status | Yes | Not applicable |
| Hover | not applicable. The bar itself is not interactive | No | Not applicable |
| Focus-visible | not applicable. Its children carry the rings | No | Not applicable |
| Pressed | not applicable | No | Not applicable |
| Selected | not applicable | No | Not applicable |
| Disabled | not applicable | No | Not applicable |
| Loading | the work item's name renders from the route, so the bar has no loading state | No | Not applicable |
| Error | the status badge reads `unknown`, and the bar keeps the work item's name | No | Not applicable |
| Empty | not applicable | No | Not applicable |
| Transient | the bar never moves. A section change never animates the bar | No | Not applicable |

#### Nav item

| State | Visual treatment | Initial | Timer arming |
|---|---|---|---|
| Default | label in muted ink, no background | Yes, for items in a collapsed group | Not applicable |
| Hover | background tints toward the surface, label darkens | No | Not applicable |
| Focus-visible | 2 px ring at a 2 px offset | No | Not applicable |
| Pressed | background tints further | No | Held while the pointer is down |
| Selected | accent left rule, tinted background, label in accent ink | Yes, for the current section | Not applicable |
| Disabled | opacity 45 percent, and the reason in a tooltip. Used for a level whose record is absent, so the reader sees the gap in place | No | Not applicable |
| Loading | not applicable. The rail renders from the route | No | Not applicable |
| Error | not applicable | No | Not applicable |
| Empty | not applicable | No | Not applicable |
| Transient | a brief highlight when a deep link lands | No | Starts on arrival, resets after 1200 ms |

#### Nav group header

| State | Visual treatment | Initial | Timer arming |
|---|---|---|---|
| Default | small uppercase mono label, chevron collapsed | No. Groups start expanded | Not applicable |
| Hover | label darkens, chevron shifts 2 px | No | Not applicable |
| Focus-visible | ring | No | Not applicable |
| Pressed | label darkens further | No | Held while the pointer is down |
| Selected | not applicable. A header is a disclosure, not a destination | No | Not applicable |
| Disabled | not applicable | No | Not applicable |
| Loading | not applicable | No | Not applicable |
| Error | not applicable | No | Not applicable |
| Empty | when every item in the group is gated, the header and the group both go | Yes, for a gated group | Not applicable |
| Transient | not applicable | No | Not applicable |

#### Work-item switcher

| State | Visual treatment | Initial | Timer arming |
|---|---|---|---|
| Default | the work item's name, with a chevron | Yes | Not applicable |
| Hover | background tints, chevron rotates 180 degrees over `--dur-fast` | No | Not applicable |
| Focus-visible | ring | No | Not applicable |
| Pressed | background tints further | No | Held while the pointer is down |
| Selected | the open list marks the current item | No | Not applicable |
| Disabled | not applicable. A reader may always change work item | No | Not applicable |
| Loading | a skeleton the width of a design name | Yes, while the index resolves | Starts on mount, ends when the index settles |
| Error | the control keeps the work item's name from the route, and states that no list is available | No | Not applicable |
| Empty | the list states that the bundle holds no other work | No | Not applicable |
| Transient | the list closes on `Escape` and on an outside click | No | Not applicable |

#### Status badge

| State | Visual treatment | Initial | Timer arming |
|---|---|---|---|
| Default | a pill carrying a word, a colour, and a shape marker | Yes | Not applicable |
| Hover | a tooltip glosses the state in one sentence | No | Not applicable |
| Focus-visible | ring | No | Not applicable |
| Pressed | not applicable. A badge is not a control | No | Not applicable |
| Selected | not applicable | No | Not applicable |
| Disabled | not applicable | No | Not applicable |
| Loading | not applicable | No | Not applicable |
| Error | reads `unknown` in the neutral colour when the word is outside the vocabulary, and keeps the raw word in the tooltip | No | Not applicable |
| Empty | not applicable | No | Not applicable |
| Transient | not applicable | No | Not applicable |

#### Contract block (Why, Done when, Abort if, Out of scope)

| State | Visual treatment | Initial | Timer arming |
|---|---|---|---|
| Default | four labelled columns on one band, Done when and Abort if side by side | Yes | Not applicable |
| Hover | a list row tints, and its source field is named on hover | No | Not applicable |
| Focus-visible | ring on the row | No | Not applicable |
| Pressed | not applicable | No | Not applicable |
| Selected | not applicable | No | Not applicable |
| Disabled | not applicable | No | Not applicable |
| Loading | a skeleton band at the block's real height | Yes, while `designs.js` resolves | Starts on mount, ends when the record settles |
| Error | the block states which record it could not read | No | Not applicable |
| Empty | `Abort if` is often absent in the corpus. The column states that no abort condition is recorded, rather than rendering blank | No | Not applicable |
| Transient | not applicable | No | Not applicable |

#### Level section (Intent, Problem and solution, Architecture)

| State | Visual treatment | Initial | Timer arming |
|---|---|---|---|
| Default | a heading, then its panels | Yes, for the current section | Not applicable |
| Hover | not applicable at section level | No | Not applicable |
| Focus-visible | not applicable. Its controls carry the rings | No | Not applicable |
| Pressed | not applicable | No | Not applicable |
| Selected | the section is current, marked in the rail | Yes, for the routed section | Not applicable |
| Disabled | the section's nav item is disabled and names the absent record | No | Not applicable |
| Loading | panels render skeletons at their real size | No | Not applicable |
| Error | the panel that failed states its reason, and the other panels still render | No | Not applicable |
| Empty | the section's nav item is gated when the work cannot fill it at all | No | Not applicable |
| Transient | a crossfade on section change | No | Ends when the section settles |

#### Epic row

| State | Visual treatment | Initial | Timer arming |
|---|---|---|---|
| Default | title, state badge, slice count, chevron collapsed | Yes | Not applicable |
| Hover | row tints, chevron shifts 2 px | No | Not applicable |
| Focus-visible | ring around the whole row | No | Not applicable |
| Pressed | row tints further | No | Held while the pointer is down |
| Selected | accent left rule, tinted background, its detail opens | No | Not applicable |
| Disabled | not applicable | No | Not applicable |
| Loading | not applicable. The row renders from the index | No | Not applicable |
| Error | not applicable | No | Not applicable |
| Empty | the row states that the epic carries no slices | Yes, when it carries none | Not applicable |
| Transient | not applicable | No | Not applicable |

#### Slice row

| State | Visual treatment | Initial | Timer arming |
|---|---|---|---|
| Default | number, title, score, attempts, state badge | Yes | Not applicable |
| Hover | row tints, title underlines | No | Not applicable |
| Focus-visible | ring around the row | No | Not applicable |
| Pressed | row tints further | No | Held while the pointer is down |
| Selected | accent left rule, tinted background, its detail opens | No | Not applicable |
| Disabled | not applicable | No | Not applicable |
| Loading | not applicable | No | Not applicable |
| Error | not applicable | No | Not applicable |
| Empty | not applicable. A slice always carries its row fields | No | Not applicable |
| Transient | not applicable | No | Not applicable |

#### Diagram panel

| State | Visual treatment | Initial | Timer arming |
|---|---|---|---|
| Default | the Mermaid source in a code block, with a control that says Render | **Yes** | Not applicable |
| Hover | the render control lifts | No | Not applicable |
| Focus-visible | ring on the render control | No | Not applicable |
| Pressed | the control tints | No | Held while the pointer is down |
| Selected | not applicable | No | Not applicable |
| Disabled | not applicable | No | Not applicable |
| Loading | announced as rendering, with a skeleton at the diagram's aspect ratio | No | **Starts when the reader presses Render, never on mount.** The runtime loads on that press |
| Error | the source stays visible, and the panel states that the render failed and why | No | Not applicable |
| Empty | the panel names the absent level | Yes, when a level has no diagram | Not applicable |
| Transient | the rendered diagram fades in | No | Ends when the render settles |

### 3.3 Visibility Gating

A gated control is absent. A disabled control is visible and inert. The shell
uses each on purpose. **Sections are gated, because an empty section wastes a
click. Levels are disabled, because an absent record is a fact the reader needs
to see in place.**

| Control | Renders when | Removed when |
|---|---|---|
| Build group | the work has at least one epic | the work carries no epics |
| Pull requests group | `epic_to_pull_request` names a pull request for one of this work's own epics | no epic carries a pull request |
| Shipped group | `stage` is `implemented`, or a `publication` exists for a pull request this work's own epics carry | neither holds |
| Rubrics item | `feature_gates` holds a gate record for this feature | the join is empty. The item then states that no gate record exists, because a missing record must not read as a pass |
| Slice list under an epic | the epic is expanded | the epic is collapsed |
| Render control | the diagram has not been rendered | the reader renders it |
| Empty-state note | the panel's record is absent | the record exists |
| Unresolved-slices panel | `slice_to_epic_unresolved` holds a slice | the join is empty |
| Retry | the index request failed | a retry starts |
| Level nav item | always present. It is disabled when its record is absent, so the gap stays visible | never |

**A pull request reached through a decision is not the work's pull request.**
An earlier version of this table accepted `adr_to_pull_request` as well. That was
wrong, and the corpus shows why. `cobuilder-viewer` has eighteen epics and none
of them carries a pull request. Its `goal.adrs[]` names ADR-0001, and ADR-0001
reaches PR 2, which is a documentation pull request from July. The group then
rendered, and the rail told a reader that this work had two pull requests when
its own work had none.

A decision's pull request belongs beside that decision, in the Architecture
level, labelled as the pull request that carried the decision. It never becomes
the work's own set. The same reasoning fixes the Shipped gate: a publication for
somebody else's pull request is not evidence that this work shipped.

---

## 4. Transitions

### 4.1 Transition Table

| Trigger | Source state | Target state | Timing | Reset condition |
|---|---|---|---|---|
| Shell mounts | — | Loading | immediate | the index settles |
| Index resolves | Loading | Populated | `--dur-base` crossfade | — |
| Index resolves with no work | Loading | Empty | `--dur-base` crossfade | a bundle is written |
| Index request fails | Loading | Error | `--dur-instant` | the reader presses retry |
| Reader selects a section | current section | that section | `--dur-base` crossfade | another section is selected |
| Reader selects a gated section | current section | redirect to the nearest available section | immediate | — |
| Reader selects another work item | work A | work B, same section where B fills it | `--dur-slow` crossfade | — |
| Reader expands a nav group | collapsed | expanded | `--dur-expand` | the reader collapses it |
| Reader opens an epic | collapsed | selected, detail open | `--dur-expand` | the selection clears |
| Reader selects a slice | none or another | that slice selected | `--dur-base` slide | the selection clears |
| Reader presses Render | source shown | rendering | immediate | the render settles or fails |
| Render settles | rendering | rendered | `--dur-base` fade | — |
| Render fails | rendering | error | `--dur-instant` | the reader presses Render again |
| Reader toggles the theme | light or dark | the other | `--dur-fast` icon, then `--dur-base` tokens | the reader toggles back |
| Reader arrives from a deep link | Loading | Populated, target selected | `--dur-slow`, then a highlight | the highlight elapses |
| Deep link names work the bundle lacks | Loading | Error naming the id | `--dur-instant` | the reader returns to the rail |
| A record body fails | Populated | Partial | `--dur-instant` | the body loads |

No transition here is armed by a timer. Every timing is a duration, not a
countdown. The one delayed state, the deep-link highlight, starts on arrival and
resets when it elapses. The diagram render is the only deferred load, and it
starts on the reader's press.

### 4.2 Timing Tokens

| Token | Value | Used for |
|---|---|---|
| `--dur-instant` | 0 ms | every error state, so a failure is never animated away from the reader |
| `--dur-fast` | 150 ms | hover tints, the theme icon, the chevron rotation |
| `--dur-base` | 200 ms | section crossfades, the render fade, theme tokens |
| `--dur-slow` | 250 ms | work-item changes, deep-link arrival |
| `--dur-expand` | 220 ms | nav groups and epic disclosure |
| `--dur-highlight` | 1200 ms | the deep-link arrival highlight |
| `--ease-out` | `cubic-bezier(0.22, 0.75, 0.3, 1)` | every entrance |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | every reversible toggle |

Every duration in section 4.1 names a token from this table. Under
`prefers-reduced-motion: reduce`, every token resolves to `--dur-instant` except
`--dur-highlight`, which keeps its 1200 ms because it marks a location rather
than moving anything.

---

## 5. Interaction Flows

### 5.1 Open a piece of work and read its intent

Entry condition: the reader opens the viewer on a work item.

1. The shell renders the top bar and the rail from the route. Neither waits for
   the index.
2. The index resolves. The rail fills in, and the gated sections appear or stay
   absent.
3. The reader lands on Intent, unless the route names another section.
4. Intent shows the identity block, then the contract: Why, Done when, Abort if,
   Out of scope.

Edge cases:
- The work has no abort condition: the column says so.
- The work is superseded: the top bar says what superseded it.
- The route names a section the work cannot fill: the shell redirects and states
  that it did.
- The route names work the bundle lacks: Error, naming the id.

### 5.2 Move from design to build without losing the work

Entry condition: a reader is in Architecture and wants the epics.

1. The reader clicks Build in the rail. The rail does not move. The top bar does
   not move.
2. The scroll pane crossfades to the epic list for the same work item.
3. The reader opens an epic. Its slices list beneath it.
4. The reader clicks Problem and solution in the rail, which is still there. The
   scroll pane returns to that level for the same work item.

Edge cases:
- The work carries no epics: Build is absent, and the rail says why on hover.
- The reader selects a slice, then leaves Build: the selection clears.
- The reader changes work item while in Build: the shell lands on Build for the
  new item, or on Intent when the new item has no epics.

### 5.3 Traverse onward to a pull request

Entry condition: the work reaches a branch or a pull request.

1. The Pull requests group appears in the rail.
2. The reader opens it. The work's pull requests list, each with its state.
3. The reader opens one. The scroll pane shows that pull request's own three
   levels: its intent, its problem and solution, and its architecture.
4. FlightDeck stays one click away in the same group, and it carries the whole
   open set.

Edge case: the work has a branch and no pull request. The group renders, and its
item states that a branch exists with no pull request recorded against it.

---

## 6. Component Specifications

### 6.1 Shell

Three fixed regions and one scroll pane. The top bar and the rail hold their
position at every scroll offset. Only the scroll pane scrolls.

### 6.2 Work-item switcher

A shadcn `Popover` over Radix, listing every design and epic the index holds.
Choosing one rewrites the route and keeps the section where the new item can
fill it.

### 6.3 Rail

A `nav` element carrying three groups. Each item is an anchor, so it is
focusable, right-clickable, and openable in a new tab. The rail collapses to
icons under 1200 px and becomes a drawer under 768 px.

### 6.4 Contract block

A four-column band. Done when and Abort if sit side by side, because a reader
weighs them against each other. Each row names the field it read.

### 6.5 Level panels

A `Card` per record. Problem and solution splits the narrative beats by kind
into its two columns, so a constraint sits beside the problem it constrains.

### 6.6 Status badge and state ladders

A shadcn `Badge` per state family. Where the corpus carries fewer states than the
loop produces, a dashed ladder renders beside the real value and is marked as a
prototype target.

### 6.7 Diagram panel

A `ScrollArea` holding the Mermaid source, with a `Button` that renders it. The
runtime loads on that press and not before.

---

## 7. Error States and Edge Cases

### 7.1 Index request fails

The shell still renders the top bar and the rail from the route. The scroll pane
names the path it read, the reason it failed, and one retry. It does not fall
back to a cached index, because a stale index shown as current is worse than a
stated failure.

### 7.2 Cases to Check

| Case | Required behaviour |
|---|---|
| A `stage` outside the vocabulary | the badge reads `unknown`, and the raw word stays in the tooltip |
| An epic with no slices | the row states it, and no chevron renders |
| A slice with no epic | it appears in the unresolved-slices panel, which names the join |
| `feature_gates` is empty | the Rubrics item states that no gate record exists. It must not read as a pass |
| An epic has no design document | the Architecture level for that epic names the absent document |
| A design carries only `goal.json` | every level renders its own absence, and the work reads as deliberately sparse |
| A superseded design | the top bar names what superseded it, read from the `supersedes` field |
| A dangling ADR reference | the Architecture panel names the reference that does not resolve |
| An epic outcome missing from the index | the Why line reads the outcome from `goal.epics[]` and says which source it used |
| A pull request with no branch | the group renders and names the branch |
| Two designs share a name | the id disambiguates, and both render |
| No deploy record exists | the Shipped group says so, and reports `stage` and any publication instead |

---

## 8. Accessibility

### 8.1 Keyboard Navigation

The rail is a `nav` of anchors, reachable in order after the top bar. A skip link
leads from the top bar to the scroll pane. Groups expand on `Enter` or `Space`.
`Escape` closes the work-item switcher and returns focus to its trigger. Every
row is a button, so it is focusable without added `tabindex`.

### 8.2 Screen Reader Support

The rail carries an accessible name. The current item carries `aria-current`.
Gated groups announce their absence in a live region when the index settles, so
a reader who cannot see the rail still learns what the work lacks. The scroll
pane carries an accessible name that names the section and the work item.

### 8.3 Colour Independence

Every state carries a word. No state relies on colour alone. The status badge and
the state ladders pair a colour with a shape marker, so the rail and the badges
survive greyscale.

### 8.4 Focus Management

Choosing a section moves focus to the section heading. Opening an epic leaves
focus on the epic row. Selecting a slice leaves focus on the row and announces
its panel. Changing work item moves focus to the top bar's work-item name. A deep
link moves focus to the target and scrolls it into view, honouring reduced
motion.

---

## 9. Responsive Considerations

### 9.1 Desktop (over 1200 px)

The rail is expanded at 248 px. The top bar holds every control on one line. The
scroll pane runs the full remaining width.

### 9.2 Tablet (768 px to 1200 px)

The rail collapses to 56 px of icons, with names in tooltips. The top bar keeps
its controls and drops the search field. Panels stack to one column.

### 9.3 Mobile (under 768 px)

The rail becomes a drawer behind one control in the top bar. The top bar holds
the work item and that control. The scroll pane is the whole screen. The three
levels become a horizontal tab strip above the content. Font sizes hold. Only the
layout narrows.

---

## 10. Animation Specifications

| Element | Animation | Token |
|---|---|---|
| Section change | a crossfade of the scroll pane, no slide | `--dur-base` |
| Work-item change | a crossfade, and the top bar's name updates without moving | `--dur-slow` |
| Nav group expand | height and opacity together | `--dur-expand` |
| Epic disclosure | the same, and the slice list reveals | `--dur-expand` |
| Slice panel | a 12 px slide with a fade | `--dur-base` |
| Theme change | the icon crossfades, then the tokens fade | `--dur-fast`, then `--dur-base` |
| Arrival highlight | a background pulse on the target | `--dur-highlight` |
| Diagram render | a fade at the diagram's own aspect ratio | `--dur-base` |

Nothing animates on scroll. Nothing parallaxes. The fixed regions never move.

---

## 11. Layering, Hit Targets, and Scroll Ownership

### 11.1 Layering

One scale, named once.

| Layer | Token | Holds |
|---|---|---|
| 0 | `--layer-base` | the shell and every panel |
| 1 | `--layer-raised` | a hovered or selected row |
| 2 | `--layer-fixed` | the top bar and the rail |
| 3 | `--layer-panel` | the work-item switcher, and tooltips |
| 4 | `--layer-modal` | the mobile nav drawer |

### 11.2 Hit Targets

| Control | Hit target element | Bounds |
|---|---|---|
| Nav item | the anchor's full row | 248 px wide, at least 36 px tall |
| Nav group header | the whole header row | full rail width, at least 32 px tall |
| Collapsed nav item | the icon's anchor | 56 px wide, at least 44 px tall |
| Work-item switcher | the trigger button | at least 44 px tall |
| Status badge | the badge, for its tooltip | at least 24 px tall. The tooltip opens on hover and on focus |
| Theme switcher | the icon button | 44 px square |
| Epic row | the whole row, not the chevron | full pane width, at least 48 px tall |
| Slice row | the whole row | full pane width, at least 44 px tall |
| Render control | the button | at least 44 px tall |
| Contract row | the row, when it links to its source | the row's full height |
| Mobile nav drawer trigger | the button | 44 px square |

An icon is never the sole hit target. Every icon sits inside a target at least
44 px in each direction.

### 11.3 Scroll Ownership

| Region | Owns the scroll | Why |
|---|---|---|
| The document | **nothing** | the page does not scroll. The shell fills the viewport exactly |
| The scroll pane | both axes | it is the only scrolling region, and it holds every piece of content |
| The rail | itself, when its items exceed the viewport | a long rail must stay usable, and the rail never scrolls the pane |
| The top bar | none | it holds one line at every width |
| The work-item switcher list | itself | its list can exceed the viewport |
| A diagram panel | itself, both axes | a rendered diagram is often wider than the pane |
| A tooltip | none | it is transient and never scrolls |

The document never scrolls, so `html` and `body` carry no overflow. Every wheel
event not consumed by a nested region scrolls the scroll pane. Where two regions
could claim a gesture, the innermost owner wins, and the outer region does not
move.

**Four rules make "no scroll" safe rather than a way to hide content.** A layout
that fills the viewport and hides its overflow will clip whatever does not fit,
and the reader has no way to reach it. These rules prevent that.

1. **The shell fills its parent, never the viewport.** It uses `h-full`, not
   `h-dvh`. The viewport height belongs to whoever owns the page. When a host
   renders the shell beneath its own chrome, `h-dvh` makes the shell taller than
   the space it was given, and the surplus is clipped at one edge.
2. **The scroll pane scrolls on both axes.** `overflow: auto`, never
   `overflow-y: auto` with `overflow-x: hidden`. A pane that hides its horizontal
   overflow clips a wide table with no scrollbar and no way to reach it.
3. **A wide block scrolls itself.** Every table, code block, and diagram wraps in
   its own `overflow-x: auto` container, so the pane keeps its own scroll and the
   wide block keeps its integrity.
4. **Every flex and grid child carries `min-w-0`.** A flex child defaults to its
   content width, so one wide row stretches the pane and pushes its siblings off
   the edge.

Measured on the mockup at 1600x1000 on 2026-09-19. The pane reported
`overflow-x: hidden`, which is rule 2's defect: any block wider than the pane
clipped with no scrollbar and no way to reach it. Rule 1 is a guard rather than a
repair. The shell did fit its parent, at 919 px against 919 px. The rule stays
because the host, not the shell, owns the viewport height, and a host that does
not give the shell a definite height will break it.

---

## 12. Future Considerations

1. **No deploy record exists.** The Shipped section reports `stage` and the
   publication entities, and states the gap. A future record type would fill it.
2. **`feature_gates` is empty.** Rubrics have nothing to read until it populates.
3. **The epic and slice vocabularies need a schema change.** The build loop
   produces six epic states and seven slice states. The corpus carries four and
   one.
4. **Epic outcomes are absent from the index.** They live in `goal.epics[]`, so
   the Why line must read a second source and say so.
5. **`epic.design_doc` misses five documents.** It builds a key from the design id
   and compares against the planning slug, so `plugin-split`'s five documents do
   not resolve. `shared/build_index.py` owns that fix.
6. **The three variations remain useful.** Their tile arrangements are inputs to
   the level panels inside the scroll pane.
7. **The theme switcher persists nothing.** A published file cannot store a
   preference.

---

## Document Validation Checklist

- [x] Every interactive component has a state table in section 3.2.
- [x] Every component marks exactly one initial state.
- [x] Every timer names its arming event and its reset event. The only deferred
      load is the diagram render, and it starts on the reader's press.
- [x] Every control with a conditional existence appears in section 3.3.
- [x] Every multi-valued setting appears in section 2.3 with a default.
- [x] Every state change appears in section 4.1 with a source and target state.
- [x] Every duration in section 4.1 names a token from section 4.2.
- [x] Every flow names its entry condition and its edge cases.
- [x] Every floating surface names a layer from section 11.1.
- [x] Every control names its hit target element and its clickable bounds.
- [x] Every overlapping region names the surface that owns the gesture.
- [x] No section depends on the mockup for an answer.
