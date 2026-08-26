---
name: cobuilder-full
title: "CoBuilder Orientation"
status: active
version: 1.0.0
description: >
  Routes requests across the four sibling plugins in the CoBuilder family.
  Use when the user asks "which cobuilder plugin do I need", "how do these
  plugins fit together", or "what does the cobuilder family do".
---

# CoBuilder Orientation

This umbrella plugin provides routing across the four specialized plugins in the
CoBuilder family. It executes no implementation procedures directly.

When a user asks for assistance, route them to the specific command or skill in
the table below.

---

## The four plugins and their modes

### 1. architect (self-only architecture governance)

Use for architecture analysis and design within the current repository checkout.
These six modes accept no foreign repository targets:

- **design** (`/architect:design`): Use before writing code to
  explore architectural options, challenge trade-offs, draft an ADR, and create
  a local branch.
- **review** (`/architect:review`): Use for security, architecture,
  and quality audits. Generates Technical and Founder HTML reports in
  `docs/architecture/review/`.
- **maintenance** (`/architect:maintenance`): Use to detect
  architectural drift and assess component health relative to prior review
  audits.
- **decisions** (`/architect:decisions`): Use to query, validate, and
  manage architecture decision records (ADRs) in `docs/architecture/adr/`.
- **describe** (`/architect:describe`): Use to map verified bounded
  contexts, dependency edges, and boundary enforcement rules in
  `docs/architecture/contexts/`.
- **debug** (`/architect:debug`): Use for architectural root-cause
  investigation when defects span multiple component boundaries.

### 2. pr (pull request lifecycle and history)

Use to narrate merged history or assess changes before pull requests open:

- **baseline** (`/pr:baseline`): Use to analyze a repository,
  detect technology stacks, map districts, and generate the initial bundle
  inventory.
- **generate** (`/pr:generate`): Use on a working branch before
  merging. Interviews the author, assesses the diff against districts and ADRs,
  and opens a pull request.
- **review** (`/pr:review`): Use to narrate already-merged
  pull requests into an interactive four-level story with scene art and
  diagrams.

### 3. artifact (bundle viewer, publishing, and presentation)

Use to inspect generated bundles or publish presentations:

- **view** (`/artifact:view`): Use to serve a generated bundle
  locally in the background using a lightweight HTTP server.
- **publish** (`/artifact:publish`): Use to export individual pull
  request levels or diagrams as self-contained Claude Artifacts.
- **collaborative presentation**: Use when an approval gate, architecture
  decision, or status readout requires an honest, self-contained HTML page
  presentation.

### 4. implement (vertical-slice feature implementation)

Use to build features from design into verified code:

- **implement** (`/implement:implement`): Use to build a feature one
  vertical slice at a time. Runs four approval gates, requires an epic technical
  solution design per epic, authors blind acceptance rubrics, and enforces
  independent validator scoring (>= 0.90 threshold).

---

## Routing guide

| User intent | Recommended plugin | Command or skill |
|---|---|---|
| Design a feature before writing code | `architect` | `/architect:design` |
| Audit security and code quality | `architect` | `/architect:review` |
| Track architectural health drift | `architect` | `/architect:maintenance` |
| Query or list ADRs | `architect` | `/architect:decisions` |
| Map bounded contexts and imports | `architect` | `/architect:describe` |
| Investigate multi-module defects | `architect` | `/architect:debug` |
| Initialize bundle for a repository | `pr` | `/pr:baseline` |
| Interview author and open a PR | `pr` | `/pr:generate` |
| Narrate merged pull requests | `pr` | `/pr:review` |
| View bundle locally in browser | `artifact` | `/artifact:view` |
| Export story level as Claude Artifact | `artifact` | `/artifact:publish` |
| Build feature in verified vertical slices | `implement` | `/implement:implement` |

Do not execute procedures from this skill. Direct the user to the matching
plugin.
