---
# --- doc-gardener required frontmatter ---
title: "ADR-0036 — design mode drafts the runtime structure, the contracts, and the draft review"
status: active
type: architecture
last_verified: 2026-09-29
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0036
name: "design mode drafts the runtime structure, the contracts, and the draft review"
state: decided
groups: [workflow, packaging]
approved_by: bjornslib
problem: "A design drafted in design mode carries no picture of how the system will hold together at runtime, no validated review before the engineer reads, no artifact for an endpoint surface or an entity model, and no bootstrap path for DDD-VOCABULARY.md in a repository that never created one, while Nexus's architecture pipeline showed a runtime-diagram contract, an independent evaluation gate, and PRD-level data-model and non-goal artifacts running against a comparable shape."
decision: "Design mode gains three drafted outputs and one bootstrap: a runtime architecture diagram at a named diagrams slot compiled to record[\"diagrams\"][\"runtime\"], authored as inline SVG per the runtime-architecture-diagram contract and checked by plugins/architect/scripts/check_design_svg.py; an optional contracts.md when the design touches a public interface; and a stage-6 draft review subagent that validates against a blind rubric and re-explores alternatives as advisory challenges, whose endorsed survivors enter stage 4's intent.alternatives per ADR-0035. Every architect and implement mode checks the glossary's existence; design stage 1 and /architect:options bootstrap it from the baseline districts with a grilling interview when it is absent; review mode reports its absence as a P1 finding and offers the bootstrap at run end; no other mode writes it."
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
  - option: "Author the runtime diagram in mermaid at the named slot, as the pre-merge draft did"
    rejected_because: "ADR-0035 already recorded inline SVG as the accepted exception to the shared mermaid pipeline, because mermaid cannot render the emphasis borders and NEW/CHG-style badges the runtime picture needs; an SVG node set also gives exact control of the cylinder, dashed-external, and rounded-service shape semantics the contract demands, which the engineer saw work in a colleague's hand-authored SVG architecture review at think-with-ai."
  - option: "Move the stage-6 draft review and its re-explore into the new options mode"
    rejected_because: "ADR-0035 scopes options mode to the whole system once, before a design exists, and forbids it running exploration; the draft reviewer closes the loop after one design's draft exists. The reviewer's endorsed survivors go back through the engineer into stage 4's intent.alternatives, which alone fills that field."
forces:
  - "Level keys and the viewer's diagram tile list are load-bearing; the slot must be additive."
  - "ADR-0035 scopes options mode to one self-contained HTML report, nothing else; a consented glossary write from its hand-off stage is the one declared exception, mirroring design stage 5's glossary-update rule."
  - "The vocabulary bootstrap's terms come from baseline-verified districts and the engineer's interview, never from the corpus; principles/ddd and the ubiquitous-language scenario shape the questions and the entry kinds, not the words."
  - "corpus/scenarios/ddd/ holds only a README today; the bootstrap cites only scenarios/architecture_ddd and principles/ddd until real scenario files exist."
  - "ADR-0025 keeps implement the only plugin that ships agents and hooks, so the reviewer must be session-spawned."
  - "Nexus's hard-gate semantics evaluate executed work; design mode's evidence rule forbids passing a prediction off as a check."
  - "The five-artifact budget in stage 5 is a budget; two additions need explicit skip rules to avoid ritual."
  - "The engineer's standing directive pins subagent spawns to the glm-5.3-flash:cloud model."
related_decisions:
  - { type: is-related-to, target: ADR-0005 }
  - { type: is-related-to, target: ADR-0013 }
  - { type: is-related-to, target: ADR-0018 }
  - { type: is-related-to, target: ADR-0025 }
  - { type: is-related-to, target: ADR-0035 }
related_concerns: [C3, C6]
history:
  - { state: tentative, date: 2026-09-29 }
  - { state: decided, date: 2026-10-01, by: bjornslib, note: "Round 2 churn: reconciled with merged PR-26. The pre-merge draft had claimed number ADR-0035 and a mermaid slot; on rebase the record renumbered to ADR-0036, the slot moved to inline SVG per the ADR-0035 exception and the engineer's preference, the alternatives hand-off to intent.alternatives was made explicit, and the vocabulary bootstrap leg joined." }
maps_to:
  context: cobuilder-packaging
  modules: [plugins/architect/skills/architecture/references/runtime-architecture-diagram.md, plugins/architect/scripts/check_design_svg.py, plugins/architect/skills/architecture/references/design-mode.md, plugins/architect/skills/architecture/references/options-mode.md, shared/build_index.py, plugins/implement/agents/vocabulary.md, plugins/artifact/viewer/src, .claude-plugin/marketplace.json]
  rule: "A design's runtime structure, contract surface, and independent draft review are drafted artifacts of design mode stage 5-6; the glossary is bootstrapped by design stage 1 or offered by options/review, and consented glossary writes are the only permitted exception to a mode's write surface. The slots attach additively and never renumber or displace the three narrative levels or the level-1 overview."
delivers:
  capability: "A design record states the runtime structure (lead tile in the architecture level), its endpoint and entity surface, and carries an independently derived review before human review."
  benefit: "The engineer reviews a design with the same runtime picture Nexus's pipeline enforced, catches contract gaps, and reads an independently challenged draft."
  beneficiary: [developer, operator, validator-agent]
related:
  - "{doc_root}/contexts/cobuilder-packaging/boundary.yaml"
---

# ADR-0036 — design mode drafts the runtime structure, the contracts, and the draft review

## Context

Design mode's seven stages produce goal, intent, assessment, narrative, and three narrative-keyed diagrams, one ADR, and a pr-draft. The comparison against Nexus's pipeline workflow (`packages/nexus-api/src/nexus/api/routes/pipeline_workflow.py`) showed both systems at the same generate-review-approve shape with different enforcement: Nexus specifies a runtime-component diagram with clustered boundaries, protocol-labeled edges, an 8-to-30-node cap, and gates execution on three independent evaluations. Cobuilder's design mode has neither a runtime picture, an independent pre-review, nor a contracts artifact.

Three mechanisms exist that make the borrowings cheap: the three-level diagram contract is keyed by filename in `shared/build_index.py` but its records dict carries arbitrary keys; ADR-0005 established the session-spawned subagent pattern design mode already uses for exploration and diagram authoring; pr-draft.md already shows the attach-when-non-empty projection path a new authored file can follow.

## Options considered

1. **Borrow the runtime-diagram contract at a named slot; keep levels 1-3 intact (chosen).** One file, one record key, one tile inside the architecture level. The overview keeps leading; no renumbering.
2. **Renumber to level-0 or add a fourth narrative level.** Rejected: touches every consumer of the level keys and breaks the design cap of three levels.
3. **Review the draft with a hard pass-cube gate.** Rejected for now: pre-code findings are predictions; the stage-6 reviewer is advisory, and the hard form remains available at implement Gate 2.
4. **Put contracts inside intent.json.** Rejected: the interview record is not the drafted artifact surface.

## Decision

Design mode stage 5 drafts two more artifacts — `diagrams/runtime-architecture.svg` authored directly as inline SVG per the new `plugins/architect/skills/architecture/references/runtime-architecture-diagram.md` contract (clustered boundaries, cylinder/dashed/rounded shape semantics, protocol-labeled boundary edges, 8-30 nodes, single page, a `viewBox`, no external references), validated by `check_design_svg.py`, and an optional `contracts.md` (envisioned endpoints and data models, skipped with a stated reason when the design touches no public interface), both shown before write. Stage 6 spawns, before the engineer reads, a reviewer that (a) validates the draft against a blind rubric derived from `goal.json` and `intent.json` only, and (b) re-explores alternatives seeded with the final draft; its findings enter stage 6 as classified challenges the engineer adjudicates — endorsed survivors reach `intent.alternatives` only through the stage-4 record per ADR-0035 — and the round is recorded through `goal.min_work.draft_review_run`. `shared/build_index.py` compiles the slot to `record["diagrams"]["runtime"]` and attaches `contracts` beside `pr_draft`. The viewer renders the runtime tile as the lead tile of the design's architecture level ahead of the class diagram, keeping the level-1 overview as the design's first diagram, and gains a contracts section on the design route. Subagent spawns run on `glm-5.3-flash:cloud`.

The last leg is the glossary. Every architect and implement mode reads `DDD-VOCABULARY.md` when it exists and states its absence. When a design finds it absent, stage 1 bootstraps it before drafting: propose term candidates from the baseline-verified districts and the real code symbols, annotate each with its DDD kind from the kind-matched `corpus/principles/ddd` cards, grill the engineer through `AskUserQuestion` — confirm, rename, reject, plus the inverted what-would-you-call-this question, using `corpus/scenarios/architecture_ddd/004_ubiquitous_language_naming.yaml` as the question bank and `003_bounded_context_splitting.yaml` for cross-context scoping — then write the file in the established entry format at the target root, or in `<bundle-dir>/` for a foreign target. `/architect:options` checks at stage 1, notes the absence among its inquiries, and offers the bootstrap at its stage-6 hand-off, since its report writes nothing else; review mode treats the absence as a P1 finding and offers the bootstrap when its run ends; `/implement:install`, `/implement:start`, and `/implement:debug` surface a notice, and `implement:vocabulary` never returns a silent CLEAN from a missing file. Only design stage 5 and these consented offers write the glossary.

Out of scope: any DAG execution workflow, per-PR diagram contract changes, glossary Non-Goals work, authoring content for corpus/scenarios/ddd/, and any new agent file or hook outside `implement`.

## Consequences

- **Positive:** the runtime picture, contract surface, and independent review arrive at the design stage where they can still change the decision; foreign repos stop running the whole lifecycle against an undefined glossary; the record index and viewer keep every existing contract.
- **Constraint introduced:** the runtime diagram is a named addendum, never a narrative level; the numbered levels and their meanings may not shift, and the runtime slot may not be re-keyed to a numeric level.
- **Negative / accepted:** reviewer spawns add latency to stage-6 rounds and share the churn budget; an SVG file renders only in the viewer and needs its own structural validator because it leaves the shared mermaid pipeline; the runtime slot is never validated by `--strict` mermaid-cli.

## Value delivered

- **New capability:** a design drafts its runtime architecture, its contracts, and an independent review before any PR exists.
- **Benefit:** review decisions are made against the runtime picture and an independently challenged draft (why it is worth it).
- **Beneficiary:** developer, operator, validator-agent.

## Maps to

- `plugins/architect/skills/architecture/references/runtime-architecture-diagram.md`
- `plugins/architect/scripts/check_design_svg.py`
- `plugins/architect/skills/architecture/references/vocabulary-bootstrap.md`
- `plugins/architect/skills/architecture/references/design-mode.md` (stage 1 fallback, stage 5 artifacts, stage 6 reviewer)
- `plugins/architect/skills/architecture/references/options-mode.md` (stage 1 check, hand-off offer)
- `plugins/implement/agents/vocabulary.md` (missing-file guard)
- `shared/build_index.py` (design record projection)
- `plugins/artifact/viewer/src` (architecture-level tile order, contracts section)
- `.claude-plugin/marketplace.json` (architect, implement, artifact versions)