---
# --- doc-gardener required frontmatter ---
title: "ADR-0022 — Simulate paths to close the open set, from the common ancestor, and show one validated path"
status: active
type: architecture
last_verified: 2026-09-02
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0022
source_pr: null
name: "Simulate paths to close the open set, from the common ancestor, and show one validated path"
state: decided
groups: [viewer, review, data-model]
approved_by: ""
problem: "A team carries tens of open pull requests. No surface answers the question a reviewer actually holds, which is not how to review one change but in what order the whole set can close. The record index resolves five kinds of join and none between two pull requests. Simulating that order against the default branch gives a confident wrong answer whenever an open pull request restructures the tree, because the default branch already carries whatever merged before."
decision: "A mode in the pr plugin simulates several paths to close the whole open set, always against the common ancestor of the open branches. It replays the best one or two with git on a scratch worktree, counts the real conflicts, and promotes the survivor. The viewer shows one validated path, leading with the state the reviewer would have and the pull requests the path cannot carry, and it computes nothing."
alternatives:
  - option: "Simulate against the default branch as it stands today"
    rejected_because: "It inverts the order whenever an open pull request restructures the tree. Measured on this repository: with all seventeen pull requests open the base is 0c099be, where commands/, scripts/ and skills/ still exist, and five open pull requests write into exactly the three directories that pull request 11 deletes. A run against master put the restructure first and produced a confident wrong answer rather than no answer."
  - option: "A region walk: one keypress per contested hunk, over a set the reviewer names"
    rejected_because: "The first draft of this record. It made the reviewer do the machine's work one hunk at a time, over a set they had to assemble themselves. The region computation survives inside the simulation as evidence and stopped being a reviewer-facing step."
  - option: "Show every simulated path side by side, and let the reviewer compare"
    rejected_because: "It returns the reviewer to the work the mode exists to remove. One validated path is shown, the alternatives are visible and unreachable, and opening the recommendation unlocks them with the reason each lost."
  - option: "Describe each path by its mechanics: which pull requests, in which order, on which paths"
    rejected_because: "A reviewer decides on the outcome, not on the machinery. The surface states what they would have when the path is done, then one line per pull request saying what it contributes, and the order sits underneath."
  - option: "Rank paths by simulation alone, with no git step"
    rejected_because: "A simulation from records cannot see a textual conflict, so it cannot tell an ordering that works from one that only looks like it does. Replaying the top candidates is what makes the recommendation something to stand behind."
  - option: "Hold a pull request that cannot merge out of the surface entirely"
    rejected_because: "A path never carries every open pull request, and the ones it drops are the ones a reviewer most needs to see. A superseded branch and an unresolvable conflict are different findings, and each is shown on the front page with two or three ways out."
  - option: "Compute the paths in the browser and render them live"
    rejected_because: "The browser cannot run git, so it cannot replay anything, and ADR-0001's content policy blocks it from fetching the evidence."
  - option: "Build the mergeable-slice computation from scratch as the product"
    rejected_because: "Systems that precompute mergeable slices already exist. The narrative and the choice between paths are the parts they do not offer, so the git step keeps a narrow interface and one of those systems can replace it."
  - option: "Ship a hook so the mode starts itself on a pull request event"
    rejected_because: "The install surface is /plugin install and nothing else, with no agents, no hooks and no MCP servers. The adopting repository supplies the trigger with a workflow or a scheduled run."
forces:
  - "The default branch already carries whatever merged before, so it is the wrong baseline for a set of branches that all predate it."
  - "ADR-0001 holds the viewer to one self-contained file under a content policy that blocks every external request. The browser cannot fetch, and it cannot run git."
  - "Field coverage across this repository's timeline is uneven: touched 14 of 14, narrated levels 8, cached diffs 8, intent 4, assessment 4, ledger lines 0."
  - "8 of 12 pull requests reaching a reviewer here carry no description, so a surface built on authored intent alone draws empty panes."
  - "A team's own auto-merge rules already handle the simple pull requests, and this design does not define those rules."
  - "ADR-0020 names viewer/index.html the repository's largest maintenance problem, and it is decided and not executed."
  - "ADR-0019 fixed the ledger vocabulary at comment, reply, and state, and fold_threads skips an unrecognised line."
  - "The install surface ships no hooks, so the mode cannot start itself."
related_decisions:
  - { type: depends-on, target: ADR-0001 }
  - { type: depends-on, target: ADR-0019 }
  - { type: is-related-to, target: ADR-0018 }
  - { type: is-related-to, target: ADR-0020 }
related_concerns: [C3, C6]
history:
  - { state: tentative, date: 2026-09-01 }
  - { state: decided, date: 2026-09-01, note: "First draft: a terminal-side proposer, a region walk of contested hunks, and a partition the reviewer corrects." }
  - { state: decided, date: 2026-09-02, by: bjornslib, note: "Revised in place before approval, after six rounds of design review against a working prototype. The terminal-computes-viewer-renders boundary is unchanged. The region walk, the reviewer-named set, and the union-find partition are gone, and the common-ancestor baseline is new. Revised rather than superseded because this record was never approved, never shipped, and nothing depends on it." }
maps_to:
  context: cobuilder-packaging
  modules: [plugins/pr, shared/build_index.py, shared/ledger.py, plugins/artifact/viewer/index.html]
  rule: "A path is simulated against the common ancestor of the open branches, never against the default branch, and the viewer renders the result without computing any part of it."
delivers:
  capability: "A reviewer opens one page and sees the state they would have if the whole open set closed, the order that gets there, the pull requests that cannot come along, and the evidence that a git replay actually held."
  benefit: "Review stops being a queue of unrelated diffs and becomes one decision about an order. The reason for that order survives as a record rather than as somebody's memory."
  beneficiary: [developer, operator, the-business]
related:
  - "docs/architecture/designs/review-flight-deck/goal.json"
  - "docs/architecture/designs/review-flight-deck/flightdeck-prototype.html"
---

# ADR-0022 — Simulate paths to close the open set, from the common ancestor, and show one validated path

## Context

The viewer reviews one pull request at a time. Previous, next, a strip of queue
dots, four levels down the left rail. That shape reads one change well, and it
answers nothing about a set.

A team carrying tens of open branches asks a different question. Not how to
review one change, but in what order the whole set can close. The relationships
that would answer it exist nowhere: the record index resolves five kinds of join,
and none of them is between two pull requests.

Six isolated exploration frames and a separate critic pass produced the first
draft of this record: a terminal-side proposer that computed contested regions,
and a reviewer who walked them one keypress at a time over a set they named
themselves. Six rounds of review against a working prototype replaced everything
above the boundary. Three measurements decided what replaced it.

**The baseline decides the order, and the obvious baseline is wrong.** The first
recommendation simulated against `master`. Master already carried the five-plugin
split, so the restructure looked like a prerequisite and the earlier work looked
like follow-up. With all seventeen pull requests open the base is `0c099be`,
where `commands/`, `scripts/` and `skills/` still exist. Five open pull requests
write into exactly those three directories, and pull request 11 deletes all
three. The correct order is the reverse. Four renames in this repository's
history make the chain checkable: `0c099be` carries the three root directories;
pull request 3 moves `.odyssey/` to `.prodyssey/`; commit `6e784e5` moves the
three directories into `plugins/cobuilder-*/`; pull requests 17 and 18 drop the
prefix.

**A path never carries the whole set.** In the worked scenario, ten of twelve
pull requests fit one path. Pull request 17 is superseded by 18 on the same head
branch, which no pull-request list shows. A second is held out by a conflict a
merge cannot resolve, where both sides rewrote the same hunk in opposite
directions.

**Simulation alone cannot tell a working order from a plausible one.** A path
derived from goal files, epics, boundary rules and districts is a hypothesis. The
git replay is what turns it into a recommendation.

The product is therefore not a review aid for a set somebody names. It is a set
of possible paths to close every open pull request, and that separates into three
questions a reviewer asks in order. What would I have when this is done. What
does each pull request contribute. Do the merges physically hold, and in what
order.

## Options considered

1. **A region walk over a named set.** The first draft of this record. It moved
   the computation off the browser, which was right, and it left the reviewer
   doing the machine's work one hunk at a time. The region arithmetic survives as
   evidence inside a simulated path.
2. **Simulate against the default branch.** The obvious choice, and it produced a
   confidently inverted order on the first run. Rejected, and recorded as an abort
   condition on the design, because it fails in no visible way at all.
3. **Show every path side by side.** Returns the comparison work to the reviewer.
4. **Describe paths by their mechanics.** A reviewer decides on the outcome. The
   mechanics move underneath it.
5. **Simulate and stop, with no git step.** Cheaper, and it cannot distinguish an
   order that works from one that reads well.
6. **Simulate from the common ancestor, replay the top candidates with git, and
   render one validated path (chosen).**

## Decision

A mode in the `pr` plugin runs on a pull request event.

It reads the open set, less whatever the team's own auto-merge rules already
handled, and calls `/pr:generate` for any pull request with no description. It
simulates at least three paths to close the set, always against the common
ancestor of the open branches. It replays the best one or two with git on a
scratch worktree, counts the real conflicts, and promotes the survivor.

It writes the result as a derived projection in the bundle. The viewer renders
it: the state the reviewer would have first, then what each pull request
contributes, then the merge chain as its own evidence, then what the replay could
not check. Pull requests the path cannot carry appear on the front page, each
with the kind of block named and two or three ways out.

The reviewer accepts a path. That records a decision, and a runner performs it.
Where the runner sends its merges is ADR-0023.

The boundary from this record's first draft is unchanged. The relationship is
computed terminal-side and written as a projection, and the viewer renders it and
computes nothing.

Out of scope: defining the team's auto-merge rules, supplying the trigger, and
any computation inside the browser.

## Consequences

- **Positive:** the reviewer answers one question about an order rather than
  reading every diff in full, and the answer carries the evidence that a replay
  held.
- **Positive:** the surface names what it cannot do. A blocked pull request, an
  unreplayed bundle, and a missing description are all visible rather than
  absent.
- **Positive:** the viewer gains a renderer and no computation, so this design
  does not enlarge `viewer/index.html` before ADR-0020's split has run.
- **Constraint introduced:** a path is simulated against the common ancestor of
  the open branches, never against the default branch, and the viewer renders the
  result without computing any part of it.
- **Negative:** the replay is a snapshot. A push after the run invalidates it, and
  the run does not watch for one.
- **Negative:** the mode cannot start itself, because the install surface ships no
  hooks. A workflow or a scheduled run in the adopting repository supplies the
  trigger.
- **Negative:** a wrong recommendation is the first thing the reviewer reads, and
  nothing here measures whether a proposed order anchors them.
