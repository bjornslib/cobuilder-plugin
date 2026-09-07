---
# --- doc-gardener required frontmatter ---
title: "ADR-0023 — A TypeScript and React viewer, compiled at author time"
status: active
type: architecture
last_verified: 2026-09-07
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0023
source_pr: null
name: "A TypeScript and React viewer, compiled at author time"
state: decided
groups: [viewer, packaging]
approved_by: ""
problem: "The viewer slices the bundle by record type: five tabs that mirror the five entity lists in index.json. Every real task crosses them, because index.json already joins what the tabs separate. Rebuilding the viewer around the three questions a reader actually arrives with needs state-dependent rendering, and the file that would carry it is 4899 lines in one function scope, with 45 innerHTML string blocks and no template layer."
decision: "Author the viewer as TypeScript and React under plugins/artifact/viewer/src/, and compile it with Vite and vite-plugin-singlefile into the committed plugins/artifact/viewer/index.html. The build runs when an engineer changes the viewer, never at /plugin install and never in the browser. A test rebuilds from source and fails when the committed output differs. The application renders three surfaces: Work, Flight deck, and Reference."
supersedes: ADR-0020
alternatives:
  - option: "Ordered parts under viewer/src/, concatenated by build_viewer.py, in plain JavaScript, as ADR-0020 decided"
    rejected_because: "It fixes file size and fixes nothing about state. The three surfaces compose a design record, a lens, a level, a filter, and a selection, and ordered concatenation still leaves 45 innerHTML blocks re-rendering by hand and no way to type the joins."
  - option: "TypeScript with no framework, bundled by esbuild, using template literals"
    rejected_because: "It answers the typing objection and keeps the toolchain small, and it leaves every list re-render hand-written. The prototype of 2026-09-07 shows the cost concentrating in lens and level switching, which is the part a component model removes."
  - option: "Preact and preact-compat instead of React"
    rejected_because: "It wins on bundle size, about 4 KB against about 45 KB compressed, and the 16 MiB Artifact budget is dominated by base64 audio and images rather than by the runtime. It stays available as a drop-in lever if the measurement in E7 comes back tight."
  - option: "Two artefacts: a React application served locally, and a reduced single file for publishing"
    rejected_because: "It splits the truth. Two renderers drift, and a reader would review a different page from the one they served. ADR-0001 exists because the served file and the published file are the same file."
  - option: "Serve the viewer from a small local web application and drop the single-file constraint"
    rejected_because: "ADR-0001 forbids it. A published Artifact is one file under a CSP that blocks every external request, and /artifact:publish is a shipped mode with recorded publications."
forces:
  - "ADR-0001: the published viewer is one self-contained file under a CSP that blocks every external request."
  - "/plugin install runs no build, so the plugin must ship the built file, committed."
  - "export_artifact.py rewrites the viewer by verbatim string replacement and hard-errors when a literal moves. A bundler moves every literal it matches."
  - "migrate_bundle.py copies the plugin's viewer/index.html into every bundle unconditionally, so the built file must exist in the plugin."
  - "ADR-0018 already computes every join in data/index.json. The viewer re-derives them by hand in each render path."
  - "ADR-0019 computes a comment anchor from the live DOM, and React owns the DOM."
  - "A generated file that is also committed goes stale the moment somebody edits the output instead of the source."
replaces: ADR-0020
related_decisions:
  - { type: replaces, target: ADR-0020 }
  - { type: depends-on, target: ADR-0001 }
  - { type: is-related-to, target: ADR-0018 }
  - { type: is-related-to, target: ADR-0019 }
history:
  - { state: tentative, date: 2026-09-07 }
  - { state: decided, date: 2026-09-07 }
maps_to:
  context: cobuilder-packaging
  modules: [plugins/artifact/viewer/index.html, plugins/artifact/viewer/src, plugins/artifact/scripts/export_artifact.py, shared/migrate_bundle.py]
  rule: "plugins/artifact/viewer/index.html is a build output compiled from TypeScript and React sources under plugins/artifact/viewer/src/. An engineer edits a source file, never the output. A test rebuilds from source and fails when the committed output differs. The build never runs at install time and never in the browser."
delivers:
  capability: "A reader opens the bundle on three goal-shaped surfaces instead of five record-type tabs, and an engineer changes one surface by opening one typed component."
  benefit: "A review that took four tab changes takes none, because the joins the index already computed are rendered together. A new surface costs one component and one route, not another pass of scattered predicate calls."
  beneficiary: [developer, reviewer, validator-agent]
related:
  - "docs/architecture/designs/react-viewer/goal.json"
  - "docs/architecture/designs/build-workflow-polish/goal.json"
  - "docs/architecture/adr/ADR-0020-viewer-parts-and-an-author-time-build.md"
---

# ADR-0023 — A TypeScript and React viewer, compiled at author time

## Context

The viewer has five view modes: Designs, Pull requests, Decisions, Contexts,
and Builds. They mirror the five entity lists that `build_index.py` writes into
`data/index.json`. The mirror is honest, and it is the problem. A reader does
not arrive holding a record type. They arrive holding one of three questions:

| Question | Records it needs | Tab changes today |
|---|---|---|
| Is this decided, and does the tree still match? | design, ADR, context | 3 |
| Where has this design got to, and what blocks it? | design, epic, slice, gate | 2 |
| What does this pull request change, and was it intended? | PR, ADR, epic, slice | 3 |

`index.json` already resolves those joins. It carries `adr_to_pull_request`,
`epic_to_pull_request`, `slice_to_epic`, `epic_status`, and
`context_verifies_district`. The viewer renders the entities and makes the
reader rebuild the joins by hand.

Rebuilding the surfaces around the three questions is not a styling change. It
composes a selected design, a selected lens, a selected level, a lane filter,
and a selection across surfaces. The file that would carry it was measured on
2026-08-24 at 4917 lines, and is 4899 lines today: one IIFE, 145 functions, 45
`innerHTML` string assignments, no `<template>` element, and one card fragment
copy-pasted 18 times.

ADR-0020 decided in August that this file must become parts compiled by a
Python script. That decision is **decided and not executed**: no `viewer/src/`
exists. Nothing is discarded by revisiting the target now, and revisiting it
after the split would discard real work.

## Decision

Author the viewer as TypeScript and React under
`plugins/artifact/viewer/src/`. Compile it with Vite and
`vite-plugin-singlefile` into the committed
`plugins/artifact/viewer/index.html`.

Three rules hold the shape:

1. The build runs when an engineer changes the viewer. It never runs at
   `/plugin install`, and never in the browser.
2. The output stays one self-contained file, so ADR-0001 is unchanged and
   `/artifact:publish` keeps working.
3. A test rebuilds from source and fails when the committed output differs, so
   an edit to the output cannot survive review.

## Why this reverses ADR-0020's fourth rejected option

ADR-0020 rejected a bundler because it "adds a Node toolchain to a repository
of prose, Python scripts, and one HTML file". That sentence is still true about
the repository. What changed is the problem.

ADR-0020 asked how to make a 4917-line file maintainable. This ADR asks what
the viewer should be, now that the information architecture changes from five
record-type tabs to three goal-shaped surfaces. Concatenating ordered parts
answers the first question and not the second: it produces smaller files that
still build HTML from strings, and it cannot type the joins that ADR-0018
already computes.

This ADR therefore **supersedes ADR-0020**. Two decided records that answer the
same question differently is drift by construction. The engineer accepted the
Node cost on 2026-09-07 and required TypeScript and React, so the reversal is
recorded here rather than left as a coexistence.

Two designs close with it. `maintainable-viewer` is superseded outright: it was
never executed. `build-workflow-polish` is also closed, and only one of its four
epics is viewer work. The other three fixes move into `react-viewer`'s E8, so
the closure is not a silent deletion.

## Consequences

**Accepted cost.** A contributor needs Node and npm to change the viewer. The
repository has never required either. This cost is paid on every future viewer
change, and no epic in the design removes it. It is the reason the verdict on
`docs/architecture/designs/react-viewer/assessment.json` is `concerns` and not
`sound`.

**Ordering is load-bearing.** `export_artifact.py` matches literal strings in
the viewer and hard-errors when one moves. A bundled build moves every one of
them. The exporter seam becomes named markers **before** any bundled output
lands, or publishing breaks silently until somebody publishes.

**Open, and measured by a spike.** Three questions stay unanswered until a
build exists: whether two machines with the same lockfile and Node version produce a
byte-identical file, how much of the 16 MiB Artifact budget the inlined runtime
spends, and whether a Claude Artifact renders a Mermaid block that React injects
after page load. Two of the design's three abort conditions depend on them, so E2 starts with a
spike that publishes one throwaway bundled page and measures all three, before
the rest of the work depends on the answer.

**The lens named "assessment" is renamed.** A reader who is not the author of
the design could not say what the word meant. The lens reads **Risks and
verdict** in the viewer, and the record on disk keeps the field name
`assessment.json`.

**ADR-0019's anchors need a decision of their own.** The comments ledger walks
the live DOM to build an anchor. React replaces nodes on state change. Either
anchors become surface-scoped, or the ledger gets a React-aware anchor
strategy. This ADR does not settle it.
