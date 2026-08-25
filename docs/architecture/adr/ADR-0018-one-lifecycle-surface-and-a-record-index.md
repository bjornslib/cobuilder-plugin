---
# --- doc-gardener required frontmatter ---
title: "ADR-0018 — One lifecycle surface, and a record index that joins it"
status: active
type: architecture
last_verified: 2026-08-21
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0018
name: "One lifecycle surface, and a record index that joins it"
state: approved
groups: [viewer, data-model]
approved_by: "bjornslib"
problem: "The lifecycle produces 41 artifacts across seven reading surfaces. The joins between them are declared in the authored source and resolved nowhere, so a decision is reachable only when a change happens to cite it."
decision: "Extend the viewer to one surface covering designs, decisions, contexts, builds, and pull requests, and give it a single derived index that resolves every join between them."
alternatives:
  - option: "A separate page per artifact family"
    rejected_because: "A reader does not open eleven files to review a pull request. They open one page. Seven surfaces already exist and adding more widens the problem the index exists to close."
  - option: "A local SQLite store for the records"
    rejected_because: "The viewer cannot read it. Six script tags assign window globals and export_artifact.py inlines each as literal JSON. Reaching SQLite needs a WASM build, which breaks the buildless viewer and the artifact size budget."
  - option: "A Postgres service behind the plugin"
    rejected_because: "It is a service. The install surface is /plugin install and nothing else, with no agents, no hooks, and no MCP servers."
  - option: "One file per entity type beside the existing projections"
    rejected_because: "It matches the pattern in data/ and it leaves the joins unresolved, which is the actual problem. One index that references everything is what makes a record reachable."
  - option: "Leave adrs.js and designs.js in place and add the index beside them"
    rejected_because: "Two sources for the same records drift. The index subsumes both."
forces:
  - "The viewer loads sibling script tags that assign window globals. That is its only input channel."
  - "export_artifact.py inlines each projection as literal JSON into a published page."
  - "Authored source lives in docs/ and derived projections live in the bundle. A projection is a full rebuild, never a merge."
  - "A derived index goes stale the moment an authored file changes."
  - "17 of 17 ADRs declare a maps_to join. Two resolve to a context. One record is reachable from nowhere."
related_decisions:
  - { type: depends-on, target: ADR-0016 }
  - { type: is-related-to, target: ADR-0014 }
  - { type: is-related-to, target: ADR-0019 }
related_concerns: [C3, C6]
history:
  - { state: tentative, date: 2026-08-21 }
  - { state: decided, date: 2026-08-21 }
  - { state: approved, date: 2026-08-21 }
maps_to:
  context: cobuilder-packaging
  modules: [viewer/index.html, scripts/build_adrs.py, scripts/build_designs.py, docs/architecture]
  rule: "Every record carries a stable id, data/index.json is the single derived projection that resolves the joins between them, a boundary record declares the districts it verifies, and realisation is derived from a pull request state rather than declared on a record."
delivers:
  capability: "A person browses the decisions, the contexts, the builds, and the pull requests of a repo in one place, and follows a join from any one of them to the others."
  benefit: "A decision stops being reachable by accident. The cost of finding why something was built the way it was drops from a search to a click."
  beneficiary: [operator, developer]
related:
  - "docs/plans/cobuilder-family/02a-artifact-map.md"
  - "docs/plans/cobuilder-family/02c-record-model.md"
---

# ADR-0018 — One lifecycle surface, and a record index that joins it

## Context

The lifecycle produces 41 artifacts. They land on seven reading surfaces:
the viewer, chat, a git diff, a GitHub pull request, a standalone report
file, a published page, and nothing at all.

Two surfaces carry eleven artifacts each. The git diff can be answered. The
viewer, which is the surface built for a person to sit and read, cannot.

The joins between the records are worse. Measured against the tree on
2026-08-21:

- 17 of 17 ADRs declare a `maps_to` block.
- 2 resolve to a bounded context. The other 15 carry `unanchored: true` and
  point at a district, which is the inferred concept rather than the
  verified one.
- 16 are reachable through an `.adr-badge` chip. ADR-0013 is reachable from
  nowhere.
- A boundary record declares `governed_by`, the reverse of that join.
  Nothing populates it.

Reachability today is incidental. A record is visible because some pull
request or design happens to cite it. There is no index. A reader cannot
browse the decisions, only stumble on one.

## Options considered

1. **A separate page per artifact family.** Rejected. Seven surfaces already
   exist, and more of them widen the problem.

2. **A local SQLite store.** A file and not a service, in the Python
   standard library, with real query semantics. Rejected for one reason:
   the viewer cannot read it. `viewer/index.html` loads six
   `<script src="../data/*.js">` tags that assign window globals, and
   `export_artifact.py` inlines each as literal JSON. Reaching SQLite needs
   a WASM build, which breaks the buildless viewer and pushes against the
   16 MiB artifact budget. It would serve scripts and not the viewer, which
   is two stores for one set of facts.

3. **A Postgres service.** Rejected. It is a service, and the install
   surface forbids one.

4. **One file per entity type.** Rejected. It matches the pattern in `data/`
   and leaves every join unresolved.

5. **One index that references everything.** Chosen.

## Decision

**The viewer becomes one surface with five modes.** Designs and Pull
requests exist. Decisions, Contexts, and Builds are added.

- **Decisions** is the index of ADRs. Its value is not the list. It is the
  anchor column, which shows at a glance which records resolve to a verified
  context and which do not.
- **Contexts** renders `canvas.md` and `boundary.yaml`. Boundary violations
  lead, because each one is recorded as an ADR candidate. The view also
  lists the districts no context covers, which is the unverified half of
  the map. Nobody runs Describe to reach this view. Design mode calls it
  when a design needs a verified region to anchor against, so a context
  bundle is a by-product of designing rather than a step a person schedules.
- **Builds** renders a feature's gate documents. `00-status.md` is not a
  document to display. It is the state that drives the view, so approval
  marks and slice scores become chrome. **Builds also carries a Backlog
  lane**, showing every epic with a null branch and every slice not yet
  scored, ranked by the count of ADRs that depend on the epic. The lane is a
  query over the index and not a file, so no backlog document exists to go
  stale. This is what makes an epic the backlog record and removes the need
  for a separate store of planned work. The view always presents work
  epic-first, with each epic's slices nested under it, never as a flat
  slice list with an epic column.

**One index, `data/index.json` plus `index.js`.** It references every entity
and resolves the joins. `build_index.py` rebuilds it in full from `docs/`
plus git, and **it subsumes `build_adrs.py` and `build_designs.py`** rather
than sitting beside them. Two sources for one set of records would drift.

**Every entity carries a stable id.** Most already do. Two do not:

| Entity | Id | Status |
|---|---|---|
| `adr` | `ADR-NNNN` | stable |
| `design`, `context` | directory name | stable |
| `epic` | `<design>/<epic-id>` | must be scoped, because `E1` repeats |
| `pull_request` | integer | stable |
| `district` | `world.districts[].id` | already stable, newly joined |
| `boundary_rule` | `<context>/<kind>/<n>` | new |
| `comment` | ulid | new, see ADR-0019 |

**A district joins to a context, and that join is what gives a district
weight.** A district is inferred and a context is verified, and until now
they were two vocabularies for one idea with nothing between them. That is
why 15 of 17 ADRs anchor to a district and are recorded as `unanchored`:
the anchor they do have resolves to nothing.

So a boundary record declares `verifies: [<district-id>]`, naming the
districts the context covers. The index resolves the edge in both
directions. Three facts follow that nothing states today:

- An ADR anchored to a district reaches a context through that district,
  once one covers it. The existing anchors start resolving without a
  rewrite.
- A district with no context is **unverified coverage**, and the list of
  them is the describe backlog, ranked by how many ADRs point at each.
- A district is now the coarse map and a context is the surveyed part of
  it. The inferred layer stops being a parallel vocabulary and becomes the
  first pass of the verified one.

**The index carries the state of a pull request, and realisation is derived
from it.** An ADR's own state machine describes the lifecycle of the
*decision*: `idea → tentative → decided → approved → challenged`. It says
nothing about whether the code matches the decision yet, and it should not.
Those are two axes, and collapsing them into one enum breaks both.

So the index holds `pull_request.state` as `open`, `merged`, or `closed`, and
an ADR reaches its pull request two ways: directly through `source_pr`, or
through the design and epic that delivered it. A merged pull request means the
decision shipped. Nothing declares that. It is computed.

This is why no new ADR state is added. `approved` stays the most final state a
person grants, and shipped is a fact the index reads off git.

A boundary rule has three kinds, and one entity carries all three with a
`kind` discriminator: a `forbidden_dependencies` edge prohibition, a
`modules[].rule` invariant with its inbound and outbound lists, and a
`context_map[]` integration pattern. They answer one question, which is what
may cross this boundary.

**The index records what it was built from.** A `sources` block holds a
content hash per `docs/` subtree plus the git head. Any mode that reads the
index compares the hashes first and rebuilds on a mismatch, in the same
place `migrate_bundle.py` already runs before every mode.

**Out of scope.** The reply channel is ADR-0019. This record covers what is
rendered and how the records join, not how a reader answers back.

## Consequences

- **Positive:** A decision becomes reachable by browsing rather than by
  accident, and the anchor column makes an unresolved join visible instead
  of silent.
- **Positive:** Identity is the durable half of this decision and the engine
  is the reversible half. With stable ids, a local SQLite index can be added
  later as a build-time projection beside `index.json` without touching one
  authored record.
- **Constraint introduced:** Every record carries a stable id, and
  `data/index.json` is the single derived projection that resolves the joins
  between them.
- **Negative / accepted:** A sixth build script, and the two it replaces
  must be retired in the same change rather than left in place.
- **Positive:** An approved but unshipped decision becomes visible, because
  the index can show an ADR whose pull request is still open. Today nothing
  distinguishes a decision that describes a target state from one the code
  already meets. ADR-0016 is exactly that case.
- **Negative / accepted:** A JSON index answers a lookup by id and a one-hop
  join by loading the file. It cannot answer an arbitrary traversal without
  loading everything. That is the threshold that would later earn SQLite.

## Value delivered

- **New capability:** A person browses the decisions, the contexts, the
  builds, and the pull requests of a repo in one place, and follows a join
  from any one of them to the others.
- **Benefit:** A decision stops being reachable by accident. The cost of
  finding why something was built a certain way drops from a search to a
  click.
- **Beneficiary:** operator, developer.

## Maps to

Context `cobuilder-packaging`, modules `viewer/index.html`,
`scripts/build_adrs.py`, `scripts/build_designs.py`, `docs/architecture`.
See `docs/architecture/contexts/cobuilder-packaging/boundary.yaml`.

## Unverified before implementation

A prototype of the Decisions mode exists at
`.lavish/decisions-register.html`, generated from the real `adrs.json`. It
proves the data supports the view. It does not prove the viewer can carry
five modes without the mode switch becoming the navigation problem this
record set out to solve.
