---
# --- doc-gardener required frontmatter ---
title: "ADR-0002 — Track publish provenance with a commit SHA + content hash, not by re-threading git history"
status: active
type: architecture
last_verified: "2026-08-19"
owner: bjoerns
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0002
name: "Track publish provenance with a commit SHA + content hash, not by re-threading git history"
state: approved
groups: []
approved_by: "merge of PR #2"
problem: "Once a PR artifact is published, re-running /prodyssey:publish needs to know whether to mint a new Artifact call or leave the existing one alone — but story.json never persisted a stable per-PR reference to compare against, and open PRs additionally move underneath an already-published artifact as new commits land."
decision: "extract_story.py now writes entry[\"commit\"] (a value it already computed internally for size/touched and previously discarded); export_artifact.py combines it with a sha256 content hash of the PR's timeline entry, referenced ADRs, and diff into publish-manifest.json, and republishes only when either signal changed, passing the previously recorded artifact_url back to the Artifact tool so a republish updates the same link instead of minting a new one."
alternatives:
- option: "Always republish on every /prodyssey:publish invocation"
  rejected_because: "Wastes an Artifact call (and mints a confusing new URL) for a PR that hasn't changed since it was last published."
- option: "Track staleness by content hash alone, no commit SHA"
  rejected_because: "Persisting the commit SHA turned out to be a ~4 line addition to a function extract_story.py already runs — and it catches a case content-hash alone can't distinguish as clearly: new commits landing on an open PR's branch."
forces:
- "extract_story.py already resolves and discards a merge-commit or branch-head SHA per PR while computing size/touched — persisting it cost nothing new to compute."
- "Open-PR entries are explicitly not immutable (story-mode.md, generate mode notes) — narration and diff both refresh as new commits land, so publish-time staleness has to track the same thing."
- "The Artifact tool mints a new URL unless the same file path is republished in-session or an existing url is passed explicitly — losing track of a PR's artifact_url means every republish orphans the last one."
related_decisions: []
related_concerns: []
history:
- state: decided
  date: unrecorded
  source: .cobuilder-architect/self/data/adrs.json
  note: "Retro-extracted from the self-bundle."
- state: approved
  date: "2026-07-24"
  by: "merge of PR #2"
  note: "Approved by the merge that shipped the decision."
maps_to:
  district: scripts
  unanchored: true
  modules:
  - scripts
  rule: "Republish a PR artifact only when its commit SHA or content hash has changed."
delivers:
  capability: "Re-running /prodyssey:publish is safe and idempotent — unchanged PRs report \"already up to date\" instead of spamming new Artifact links, and the index artifact always reflects the full, current set."
  benefit: "Publishing becomes a pipeline you can re-run freely rather than a one-shot action you have to remember not to repeat."
  beneficiary:
  - developer
  - operator
source_pr: 2
provenance: inferred
---

## Context

Retroactively extracted from PR #2. Once the artifact-export mechanism
(ADR-0001) existed, the next question was what happens on a second
`/prodyssey:publish` run — especially for an open PR, whose diff and
narrative are explicitly not settled history.

## Options considered

1. **Always republish.** Rejected — wasteful, and risks orphaning the
   previous Artifact URL if it isn't reused.
2. **Content hash only.** Rejected — works, but investigation showed the
   commit SHA was already computed and thrown away one function over, so
   adding it was nearly free and catches branch-moved-but-text-unchanged
   cases more directly.
3. **Commit SHA + content hash together (chosen).**

## Decision

`extract_story.py` persists `entry["commit"]`. `export_artifact.py` computes
a sha256 `source_hash` over the PR's timeline entry + referenced ADRs + diff,
and records both plus the export's file/byte metadata into
`exports/publish-manifest.json`. `record_publish.py` writes the Artifact
tool's returned URL back into the same file once Claude has it.

## Consequences

- **Positive:** idempotent republishing; the index artifact can always
  rebuild from a single source of truth instead of guessing what's changed.
- **Constraint introduced:** `exports/publish-manifest.json` is now load-
  bearing state, not disposable build output — it's tracked in git
  alongside `data/`/`assets/`, not gitignored.
- **Negative / accepted:** a PR generated before this change has no
  `commit` field until it's regenerated — handled as "unknown," not an
  error.

## Value delivered

- **New capability:** safe, repeatable publishing with no manual bookkeeping
  of what's already live.
- **Benefit:** removes the operational burden of tracking Artifact URLs by
  hand across sessions.
- **Beneficiary:** developer, operator

## Maps to

District `scripts` from `.odyssey/inventory.yaml`.
