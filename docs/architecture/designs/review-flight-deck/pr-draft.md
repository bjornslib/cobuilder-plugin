## Problem

A reviewer with several pull requests open holds the relationship between them
in their head. The viewer reviews one pull request at a time, so nothing on
screen answers the question the reviewer actually carries: do any of these fight
each other, and should any of them be one review instead of two. GitHub's
stacked pull requests answer a narrower version, because a stack is a
parent-child chain the author declares in advance. The set a reviewer needs is
assembled after the fact, out of work several people opened without
coordinating.

The team wants to get through pull request reviews with more ease. The bundle
already holds the material a relationship could be computed from, and the record
index already resolves five other kinds of join. A pull-request-to-pull-request
relationship is the one join nobody has built.

## Why this approach

The machine proposes, and the reviewer corrects.

A terminal-side mode reads the selected pull requests, fetches their branches,
and computes two things: an ordered list of contested regions, where a region is
a file and a line span more than one pull request writes, and a proposed
partition of the set into review units. The reviewer walks the regions with one
keypress each, and corrects the partition with three gestures. Every keypress
appends one line to the ledger through `shared/ledger.py`, with direct file
access and no HTTP request. A projection folds those lines into one recorded
call per pull request, and into the missing pull-request-to-pull-request join.
The viewer renders the proposal and the recorded calls, and never computes them.

Three measurements decided the placement. The browser cannot run git and cannot
fetch, under the content policy ADR-0001 records, so it cannot see a textual
conflict at all. Two of the three chosen evidence levels yield no pair, because
`adr_to_pull_request` and `epic_to_pull_request` each hold one pull request per
key. And 86 of the 91 possible pairs share a path prefix, so overlap is the base
rate rather than a finding. Every surface that put the computation on screen was
solving a problem the screen is not allowed to solve.

## Alternatives considered

- **The Gang Rail: shift-click the queue dots and stack one narration pane per selected pull request down the existing four levels** — rejected because it is the cheapest option and it only rearranges what the reviewer must read. It does no work on the reviewer's behalf, and its stacked panes are empty for both open pull requests, which carry no narration. Its multi-select is kept as the mechanic for correcting a proposal.
- **Contested Subjects: swap the level rail for cards of shared repo nouns, quoting each pull request verbatim, with a SILENT row where a pull request said nothing** — rejected because it renders evidence more honestly than any other option and it still waits for the reviewer to assemble the set first. Its SILENT-row rule is kept as a rendering rule, because absence must never render as agreement.
- **The Claims Docket: one row per machine claim with its rule, its inputs, and a computed or unassessable basis** — rejected because ten of fourteen pull requests carry no authored intent, so most rows are empty, and the build is four new subsystems, most of them inside `viewer/index.html`. Its unassessable row is kept, because a blind spot must appear on the record rather than be absent from it.
- **Shared-path overlap from the touched map as an evidence level** — rejected because 86 of the 91 possible pairs share a path prefix, and `(root)` alone is shared by 12 of 14 pull requests. Presence of overlap is the base rate in this repository, not a finding.
- **Compute the relationship in the browser and render it live** — rejected because the browser cannot run git, so it cannot see a textual conflict, and ADR-0001's content policy blocks it from fetching the evidence.
- **Let the deck write to GitHub directly** — rejected because it needs a credential inside a page that also publishes as a Claude Artifact, and it breaks the rule that the viewer is a static page.
- **Record the call through the existing `POST /feedback` endpoint** — rejected because that path works only under `serve_bundle.py --allow-write`. Plain `http.server` returns 404 and a published Artifact blocks the request, and both fall back to browser storage with a promised sync that nothing implements.
- **Rank the correction reasons by the reviewer's own precedent from day one** — rejected because the ledger is 0 bytes. History improves the reason ranking and does not produce the partition, so the proposer works without it.
- **Take the input set from a live `gh pr list`** — rejected because it depends on the first epic of the `inflight-record-store` design, which is backlog and unbuilt.

## Out of scope

- Every GitHub write. No merge, no close, no comment, no label, no reviewer, no base retarget.
- The precedent engine, the reason ranking, and the counterfactual on a bracket boundary.
- Any conflict computation inside the browser.
- Renaming or restructuring the five existing view modes.
- Fixing the design-level join in `shared/build_index.py`. Deferred to the `inflight-record-store` design, which owns the pull-request entity gap.

## Risks

- The proposer must fetch the open branches before `git merge-tree` can say anything. This checkout holds `master` and one working branch, so a mode that has so far only read local git gains a network step.
- Folding region verdicts with union-find is transitive. A reviewer who groups A with B at one region and B with C at another has not said that A and C belong together, and the projection would assert it.
- Deferring the design-level join leaves the cold-start proposer with textual conflict as its only strong signal, and textual conflict needs a fetch. A cohort with no fetchable branch gets an empty proposal.
- A proposed partition accepted in silence records a decision the reviewer never examined. That is the mechanic's value and its danger in the same line.
- A region list is computed against the current head of each branch. A push invalidates it, and a stale stop list is worse than none, because it looks current.
- The approach does work before the reviewer arrives, which is the point, and it also means a wrong proposal is the first thing they read. An anchoring effect is likely and unmeasured.

## How this was tested

Nothing is built. The first check is the throwaway script named in the first
epic: parse the hunk headers already stored in the eight cached diff files and
print the region table for pull requests 11 and 12, which share 29 files. If the
stop list is not materially shorter than the shared-file list, the central claim
of the approach is false and the design stops.

## Where to focus

- Whether a proposed partition helps a reviewer or anchors them.
- The union-find transitivity rule, and whether the projection should stop at pairwise edges.
- Whether the viewer stays a pure renderer, with no relationship computed in the browser.

The author flagged these parts as not fully understood:

- Whether a stop list is materially shorter than a file list on a real cohort. Untested against anything.
- Whether a reviewer corrects a wrong grouping more readily than they build a right one. This is the load-bearing claim of the approach and it rests on judgement, not measurement.
- How a region list should behave when one branch of the set is pushed mid-review.
