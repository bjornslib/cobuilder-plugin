---
# --- doc-gardener required frontmatter ---
title: "ADR-0023 — Execute an accepted path onto integration branches, never onto the default branch"
status: active
type: architecture
last_verified: 2026-09-02
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0023
source_pr: null
name: "Execute an accepted path onto integration branches, never onto the default branch"
state: decided
groups: [review, execution]
approved_by: ""
problem: "Accepting a path commits a team to merging ten pull requests in a stated order. Executing that onto the default branch makes the first merge irreversible and the whole path unabandonable, and it gives the reviewer no tree to inspect between one bundle and the next. It also makes the runner the first thing in this plugin family that writes to a shared branch."
decision: "A runner reads an accepted path from the ledger and merges each bundle onto its own integration branch, built from the previous bundle's branch and rooted at the common ancestor. The default branch receives one pull request at the end, from the last bundle's branch. The reviewer commits to the path once, and separately chooses the pace: all bundles in one run, or one bundle with a checkpoint after each."
alternatives:
  - option: "Merge each bundle straight onto the default branch"
    rejected_because: "The first merge is irreversible, so a path that turns out wrong at bundle two has already changed the branch everybody works from. Abandoning it becomes a revert exercise instead of a branch deletion."
  - option: "One integration branch for the whole path, with every bundle merged into it"
    rejected_because: "It is abandonable, and it gives the reviewer nothing to check out between bundles. A branch per bundle is the checkpoint, and it costs one branch each."
  - option: "Open a pull request per bundle onto the default branch"
    rejected_because: "It multiplies the reviews the path exists to collapse, and it puts a partially applied path in front of everyone before the reviewer has seen the tree."
  - option: "Let the reviewer choose the pace on every bundle, one at a time"
    rejected_because: "It reopens the decision the reviewer already made. They commit to the path once, and the pace is one setting for the run, not a prompt per bundle."
  - option: "Apply the path with a rebase of each branch onto the growing integration branch"
    rejected_because: "It rewrites other people's branches. A merge leaves every author's checkout valid, and this design never touches a branch it does not own."
forces:
  - "The default branch is what everybody works from, so a partially applied path there is a shared cost."
  - "A path is a hypothesis validated by a replay, and a replay is a snapshot. The tree the runner produces can differ from the tree the replay produced."
  - "A checkpoint is only useful if it is a real tree somebody can check out and read."
  - "Rewriting a contributor's branch invalidates their checkout, and no author asked for it."
  - "This runner is the first thing in the plugin family that writes to a remote. Everything before it wrote into the bundle or the ledger."
  - "The install surface ships no hooks, so the runner is supplied by the adopting repository, not by the plugin."
related_decisions:
  - { type: depends-on, target: ADR-0022 }
  - { type: depends-on, target: ADR-0019 }
related_concerns: [C3, C6]
history:
  - { state: tentative, date: 2026-09-02 }
  - { state: decided, date: 2026-09-02 }
maps_to:
  context: cobuilder-packaging
  modules: [plugins/pr, shared/ledger.py]
  rule: "A runner merges a bundle onto its own integration branch and never onto the default branch. Abandoning an accepted path is a branch deletion, not a revert."
delivers:
  capability: "A team accepts a whole merge path in one decision, and still stops after any bundle to check out the resulting tree before releasing the next."
  benefit: "Committing to an order stops being a risk. A path that turns out wrong costs three branch deletions, and the branch everybody works from never carried it."
  beneficiary: [developer, operator]
related:
  - "docs/architecture/designs/review-flight-deck/goal.json"
---

# ADR-0023 — Execute an accepted path onto integration branches, never onto the default branch

## Context

ADR-0022 decided how a path is simulated, validated and shown. Accepting one
commits a team to merging ten pull requests in a stated order. Something has to
carry that out, and where it sends its merges decides whether the decision is
reversible.

Two facts make the default branch the wrong target.

**A path is a hypothesis with a replay behind it, not a proof.** The replay runs
on a scratch worktree against recorded branch heads. A push after the run
invalidates it, and the tree the runner produces can differ from the tree the
replay produced. The first merge is where that shows up.

**A checkpoint has to be a real tree.** The reviewer's stated preference is to
commit to a path once and then control the pace, merging one bundle and reading
the result before releasing the next. That is only meaningful if the intermediate
state is somewhere they can check out.

The worked scenario gives the shape. Ten pull requests fall into three bundles:
five that finish the single plugin, one that splits the repository into five
plugins, and four that name and fix the new structure.

## Options considered

1. **Merge each bundle onto the default branch.** Simplest to implement, and it
   makes bundle one irreversible before bundle two is attempted.
2. **One integration branch for the whole path.** Abandonable, and it offers no
   checkpoint between bundles.
3. **A pull request per bundle onto the default branch.** Multiplies the reviews
   the path exists to collapse.
4. **Rebase each branch onto the growing integration branch.** Rewrites branches
   this design does not own.
5. **One integration branch per bundle, chained (chosen).**

## Decision

A runner reads an accepted path from the ledger and merges each bundle onto its
own integration branch. Each branch is built from the previous one, and the first
is built from the common ancestor:

```
0c099be  ──▶  flightdeck/<path>/1-<slug>      bundle 1
              flightdeck/<path>/2-<slug>      bundle 2, from bundle 1
              flightdeck/<path>/3-<slug>      bundle 3, from bundle 2
                       │
                  default branch              one pull request, at the end
```

The reviewer commits to the path once, and separately chooses the pace. One
bundle at a time is the default: the runner merges a bundle, stops, and the
reviewer checks out that branch before releasing the next. All at once runs the
three merges and opens the pull request.

The runner never rebases, amends, or force-pushes a branch it does not own.

Out of scope: merging the final pull request, which stays a human action on the
default branch under whatever rules that repository already has.

## Consequences

- **Positive:** abandoning an accepted path is three branch deletions. The branch
  everybody works from never carried any of it.
- **Positive:** every checkpoint is a real tree with a name, so reading the
  intermediate state needs no special tooling.
- **Constraint introduced:** a runner merges a bundle onto its own integration
  branch and never onto the default branch. Abandoning an accepted path is a
  branch deletion, not a revert.
- **Negative:** a path of N bundles leaves N branches to clean up, and nothing
  here deletes them.
- **Negative:** the integration branches drift from the default branch while the
  path runs. A long pause between bundles reintroduces the conflicts the path was
  ordered to avoid.
- **Negative:** this is the first remote write in the plugin family, and the
  runner is supplied by the adopting repository rather than by the plugin, so its
  credentials and its permissions are outside this design.
