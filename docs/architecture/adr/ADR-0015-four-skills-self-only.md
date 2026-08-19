---
# --- doc-gardener required frontmatter ---
title: "ADR-0015 — Four shipped skills, architecture modes self-only"
status: active
type: architecture
last_verified: "2026-08-19"
owner: bjoerns
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0015
name: "Four shipped skills, architecture modes self-only"
state: decided
groups: []
approved_by: ""
problem: "Design mode needs the architecture corpus, and the install-surface claim that the plugin ships exactly two skills was already false once mermaid existed. Keeping architecture in a second repo, or keeping ste-writing repo-local, left design mode without a corpus it could edit."
decision: "Merge archkit main at 61f3c3e into this plugin, ship four skills (odyssey, architecture, mermaid, ste-writing), rename the plugin and bundle directory to cobuilder-architect, and make the six architecture modes self-only. Odyssey's five modes keep --repo."
alternatives:
- option: "Keep archkit a soft, optional dependency"
  rejected_because: "A design mode whose corpus is optional degrades into a chat."
- option: "Give architecture modes --repo as well"
  rejected_because: "docs/ is a sanctioned write location for this repo only. A foreign checkout must not receive architecture documents from this plugin."
- option: "Keep ste-writing under .claude/skills/ only"
  rejected_because: "ADR procedural text and skill prose now run through that skill on every design and generate pass. A repo-local copy is invisible to an installer."
forces:
- "the real install constraint is no agents, no hooks, and no MCP servers"
- "ADR-0004 said ste-writing stays off the install surface"
- "GitHub redirects a renamed repository, so existing marketplace installs should keep resolving"
related_decisions:
- {type: is-related-to, target: ADR-0003}
- {type: is-related-to, target: ADR-0004}
- {type: is-related-to, target: ADR-0011}
related_concerns: []
history:
- {state: decided, date: "2026-08-19", note: "Recorded with the cobuilder-architect merge. ADR-0004's install-surface clause no longer holds. Chosen on this branch; not approved until a human merges."}
maps_to:
  district: skills
  unanchored: true
  modules:
  - skills
  - .claude-plugin
  rule: "The plugin ships four skills and no agents, hooks, or MCP servers. Architecture modes refuse a foreign target."
delivers:
  capability: "One plugin covers design, submit, and review, with the corpus in the same install."
  benefit: "Design mode can reason with a corpus it can edit, and an installer gets a predictable surface with no extra permission hooks."
  beneficiary:
  - developer
  - plugin installers
provenance: authored
---

## Context

ADR-0004 kept `ste-writing` off the install surface so an installer received
only odyssey and mermaid. Design mode needs the architecture skill in the
same plugin. The two-skills sentence in CLAUDE.md was already stale.

## Options considered

1. **Optional archkit.** Rejected. Design without a corpus is a chat.
2. **Architecture `--repo`.** Rejected. `docs/` is self-only.
3. **Keep ste-writing repo-local.** Rejected. Design and generate invoke it.
4. **Merge, ship four skills, self-only architecture** (chosen).

## Decision

The plugin is `cobuilder-architect` version 0.4.0. It ships `odyssey`,
`architecture`, `mermaid`, and `ste-writing`. Architecture commands refuse
`--repo` and `--store`. Odyssey keeps both. A leftover `.prodyssey/` store
is moved to `.cobuilder-architect/` before any mode resolves the bundle dir.

The install constraint that remains is: no agents, no hooks, no MCP servers.

## Consequences

- **Positive:** design, submit, and review share one install.
- **Constraint introduced:** architecture analysis of a foreign repo is out
  of scope.
- **Negative / accepted:** ADR-0004's "never a third skill" clause is no
  longer current. The record stays in the register as history.

## Value delivered

- **New capability:** one plugin for the architecture lifecycle except build.
- **Benefit:** the corpus and the mode that uses it cannot skew across repos.
- **Beneficiary:** developer, plugin installers.

## Maps to

District `skills`. Unanchored until a boundary.yaml exists.
