# Work board: Interaction Design Specification

**Version:** 2.4
**Date:** 2026-09-22
**Author:** design session with bjornslib
**Product document:** `01-product.md` (not yet written. The product intent currently lives in `docs/architecture/designs/cobuilder-viewer/goal.json`.)

Version 2.0 replaces the surface-first shape with an application shell and a
three-level content hierarchy. The three layout variations built on
2026-09-18 are inputs to this document, not candidates against it. Their tile
arrangements remain useful inside the scroll pane. Their page-scrolling frame
is superseded by section 2.1.

Version 2.1 records five cleanups the engineer asked for after reading the
first build of the shell. The shell stops quoting where a value came from. It
stops announcing that a record is present. The points of Problem and solution
become striped rows inside one card per column. An absent panel states the
absence in two words. Assessment, Risks, and Unknowns start closed. Sections
1.1, 2.2, 2.3, 3.2, 3.3, 4.1, 6.4, 6.5, 7.2, 10, and 11.2 carry the changes.

Version 2.2 records what the engineer asked for after reading the second
build. The contract moves to the left of Intent, and the Identity box goes.
Branch, epic count, and supersedes move to a top-line panel, and the contract
reads on two lines. Every pull request element comes off a decision row and off
the ADR sheet, and every control that navigates becomes a SmoothUI
`smooth-button`.

The Architecture level reorders itself around what a reader arrives for. The
section-link bar sits at the top of the pane. Sections 2.1, 2.2, 3.2, 3.3, 4.1,
5.1, 6.1, 6.4, 6.5, 6.8, 8.1, 9.3, 10, 11.1, 11.2, and 11.3 carry the changes.

Version 2.3 applies the approved Material 3 design scheme to the shell. The
ground moves from a cool grey to a pale teal, and every heading takes a band.
The three heading levels stay apart. No hover state may fill with the heading
colour, and the engineer set that rule in one sentence. Three surfaces take a
tilt, and no reading surface does. A reading-progress strip joins the pane's
top edge. Sections 3.2, 4.2, 6.1, 8.3, and 11.3 carry the changes.

Version 2.4 records the section model. A level is a sequence of sections, one
section on screen at a time on a horizontal track. **The box owns the scroll,
never the pane.** So a paged level's pane does not move at all, and the frame a
reader sees never shifts. The section strip, the pager bar, and the two arrow
keys move one shared index. The strip and the pager derive their labels from the
panels themselves, so a label cannot disagree with the heading it names. The
progress strip measures the level rather than one box, as `(index + within) /
count`. Intent, Problem & Solution, Architecture, and Build page; Rubrics does
not. A paged level drops its visible heading band and keeps an `sr-only` `h1`,
so the focus move still lands. The diagram runtime now loads when the Diagrams
section mounts, because a tile cannot wait for a press. The envisioned pull
request moves to the Pull requests level, which fills when a work has a drafted
pull request and no longer redirects. Sections 2, 2.3, 11, 11.2, and 11.3 carry
the changes, and ADR-0028 records the decision.

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
5. **Absence is a state of its own.** A record that does not exist is stated in
   place, not hidden and not rendered as a blank box. The panel names no file and
   no field, because a reader cannot act on either.
6. **The shell renders. It never computes.** Every count, state, and join comes
   from `data/index.json`.
7. **The reading surface quotes no source.** A panel prints no field path, no
   file name, and no join name. A reader who wants an outcome does not need to
   know that the field is called `goal.outcome`. The rail is the one exception,
   and section 3.3 states why.
8. **Presence is never announced. Absence is.** A record that exists renders its
   own content and no marker. A reader needs to hear only what is not there, so
   one readiness state survives: absent. It reads `not present`.

---

## 2. Information Architecture

### 2.1 Navigation Structure

The shell has three fixed regions and one content column.

```
┌──────────────────────────────────────────────────────────────────┐
│ TOP BAR (fixed)   [ work item ] [ stage ] [ search ] [ theme ]   │
├────────────────────┬─────────────────────────────────────────────┤
│ LEFT NAV (fixed)   │  [ top line: branch · epics · supersedes ]   │
│                    │                                             │
│ THE WORK           │  CONTENT COLUMN                              │
│   Intent           │   a paged level, or a section that stacks    │
│   Problem & Sol.   │                                             │
│   Architecture     │                                             │
│ BUILD              │                                             │
│   Epics            │                                             │
│   Rubrics          │                                             │
│ PULL REQUESTS      │                                             │
│   This work's      │                                             │
│   FlightDeck       │                                             │
│ SHIPPED            │                                             │
└────────────────────┴─────────────────────────────────────────────┘
```

**A level renders in one of two modes, and the mode decides what owns the
scroll.**

**A paged level** lays its sections on a horizontal track. One section is on
screen at a time, and the pane does not scroll at all. The frame a reader sees
therefore never moves.

```
┌──────────────────────────────────────────────────────────────────┐
│ [ top line: branch · epics · supersedes ]                        │
│ ──────── level progress ──────────────────────────────────────── │
│ [ Diagrams ] [ Why ] [ Done when ] [ Abort if ] [ Out of scope ] │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ ONE SECTION AT THE FULL WIDTH OF THE STAGE                   │ │
│ │ the box owns the scroll, on both axes                        │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ [ ‹ Previous ]        Section 1 of 5        [ Next › ]           │
└──────────────────────────────────────────────────────────────────┘
```

**A section that stacks** keeps the pane's own scroll. The shell's older shape
stands. A sticky band holds the progress strip and the section links, and the pane
below it holds every panel of that section.

```
┌──────────────────────────────────────────────────────────────────┐
│ [ top line: branch · epics · supersedes ]                        │
│ ──────── progress over the pane ──────────────────────────────── │
│ [ section links, sticky, one per panel on the page ]             │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ THE PANE, the only scrolling region below this band          │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**Four levels page, and three sections stack.**

| Section | Mode | Sections on the track |
|---|---|---|
| Intent | paged | Diagrams, Why, Done when, Abort if, Out of scope |
| Problem & Solution | paged | Problem and solution, Risks, Assessment, Unknowns |
| Architecture | paged | Diagrams, Architecture Decisions, Boundaries, Districts and alternatives considered |
| Build | paged | three runs of six epics, in delivery order |
| Build / Rubrics | stacks | — |
| Pull requests | stacks | — |
| Shipped | stacks | — |

**A section is view state, never a route.** The strip, the pager bar, and the two
arrow keys move one shared index, and a step writes no hash. So a reader pages
through Architecture without the route changing under them. A route that names
one of a section's records still lands on the right section. A deep link to an
epic lands on the run that holds it, with that epic open.

**The strip and the pager bar hold no list of their own.** Both read the sections
the level actually rendered. The pager reads its count from the same array of
sections the boxes come from. A section that renames itself renames its own link.
So no label can disagree with the heading it names.

**The section links are not a fixed region.** On a section that stacks they are
`sticky` children of the scroll pane, so the pane keeps the only scroll. A link
moves the pane to a panel on the page. It never moves the window. A paged level
has no section links at all. The strip names the sections there, and nothing
moves the pane, because the pane does not scroll. Section 11.3 states why the
window cannot move.

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
| Intent | `goal.json` alone is enough. `intent.json` adds depth, and the first diagram level adds the container drawing | `goal.outcome`, `goal.done_when`, `goal.abort_if`, `intent.out_of_scope`, the first entry of `diagrams/` |
| Problem and solution | `intent.json`, `narrative.json`, or `assessment.json` | `narrative.problem_solution` beats by kind, `intent.problem`, `intent.approach`, `intent.risks`, `intent.unknowns`, `assessment.verdict` and `assessment.findings`, `intent.alternatives` |
| Architecture | `goal.json`'s `adrs[]`, or the design's `diagrams/` | the linked ADRs with their `maps_to.rule`, `boundary_rule` entities, districts and contexts touched, the diagram levels after the first, and for an epic the technical solution design's `Types & Signatures` |

**The Work surface pages four levels, and the sections come from the records.**
The Build level is the one level whose sections are computed rather than listed:
its epics are cut into runs of six, in the delivery order the epic ids carry, so
a section is one screen and the level's spine stays short. ADR-0028 records the
choice and why the epic state could not decide it.

**The first diagram level is the overview, and it belongs to Intent.** That level
is the container drawing. It names the surfaces and the people who use them, and
that answers what this work is and who it is for. The levels after it are
mechanism, and they belong to Architecture. The cut is positional, so it holds for
a bundle with two levels as well as three.

**The work item's own facts sit above every section, not inside Intent.** The
shell draws one top line holding the branch, the epic count, and what the work
supersedes. Version 2.1 kept those in an Identity panel inside Intent, and
version 2.2 dissolved that panel. The work item's name and stage already live
in the top bar, so the top line does not repeat them. It renders for every
section, because a reader in Build asks which branch they are on just as often
as a reader in Intent.

**What the corpus cannot supply.** The shell names these rather than implying
them.

| Missing | Consequence |
|---|---|
| A deploy record | the Shipped section reports `stage: implemented` and the publication entities, and states that no deploy record exists |
| `feature_gates` is empty | the Rubrics section states that no gate record exists, and must not read as a pass |
| Epics carry four states | the intended six render as a marked prototype ladder beside the real value |
| All 29 slices are `completed` | the intended seven render the same way |
| An epic has no `outcome` in the index | the outcome comes from `goal.epics[]`, and the panel states the outcome and no source |

**What the shell never prints.** A panel names the record it read, never the file
or the field it read it from. `goal.outcome` is `Why`. `goal.done_when` is `Done
when`. The heading carries the meaning, and the path carries none. Seventeen
sites printed a path in version 2.0, and version 2.1 removed every one.

### 2.3 Declared Defaults

| Setting | Default value | Alternatives | Declared where |
|---|---|---|---|
| Theme | **light** | dark | `data-theme` on the root |
| Theme persistence | none | per reader | not implemented. A published file cannot persist |
| Section | `intent` | the other sections | route |
| Work item | none | a design or an epic id | route |
| Section index on a paged level | **the first section** | any later section | component state, reset by a route change |
| Section index for an epic deep link | **the run that holds that epic** | the first section | route |
| Left nav state | expanded | a group collapsed | component state |
| Rail collapse | expanded above 1200 px | collapsed | viewport |
| Panel body on a paged level | **open. No fold exists** | — | not configurable |
| Panel body on a stacking section | open | closed, for a panel that declares it | component state |
| Diagram runtime | **loads when the Diagrams section mounts** | — | section mount |
| Diagram tile zoom | **100 %, the drawing fitted to the dialog** | 50 % to 400 %, in steps | component state, per dialog |
| Record sheet jumplink row | one link per part the record marked | no row, for a record that marks none | the record |
| State ladder display | real value only | real plus intended | component state |
| Motion | follows `prefers-reduced-motion` | forced off | media query |

**A paged level has no fold.** Version 2.1 made Assessment, Risks, and Unknowns
start closed, and the reason was the stacked page. The pane is 558 px tall at
1280x633, and a section of four open panels ran to several thousand pixels. On a
paged level each panel is its own section, so a fold inside it is a fold inside a
fold. A reader who arrives at a section sees the whole of it. The panels keep
nothing hidden: an absent panel is still `absent`, which is a stated state rather
than a fold.

**Theme is light.** It does not follow the operating-system preference, because
the engineer declared light on 2026-09-18.

**The diagram runtime loads when the Diagrams section mounts.** It used to load
on the reader's press and at no other moment, because the Mermaid runtime is
large. A tile cannot wait for a press: the tile is the drawing. So the rule
becomes: the runtime loads when the Diagrams section mounts, and at no other
moment. Nothing on any other level pays for it. A tile whose render fails states
the failure in one line. Its dialog then shows the authored source as text. That
is the only place the source survives, and no source toggle exists for the
working case.

**The progress strip measures the level, not one box.** On a paged level its
value is `(index + within) / count`. `within` is the active box's own scroll
progress. A box with no scroll range counts as fully read, so a section that fits
one screen contributes its whole share with no special case. The value never
resets on a section change, and it never decreases on a forward walk. On a section
that stacks, the strip measures the pane's own offset, as it always has.

### 2.4 Presence and Absence

Two statements about the same record used to render together: the record's own
content, and a pill saying the record was present. The second statement carried
nothing. Version 2.1 removed the present pill and the partial pill, so one
readiness state survives.

| State | Frame | Marker | Word |
|---|---|---|---|
| present | a solid card | none | none |
| absent | a dashed card in the muted surface | a strikethrough circle | not present |

The partial state is gone rather than renamed. A record that holds some of its
fields is a record, and the panel renders the fields it holds. A record that
holds none of them is absent.

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

#### Surface palette

The ground moved from a cool grey to a pale teal on 2026-09-21, and the approved
architecture concept made the change. The engineer's reason is that the page then
reads as a colour rather than as the absence of one.

| Token | Value | Holds |
|---|---|---|
| `--ground` | `#e9f2f3` | the page behind the cards |
| `--surface` | `#ffffff` | a card. It stays white and is never tinted with the ground |
| `--surface-2` | `#f4fafb` | the first container step, for a panel's inner block |
| `--surface-3` | `#dfecee` | the second container step, for a hover on a container |
| `--line` | `#cfe0e2` | a card's border |
| `--line-soft` | `#e4eff1` | a rule inside a card |

The two container steps and the two hairlines carry the same teal as the ground,
so the hierarchy a reader reads from them survives the move. The dark theme picks
its own steps rather than reusing these, and its ground keeps the same teal.

#### Heading bands

Every heading in the shell carries a background, so a heading is a solid object
rather than a line of larger type. Three levels exist, and each level takes its
own treatment. The three stay apart on purpose. One treatment for all of them
would turn the page into a wall of teal.

| Level | Component | Treatment |
|---|---|---|
| 1 | the section heading, the page's own `h1` | a solid `--band` fill, `--band-ink` text, a 16 px radius, and padding of 22 px by 26 px. It runs the pane's full width, above the panels |
| 2 | every panel heading, the `Panel` component's title row | a solid `--band` fill, `--band-ink` text and icon, a 10 px radius. It sits inset inside its card, so the card's own border and padding show around it |
| 3 | a sub-heading: the `SubHead` component's `h3`, and the target name on a boundary rule card | a `--tint` bar, `--tint-ink` text, a 6 px radius, and `inline-block`, so the bar hugs the text |

| Token | Value | Holds |
|---|---|---|
| `--band` | `#006572` | the fill of levels 1 and 2 |
| `--band-ink` | `#ffffff` | the text and the icons on that fill. It is 6.8 to 1 against `--band`, which clears WCAG AA |
| `--tint` | `#cde7ed` | the fill of level 3 |
| `--tint-ink` | `#10353b` | the text on that fill. It is 10.2 to 1 against `--tint` |

An absent panel takes the same band as a present one. The heading level belongs
to the panel, so a panel that states an absence still sits at that level.

The count beside a panel heading reads `--band-ink` at 75 percent. The chevron
reads `--band-ink` at 80 percent.

**No hover, focus, selected, or active state fills with `--band`.** The engineer
set this rule on 2026-09-21, and the sentence is theirs: "Only the hover-over
colour must not be the same as the heading colour." A control that turns the
heading colour on hover reads as a heading, and the reader then cannot tell a
heading from a thing they can press. Every hover in the shell stays in the light
tint family instead: `--surface-2`, `--surface-3`, `--accent-wash`, and `--tint`.

A control that already sits on a band cannot take a fill at all. A white wash
over `--band` mixes back to a colour close to `--band` itself. Such a control
takes a 1 px `--band-ink` ring at 35 percent instead, and it brightens its own
ink. The panel disclosure is the one case today.

#### Tilt card

Three surfaces carry a tilt: a boundary rule card, a design card on the Work
board, and an epic card in Build. A tilt belongs to an object a reader picks up
with the pointer.

**A tilt never belongs to a reading surface.** The striped Problem and Solution
cards, the decision rows, the diagrams panel, the record sheet, and every block
of prose a reader reads in place take no tilt. A plane that moves under the
pointer makes text harder to read, and that is the opposite of what the surface
is for.

| State | Visual treatment | Initial | Timer arming |
|---|---|---|---|
| Default | the card at rest, at its own scale | Yes | Not applicable |
| Hover | the card follows the pointer, up to a 12 degree rotation on each axis, and rises to 1.03 of its scale | No | Not applicable |
| Focus-visible | the card takes the same tilt at 35 percent of its range, so a keyboard reader sees the object move | No | Not applicable |
| Pressed | the card keeps its pointer tilt. The press belongs to the control inside it | No | Held while the pointer is down |
| Selected | not applicable. A tilt marks an object, not a selection | No | Not applicable |
| Disabled | not applicable | No | Not applicable |
| Loading | not applicable | No | Not applicable |
| Error | not applicable | No | Not applicable |
| Empty | not applicable | No | Not applicable |
| Transient | the card returns to rest when the pointer leaves, over the component's own 0.25 s spring | No | Ends when the card settles |

The tilt is the tilt-without-glare variant. The component holds a `glare`
property, and it renders its radial glare overlay only when that property is
true. The shell passes `false` at every call site, so the overlay never exists.
A pale overlay would wash out the card's own text on a light ground.

The tilt respects `prefers-reduced-motion: reduce`. The component attaches no
pointer handler under that setting, so the card never moves.

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
| Default | two lines on one band. `Why` owns the first line at full width, and `Done when`, `Abort if` and `Out of scope` share the second | Yes | Not applicable |
| Hover | a list row tints | No | Not applicable |
| Focus-visible | ring on the row | No | Not applicable |
| Pressed | not applicable | No | Not applicable |
| Selected | not applicable | No | Not applicable |
| Disabled | not applicable | No | Not applicable |
| Loading | a skeleton band at the block's real height | Yes, while the record resolves | Starts on mount, ends when the record settles |
| Error | the block states that it could not read the record | No | Not applicable |
| Empty | `Abort if` is often absent in the corpus. The column states that no abort condition is recorded, rather than rendering blank | No | Not applicable |
| Transient | not applicable | No | Not applicable |

#### Section-link bar

A bar of one link per panel the page rendered. A link moves the scroll pane to
that panel's heading. The bar holds the links and nothing else, so a page whose
panels are gated away renders no bar at all.

| State | Visual treatment | Initial | Timer arming |
|---|---|---|---|
| Default | a row of links in muted ink, pinned to the pane's top edge | Yes, when the page holds at least one panel | Not applicable |
| Hover | the link gains a border and a surface tint, and its label darkens | No | Not applicable |
| Focus-visible | 2 px ring at a 2 px offset | No | Not applicable |
| Pressed | the pane animates to the target | No | Ends when the pane settles at the target |
| Selected | not applicable. The bar does not track the reader's offset, because that would cost a scroll listener for no answer | No | Not applicable |
| Disabled | not applicable. A link is present only while its panel is | No | Not applicable |
| Loading | not applicable. The bar renders from the panels the page already holds | No | Not applicable |
| Error | not applicable. A panel that failed still carries a heading, so its link still works | No | Not applicable |
| Empty | the page holds no panel, so the bar renders nothing | Yes, for a page with no panel | Not applicable |
| Transient | the bar stays at the pane's top edge while the pane moves under it | No | Not applicable |

#### Level section (Intent, Problem and solution, Architecture)

| State | Visual treatment | Initial | Timer arming |
|---|---|---|---|
| Default | a heading, then its panels | Yes, for the current section | Not applicable |
| Hover | not applicable at section level | No | Not applicable |
| Focus-visible | not applicable. Its controls carry the rings | No | Not applicable |
| Pressed | not applicable | No | Not applicable |
| Selected | the section is current, marked in the rail | Yes, for the routed section | Not applicable |
| Disabled | the section's nav item is disabled and names the absent record. The panel itself states the absence in two words | No | Not applicable |
| Loading | panels render skeletons at their real size | No | Not applicable |
| Error | the panel that failed states its reason, and the other panels still render | No | Not applicable |
| Empty | the section's nav item is gated when the work cannot fill it at all | No | Not applicable |
| Transient | a crossfade on section change | No | Ends when the section settles |

#### Panel disclosure

No panel starts closed, so no panel carries a disclosure on arrival. The shell
used to start Assessment, Risks, and Unknowns closed. That is gone: on a paged
level each panel is its own section, so a fold inside a page is a fold inside a
fold. A reader may still fold a panel, and the folded row keeps its heading and
its count, so it says what it holds.

| State | Visual treatment | Initial | Timer arming |
|---|---|---|---|
| Default | the band heading row, with the count and no chevron, because every panel arrives open | **Yes, on every panel** | Not applicable |
| Hover | a 1 px `--band-ink` ring at 35 percent, and the chevron brightens to full `--band-ink`. No fill, because the row already carries the band | No | Not applicable |
| Focus-visible | a 2 px `--band-ink` ring at a 2 px offset. The teal ring is 1.4 to 1 on the band, so it would not read there | No | Not applicable |
| Pressed | the ring holds | No | Held while the pointer is down |
| Selected | not applicable. A disclosure is not a destination | No | Not applicable |
| Disabled | not applicable. An absent panel renders open and carries no disclosure | No | Not applicable |
| Loading | not applicable. The panel renders from the record | No | Not applicable |
| Error | not applicable | No | Not applicable |
| Empty | an absent panel renders open, so the reader never has to open a panel to learn that a record is missing | No | Not applicable |
| Transient | height and opacity animate together | No | Ends when the panel settles |

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

#### Diagram tile and dialog

A tile is one drawing at miniature scale, one for each level the section was
given. A press opens the drawing whole in a modal dialog. The dialog carries zoom
out, zoom in, reset to fit, and close. The tile holds no source block and no
control of its own.

| State | Visual treatment | Initial | Timer arming |
|---|---|---|---|
| Default | the drawing at miniature scale inside a fixed-height window, with one word naming its kind | **Yes** | Not applicable |
| Hover | the tile border takes `--line`, and the pointer is a pointer | No | Not applicable |
| Focus-visible | a 2 px `--ring` ring | No | Not applicable |
| Pressed | the ring holds | No | Held while the pointer is down |
| Selected | not applicable. A tile is not a destination | No | Not applicable |
| Disabled | not applicable | No | Not applicable |
| Loading | announced as rendering, with a skeleton at the tile's own height | No | **Starts when the Diagrams section mounts, never on a press.** The runtime loads on that mount |
| Error | the tile states the failure in one line and names where the source is | No | Not applicable |
| Empty | the section names the absent level | Yes, when a level has no diagram | Not applicable |
| Transient | the drawing fades in | No | Ends when the render settles |

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
| Slice list under an epic | the epic owns at least one slice | the epic owns no slice. The epic row states the count of zero instead |
| Render control | the diagram has not been rendered | the reader renders it |
| Empty-state note | the panel's record is absent | the record exists |
| Panel disclosure | the panel holds a record and declares a closed default | the record is absent, because an absent panel renders open |
| Unresolved-slices panel | `slice_to_epic_unresolved` holds a slice | the join is empty |
| Retry | the index request failed | a retry starts |
| Level nav item | always present. It is disabled when its record is absent, so the gap stays visible | never |
| Section-link bar | the page holds at least one panel | the page holds none. An empty bar would spend a strip of the pane on nothing |
| Section link | its panel is on the page | its panel is gated away, or its section did not render it |

**The rail names the absent records, and no other surface does.** A greyed nav
item with no reason is the one place a reader is genuinely stuck, so the rail
keeps its tooltip and its inline line, and both name the records. Every panel
stops at the fact. This is an explicit engineer decision, taken on 2026-09-19.

**A decision carries no pull request element at all.** Version 2.1 put the
pull request that carried a decision beside that decision, in the Architecture
level. The engineer removed it in version 2.2. The reason is that the work
item's own state already says whether the work reached a pull request. So the
`carried by PR N` chip is gone. The `no PR` chip is gone, and so is the block
inside the ADR sheet. No epic row carries a pull request chip either. The
decision row keeps the decision's own state badge, and the whole record stays
one press away.

That removal does not touch the Pull requests group. The group still gates on
`epic_to_pull_request` for this work's own epics. A pull request the work did
not open still does not enter it, and the Shipped gate still holds its rule.

---

## 4. Transitions

### 4.1 Transition Table

| Trigger | Source state | Target state | Timing | Reset condition |
|---|---|---|---|---|
| Shell mounts | — | Loading | immediate | the index settles |
| Index resolves | Loading | Populated | `--dur-base` crossfade | — |
| Index resolves with no work | Loading | Empty | `--dur-base` crossfade | a bundle is written |
| Index request fails | Loading | Error | `--dur-instant` | the reader presses retry |
| Reader selects a section | current section | that section, and the track slides one box | `--dur-base` slide | another section is selected |
| Reader selects a gated section | current section | redirect to the nearest available section | immediate | — |
| Reader selects another work item | work A | work B, same section where B fills it | `--dur-slow` crossfade | — |
| Reader expands a nav group | collapsed | expanded | `--dur-expand` | the reader collapses it |
| Reader folds a panel | open | folded | `--dur-expand` | the reader unfolds it |
| Reader opens an epic | collapsed | selected, detail open | `--dur-expand` | the selection clears |
| Reader selects a slice | none or another | that slice selected | `--dur-base` slide | the selection clears |
| The Diagrams section mounts | none | rendering | immediate | the render settles or fails |
| Render settles | rendering | rendered | `--dur-base` fade | — |
| Render fails | rendering | error | `--dur-instant` | the reader leaves the section and returns |
| Reader toggles the theme | light or dark | the other | `--dur-fast` icon, then `--dur-base` tokens | the reader toggles back |
| Reader arrives from a deep link | Loading | Populated, target selected | `--dur-slow`, then a highlight | the highlight elapses |
| Deep link names work the bundle lacks | Loading | Error naming the id | `--dur-instant` | the reader returns to the rail |
| A record body fails | Populated | Partial | `--dur-instant` | the body loads |
| Reader selects a jump-bar link on a stacked level | the pane's current offset | the pane's offset at the target's heading | `--dur-base`, through the pane's own smooth scroll | the reader scrolls, or selects another link |

No transition here is armed by a timer. Every timing is a duration, not a
countdown. The one delayed state, the deep-link highlight, starts on arrival and
resets when it elapses. The diagram render is the only deferred load, and it
starts when its section mounts rather than on a press.

Two transitions move a region rather than crossfading one, and both name a token.
A section change slides the track one box. A jump-bar press on a stacked level
moves the pane. Under `prefers-reduced-motion: reduce` each resolves to
`--dur-instant`, so the reader arrives in one frame.

### 4.2 Timing Tokens

| Token | Value | Used for |
|---|---|---|
| `--dur-instant` | 0 ms | every error state, so a failure is never animated away from the reader |
| `--dur-fast` | 150 ms | hover tints, the theme icon, the chevron rotation |
| `--dur-base` | 200 ms | section slides, the render fade, theme tokens |
| `--dur-slow` | 250 ms | work-item changes, deep-link arrival |
| `--dur-expand` | 220 ms | nav groups and epic disclosure |
| `--dur-highlight` | 1200 ms | the deep-link arrival highlight |
| `--ease-out` | `cubic-bezier(0.22, 0.75, 0.3, 1)` | every entrance |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | every reversible toggle |

Every duration in section 4.1 names a token from this table. Under
`prefers-reduced-motion: reduce`, every token resolves to `--dur-instant` except
`--dur-highlight`, which keeps its 1200 ms because it marks a location rather
than moving anything.

The tilt card's return to rest is the one duration outside this table. The
component ships its own 0.25 s spring with a bounce of 0.1, and the shell does
not restate it. Section 3.2's tilt card table states it, and section 4.1 holds
no row for it, because a pointer-tracked transform is an animation rather than a
state change. The hover tints are absent from section 4.1 for the same reason.

---

## 5. Interaction Flows

### 5.1 Open a piece of work and read its intent

Entry condition: the reader opens the viewer on a work item.

1. The shell renders the top bar and the rail from the route. Neither waits for
   the index.
2. The index resolves. The rail fills in, and the gated sections appear or stay
   absent.
3. The reader lands on Intent, unless the route names another section.
4. Intent shows the contract: `Why` on its own line, then `Done when`, `Abort
   if`, and `Out of scope` on the second. The work item's branch, epic count,
   and supersedes already sit on the top line above the heading.

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

Three strips sit at the top of the pane, and none is a fourth fixed region. The
reading-progress strip and the section-link bar share one sticky band, and the
bar's own band sits directly under it.

The **reading-progress strip** reports the pane's own offset as one 4 px bar. It
spans the pane's full width. It measures the pane element and never the window,
because the document cannot scroll. Section 11.3 states why.

The **section-link bar** sits under the strip in the same band, and it is
`sticky`. It holds one anchor per panel the page rendered, in document order.
The bar reads the panels rather than a list of its own. A panel a section gated
away therefore gains no link. A panel that only renders when its record exists
gains one.

The **top line** sits under the bar. It holds the work item's branch, its epic
count, and what it supersedes, on one line. Section 2.2 states why it exists
and why it names no work item and no stage.

### 6.2 Work-item switcher

A shadcn `Popover` over Radix, listing every design and epic the index holds.
Choosing one rewrites the route and keeps the section where the new item can
fill it.

### 6.3 Rail

A `nav` element carrying three groups. Each item is an anchor, so it is
focusable, right-clickable, and openable in a new tab. The rail collapses to
icons under 1200 px and becomes a drawer under 768 px.

### 6.4 Contract block

The contract leads Intent and it starts at the pane's left edge. Version 2.1
kept it to the right of an Identity panel, and version 2.2 dissolved that panel,
so nothing holds the contract off the left edge any more.

A two-line band. `Why` takes the first line at full width, because the outcome
is the sentence the whole work answers to. `Done when`, `Abort if`, and `Out of
scope` share the second line, because a reader weighs those three against each
other. A column carries its heading word and nothing else.

### 6.5 Level panels

A `Card` per record. Problem and solution splits the narrative beats by kind into
its two columns, so a constraint sits beside the problem it constrains.

Each of those two columns is one shadcn `Card`. Its heading is the column word,
`PROBLEM` or `SOLUTION`. The authored problem or approach prose is the card's
lead, set as prose above the rows and not boxed. The beats are the rows under it,
each one a bullet and its text. **The rows alternate in tint.** The first row
paints `--surface`, which is the card's own colour, and the next paints
`--surface-2`. The pattern repeats down the list. Both tokens are redefined under
`data-theme="dark"`, so the stripe holds in either theme. The tint follows the
row's index rather than `odd:`, so a row added above the list cannot shift the
pattern.

The earlier shape gave every beat its own outlined box and then painted two more
boxes amber and green below. That was two treatments for one thing, and version
2.1 removed the second one.

Alternatives considered is not here. A rejected option is architectural, and each
decision carries its own alternatives, so the panel sits in Architecture.

The Architecture level orders its tiles by what a reader arrives for. Diagrams
lead, because the picture answers the shape question fastest. Linked
Architecture Decisions follows, with Districts and contexts touched on the
right, because a reader who wants one usually wants the other. Boundary rules
spans the pane's full width. This corpus carries sixteen rules, and a one-third
tile turned them into a long column of narrow cards. The full width therefore
carries a multi-column grid.

### 6.6 Status badge and state ladders

A shadcn `Badge` per state family. Where the corpus carries fewer states than the
loop produces, a dashed ladder renders beside the real value and is marked as a
prototype target.

### 6.7 Diagram panel

A `ScrollArea` holding the Mermaid source, with a `Button` that renders it. The
runtime loads on that press and not before.

### 6.8 Controls that navigate

Every control that moves the reader somewhere is a SmoothUI `smooth-button`,
taken from the live registry at `https://smoothui.dev/r/smooth-button.json`.
This shell carries three: `Open the whole record`, on a decision row, `Open the
whole rule`, on a boundary rule, and `Open the design`, on an epic's Gate 4b
document.

The variant is `outline`, not a filled brand button. A reading surface is not a
marketing page. A filled button on a page whose subject is a record shouts
louder than the record does. Each control carries a trailing arrow, because the
arrow says the control moves the reader forward rather than toggling something
in place. The size is the registry's `lg`, which is 44 px, so section 11.2's hit
target holds.

The registry item's `tokens.json` dependency adds no file and no `css` block. It
does carry CSS variables, so the token block it wrote into `index.css` is
expected rather than a failure.

The item imports `Slot` from `@radix-ui/react-slot`. This application depends on
the unified `radix-ui` package instead, and that package already exports `Slot`.
The import therefore points at `radix-ui`, and no second copy of the package is
installed.

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
| An epic with no slices | the epic row states the count of zero, and no slices block renders |
| A slice with no epic | it appears in the unresolved-slices panel |
| `feature_gates` is empty | the Rubrics item states that no gate record exists. It must not read as a pass |
| An epic has no design document | the epic's own panel tells the two cases apart. A work with no plan directory states that none of its epics can have one. A work with a plan states that this epic has none |
| A design carries only `goal.json` | every level renders its own absence, and the work reads as deliberately sparse |
| A superseded design | the top bar names what superseded it |
| A dangling ADR reference | the Architecture panel names the reference that does not resolve |
| An epic outcome missing from the index | the panel reads the outcome from `goal.epics[]` and states no source |
| A pull request with no branch | the group renders and names the branch |
| Two designs share a name | the id disambiguates, and both render |
| No deploy record exists | the Shipped group says so, and reports `stage` and any publication instead |
| An absent record in a closed panel | the panel renders open, because an absence behind a disclosure is an absence the reader cannot see |
| A panel a section gated away | the section-link bar holds no link for it, because the bar reads the panels the page rendered |
| A page with no panel at all | the section-link bar renders nothing, rather than an empty strip |

---

## 8. Accessibility

### 8.1 Keyboard Navigation

The rail is a `nav` of anchors, reachable in order after the top bar. A skip link
leads from the top bar to the scroll pane. Groups expand on `Enter` or `Space`.
`Escape` closes the work-item switcher and returns focus to its trigger. Every
row is a button, so it is focusable without added `tabindex`.

The section-link bar is a second `nav` of anchors, and it sits at the start of
the scroll pane, so a keyboard reader meets it before the section's own content.
A press moves the pane and leaves focus on the target panel, so the reader lands
where the pointer would have.

### 8.2 Screen Reader Support

The rail carries an accessible name. The current item carries `aria-current`.
Gated groups announce their absence in a live region when the index settles, so
a reader who cannot see the rail still learns what the work lacks. The scroll
pane carries an accessible name that names the section and the work item.

### 8.3 Colour Independence

Every state carries a word. No state relies on colour alone. The status badge and
the state ladders pair a colour with a shape marker, so the rail and the badges
survive greyscale.

A heading band carries text, so its two values hold a contrast ratio rather than
a look. White on `--band` is 6.8 to 1, and `--tint-ink` on `--tint` is 10.2 to 1.
Both clear WCAG AA for body text. The focus ring is `--band-ink` on a band,
because the teal ring is 1.4 to 1 there.

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

The section-link bar wraps to more than one row when the pane is narrow, so it
keeps every link rather than dropping the ones that do not fit. The top line
wraps the same way.

---

## 10. Animation Specifications

| Element | Animation | Token |
|---|---|---|
| Section change | a crossfade of the scroll pane, no slide | `--dur-base` |
| Work-item change | a crossfade, and the top bar's name updates without moving | `--dur-slow` |
| Nav group expand | height and opacity together | `--dur-expand` |
| Panel disclosure | height and opacity together | `--dur-expand` |
| Epic disclosure | the same, and the slice list reveals | `--dur-expand` |
| Slice panel | a 12 px slide with a fade | `--dur-base` |
| Theme change | the icon crossfades, then the tokens fade | `--dur-fast`, then `--dur-base` |
| Arrival highlight | a background pulse on the target | `--dur-highlight` |
| Diagram render | a fade at the diagram's own aspect ratio | `--dur-base` |
| Section-link jump | the pane's offset moves to the target's heading | `--dur-base`, or `--dur-instant` under reduced motion |

Nothing animates on scroll. Nothing parallaxes. The fixed regions never move.
The section-link bar is the one element that holds its position while the pane
moves. It is sticky inside the pane, not fixed to the window.

---

## 11. Layering, Hit Targets, and Scroll Ownership

### 11.1 Layering

One scale, named once.

| Layer | Token | Holds |
|---|---|---|
| 0 | `--layer-base` | the shell and every panel |
| 1 | `--layer-raised` | a hovered or selected row, and the sticky band of a section that stacks |
| 2 | `--layer-fixed` | the top bar and the rail |
| 3 | `--layer-panel` | the work-item switcher, the tooltips, and the diagram dialog's backdrop |
| 4 | `--layer-modal` | the mobile nav drawer, the record sheet, and the diagram dialog |

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
| Panel disclosure | the panel's heading row, on a panel that declares one | full panel width, at least 36 px tall |
| Section heading in the strip | the anchor | at least 32 px tall, and the anchor stays focusable |
| Pager control | the button | at least 44 px tall |
| Diagram tile | the whole tile | the tile's full width, 200 px tall. The drawing inside carries `pointer-events: none`, so the tile is one target |
| Zoom control | the button | 44 px square |
| Dialog close | the button | 44 px square |
| Sheet jumplink | the anchor | at least 32 px tall |
| Render control | the button | at least 44 px tall |
| Navigating control | the button | at least 44 px tall |
| Section link | the anchor | at least 32 px tall |
| Contract row | the row, when it links to its source | the row's full height |
| Mobile nav drawer trigger | the button | 44 px square |

An icon is never the sole hit target. Every icon sits inside a target at least
44 px in each direction, and the two exceptions above are anchors, which meet the
same rule at 32 px because a heading is a word rather than an icon.

**The two arrow keys are a hit target too.** `ArrowLeft` and `ArrowRight` step the
section index on a paged level, and they act wherever focus sits. The binding
ignores an event whose target is an `input`, a `textarea`, or a `select`. It also
ignores one with a modifier key held.

### 11.3 Scroll Ownership

| Region | Owns the scroll | Why |
|---|---|---|
| The document | **nothing** | the page does not scroll. The shell fills the viewport exactly |
| The pane | both axes, on a section that stacks | it is the only scrolling region for that mode, and it holds every panel of the section |
| The pane | **nothing, on a paged level** | the level lays its sections on a track and one box is on screen, so the pane has no overflow to own. The frame a reader sees never moves |
| A section box | both axes, when its section is taller than the box | the box is the only region that scrolls on a paged level. The stage clips the track, never a box's content |
| The section strip | itself, sideways, when the headings exceed the width | a record with many sections keeps every heading reachable |
| The pager bar | none | it holds one row of two controls and a count |
| The rail | itself, when its items exceed the viewport | a long rail must stay usable, and the rail never scrolls the pane |
| The top bar | none | it holds one line at every width |
| The work-item switcher list | itself | its list can exceed the viewport |
| The diagram dialog's body | both axes | a drawing at 400 % is far wider and taller than the dialog |
| The record sheet's container | both axes | an ADR body holds tables and long prose |
| A tooltip | none | it is transient and never scrolls |
| The section-link bar | none. It is `sticky` inside the pane, so it rides the pane's own scroll and adds no region | it holds one row of links, and it never scrolls anything |
| The progress strip | none. It holds one 4 px bar | on a paged level it reports the level's own position, and on a section that stacks it reports the pane's offset |

The document never scrolls, so `html` and `body` carry no overflow. Every wheel
event not consumed by a nested region scrolls the innermost region that can take
it. Where two regions could claim a gesture, the innermost owner wins, and the
outer region does not move.

**A section link moves the pane element, never the window.** The document cannot
scroll at all, so a hash write or a `window.scrollTo` would land nowhere. The
link intercepts the press, measures the target against the pane, and sets the
pane's own offset. Under `prefers-reduced-motion: reduce` the pane arrives in
one frame instead of animating.

**A section heading in the strip moves nothing at all except the index.** On a
paged level the pane cannot scroll, so there is no offset to set. The press sets
the shared index, and the track slides one box. The box then owns its own scroll.
The heading stays focusable, and the press is prevented so the route never moves.

**The progress strip measures the level on a paged level and the pane on a
section that stacks.** The document cannot scroll, so a window-scoped progress
bar would read zero at every position. On a section that stacks the strip takes
the pane's own element and reports that element's offset, as it always has. On a
paged level the strip instead reports `(index + within) / count`. `within` is the
active box's own scroll progress, and a box with no scroll range counts as fully
read. That value answers how far through the level a reader is. A pane-scoped bar
cannot answer that question once the pane stops scrolling. The strip spans the
level's full width and sits above the section strip.

**Five rules make "no scroll" safe rather than a way to hide content.** A layout
that fills the viewport and hides its overflow will clip whatever does not fit,
and the reader has no way to reach it. These rules prevent that.

1. **The shell fills its parent, never the viewport.** It uses `h-full`, not
   `h-dvh`. The viewport height belongs to whoever owns the page. When a host
   renders the shell beneath its own chrome, `h-dvh` makes the shell taller than
   the space it was given, and the surplus is clipped at one edge.
2. **The scrolling region scrolls on both axes.** `overflow: auto`, never
   `overflow-y: auto` with `overflow-x: hidden`. A region that hides its
   horizontal overflow clips a wide table with no scrollbar and no way to reach
   it. The region is the pane on a section that stacks. It is the section box on a
   paged level, where the pane itself has nothing to scroll.
3. **A wide block scrolls itself.** Every table, code block, and diagram wraps in
   its own `overflow-x: auto` container, so the region keeps its own scroll and the
   wide block keeps its integrity.
4. **Every flex and grid child carries `min-w-0`.** A flex child defaults to its
   content width, so one wide row stretches the region and pushes its siblings off
   the edge.
5. **The shell fills the visible screen, never the whole window.** It caps itself
   to the narrower of the window and the screen. This rule is the price of rule 2,
   and it exists because of a real failure. A reader ran a 1600 px window on a
   1512 px screen. The surplus 88 px sat outside the display. A normal page would
   let them scroll sideways to reach it. This shell cannot, on purpose, so 88 px
   of content was unreachable and no scrollbar could appear to say so. The reader
   reported it as clipping, which is exactly what it looked like. A window is not
   a screen, and a shell with no document scroll must never assume it is.

**On a paged level, the stage clips only the track.** The stage's outer element
is `overflow: hidden`, and what it hides is the boxes either side of the one on
screen. It never hides a box's content. Each box is its own two-axis scroll
region, and the boxes off screen carry `inert`. So nothing focusable sits where a
reader cannot see it. This is the one clip box in the shell, and it is the reason
rule 3 holds rather than bends on a paged level.

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
      load is the diagram render, and it starts when its section mounts.
- [x] Every control with a conditional existence appears in section 3.3.
- [x] Every multi-valued setting appears in section 2.3 with a default.
- [x] Every state change appears in section 4.1 with a source and target state.
- [x] Every duration in section 4.1 names a token from section 4.2.
- [x] Every flow names its entry condition and its edge cases.
- [x] Every floating surface names a layer from section 11.1.
- [x] Every control names its hit target element and its clickable bounds.
- [x] Every overlapping region names the surface that owns the gesture.
- [x] No section depends on the mockup for an answer.
