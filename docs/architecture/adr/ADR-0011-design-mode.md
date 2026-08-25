---
# --- doc-gardener required frontmatter ---
title: "ADR-0011 — Design mode: capture intent before the code exists"
status: active
type: architecture
last_verified: "2026-08-19"
owner: bjoerns
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0011
name: "Design mode: capture intent before the code exists"
state: decided
groups: []
approved_by: ""
problem: "The plugin captures author intent at submit time, after the change exists. Nothing captures it at design time, when the engineer still holds the alternatives, the constraints, and the doubts."
decision: "Add /cobuilder-architect:design, a seven-stage interview-led design mode that writes docs/architecture/designs/<name>/, drafts a proposed ADR, and joins N pull requests through an epics array and the branch name design/<name>[/<epic-slug>]."
alternatives:
- option: "Build design mode in archkit, next to its existing design mode"
  rejected_because: "The interview discipline, the bundle, the diagram pipeline, and the viewer all live here. archkit's contribution is one skill call."
- option: "Keep archkit an optional dependency and degrade when absent"
  rejected_because: "A design mode whose substance is optional degrades silently into a chat."
- option: "Ask the engineer which options they rejected, as an interview question"
  rejected_because: "A rejected option is an outcome of the design process, not an input to it."
- option: "Mint a synthetic PR key so a design enters the story.json timeline directly"
  rejected_because: "story.json keys on an integer pr, and four readers depend on it."
- option: "Keep a scalar branch field and accept one PR per design"
  rejected_because: "An initiative with N epics produces N pull requests. A 1:1 join cannot express that."
forces:
- "story.json keys on an integer pr, and a design has no PR number"
- "interview-guide.md caps the interview at six topics"
- "the plugin ships no agents, hooks, or MCP servers"
- "cobuilder-factory owns epic decomposition; design mode must not grow a second planning tier"
related_decisions:
- {type: is-related-to, target: ADR-0009}
- {type: is-related-to, target: ADR-0014}
related_concerns: []
history:
- {state: decided, date: "2026-08-19", note: "Amended from the hand-authored draft to use docs/, epics, and the cobuilder-architect command prefix. Chosen on this branch; not approved until a human merges."}
maps_to:
  district: skills
  unanchored: true
  modules:
  - skills/odyssey
  - commands
  rule: "A design lives under docs/architecture/designs/<name>/ and never enters story.json until submit files a real PR number."
delivers:
  capability: "An engineer can design a change with the plugin before writing it, and the design carries through to the pull requests that implement it."
  benefit: "Intent, alternatives, and constraints are recorded while the author still knows them, so generate mode stops reconstructing them from merged code."
  beneficiary:
  - developer
  - reviewer
  - the-business
provenance: authored
---

## Context

Submit mode interviews an author before the pull request opens. That is already
later than the moment the alternatives are still open. Design mode reaches that
moment. The design stays off the timeline until submit mode files it under the
real number that `gh pr create` returns.

## Options considered

1. **Build it in archkit.** Rejected. This plugin holds the interview, the
   bundle, the diagram subagent, and the viewer.
2. **Keep the architecture skill optional.** Rejected. The corpus is the design
   content, not an enhancement.
3. **Ask which options they rejected.** Rejected. Stages 3 and 4 produce those.
4. **Mint a synthetic PR key.** Rejected. Four readers assume `pr` is real.
5. **One branch per design.** Rejected. N epics need N pull requests.

## Decision

`/cobuilder-architect:design` runs seven stages and writes
`docs/architecture/designs/<name>/`. The ADR is `state: decided`. Stage 4 is
the challenge gate. Stage 7 asks whether this is one PR or several, captures
epic slugs if several, and creates the first local branch only.

`goal.json` holds an `epics` array. The branch form is `design/<name>` or
`design/<name>/<epic-slug>`. Submit mode strips `design/`, takes the first
segment as the name, and measures drift per epic.

## Consequences

- **Positive:** rejected options exist before any code exists.
- **Constraint introduced:** design mode does not decompose epics.
- **Negative / accepted:** stage 7 does nothing under `--non-interactive`.

## Value delivered

- **New capability:** design a change before writing it.
- **Benefit:** generate mode stops guessing intent.
- **Beneficiary:** developer, reviewer, the-business.

## Maps to

District `skills`. Unanchored until a boundary.yaml exists.
