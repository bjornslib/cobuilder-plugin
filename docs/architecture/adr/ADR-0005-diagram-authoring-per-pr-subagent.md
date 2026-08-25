---
# --- doc-gardener required frontmatter ---
title: "ADR-0005 — Diagram authoring delegated to a per-PR subagent, never the orchestrating Claude or a script"
status: active
type: architecture
last_verified: "2026-08-19"
owner: bjoerns
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0005
name: "Diagram authoring delegated to a per-PR subagent, never the orchestrating Claude or a script"
state: approved
groups: []
approved_by: "merge of PR #4"
problem: "Adding Mermaid diagrams as a visual family alongside Gemini scene art meant deciding who writes the actual `.mmd` diagram sources. The plugin already held a hard rule that scripts never author judgment-shaped content (narrative, ADRs) — only move data — and diagram content (what to show, how to group it, what level of detail) is exactly that kind of judgment call. But authoring three diagrams per PR directly in the orchestrating Claude's own context has a discoverability cost too: the Mermaid authoring rules live in a reference set of over fifty files, one per diagram type, that only makes sense loaded on demand, not kept resident in the orchestrator's context for every PR whether or not it needs diagrams."
decision: "Generate mode spawns one subagent per PR for diagram authoring. Its prompt requires it to invoke `Skill(\"prodyssey:mermaid\")` first (falling back to reading `skills/mermaid/SKILL.md` directly if the skill doesn't resolve by name in that session), hands it the PR's timeline entry, extracted diff, and inventory as grounding, and requires it to write exactly three files — `pr{N}-level1.mmd` (`C4Container`), `pr{N}-level2.mmd` (`sequenceDiagram`), `pr{N}-level3.mmd` (`classDiagram`) — returning only their paths. `build_diagrams.py` then compiles those files into `data/diagrams.js` and validates each one's required diagram type and bracket balance; a validation failure is sent back to the same subagent to fix, never hand-patched by the orchestrator."
alternatives:
- option: "Have the orchestrating Claude author the .mmd files itself, inline"
  rejected_because: "Keeps the entire Mermaid reference set (block, C4, sequence, class, and dozens more diagram types) loaded against every PR's context regardless of whether that PR needs diagrams at all, and duplicates authoring-rule maintenance between the odyssey skill and the diagram content."
- option: "Have build_diagrams.py generate diagrams programmatically from the diff"
  rejected_because: "Breaks the plugin's standing invariant that scripts only move data — deciding what a diagram should show is the same kind of judgment call already reserved for Claude in narrative and ADR authoring, not something a deterministic script can produce."
forces:
- "The plugin's existing convention, already true for narrative and ADRs: a mechanical script only compiles and validates content a subagent already wrote — it never authors that content itself."
- "A new `--art both|diagram|image` flag controls which visual family a sweep produces per PR; `--art diagram` skips Gemini entirely, and since a diagram is plain text rather than base64 image data, it meaningfully relieves the 16 MiB Artifact-publish budget from ADR-0001."
- "verify_bundle.py must report `diagram.level-*` status regardless of which family actually gated a given sweep, so a later `--art both` re-run or a publish-mode budget check can see the true state of both families, not just whichever one last ran."
related_decisions: []
related_concerns: []
history:
- state: decided
  date: unrecorded
  source: .cobuilder-architect/self/data/adrs.json
  note: "Retro-extracted from the self-bundle."
- state: approved
  date: "2026-08-02"
  by: "merge of PR #4"
  note: "Approved by the merge that shipped the decision."
maps_to:
  district: skills
  unanchored: true
  modules:
  - skills/odyssey
  rule: "The orchestrating Claude never writes or hand-patches a .mmd file. A per-PR subagent authors them."
delivers:
  capability: "PRs can get architecture diagrams at zero Gemini cost, authored with full access to a large, specialized Mermaid ruleset, without that ruleset bloating every other PR's authoring context."
  benefit: "Diagrams and scene art become independently selectable per sweep, and diagram-only PRs get meaningfully easier to fit under the artifact-publish size cap."
  beneficiary:
  - developer
  - "operator (whoever runs /prodyssey:publish under the 16 MiB cap)"
source_pr: 4
provenance: inferred
---

## Context

Retroactively extracted from PR #4. Mermaid diagrams were added as a second visual family for levels 1-3, alongside the existing Gemini scene art from earlier PRs, and needed an authoring path consistent with the plugin's judgment-vs-mechanical split already established for narrative and ADRs.

## Options considered

1. **Orchestrator authors .mmd inline.** Rejected — forces the full Mermaid reference set into every PR's context and duplicates authoring-rule ownership.
2. **Script-generates diagrams from the diff.** Rejected — violates the scripts-never-author-judgment-content rule.
3. **Per-PR subagent invoking the mermaid skill (chosen).**

## Decision

One subagent per PR, told to invoke `Skill("prodyssey:mermaid")` and write exactly three typed `.mmd` files; `build_diagrams.py` compiles and validates them mechanically, sending failures back to the same subagent rather than patching them directly.

## Consequences

- **Positive:** diagram authoring inherits the same judgment/mechanical split already proven for narrative and ADRs; Gemini cost and the 16 MiB artifact budget both become easier to manage for diagram-only sweeps.
- **Constraint introduced:** the orchestrating Claude must never write or hand-patch a `.mmd` file directly — all fixes route back through the subagent.
- **Negative / accepted:** one extra subagent spawn per PR when diagrams are requested, versus authoring inline.

## Value delivered

- **New capability:** independent, zero-Gemini-cost architecture diagrams per PR.
- **Benefit:** smaller authoring context per sweep and an easier artifact-publish budget.
- **Beneficiary:** developer, operator

## Maps to

District `skills` from `.prodyssey/self/inventory.yaml`.
