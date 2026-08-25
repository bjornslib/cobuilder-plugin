---
# --- doc-gardener required frontmatter ---
title: "ADR-0004 — Keep the ste-writing skill dev-local, out of the plugin's install surface"
status: active
type: architecture
last_verified: "2026-08-19"
owner: bjoerns
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0004
name: "Keep the ste-writing skill dev-local, out of the plugin's install surface"
state: approved
groups: []
approved_by: "merge of PR #3"
problem: "The repo needed a controlled-language (ASD-STE100) writing skill and linter to keep its own docs and PR narratives in a consistent register, but the plugin's `skills/` directory is exactly what ships to anyone who runs `/plugin install prodyssey@prodyssey` — adding a general-purpose writing-style skill there would silently grow every installer's surface with a skill that has nothing to do with generating codebase odysseys."
decision: "`ste-writing` lives under `.claude/skills/ste-writing/`, a location outside the plugin manifest's `skills/` tree entirely, so an install of `prodyssey@prodyssey` still gets exactly the two skills the plugin has always shipped (odyssey, and mermaid one PR later) and never a third."
alternatives:
- option: "Ship it under skills/ste-writing/ alongside odyssey"
  rejected_because: "Every installer of the plugin would receive a general writing-style skill unrelated to codebase odysseys, contradicting the plugin's already-explicit \"no agents, no hooks, no MCP servers\" minimal-install-surface stance."
forces:
- "The plugin's minimal-surface intent is an explicit, pre-existing design constraint (no agents/hooks/MCP servers, deliberately so it never touches another session's permission surface), and `skills/` is auto-discovered by the manifest with no allowlist to exclude an individual skill."
- "The repo's own writing standard (ASD-STE100 for README, CLAUDE.md, reference docs, commit/PR bodies) still needs an available skill and linter for sessions working inside this repo, independent of what the plugin ships downstream."
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
  district: skills
  unanchored: true
  modules:
  - .claude/skills/ste-writing
  rule: "Repo-local writing tools live under .claude/skills/, never under the plugin skills/ tree."
delivers:
  capability: "This repo can enforce a documentation writing standard on itself without changing what any plugin installer receives."
  benefit: "Keeps two separate concerns — how prodyssey ships, versus how this repo writes its own docs — from leaking into each other."
  beneficiary:
  - developer
  - "plugin installers (install surface stays unaffected)"
source_pr: 3
provenance: inferred
---

## Context

Retroactively extracted from PR #3. The repo adopted an ASD-STE100 writing standard for its own prose (README, CLAUDE.md, reference docs, commit/PR bodies) and needed a skill plus linter to enforce it, at the same time the plugin's `skills/` directory already had an established minimal-surface rule.

## Options considered

1. **Ship under `skills/ste-writing/`.** Rejected — grows every installer's surface with an unrelated skill.
2. **Place under `.claude/skills/ste-writing/`, dev-local only (chosen).**

## Decision

`ste-writing` and its linter (`.claude/skills/ste-writing/ste-lint.py`) live outside the plugin manifest's discovered tree. CLAUDE.md documents explicitly that an install of `prodyssey@prodyssey` gets exactly the skills under `skills/` in this repo, never `.claude/skills/`.

## Consequences

- **Positive:** plugin install surface stays exactly as minimal as before this PR.
- **Constraint introduced:** any future repo-local-only tooling should default to `.claude/skills/`, not `skills/`, unless it's meant to ship.
- **Negative / accepted:** ste-writing isn't available to other repos that install the prodyssey plugin — it's specific to this repo's own documentation practice.

## Value delivered

- **New capability:** a self-enforced writing standard for this repo's own docs.
- **Benefit:** keeps shipping surface and internal tooling decisions independent.
- **Beneficiary:** developer, plugin installers

## Maps to

District `skills` from `.prodyssey/self/inventory.yaml`.
