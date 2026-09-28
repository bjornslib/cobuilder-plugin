---
# --- doc-gardener required frontmatter ---
title: "ADR-0028 — A level is sections on a track, and the box owns the scroll"
status: active
type: architecture
last_verified: 2026-09-22
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0028
source_pr: null
name: "A level is sections on a track, and the box owns the scroll"
state: decided
groups: [viewer]
approved_by: ""
problem: "A long page has no bound. A level of the Work surface put every panel in one column. Intent ran to 4.2 pages. Build's eighteen epics ran to 2.1 pages as one panel. Architecture's rule list ran to 2.31 pages. A reader in that column cannot tell how much is left. The reader cannot name the part they are in either, and cannot tell whether the next screen holds what they came for. A chat transcript fails the same way, and this viewer exists to remove that failure. A scrollbar reports a fraction of a page. It does not report a fraction of the work, so it answers a question nobody asked."
decision: "A level is a sequence of sections. One section is on screen at a time, on a horizontal track. The box owns the scroll and not the pane. So a paged level's pane does not scroll at all, and the frame a reader sees never moves. A section taller than its box scrolls inside that box. The section strip at the top, the pager bar at the bottom, and the two arrow keys move one shared index. That index is view state and never a route. The strip and the pager read their labels and their count from the sections the level rendered. So a label cannot disagree with the heading it names. The progress strip reports (index + within) / count, where within is the active box's own scroll progress. A box with no scroll range counts as fully read. So the value never resets on a section change, and it never decreases on a forward walk. A paged level drops its visible heading band. It keeps an sr-only h1 with the same id, so the focus move still lands. Four levels page today: Intent, Problem & Solution, Architecture, and Build. Build computes its sections from its epics, in delivery order and six to a section, because it records no state that divides them."
alternatives:
  - option: "Keep one long scrolling page per level"
    rejected_because: "That is the failure itself. Intent measured 4.2 pages. So a reader cannot tell how much is left, and cannot name the part they are in. A scrollbar answers a fraction of a page. The real question is how much of this level remains, and the scrollbar does not answer it."
  - option: "A vertical scroll-snap pager the reader drags through"
    rejected_because: "Scroll-snap keeps the page's own scroll, so the frame still moves. A section taller than the viewport cannot snap to anything either. The reader drags, the snap fights the overflow, and the landing point depends on where the drag stopped. A section that does not fit its screen is the common case here, not the exception."
  - option: "A separate route per section"
    rejected_because: "A section is view state and not a destination. A route per section multiplies the deep-link surface by the section count. Every page step would write a history entry the reader did not ask for. It also gives the rail's rule a second reading, because the rail names sections. And a step could fail the gate, when a section the work cannot fill has no route to land on."
  - option: "The six design lenses, the model before this one"
    rejected_because: "The lens list described navigation rather than content. It did not survive its own contradiction: every place that named the lenses listed six, three places said seven, and no seventh lens was ever named. A lens also answers the wrong question. A reader picks a topic, a topic has no bound, and the level still runs several thousand pixels with no way to say where the reader is."
  - option: "A wide track inside the pane, with the reader scrolling it sideways"
    rejected_because: "The pane would own a horizontal scroll over one very wide row. The reader's position would become a pixel offset rather than a section number. The arrow keys would have nothing discrete to step. The progress strip would report a fraction of a track several thousand pixels long. The frame would still move, which is half of the problem the model has to solve."
  - option: "Open every panel of a level, and let each panel's own fold carry the structure"
    rejected_because: "A fold inside a page is a fold inside a fold. Once a level shows one section at a time, three closed panels hide most of that one section. A reader who must open three folds to see one screen has the long-page problem again, with extra presses."
forces:
  - "The document never scrolls. The shell fills its host, and the content owns whatever scroll there is. So a level's overflow must land in a region that is not the pane."
  - "ADR-0023 fixes the build: TypeScript, React, Vite, and one committed file. The model must hold inside a single-file React application with no router. That is why the index is component state rather than a route."
  - "The rail lists sections and never records. A section is therefore the unit a reader moves between, and a section must be meaningful on its own."
  - "The corpus grows. This design carries eighteen epics, and the repository carries twenty-nine slices. So no list that grows with the corpus can be a rail item or an unbounded spine."
  - "Measured on the built mockup: Intent ran to 4.2 pages as one column. Its Done when section alone is 2.55 pages. Build's eighteen epics ran to 2.1 pages as one panel. Architecture's Boundaries section is 2.31 pages, and its Districts and alternatives section is 1.63 pages."
  - "Measured on the built mockup: on a paged level the pane reports zero overflow, and the boxes carry the scroll. Intent's Done when box holds 849 px of range. Architecture's Boundaries box holds 722 px, and its Districts and alternatives box holds 362 px."
  - "A section that fits one screen must still contribute its whole share of the level. Without that rule the progress strip would stall at a boundary that is not real."
  - "The engineer's own reading of the earlier level: once a level shows less at a time, it should show everything it does show. So the panels of a paged section render open and carry no fold."
related_decisions:
  - { type: depends-on, target: ADR-0023 }
  - { type: depends-on, target: ADR-0018 }
  - { type: is-related-to, target: ADR-0020 }
  - { type: is-related-to, target: ADR-0027 }
related_concerns: []
history:
  - { state: tentative, date: 2026-09-22 }
  - { state: decided, date: 2026-09-22, by: bjornslib, note: "Decided while the Work surface's prototype was rebuilt as sections. The engineer approved the model: a level is sections on a track, the box owns the scroll, and the panels of a section render open. The prototype lives at plugins/artifact/viewer/src/variations/sections-e/." }
maps_to:
  context: cobuilder-packaging
  modules: [plugins/artifact/viewer/src, plugins/pr, shared]
  rule: "A level is a sequence of sections. One section is on screen at a time on a horizontal track, and the box owns the scroll rather than the pane. The section strip, the pager bar, and the arrow keys move one shared index, which is view state and never a route. The progress strip reports (index + within) / count over the level, where a box with no scroll range counts as fully read. A paged level drops its visible heading band and keeps an sr-only h1 with the same id."
delivers:
  capability: "A reader knows where they are in a level, and how much of it is left. One section is on screen, the strip names every section, and the progress strip reports a position in the level rather than a fraction of a page."
  benefit: "The reader never has to guess how far the end is. That guess is the failure this viewer exists to remove. A level that grows by a section stays readable, because the reader meets one screen at a time and the strip says how many remain."
  beneficiary: [developer, reviewer, the-business]
  enables: ["A level can hold any number of sections without becoming a long page", "A section can carry a drawing, a rule set, or an epic run at its own size, because the box owns the scroll"]
  addresses_problem: P3
related:
  - "docs/architecture/designs/cobuilder-viewer/goal.json"
  - "docs/plans/cobuilder-viewer/interaction-design.md"
  - "plugins/artifact/viewer/src/variations/sections-e/"
---

# ADR-0028 — A level is sections on a track, and the box owns the scroll

## Context

The Work surface renders one piece of work as a set of levels. Intent, Problem &
Solution, and Architecture are the levels. Build, Pull requests, and Shipped
extend them. Each level used to render every panel it holds in one column inside
the pane. The pane owned the only scroll.

A column of that shape has no bound. Measured on the built prototype, Intent ran
to 4.2 pages. Architecture's Boundaries panel ran to 2.31 pages. Its Districts
and alternatives panel ran to 1.63 pages. Build's eighteen epic rows ran to 2.1
pages as one panel.

A reader in that column cannot tell how much is left. The reader cannot name the
part they are in either. A scrollbar reports a fraction of a page, and that
answer does not help.

The earlier model named six design lenses. The lenses were intent,
problem/solution, architecture, risks and verdict, build, and pull requests. The
list described navigation rather than content. It also did not survive its own
record. Every place that named the lenses listed six. Three places said seven,
and no seventh lens was ever named.

The engineer's reading of the rebuilt level fixed the second half of the
problem. Once a level shows less at a time, it should show everything it does
show. So the panels of a section render open and carry no fold. A fold inside a
page is a fold inside a fold.

## Options considered

1. **One long scrolling page per level.** The shape in place. Rejected: it is the
   failure itself.
2. **A vertical scroll-snap pager.** Rejected: scroll-snap keeps the page's own
   scroll, so the frame still moves. A tall section cannot snap cleanly.
3. **A separate route per section.** Rejected: a section is view state. A route
   multiplies the deep-link surface and records every step in history.
4. **A wide track the reader scrolls sideways inside the pane.** Rejected: the
   reader's position becomes a pixel offset, and the frame still moves.
5. **The six design lenses.** Rejected: the list is navigation, it contradicted
   itself, and a topic has no bound.
6. **Sections on a track, one on screen, with the box owning the scroll.**
   Chosen.

## Decision

A level is a sequence of sections. One section is on screen at a time, on a
horizontal track that moves by transform.

**The box owns the scroll, never the pane.** On a paged level the pane does not
scroll at all, so the frame a reader sees never moves. A section taller than its
box scrolls inside that box, on both axes. The measurement holds: the pane
reports zero overflow, and the boxes carry the range. Intent's Done when box
holds 849 px. Architecture's Boundaries box holds 722 px, and its Districts and
alternatives box holds 362 px.

**One index drives three controls.** The section strip at the top, the pager bar
at the bottom, and the `ArrowLeft` and `ArrowRight` keys move the same index. The
index is view state, so a step writes no route and the hash never moves.

**The controls derive their own labels.** The strip reads the section headings
the level rendered. The pager reads its count from the same array of sections the
boxes come from. A section that renames itself renames its own link.

**The progress strip measures the level.** Its value is `(index + within) /
count`. `within` is the active box's own scroll progress. A box with no scroll
range counts as fully read. So a section that fits one screen contributes its
whole share, with no special case. The value never resets on a section change,
and it never decreases on a forward walk.

**A paged level drops its visible heading band.** The strip names the same words
lower down, so a band above it would repeat them. The heading stays in the
document as an `sr-only` `h1`. It holds the same element id, so the focus move on
a section change still lands and the document keeps its one `h1`.

**A paged section carries no fold.** Its panels render open. An absent record is
still `absent`, which is a stated state and not a fold.

**Four levels page today.** Intent holds Diagrams, Why, Done when, Abort if, and
Out of scope. Problem & Solution holds Problem and solution, Risks, Assessment,
and Unknowns. Architecture holds Diagrams, Architecture Decisions, Boundaries,
and Districts and alternatives considered. Build holds three runs of six epics.
Rubrics keeps the stacking shape.

**Build computes its sections, because no state divides its epics.** All
eighteen epics of this design read `no-pull-request` in the join. All eighteen
read `planned` in the entity. All eighteen name one branch, and the design
records no slices and no epic solution designs. One state over eighteen epics is
not a spine. The level therefore cuts the epic order it already has, six to a
section. A section is then one screen, and the sequence a reader follows is
preserved.

**Two more consequences follow from the same reading.** The first diagram level
is the container drawing. It names the surfaces and the people who use them, so
it belongs to Intent. The levels after it are mechanism and stay in Architecture.
The envisioned pull request moved to the Pull requests level. That level now
fills when a work has a drafted pull request, so a design with no merged pull
request can still reach the level that names the one it will open.

## Consequences

- **Positive:** a reader always knows how much of a level remains.
- **Positive:** the frame a reader is reading never moves under them.
- **Positive:** a level grows by adding a section, and the strip absorbs the
  growth. The rail's rule is untouched, because a section is not a record.
- **Positive:** a section can hold content of any size, because its box owns the
  scroll. A 2.55-page section and a 0.47-page section sit on the same track.
- **Constraint introduced:** on a paged level the pane owns no scroll. So any
  block wider than its box must scroll inside the box. The shell's
  scroll-ownership rules carry this as their two-region form.
- **Constraint introduced:** the section index lives in component state and not
  in the route. A reader cannot share a link to one section of one level. A
  record inside a section is still shareable, and an epic deep link lands on the
  run that holds it.
- **Negative:** a paged level cannot be read as one document. A reader who wants
  to scan the whole level must step through it instead. The strip and the arrow
  keys make that cheap, and it is still a change.
- **Negative:** the progress strip needs the active box's own scroll position, so
  the strip is bound to the box and not to the pane. A box that cannot scroll
  counts as fully read. That rule is honest, and it reads as a full bar on a
  short section.
- **Open, deferred to the design's epics:** whether a section can be addressed by
  a route without giving the rail a second meaning. Also open: whether the strip
  should carry a per-section reading rather than one level-wide position.

## Value delivered

- **New capability:** a reader sees one section at a time, and reads their
  position in the level from the strip.
- **New capability:** the reader no longer scrolls a column of unknown length.
- **Benefit:** the failure this viewer exists to remove is gone from the Work
  surface's levels. A reader who cannot tell how far the end is has that problem
  no more, and the fix holds as a level grows.
- **Beneficiary:** a developer reading a work item before a change, a reviewer
  checking what a work claims, and the team that reads the bundle instead of a
  raw diff.

## Maps to

Context `cobuilder-packaging`. Modules `plugins/artifact/viewer/src`,
`plugins/pr`, and `shared`.

The rule this record establishes is the one the boundary record carries for the
viewer. A level is a sequence of sections. The box owns the scroll. One index
drives the strip, the pager, and the arrow keys, and the progress strip reports a
position in the level.
