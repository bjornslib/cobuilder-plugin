---
# --- doc-gardener required frontmatter ---
title: "ADR-0027 — FlightDeck: one surface, two modes, a ledger-recorded merge-order recommendation"
status: active
type: architecture
last_verified: 2026-09-18
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0027
source_pr: null
name: "FlightDeck: one surface, two modes, a ledger-recorded merge-order recommendation"
state: decided
groups: [viewer, review, data-model, execution]
approved_by: ""
problem: "Two designs each claimed part of the same surface. react-viewer's E5 rebuilds the single-pull-request narration view in React and names it Flight deck. review-flight-deck computes a merge order for the whole open pull-request set and gives its surface the same name. Shipping them apart means building the pull-request surface twice. The two designs also left three questions open between them, because neither had read the other. Where can a merge-order simulation run, when a browser cannot invoke git. How does the ledger carry a proposal, an acceptance, and a real outcome without breaking ADR-0019's vocabulary. Who owns the open pull request as a record-index entity."
decision: "FlightDeck is one surface in cobuilder-viewer, and it replaces the Pull requests tab. It carries two modes. Single-pull-request mode ships first, at parity with today's four-level narration, diagrams, scene art, audio, and intent and assessment sheet. Multi-pull-request mode ships later in the same design. A reviewer selects open pull requests. A skill run or scheduled workflow then simulates candidate merge orders against the common ancestor with git merge-tree. It replays the best one or two on a scratch worktree and commits the result as data. The viewer only renders that data. The ledger records a merge-order proposal, its acceptance, and the post-merge tree hash as three subtypes of the existing state line kind. OpenPullRequest extends the single-pull-request type, and the shared types module defines it once."
alternatives:
  - option: "Ship react-viewer and review-flight-deck as two designs, sequenced"
    rejected_because: "That order would build the ordering UI against the viewer E5 is about to replace, then rebuild it in React. Someone would also resolve the name collision twice, once informally and once for real."
  - option: "Recompute the merge order live in the browser, on demand"
    rejected_because: "A browser cannot run git. ADR-0001's content policy also blocks it from fetching the evidence. That constraint is hard, not a preference, and it carries forward unchanged from ADR-0025."
  - option: "A scheduled GitHub Action recomputes the plan and commits it"
    rejected_because: "review-flight-deck's own record already resolved automatic triggering. A scheduled skill run or a workflow supplies it, matching every other Odyssey mode. A GitHub Action would add CI infrastructure this family has never needed."
  - option: "A persistent, org-owned service computes the join index and the merge plan across every adopting repository"
    rejected_because: "This option discards the install-surface rule outright. No plugin in this family ships an agent, a hook, or an MCP server, and every bundle is a per-repo, git-committed artifact by design. The pressure behind the option is real, and a committed data file answers it."
  - option: "Three new top-level ledger line kinds: path-acceptance, bundle-merge, blocked-pr-decision"
    rejected_because: "ADR-0019 fixed the ledger vocabulary at comment, reply, and state, deliberately. A proposal, an acceptance referencing it, and a post-merge actual result are three subtypes of state. A future reader then never meets an unrecognised top-level kind."
  - option: "OpenPullRequest as its own hand-copied type in the multi-pull-request epic"
    rejected_because: "A field renamed on one type and not the other compiles clean on both sides and drifts silently. One branded extension, defined once, makes the type checker refuse the drift instead."
  - option: "Build both modes as one epic"
    rejected_because: "Multi-pull-request mode needs the typed data layer and the open-pull-request entity that single-pull-request mode does not. One epic means neither reaches parity before the other's risk lands on top of it."
forces:
  - "ADR-0001 holds the viewer to one self-contained file under a content policy that blocks every external request. The browser cannot fetch, and it cannot run git."
  - "ADR-0018 already computes joins in data/index.json. Both FlightDeck modes read that index rather than re-deriving joins by hand."
  - "ADR-0019 fixed the ledger vocabulary at comment, reply, and state, and fold_threads skips a line it does not recognise."
  - "ADR-0023 fixes the build: TypeScript, React, Vite, one committed file, and a test that fails when the build and the committed output differ."
  - "The install surface ships no hooks, so nothing in this design starts itself. The adopting repository supplies the trigger."
  - "A spike measured the ordering problem on real history. Thirty open branches shared one true common ancestor, and 42.5 percent of pairwise merges conflicted. A greedy minimum-conflict order beat arrival order by roughly 40 percent on stop count."
  - "A replay is a snapshot against recorded branch heads, and a push after the run invalidates it. The ledger therefore records the exact ancestor SHA and the per-step inputs a later replay needs."
related_decisions:
  - { type: replaces, target: ADR-0025 }
  - { type: replaces, target: ADR-0026 }
  - { type: depends-on, target: ADR-0001 }
  - { type: depends-on, target: ADR-0018 }
  - { type: depends-on, target: ADR-0019 }
  - { type: depends-on, target: ADR-0023 }
related_concerns: [C3, C6]
history:
  - { state: tentative, date: 2026-09-18 }
  - { state: decided, date: 2026-09-18, by: bjornslib, note: "Merges ADR-0025 and ADR-0026 into one record for the cobuilder-viewer design, which itself merges react-viewer and review-flight-deck. Both source records were never approved and never shipped, and nothing outside this design depends on them separately." }
maps_to:
  context: cobuilder-packaging
  modules: [plugins/artifact/viewer/src, plugins/pr, shared/build_index.py, shared/ledger.py]
  rule: "FlightDeck is one React surface with two modes. Multi-pull-request mode never simulates in the browser. A skill run or scheduled workflow computes candidate merge orders, and commits the result as data/merge-plan.json for the viewer to render. A merge-order proposal, its acceptance, and its post-merge actual result are subtypes of the ledger's existing state line kind. OpenPullRequest extends PullRequest, defined once in the shared types module."
delivers:
  capability: "A reviewer opens one surface for a pull request, whether it is one change or the whole open set. It shows a validated recommendation with the evidence that a git replay held, never a live simulation to wait on or trust blind."
  benefit: "The team builds the pull-request surface once. The ledger stays inside its fixed vocabulary. An open pull request's type cannot drift silently from a merged one."
  beneficiary: [developer, reviewer, validator-agent]
related:
  - "docs/architecture/designs/cobuilder-viewer/goal.json"
  - "docs/architecture/adr/ADR-0023-react-viewer-and-a-vite-build.md"
---

# ADR-0027 — FlightDeck: one surface, two modes, a ledger-recorded merge-order recommendation

## Context

`react-viewer` (ADR-0023) rebuilds the bundle viewer as three surfaces: Work,
Flight deck, and Reference. Its E5 epic names Flight deck the
single-pull-request narration view. `review-flight-deck` (ADR-0025, ADR-0026)
independently gave its multi-pull-request merge-ordering surface the same name,
for something unrelated. Both designs reached `stage: "review"` before this
collision surfaced.

Shipping them as two designs means building the pull-request surface twice.
E5 replaces the viewer, so an ordering UI built first would then need a rebuild
in React. The name would also mean two things in one application, which
`CLAUDE.md`'s Vocabulary table exists to prevent.

Three questions stayed open across both source records. Where can a merge-order
simulation run, given that a browser cannot invoke git? How does the ledger
carry a proposal, an acceptance, and a real outcome without breaking
ADR-0019's fixed three-kind vocabulary? Who owns the open pull request as a
record-index entity, given that a later design (`inflight-record-store`) needed
the same thing?

A divergent-exploration pass across six frames, and a separate critic pass,
surfaced two more findings. First, the pressure toward precomputing the merge
plan rather than simulating it live is real. The frame that answered with a
scheduled GitHub Action missed that this family already solved automatic
triggering with a skill run or workflow. Second, a frame proposed a cross-repo
shared computation service. That option was a trap. It reads as sound scaling
architecture, and it silently discards the install-surface rule that holds this
family together.

## Decision

FlightDeck is one surface in `cobuilder-viewer`, replacing the Pull requests
tab. It carries two modes.

**Single-pull-request mode** ships first, as an epic in `cobuilder-viewer`. It
reaches parity with today's viewer: four narration levels, Mermaid diagrams,
scene art, narration audio, the diff, and the intent and assessment sheet.

**Multi-pull-request mode** ships as a later epic in the same design. A reviewer
selects open pull requests. A skill run or scheduled workflow, never the
browser, simulates candidate merge orders with chained `git merge-tree` against
the common ancestor. It replays the best one or two on a scratch worktree, then
commits the result as `data/merge-plan.json`, alongside `data/index.json`. The
viewer renders that file and computes nothing.

Three non-authored conflict shapes get their own labels, distinct from a real
authorship disagreement. A shared generated file re-diverges from different
inputs. A hot file needs to land before many others touch it. Two branches add
identical content independently through a shared upstream merge. A reviewer
should not adjudicate any of the three.

The ledger records three moments as subtypes of the existing `state` line kind.
The first is a merge-order proposal, carrying the base commit, the ranked
candidates, per-file shape labels, and a content hash of the simulation output.
The second is an acceptance, referencing the proposal's hash and naming the
chosen candidate. The third is a post-merge actual result, carrying the real
resulting tree hash. An auditor diffs the accepted candidate's predicted hash
against the actual one, without asking the merger anything. A mismatch is a
refusable, renderable state, never silently reconciled.

The shared types module defines `OpenPullRequest` once, as
`PullRequest & { status: "open" }`, in the epic that ships single-pull-request
mode. Multi-pull-request mode may not declare a PR-shaped type of its own. A
field renamed on one and not reflected in the other fails the build.

Execution carries ADR-0026's decision forward unchanged. A runner reads an
accepted path from the ledger. It merges each bundle onto its own integration
branch, built from the previous bundle and rooted at the common ancestor. The
default branch receives one pull request, from the last bundle's branch. The
reviewer commits to the path once, then chooses the pace.

## Consequences

- **Positive:** the team builds the pull-request surface once. Multi-pull-request
  mode extends single-pull-request mode's types and data layer instead of
  duplicating them.
- **Positive:** the ledger keeps exactly the vocabulary ADR-0019 fixed. A future
  reader of `fold_threads` never meets an unrecognised top-level kind.
- **Positive:** an auditor reconstructs what a reviewer saw and what actually
  merged, from the ledger alone, without asking anyone.
- **Constraint introduced:** multi-pull-request mode never simulates in the
  browser. Only a skill run or scheduled workflow runs `git merge-tree`, and it
  commits the output as data before the viewer renders it.
- **Negative:** the ledger's proposal line must record the exact ancestor SHA
  and the per-step simulation inputs. ADR-0025 did not carry that schema work.
- **Negative:** referenced SHAs can fall to garbage collection between
  acceptance and audit. Nothing here keeps them reachable, and this record does
  not settle that.
- **Open, deferred to the design's epics:** two measurement questions stay open.
  The epics settle the byte-equality test that tells a generated-file conflict
  from a real one, and the heuristic that ranks candidate orders.
