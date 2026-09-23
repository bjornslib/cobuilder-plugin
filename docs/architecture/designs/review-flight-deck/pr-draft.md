## Problem

A team carries tens of open pull requests at once. Every surface they have
reviews one change at a time, so nobody can answer the question they actually
hold: in what order can this whole set close. GitHub's stacked pull requests
answer a narrower version, because a stack is a parent-child chain the author
declares in advance. The set a reviewer faces is whatever several people opened
without coordinating, and the relationships between those branches exist nowhere.

The team wants to get through pull request reviews with more ease. The bundle
already holds the goal files, epics, boundary rules and districts a first pass
could reason over, and the record index already resolves five kinds of join. A
relationship between two pull requests is the one join nobody has built.

## Why this approach

Simulate paths to close the whole open set, validate the best with git, and show
one.

On a pull request event the mode reads the open set, drops whatever the team's
auto-merge rules already handled, and gives any pull request with no description
one from `/pr:generate`. It simulates at least three paths **against the common
ancestor of the open branches**, replays the best one or two on a scratch
worktree, counts the real conflicts, and promotes the survivor.

The viewer leads with the state the reviewer would have if they accept, then one
line per pull request saying what it contributes, then the merge chain as its own
evidence. Pull requests the path cannot carry appear on the front page with the
kind of block named and a way out. The reviewer accepts a path once and chooses
the pace, and a runner merges each bundle onto its own integration branch.

The baseline is the load-bearing part. Simulating against the default branch
inverts the order whenever an open pull request restructures the tree, and it
does so with no visible failure. It did exactly that on the first run here: with
all seventeen pull requests open the base is `0c099be`, where `commands/`,
`scripts/` and `skills/` still exist, and five open pull requests write into the
three directories that pull request 11 deletes.

## Alternatives considered

- **Simulate against the default branch as it stands today** — rejected because it inverts the order whenever an open pull request restructures the tree, and it returns a well-formed confident answer rather than an error.
- **A region walk: one keypress per contested hunk, over a set the reviewer names** — rejected because it made the reviewer do the machine's work one hunk at a time, over a set they had to assemble themselves. The region arithmetic survives inside the simulation as evidence.
- **Show every simulated path side by side and let the reviewer compare** — rejected because it hands the comparison work back to the reviewer, which is the work the mode exists to remove.
- **Describe each path by its mechanics** — rejected because a reviewer decides on the outcome, not the machinery.
- **Simulate from the records and stop, with no git step** — rejected because a simulation cannot see a textual conflict, so it cannot tell an order that works from one that only reads well.
- **Hold a pull request that cannot merge out of the surface entirely** — rejected because a path never carries every open pull request, and the ones it drops are the ones a reviewer most needs to see.
- **Merge each bundle onto the default branch** — rejected because the first merge is irreversible, so a path that turns out wrong at bundle two has already changed the branch everybody works from.
- **Rebase every branch onto the growing integration branch** — rejected because it rewrites other people's branches, and none of those authors asked for it.
- **Ask the reviewer to approve each bundle as it comes** — rejected because it reopens a decision they already made.
- **Compute the paths in the browser and render them live** — rejected because the browser cannot run git, and ADR-0001's content policy blocks it from fetching the evidence.
- **Build the mergeable-slice computation from scratch as the product** — rejected because systems that precompute mergeable slices already exist. The narrative and the choice between paths are what they do not offer.
- **Ship a hook so the mode starts itself** — rejected because the install surface is `/plugin install` and nothing else.

## Out of scope

- Defining the team's auto-merge rules. The mode reads which pull requests those rules handled and takes no position on them.
- Merging the final pull request onto the default branch. That stays a human action under whatever rules the repository already has.
- Deleting the integration branches after a path completes.
- Any conflict computation inside the browser.
- The trigger. A workflow or a scheduled run in the adopting repository supplies it.
- Fixing the design-level join in `shared/build_index.py`. Deferred to the `inflight-record-store` design.

## Risks

- The replay is a snapshot taken against recorded branch heads. A push after the run invalidates it, and the run does not watch for one.
- A wrong recommendation is the first thing the reviewer reads. Nothing in this design measures whether a proposed order anchors them.
- Integration branches drift from the default branch while a path runs. A long pause between bundles reintroduces the conflicts the order was chosen to avoid.
- A path of N bundles leaves N branches behind, and nothing here deletes them.
- The runner is the first thing in this plugin family that writes to a remote. Its credentials and permissions sit outside this design.
- The mode cannot start itself. A repository that never wires the trigger gets a surface that runs only when somebody remembers to run it.

## How this was tested

Nothing is built. Two things were measured rather than assumed.

The region arithmetic ran in a scratchpad over the eight cached diff files, across
every pair of merged pull requests that shares an authored file. Cutting a set by
contested region reduces the reading surface for 27 of 27 pairs, from 0.00 to
0.41 of the total changed files.

The four structural renames the ordering rests on are verified against this
repository's history with `git ls-tree`: `0c099be` carries `commands/`,
`scripts/`, `skills/` and `viewer/`; commit `6e784e5` moves the first three into
`plugins/cobuilder-*/`.

## Where to focus

- Whether the common-ancestor baseline is stated strongly enough to survive an implementer who reaches for `HEAD`, because `HEAD` is what every other script in this repository reads.
- Whether one recommendation with the alternatives locked helps a reviewer or anchors them.
- Whether the integration-branch scheme is worth N branches per path.
- Whether the treatment of a pull request that cannot merge gives a reviewer enough to act, or only enough to worry.

The author flagged these parts as not fully understood:

- Whether a reviewer trusts a proposed order more than their own reading of the queue. This is the load-bearing claim and it rests on judgement.
- How a path should behave when a branch in it is pushed mid-rollout.
- Whether three simulated paths is the right number, or whether two is enough and four is noise.
- What a team's auto-merge rules look like in practice. The split shown in the prototype is invented.
