# Three view designs and one response channel

A Gate 2 input, following the artifact map in `02a-artifact-map.md`.

## Settled before designing

**F1 is resolved.** The three HTML conventions serve different readers and
stay separate. One publish-and-respond mechanism serves all three. A page
declares whether it needs an answer. The mechanism does not care which
convention produced it.

**F4 and F5 are accepted as they stand.** Divergent exploration persists
nothing, and the rubrics stay blind. Neither needs a change.

**One correction to the grouping.** ADRs and bounded contexts are not
pull-request documents. An ADR outlives the change that introduced it, which
is why `docs/architecture/adr/` is a flat store. `canvas.md` and
`boundary.yaml` describe a part of the system and are tied to no change at
all. Only `pr-draft.md` and `assessment.md` are pull-request scoped, and
`assessment.md` already renders in the viewer's assessment sheet.

Checked against `viewer/index.html`: it holds no reference to
`docs/architecture/contexts/`, to a canvas, or to a boundary record. The four
matches for those words are narrative `kind` labels and
`assessment.boundary_checks`, which are unrelated. **Bounded contexts have no
surface anywhere.** That is the real gap, and it is narrower than "the pull
request documents need an interface".

## Design A — the Build view

**Problem.** `01-product.md` through `04-slices.md` are four documents that
describe one thing: the state of a build. A reader opens four files and
assembles the picture themselves.

**The insight.** `00-status.md` is not a fifth document to display. It is the
**state that drives the view**. Approval marks, slice checkmarks, and scores
are chrome, not content. Treat it as the model and the other four become
panels inside one page.

**Shape.** A vertical spine, because the gates are sequential and stateful.
Tabs would hide exactly the thing a reader needs: how far along this is.

- A **gate rail** down the left. Four gates, each with its state. The current
  gate is expanded. An approved gate collapses to one line with its date.
- The **panel** shows the current gate's document, rendered.
- A **slice ladder** below the gates. One row per slice, with its score, its
  attempt count, and its state. An escalated slice is marked, never hidden.
  The ladder is grouped epic-first, with each epic's slices nested under it,
  never rendered as a flat slice list with an epic column.
- The **pending question** is pinned at the bottom, as
  `collaborate-with-user` requires.

**What it replaces.** Nothing. The five markdown files stay the source of
record. This view presents them.

## Design B — the Contexts view

**Problem.** Describe mode produces the most carefully verified artifact in
the system. Every claim in a `boundary.yaml` is grep-checked against real
import edges. None of it is visible anywhere.

**Shape.** A map, not a document list. A bounded context is defined by its
edges, so the edges are the view.

- A **context grid**. One card per context, showing its modules, its public
  interface, and its count of forbidden dependencies.
- Opening a card shows the canvas, and the boundary record beside it as a
  rule list rather than as YAML.
- A **violations lane**, shown first when any exists. Describe mode records a
  boundary violation as a `forbidden_dependencies` entry with a `why` and
  flags it as an ADR candidate. That flag is a call to action and belongs at
  the top of the view, not inside a card.
- Every rule links to the ADR that governs it, through `maps_to.context`.
  This is the join the ADR template already declares and nothing renders.

**Why this and not a pull-request view.** The pull-request documents already
have surfaces. Contexts have none, and they are the artifact whose verification
cost is highest.

**The join is declared and empty.** A flat ADR store is correct only while the
records are referenced from somewhere. Counted against the tree today:

- 3 designs reference ADRs through `goal.json.adrs[]`, and the viewer renders
  that.
- 17 of 17 ADRs declare a `maps_to` block.
- **15 of 17 carry `unanchored: true`** and map to a *district* rather than a
  *context*. A district is the inferred, unverified concept. A context is the
  grep-verified one. The template asks for a context and the corpus gives a
  district.
- The 2 anchored records are ADR-0016 and ADR-0017, written yesterday, and the
  context they name does not exist yet.

So the reference that would justify the flat store is declared everywhere and
resolves nowhere. The Contexts view is what renders that join, and writing the
first `boundary.yaml` is what gives it something to render.

One stale value found while counting: one ADR maps to a district named
`.prodyssey`, from before the rename.

## Design C — the response channel

> **ADR-0019 supersedes three points below.** The build-time `data-fb` anchor
> is rejected in favour of a selector computed from the live DOM at annotation
> time. The local write endpoint is decided rather than open, and lands in the
> same epic as the anchor. And the drawer opens on a click on any element,
> with the page shifted so the reader still sees the text they are commenting
> on. The rest of this section stands.

**Problem.** The viewer is the largest reading surface and carries no way to
reply. A person reads a whole pull request and has nowhere to put a reaction.

**The principle.** Do not invent a comment model. The Claude Artifact platform
already ships one that works: a thread anchored to a page, a reply from the
agent, and a resolve. Model the local channel on that same shape, so both
collapse into one inbox rather than two.

**The thread record.** One line appended to
`<bundle-dir>/feedback/threads.ndjson`:

```json
{"id":"t7","surface":"viewer","anchor":"pr-11/level-2/para-3",
 "quote":"the migration ladder runs in memory","body":"is this still true after the split?",
 "author":"human","ts":"2026-08-21T14:02:00Z","state":"open"}
```

- `anchor` is a stable id emitted into the rendered page as `data-fb`. A
  paragraph, a diagram, a finding, a table row. Anything a reader can point at
  gets one.
- `state` is `open`, `answered`, or `resolved`, matching the Artifact model.
- The agent reads the file, acts, appends a reply line, and resolves.

**Two transports, one record.**

| Surface | How a comment arrives | Status |
|---|---|---|
| Published Artifact page | native comment threads | **works today**, no new code |
| Local viewer | the view server accepts a POST and appends a line | **needs a decision**, see below |

**The decision this forces.** `view` mode currently serves static files with
`python3 -m http.server`. A POST endpoint makes it a small application. That
is a real change and it is the cost of the local half. Three ways out:

1. **Publish to comment.** Do nothing locally. A reader who wants to comment
   publishes the bundle and comments there. Zero new code. It makes commenting
   a deliberate act rather than an available one.
2. **A write endpoint.** Replace the bare server with a small handler that
   accepts `POST /feedback` and appends to the file. Roughly 40 lines. It keeps
   the install surface unchanged, because it is a script and not a hook.
3. **Clipboard hand-off.** The viewer holds comments in `localStorage` and a
   button copies them as one JSON block the person pastes into chat. No server
   change, and it needs a manual step every time.

Option 2 is the honest one. Option 1 is a real answer if publishing is going to
be the default anyway, which open question 2 in `02a` already asks.

**What a comment must carry to be useful.** The quote. A reaction with no
anchor forces the agent to guess what it refers to, which is the same
reconstruction problem the whole plugin exists to remove.

## Open questions

1. Which of the three transports for the local viewer? Option 2 is
   recommended and it changes what `view` mode is.
2. Does the Build view live in the bundle viewer as a third mode beside
   Designs and Pull requests, or as a `.lavish` page per feature? The bundle
   viewer is per-repo and a build is per-feature, which argues for the second.
3. Does the Contexts view justify a new projection, `contexts.js`, built by a
   new script? Every other viewer surface has one. This would be the fifth.

## Unverified

- Artifact comment threads are documented and this session has not run one end
  to end. Design C's "works today" column rests on documentation.
- Line counts for option 2 are an estimate, not a measurement.
