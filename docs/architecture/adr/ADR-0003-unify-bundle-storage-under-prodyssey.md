---
# --- doc-gardener required frontmatter ---
title: "ADR-0003 — Unify bundle storage under .prodyssey/, self-analysis into .prodyssey/self/"
status: active
type: architecture
last_verified: "2026-08-19"
owner: bjoerns
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0003
name: "Unify bundle storage under .prodyssey/, self-analysis into .prodyssey/self/"
state: approved
groups: []
approved_by: "merge of PR #3"
problem: "Two separate storage roots existed for the same kind of output: self-analysis bundles lived at `<target>/.odyssey/`, while foreign-repo bundles were cached centrally at `<hub>/.prodyssey/<repo-slug>/`. Every script's `--bundle-dir` default, every skill reference, and every command had to carry two path conventions, and there was no single root to write one `.gitignore` line against for hub-local bookkeeping (`.view-server.pid`, `.view-server.log`, the `active` symlink)."
decision: "Collapse both roots into one: self-analysis bundles now default to `<target>/.prodyssey/self/`, a sibling of the existing `<hub>/.prodyssey/<repo-slug>/` cache directories, with `self` reserved as a slug no repo-derived hash can ever collide with. Every script's `--bundle-dir` default, the skill's Hub-resolution rule, and the `.gitignore` guidance were rewritten around this single root — and a legacy-layout detector stops any mode with the exact `git mv .odyssey .prodyssey/self` command instead of silently treating the old path as \"no baseline found\"."
alternatives:
- option: "Keep two storage roots, just document the split more clearly"
  rejected_because: "Leaves the actual maintenance cost in place — ~10 places across scripts, SKILL.md, README, and CLAUDE.md still hardcode two different default paths — and still gives no single root for one shared .gitignore rule."
- option: "Auto-migrate a legacy `.odyssey/` bundle on next run (run `git mv` for the user)"
  rejected_because: "Contradicts the skill's standing posture of never editing the target repo's source outside the bundle directory itself; a legacy layout gets a printed command for the user to run, not an automatic move on their behalf."
forces:
- "Every one of the plugin's scripts (plus SKILL.md, README.md, CLAUDE.md) hardcoded `.odyssey` as the self-analysis default, duplicating the same path assumption in roughly ten places."
- "A legacy `.odyssey/` bundle must never be silently reinterpreted as \"no baseline exists\" and regenerated — that would burn real Gemini API cost re-deriving content a maintainer already authored by hand."
- "The `.prodyssey/` bookkeeping entries (`.view-server.pid`, `.view-server.log`, the `active` symlink) need a `.gitignore` line that ignores only those three files, never `.prodyssey/` as a whole, since real bundle directories sit right next to them and are meant to be committed."
related_decisions: []
related_concerns: []
history:
- state: decided
  date: unrecorded
  source: .cobuilder-architect/self/data/adrs.json
  note: "Retro-extracted from the self-bundle."
- state: approved
  date: "2026-07-28"
  by: "merge of PR #3"
  note: "Approved by the merge that shipped the decision."
maps_to:
  district: .prodyssey
  unanchored: true
  modules:
  - .prodyssey
  rule: "Self-analysis and foreign-repo bundles share one root, with self reserved as a slug."
delivers:
  capability: "One storage root for every bundle, self-analysis or foreign-repo, with one `.gitignore` rule and one path convention across the whole plugin instead of two."
  benefit: "Removes a whole class of \"which root is this bundle actually in\" bugs and doc-drift before they can occur, and gives centrally-cached and self-analysis bundles the same on-disk shape."
  beneficiary:
  - developer
  - "the plugin itself (maintainers and future sessions working in this repo)"
source_pr: 3
provenance: inferred
---

## Context

Retroactively extracted from PR #3. The plugin had grown two separate bundle-storage roots as the central-cache feature (`<hub>/.prodyssey/<repo-slug>/`) was added alongside the original self-analysis location (`<target>/.odyssey/`), and the split had started costing real maintenance overhead across scripts, skill references, and commands.

## Options considered

1. **Document the split better, keep two roots.** Rejected — doesn't remove the duplicated path-default maintenance burden or unlock a single `.gitignore` line.
2. **Auto-migrate legacy bundles via `git mv` on next run.** Rejected — an automatic move inside the user's repo contradicts the skill's "never edits target repo source" rule; detect-and-instruct instead.
3. **Unify under `<target>/.prodyssey/self/` (chosen).**

## Decision

Every script's `--bundle-dir` default becomes `<repo>/.prodyssey/self`. The skill's Hub-resolution rule is rewritten around one root with `self` as a reserved slug. A legacy-layout check runs before any mode's other work: if the new path is missing but `<target>/.odyssey/` exists, the mode stops and prints the exact `git mv` command rather than proceeding.

## Consequences

- **Positive:** one path convention everywhere; central and self-analysis bundles are now structurally identical, just at different subpaths of the same root.
- **Constraint introduced:** `self` can never be used as a foreign-repo slug — the slug derivation must guarantee this.
- **Negative / accepted:** any bundle generated before this PR needs a one-time manual `git mv`, not handled automatically.

## Value delivered

- **New capability:** a single, consistent bundle-storage root for the whole plugin.
- **Benefit:** removes duplicated path-convention maintenance and enables one shared `.gitignore` rule.
- **Beneficiary:** developer, the plugin itself

## Maps to

District `.prodyssey` from `.prodyssey/self/inventory.yaml`.
