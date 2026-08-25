---
# --- doc-gardener required frontmatter ---
title: "ADR-0020 — Viewer parts and an author-time build"
status: active
type: architecture
last_verified: 2026-08-24
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0020
name: "Viewer parts and an author-time build"
state: decided
groups: [viewer, packaging]
approved_by: ""
problem: "viewer/index.html is 4917 lines in one file: 881 lines of CSS and 3872 lines of JavaScript in a single IIFE holding 145 functions. Five view modes interleave through 50 scattered mode-predicate calls, 45 innerHTML string blocks carry no shared template, and one card fragment is copy-pasted 18 times. The file must ship as one self-contained file, so nobody has been able to split it."
decision: "Author the viewer as parts under viewer/src/, and compile them into the committed viewer/index.html with build_viewer.py. The build runs when an engineer changes the viewer, never at install and never in the browser, and a test fails when the committed file does not equal a fresh build."
alternatives:
  - option: "Leave the viewer as one hand-edited file and remove only the duplication"
    rejected_because: "It delivers easier maintenance without smaller parts. The file stays near 4000 lines, so a reader still holds five interleaved modes in one scroll, and the next mode is as invasive to add as the last one was."
  - option: "Split the viewer into real sibling files loaded by script and link tags"
    rejected_because: "ADR-0001 forbids it. A published Artifact is a single file under a CSP that blocks every external request, and export_artifact.py inlines the data because sibling files do not survive publishing."
  - option: "Generate index.html into the bundle at migrate time and never commit it"
    rejected_because: "/plugin install runs no build, so an installed plugin would ship no viewer at all. migrate_bundle.py and export_artifact.py both read the plugin's own viewer/index.html as an existing file."
  - option: "Adopt a bundler such as esbuild or Vite"
    rejected_because: "It adds a Node toolchain to a repository of prose, Python scripts, and one HTML file. Concatenation of ordered parts is the whole requirement, and PEP 723 already covers every other script here."
forces:
  - "ADR-0001: the published viewer is one self-contained file under a CSP that blocks every external request."
  - "The install surface is /plugin install and nothing else, with no agents, no hooks, and no MCP servers. Install runs no build."
  - "export_artifact.py rewrites the viewer by verbatim string replacement and hard-errors with not-found-verbatim when the literal text moves. Any refactor can break publishing silently until somebody publishes."
  - "migrate_bundle.py copies the plugin's viewer/index.html into every bundle unconditionally, so the built file must exist in the plugin."
  - "A generated file that is also committed goes stale the moment somebody edits the output instead of the parts."
related_decisions:
  - { type: depends-on, target: ADR-0001 }
  - { type: is-related-to, target: ADR-0018 }
  - { type: is-related-to, target: ADR-0019 }
  - { type: is-related-to, target: ADR-0006 }
related_concerns: [C3, C6]
history:
  - { state: tentative, date: 2026-08-24 }
  - { state: decided, date: 2026-08-24 }
maps_to:
  context: cobuilder-packaging
  modules: [plugins/cobuilder-artifact/viewer/index.html, plugins/cobuilder-artifact/scripts/export_artifact.py, shared/migrate_bundle.py]
  rule: "viewer/index.html is a build artifact compiled from viewer/src/. An engineer edits a part, never the output, and a test fails when the committed output does not equal a fresh build."
delivers:
  capability: "An engineer changes one view mode by opening one file of a few hundred lines, instead of finding it inside 3872 lines of one function scope."
  benefit: "The cost of a viewer change stops scaling with the size of the whole viewer. A sixth mode becomes a new part plus one registry entry, rather than another pass of scattered predicate calls."
  beneficiary: [developer, validator-agent]
related:
  - "docs/architecture/contexts/cobuilder-packaging/boundary.yaml"
  - "docs/architecture/designs/maintainable-viewer/goal.json"
---

# ADR-0020 — Viewer parts and an author-time build

## Context

`viewer/index.html` is the largest authored file in the repository. Measured
on 2026-08-24:

| Property | Value |
|---|---|
| Total lines | 4917 |
| CSS | 881 lines |
| JavaScript | 3872 lines, one IIFE, 145 functions |
| Mode-predicate calls | 50, across five view modes |
| `innerHTML` string assignments | 45 |
| `<template>` elements | 0 |
| The `empty-card` fragment | repeated 16 times, `empty-detail` 18 times |
| Longest functions | 231, 222, and 219 lines |

The five view modes do not live in five places. They interleave. A single
function, `renderLevelRail`, carries the same rail-item template four times
and differs only in the data behind it. Three separate functions of over
200 lines each render main content for one mode apiece.

Two facts have kept this file whole. `/plugin install` runs no build step,
so whatever the plugin ships is what runs. And ADR-0001 records that a
published Artifact is one file under a CSP that blocks every external
request, which is why `export_artifact.py` inlines the data rather than
loading it. A viewer split into sibling files loaded at runtime cannot be
published.

A third fact makes the situation worse rather than merely awkward.
`export_artifact.py` edits the viewer by verbatim string replacement and
fails with a not-found-verbatim error when a literal moves. The publish
pipeline is coupled to exact source text inside the viewer. Nobody sees
that coupling until a publish fails, so the file resists refactoring by
punishing it late.

Two regressions this month show the cost. A `[hidden]` attribute was
defeated by a `display:flex` rule 100 lines away, and the caption it was
meant to hide stayed visible in four of five modes. Separately, the
`#adr-sheet` and `#assessment-sheet` markup blocks were deleted while
their CSS and every JavaScript reference survived, so `renderSheetVisibility`
threw on every call. Neither defect is exotic. Both are what a 4917-line
file with no seams produces.

## Options considered

1. **Remove the duplication in place, and keep one hand-edited file.**
   A template helper and a mode registry would cut real repetition, and
   the convention would survive untouched. Rejected because it delivers
   half the ask. The file stays near 4000 lines, a reader still holds
   five interleaved modes in one scroll, and "smaller parts" is not
   delivered at all.

2. **Split into sibling files loaded by `<script>` and `<link>`.**
   Rejected. ADR-0001 already settled this. A published Artifact has no
   sibling files.

3. **Generate the viewer into the bundle at migrate time, and commit no
   output.** The cleanest source tree of the four. Rejected because
   `/plugin install` runs no build, so an installed plugin would carry no
   viewer. Both `migrate_bundle.py` and `export_artifact.py` read the
   plugin's own `viewer/index.html` as a file that already exists.

4. **Adopt a bundler.** Rejected. It puts a Node toolchain into a
   repository of prose, Python scripts, and one HTML file, to do a job
   that is ordered concatenation.

5. **Author-time build with a committed output.** Chosen.

## Decision

The viewer is authored as ordered parts under
`plugins/cobuilder-artifact/viewer/src/`. `build_viewer.py` concatenates
them into `plugins/cobuilder-artifact/viewer/index.html`, which stays
committed and stays the file that ships.

**Build-free is narrowed, not abandoned.** The property that matters is
that no build runs at install and no build runs in the browser. Both hold.
What ends is build-free authoring, which is the half that has been paying
for itself in defects rather than in simplicity.

**The output is guarded, not trusted.** A committed generated file goes
stale the moment somebody edits the output. A test rebuilds from the parts
and fails when the result differs from the committed file. That test is
the whole reason this arrangement is safe.

**The exporter seam becomes declared.** `export_artifact.py` stops
matching incidental literals and matches named markers that the parts
emit on purpose. The coupling between the viewer and the publish pipeline
becomes a stated contract rather than an accident of formatting.

**Out of scope.** This record decides the packaging of the viewer source
and the guard on its output. It does not decide the part boundaries, the
template mechanism, or the shape of the mode registry. Those belong to the
`maintainable-viewer` design, which is deliberately deferred and sits in
the backlog as four planned epics.

## Consequences

- **Positive:** A view mode becomes one file of a few hundred lines. A
  sixth mode is a new part plus one registry entry.
- **Positive:** The publish coupling stops being invisible. A moved marker
  fails a test instead of failing a publish.
- **Constraint introduced:** `viewer/index.html` is a build artifact
  compiled from `viewer/src/`. An engineer edits a part, never the output,
  and a test fails when the committed output does not equal a fresh build.
- **Negative / accepted:** A generated file is committed, so every viewer
  change shows a large diff in the output beside a small diff in a part. A
  reviewer must learn to read the part and ignore the output.
- **Negative / accepted:** An engineer who edits `index.html` directly
  loses that edit at the next build. The guard test converts the loss into
  a failure, but it cannot prevent the mistake.
- **Negative / accepted:** One more script to maintain, and one more test
  that must run before the viewer is trusted.

## Value delivered

- **New capability:** An engineer changes one view mode by opening one
  file of a few hundred lines, instead of locating it inside 3872 lines of
  a single function scope.
- **Benefit:** The cost of a viewer change stops scaling with the size of
  the whole viewer.
- **Beneficiary:** developer, validator-agent.

## Maps to

Context `cobuilder-packaging`, modules
`plugins/cobuilder-artifact/viewer/index.html`,
`plugins/cobuilder-artifact/scripts/export_artifact.py`,
`shared/migrate_bundle.py`. See
`docs/architecture/contexts/cobuilder-packaging/boundary.yaml`.

## Unverified before implementation

The part boundaries in the backlog are drawn from the file's own 35 banner
comments and have not been tested by an actual split. A section that reads
as self-contained may still close over state defined elsewhere in the
IIFE, because everything currently shares one scope. The first epic exists
to find that out.

No measurement yet supports the claim that ordered concatenation is
sufficient. If any part must be reordered at build time rather than
concatenated in filename order, this record needs revisiting.
