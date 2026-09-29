---
# --- doc-gardener required frontmatter ---
title: "ADR-0035 — design mode drafts the runtime structure, the contracts, and the draft review"
status: active
type: architecture
last_verified: 2026-09-29
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0035
name: "design mode drafts the runtime structure, the contracts, and the draft review"
state: tentative
groups: [workflow, packaging]
approved_by: ""
problem: "A design drafted in design mode carries no picture of how the system will hold together at runtime, no validated review before the engineer reads, and no artifact for an endpoint surface or an entity model, while Nexus's architecture pipeline showed both a runtime-diagram contract and an independent evaluation gate running against a comparable shape."
decision: "Design mode gains three drafted outputs: a runtime architecture diagram at a named diagrams slot compiled to record[\"diagrams\"][\"runtime\"], an optional contracts.md when the design touches a public interface, and a stage-6 draft review subagent that validates against a blind rubric and re-explores alternatives as advisory challenges."
alternatives:
  - option: "Reserve diagrams/level-0.mmd ahead of the numbered levels and renumber the viewers' level handling"
    rejected_because: "The level keys are load-bearing in build_index, the viewer tile list, and the readiness check, and the engineer asked that the overview keep leading the design."
  - option: "Make the runtime diagram the design's fourth narrative level"
    rejected_because: "Design mode caps a design at three levels when it has no diff; a fourth narrative level also crowds the PR contract's reserved file-changes slot."
  - option: "Upgrade the per-PR level-1 brief to the runtime contract so PR diagrams follow it too"
    rejected_because: "The engineer ruled the PR stage too late: the runtime diagram belongs to architecture:design, and the per-PR contract stays diff-grounded."
  - option: "Enforce the draft review as a hard gate, three independent reviews all passing before completion"
    rejected_because: "Pre-code findings are predictions, and a numeric blocker dresses a prediction as a check; the reviewer is advisory at stage 6 first, with the hard form available for implement Gate 2."
  - option: "Carry endpoints and data models as new fields inside intent.json"
    rejected_because: "intent.json is the interview record; staged contracts are drafted artifacts and belong in a separate, show-before-write file."
forces:
  - "Level keys and the viewer's diagram tile list are load-bearing; the slot must be additive."
  - "ADR-0025 keeps implement the only plugin that ships agents and hooks, so the reviewer must be session-spawned."
  - "Nexus's hard-gate semantics evaluate executed work; design mode's evidence rule forbids passing a prediction off as a check."
  - "The five-artifact budget in stage 5 is a budget; two additions need explicit skip rules to avoid ritual."
  - "The engineer's standing directive pins subagent spawns to the glm-5.3-flash:cloud model."
related_decisions:
  - { type: is-related-to, target: ADR-0005 }
  - { type: is-related-to, target: ADR-0018 }
  - { type: is-related-to, target: ADR-0025 }
  - { type: is-related-to, target: ADR-0013 }
related_concerns: [C3, C6]
history:
  - { state: tentative, date: 2026-09-29 }
maps_to:
  context: cobuilder-packaging
  modules: [shared/skills/mermaid/references/architecture-diagram.md, plugins/architect/skills/architecture/references/design-mode.md, shared/build_index.py, plugins/artifact/viewer/src, .claude-plugin/marketplace.json]
  rule: "A design's runtime structure, contract surface, and independent draft review are drafted artifacts of design mode stage 5-6; they attach to the design record additively and never renumber or displace the three narrative levels or the level-1 overview."
delivers:
  capability: "A design record states the runtime structure (lead tile in the architecture level), its endpoint and entity surface, and carries an independently derived review before human review."
  benefit: "The engineer reviews a design with the same runtime picture Nexus's pipeline enforced, catches contract gaps, and reads an independently challenged draft."
  beneficiary: [developer, operator, validator-agent]
related:
  - "{doc_root}/contexts/cobuilder-packaging/boundary.yaml"
---

# ADR-0035 — design mode drafts the runtime structure, the contracts, and the draft review

## Context

Design mode's seven stages produce goal, intent, assessment, narrative, and three narrative-keyed diagrams, one ADR, and a pr-draft. The comparison against Nexus's pipeline workflow (`packages/nexus-api/src/nexus/api/routes/pipeline_workflow.py`) showed both systems at the same generate-review-approve shape with different enforcement: Nexus specifies a runtime-component diagram with clustered boundaries, protocol-labeled edges, an 8-to-30-node cap, and gates execution on three independent evaluations. Cobuilder's design mode has neither a runtime picture, an independent pre-review, nor a contracts artifact.

Three mechanisms exist that make the borrowings cheap: the three-level diagram contract is keyed by filename in `shared/build_index.py` but its records dict carries arbitrary keys; ADR-0005 established the session-spawned subagent pattern design mode already uses for exploration and diagram authoring; pr-draft.md already shows the attach-when-non-empty projection path a new authored file can follow.

## Options considered

1. **Borrow the runtime-diagram contract at a named slot; keep levels 1-3 intact (chosen).** One file, one record key, one tile inside the architecture level. The overview keeps leading; no renumbering.
2. **Renumber to level-0 or add a fourth narrative level.** Rejected: touches every consumer of the level keys and breaks the design cap of three levels.
3. **Review the draft with a hard pass-cube gate.** Rejected for now: pre-code findings are predictions; the stage-6 reviewer is advisory, and the hard form remains available at implement Gate 2.
4. **Put contracts inside intent.json.** Rejected: the interview record is not the drafted artifact surface.

## Decision

Design mode stage 5 drafts two more artifacts — `diagrams/runtime-architecture.mmd` per the new `shared/skills/mermaid/references/architecture-diagram.md` contract (clustered boundaries, shape semantics, protocol-labeled edges, 8-30 nodes, single page) and an optional `contracts.md` (envisioned endpoints and data models, skipped with a stated reason when the design touches no public interface), both shown before write. Stage 6 spawns, before the engineer reads, a reviewer that (a) validates the draft against a blind rubric derived from `goal.json` and `intent.json` only, and (b) re-explores alternatives seeded with the final draft; its findings enter stage 6 as classified challenges, advisory to the human gate, recorded through `goal.min_work.draft_review_run`. `shared/build_index.py` compiles the slot to `record["diagrams"]["runtime"]` and attaches `contracts` beside `pr_draft`. The viewer renders the runtime tile as the lead tile of the design's architecture level ahead of the class diagram, keeping the level-1 overview as the design's first diagram, and gains a contracts section on the design route. Subagent spawns run on `glm-5.3-flash:cloud`.

Out of scope: any DAG execution workflow, per-PR diagram contract changes, glossary Non-Goals work, and any new agent file or hook outside `implement`.

## Consequences

- **Positive:** the runtime picture, contract surface, and independent review arrive at the design stage where they can still change the decision; the record index and viewer keep every existing contract.
- **Constraint introduced:** the runtime diagram is a named addendum, never a narrative level; the numbered levels and their meanings may not shift, and the runtime slot may not be re-keyed to a numeric level.
- **Negative / accepted:** reviewer spawns add latency to stage-6 rounds and share the churn budget; mermaid C4 cluster rendering may bind harder than Nexus's dot clusters did.

## Value delivered

- **New capability:** a design drafts its runtime architecture, its contracts, and an independent review before any PR exists.
- **Benefit:** review decisions are made against the runtime picture and an independently challenged draft (why it is worth it).
- **Beneficiary:** developer, operator, validator-agent.

## Maps to

- `shared/skills/mermaid/references/architecture-diagram.md`
- `plugins/architect/skills/architecture/references/design-mode.md` (stage 5 artifacts, stage 6 reviewer)
- `shared/build_index.py` (design record projection)
- `plugins/artifact/viewer/src` (architecture-level tile order, contracts section)
- `.claude-plugin/marketplace.json` (architect, implement, artifact versions)