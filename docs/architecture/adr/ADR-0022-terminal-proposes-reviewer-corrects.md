---
# --- doc-gardener required frontmatter ---
title: "ADR-0022 — A terminal-side proposer for a multi-pull-request review, and a viewer that only renders it"
status: active
type: architecture
last_verified: 2026-09-01
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0022
source_pr: null
name: "A terminal-side proposer for a multi-pull-request review, and a viewer that only renders it"
state: decided
groups: [viewer, review, data-model]
approved_by: ""
problem: "A reviewer with several pull requests open holds the relationship between them in their head. The viewer reviews one pull request at a time, and the record index resolves five kinds of join but none between two pull requests. Every surface that could show the relationship has to compute it first, and the browser can neither run git nor fetch anything, because ADR-0001 holds the viewer to one self-contained file under a content policy that blocks every external request."
decision: "Compute the relationship terminal-side. A mode in the pr plugin fetches the selected branches, derives an ordered list of contested regions and a proposed partition of the set, and writes both as a derived projection. The reviewer walks the regions and corrects the partition, and every act appends one line to the ledger through shared/ledger.py with direct file access. The viewer renders the proposal and the recorded calls, and computes no relationship of its own."
alternatives:
  - option: "The Gang Rail: shift-click the queue dots and stack one narration pane per selected pull request down the existing four levels"
    rejected_because: "It is the cheapest option and it only rearranges what the reviewer must read. It does no work on the reviewer's behalf, and its stacked panes are empty for both open pull requests, which carry no narration. Its multi-select is kept as the mechanic for correcting a proposal."
  - option: "Contested Subjects: swap the level rail for cards of shared repo nouns, quoting each pull request verbatim, with a SILENT row where a pull request said nothing"
    rejected_because: "It renders evidence more honestly than any other option and it still waits for the reviewer to assemble the set first. Its SILENT-row rule is kept as a rendering rule, because absence must never render as agreement."
  - option: "The Claims Docket: one row per machine claim with its rule, its inputs, and a computed or unassessable basis"
    rejected_because: "Ten of fourteen pull requests carry no authored intent, so most rows are empty, and the build is four new subsystems, most of them inside viewer/index.html. Its unassessable row is kept, because a blind spot must appear on the record rather than be absent from it."
  - option: "Use shared-path overlap from the touched map as an evidence level"
    rejected_because: "86 of the 91 possible pairs share a path prefix, and (root) alone is shared by 12 of 14 pull requests. Presence of overlap is the base rate in this repository, not a finding."
  - option: "Compute the relationship in the browser and render it live"
    rejected_because: "The browser cannot run git, so it cannot see a textual conflict, and ADR-0001's content policy blocks it from fetching the evidence."
  - option: "Record the call through the existing POST /feedback endpoint, as the comments drawer does"
    rejected_because: "That path works only under serve_bundle.py --allow-write. Plain http.server returns 404 and a published Artifact blocks the request, and both fall back to browser storage with a promised sync that nothing implements."
  - option: "Rank the correction reasons by the reviewer's own precedent from day one"
    rejected_because: "The ledger is 0 bytes. History improves the reason ranking and does not produce the partition, so the proposer works without it and the precedent layer waits for rows."
forces:
  - "ADR-0001 holds the viewer to one self-contained file under a content policy that blocks every external request. The browser cannot fetch, and it cannot run git."
  - "Two of the three chosen evidence levels yield no pair today. adr_to_pull_request and epic_to_pull_request each hold one pull request per key, so neither produces an edge. Grouping epics by their design produces two."
  - "Field coverage across the 14 timeline entries is uneven: touched 14, narrated levels 8, cached diffs 8, intent 4, assessment 4, ledger lines 0."
  - "Neither open pull request has a local branch in this checkout, so git merge-tree needs a fetch before it can report anything."
  - "ADR-0020 names viewer/index.html the repository's largest maintenance problem, and it is decided and not executed."
  - "ADR-0019 fixed the ledger vocabulary at comment, reply, and state, and fold_threads skips an unrecognised line."
  - "The install surface is /plugin install and nothing else, with no agents, no hooks, and no MCP servers."
related_decisions:
  - { type: depends-on, target: ADR-0001 }
  - { type: depends-on, target: ADR-0019 }
  - { type: is-related-to, target: ADR-0018 }
  - { type: is-related-to, target: ADR-0020 }
related_concerns: [C3, C6]
history:
  - { state: tentative, date: 2026-09-01 }
  - { state: decided, date: 2026-09-01 }
maps_to:
  context: cobuilder-packaging
  modules: [plugins/pr, shared/build_index.py, shared/ledger.py, plugins/artifact/viewer/index.html]
  rule: "A pull-request relationship is computed terminal-side and written as a projection. The viewer renders it and never computes one."
delivers:
  capability: "A reviewer receives an ordered plan for a set of pull requests before they open any of them, and records one call per pull request that names the set it was judged against."
  benefit: "Review work drops from reading every diff in full to answering one question per contested region, and the reason for a grouping survives as a record rather than as a memory."
  beneficiary: [developer, operator]
related:
  - "docs/architecture/designs/review-flight-deck/goal.json"
---

# ADR-0022 — A terminal-side proposer for a multi-pull-request review, and a viewer that only renders it

## Context

The viewer reviews one pull request at a time. Previous, next, a strip of queue
dots, four levels down the left rail. That shape reads one change well. It
answers nothing about a set.

A reviewer holding five open pull requests carries a different question: do any
of these fight each other, and should any of them be one review instead of two.
GitHub answers a narrower version through stacked pull requests, where the
author declares a parent-child chain in advance. A reviewer's set is assembled
after the fact, out of work several people opened without coordinating.

Six isolated exploration frames produced six surfaces for that question. A
separate critic pass measured each one against the committed bundle. Three
measurements decided this record.

**The browser cannot see a conflict.** ADR-0001 holds the viewer to one
self-contained file under a content policy that blocks every external request.
The browser cannot run git and it cannot fetch the evidence. Any surface that
draws a relationship must be handed one.

**Two of the three chosen evidence levels are empty.** `adr_to_pull_request`
holds one pull request per ADR and `epic_to_pull_request` holds one per epic, so
neither yields a single pair. Grouping epics by their design yields two.
`git merge-tree` needs both branch heads, and this checkout holds `master` and
one working branch.

**Overlap is the base rate.** 86 of the 91 possible pairs share a path prefix.
`(root)` alone is shared by 12 of 14 pull requests. Presence of overlap carries
no information here. Only magnitude and specificity do.

## Options considered

1. **The Gang Rail.** Shift-click the queue dots, stack one narration pane per
   selected pull request down the four existing levels. Roughly thirty lines to
   start, no new file, no server change. It rearranges what the reviewer must
   read and does no work for them, and its panes are empty for both open pull
   requests, which carry no narration.

2. **Contested Subjects.** Swap the level rail for cards of shared repo nouns,
   quoting each pull request verbatim with the field stamped on it, and a SILENT
   row of equal weight where a pull request said nothing. It is the most honest
   rendering of uneven evidence in the set, and it still waits for the reviewer
   to assemble the set before anything happens.

3. **The Claims Docket.** One row per machine claim, carrying the rule that
   produced it and whether it could be computed at all. Its uncomputable row is
   a genuinely good idea. Ten of fourteen pull requests carry no authored
   intent, so most rows are empty, and the build is four subsystems, most of
   them inside the file ADR-0020 already names as the largest maintenance
   problem.

4. **The Braid and The Cut, taken together (chosen).** Both do work before the
   reviewer arrives. The Braid re-cuts the set by region, so a region only one
   pull request writes never becomes a stop. The Cut proposes a partition of the
   set into review units and asks the reviewer to correct it, on the ground that
   correcting a wrong grouping is a cheaper judgement than building a right one.
   Neither needs the viewer, and the work they do is exactly the work the
   browser cannot perform.

## Decision

Compute the relationship terminal-side and render it in the viewer.

A mode in the `pr` plugin takes a set of pull request numbers, fetches their
branches, and derives two things: an ordered list of contested regions, where a
region is a file and a line span more than one pull request writes, and a
proposed partition of the set into review units. It writes both as a derived
projection in the bundle.

The reviewer walks the regions with one keypress each, and corrects the
partition with three gestures. Every act appends one line to the ledger through
`shared/ledger.py`, with direct file access and no HTTP request. A projection
folds those lines into one recorded call per pull request, and into the
pull-request-to-pull-request join the record index does not have.

The viewer renders the proposal and the recorded calls. It computes no
relationship. A copy served without a write path renders read-only and says so,
rather than accepting a call it cannot keep.

Out of scope: every GitHub write, the precedent engine and its ranked reasons,
any conflict computation inside the browser, and the design-level join fix,
which belongs to the `inflight-record-store` design.

## Consequences

- **Positive:** the work the browser cannot do moves to where it can be done,
  and the deck stops depending on a write path that fails on two of three
  serving modes. A reviewer answers one question per contested region instead of
  reading every diff in full.
- **Positive:** the viewer gains a renderer and no computation, so this design
  does not enlarge `viewer/index.html` before ADR-0020's split has run.
- **Constraint introduced:** a pull-request relationship is computed
  terminal-side and written as a projection. The viewer renders it and never
  computes one.
- **Negative:** a wrong proposal is the first thing the reviewer reads, and an
  untouched bracket is recorded as an accepted decision. The mechanic that makes
  the correction cheap is the same one that can manufacture agreement.
- **Negative:** the proposer gains a network step. It must fetch a branch before
  it can report a textual conflict, and a cohort whose branches cannot be
  fetched gets an empty proposal.
- **Negative:** two new ledger line kinds sit outside the vocabulary ADR-0019
  fixed, so each needs its own projection, and `fold_threads` ignores both.
- **Open:** folding region verdicts with union-find is transitive. Grouping A
  with B and B with C asserts that A and C belong together, which no reviewer
  said. Either label the transitive edge as derived, or stop at pairwise edges.
