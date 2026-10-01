---
# --- doc-gardener required frontmatter ---
title: "ADR-0035 — The options mode proposes alternatives, and design mode decides"
status: active
type: architecture
last_verified: 2026-10-01
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0035
source_pr: null
name: "The options mode proposes alternatives, and design mode decides"
state: decided
groups: [workflow, architect]
approved_by: ""
problem: "Review mode finds defects. Design mode starts from an outcome that the engineer already named. Nothing asks whether the flow and the technology choices of the whole system are still right, or what other options exist for the same outcome."
decision: "Add /architect:options as a seventh architect mode. It writes one self-contained HTML report with a fixed structure under docs/architecture/options/<name>/ and nothing else. It proposes alternatives and never records a decision. The engineer pastes the decisions text into /architect:design, whose stage 4 alone fills intent.alternatives."
alternatives:
  - option: "Add an optional pre-step to design mode instead of a seventh mode"
    rejected_because: "Design mode designs one change. The options mode examines the architecture of the whole system. A pre-step of one design cannot hold that scope."
  - option: "Write an options.json beside the report so that design mode reads decisions by ID"
    rejected_because: "Nothing would read the file. The design forbids a change to design mode. A file with no reader is the kind of step this repo skips. The inquiry IDs and the pasted decisions text carry the hand-off."
  - option: "Draw the diagrams in Mermaid, as design mode does"
    rejected_because: "Mermaid cannot draw the emphasis borders and the NEW and CHG badges that the report needs. The report uses inline SVG only."
  - option: "Depend on Lavish for the decision forms"
    rejected_because: "A report that needs an editor does not open from a double click. The forms use copy buttons only."
  - option: "Run divergent exploration inside the mode"
    rejected_because: "It costs seven agent calls for each run, and it belongs to design stage 3. The options mode proposes. Design stage 4 decides."
  - option: "Call each item a finding or a question"
    rejected_because: "Both words already have a meaning in the glossary. The item is an inquiry."
consequences:
  - "The architect plugin has seven modes. A test pins the set and checks that the command files match it."
  - "The report is not a record in data/index.json, so the viewer does not show it. A later design can add a projection."
  - "The report uses inline SVG, which is an accepted exception to the shared mermaid pipeline."
forces:
  - "The reference report already exists and has a fixed structure that a user of CoBuilder asked for."
  - "Only implement may ship an agent or a hook, and no plugin ships an MCP server (ADR-0025)."
  - "Design mode owns framing, exploration, and the challenge for one change (ADR-0013)."
  - "A step with no mechanical consumer gets skipped, so the report needs a validator."
related_decisions:
  - { type: is-related-to, target: ADR-0013 }
  - { type: is-related-to, target: ADR-0018 }
  - { type: is-related-to, target: ADR-0025 }
related_concerns: []
history:
  - { state: decided, date: 2026-10-01, by: bjornslib, note: "Decided in chat on 2026-10-01 after a brief review. Design mode stage 3 was skipped by choice, and stage 4 ran with two cited challenges." }
maps_to:
  context: cobuilder-packaging
  modules: [plugins/architect/commands/options.md, plugins/architect/skills/architecture/SKILL.md, plugins/architect/skills/architecture/references/options-mode.md, plugins/architect/scripts/check_options_report.py]
  rule: "An architect mode that proposes options never records a decision. Design stage 4 alone fills intent.alternatives."
delivers:
  capability: "An engineer gets one report of inquiries and alternatives about the whole system before any design starts."
  benefit: "The questions worth designing surface early, with evidence and a confidence tag on each claim, so design mode starts from a chosen inquiry and not a blank outcome."
  beneficiary: [developer]
related:
  - "docs/architecture/contexts/cobuilder-packaging/boundary.yaml"
---

# ADR-0035 — The options mode proposes alternatives, and design mode decides

## Context

Review mode scores defects. Design mode designs one change from an outcome that the engineer named first. A manual run showed a third need. An engineer wants to ask whether the flow and the technology choices of the whole system are still right. A user of CoBuilder asked for this.

## Options considered

1. **A pre-step inside design mode.** Rejected. Design mode designs one change, and this work covers the whole system.
2. **An `options.json` file.** Rejected. Nothing would read it.
3. **Mermaid diagrams.** Rejected. Mermaid cannot draw the emphasis borders and badges.
4. **A Lavish dependency.** Rejected. The report must open from a double click.
5. **Divergent exploration inside the mode.** Rejected. It belongs to design stage 3.
6. **The words "finding" or "question".** Rejected. Both already have a meaning.
7. **A seventh mode with one HTML report (chosen).**

## Decision

Add `/architect:options`. The mode runs seven stages, 0 to 6. It writes one HTML report under `docs/architecture/options/<name>/`. A validator in `plugins/architect/scripts/` reads the HTML and checks its structure. The hand-off to design is a paste of the decisions text, which holds the inquiry IDs. Out of scope: divergent exploration, a Lavish integration, a record-index entry, a PDF export, and a foreign-repo target.

## Consequences

- **Positive:** The questions worth designing surface before design starts. The report opens offline.
- **Constraint introduced:** An architect mode that proposes options never records a decision. Design stage 4 alone fills `intent.alternatives`.
- **Negative / accepted:** The viewer does not show the report (ADR-0018). The validator checks form and not truth.

## Value delivered

- **New capability:** An engineer gets one report of inquiries and alternatives about the whole system.
- **Benefit:** The questions worth designing surface early.
- **Beneficiary:** The developer.

## Maps to

Context `cobuilder-packaging`, modules `plugins/architect/commands/options.md`, `plugins/architect/skills/architecture/SKILL.md`, `plugins/architect/skills/architecture/references/options-mode.md`, and `plugins/architect/scripts/check_options_report.py`.
