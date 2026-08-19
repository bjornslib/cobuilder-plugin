---
# --- doc-gardener required frontmatter ---
title: "ADR-NNNN — <decision name>"
status: active
type: architecture
last_verified: YYYY-MM-DD
owner: <owner>
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-NNNN
name: "<decision name>"
state: tentative           # idea|tentative|decided|approved|challenged|rejected|discarded
groups: []                 # cross-cutting theme tags, e.g. [ddd-alignment]
approved_by: ""            # REQUIRED non-empty to enter `approved`; human identity only
problem: "<the problem this decision answers>"
decision: "<the chosen option, one sentence>"
alternatives:              # >=1 entry — what was traded away (P2 guard)
  - option: "<rejected option>"
    rejected_because: "<why>"
forces:                    # constraints/drivers: requirements, expertise, business
  - "<force>"
related_decisions: []      # typed edges to EXISTING records only:
                           #   {type: depends-on|caused-by|is-excluded-by|replaces|is-alternative-for|is-related-to, target: ADR-NNNN}
related_concerns: []       # van Heesch concern codes, e.g. [C3, C6]
history:                   # oldest first; never invent dates (integrity rules §5)
  - { state: tentative, date: YYYY-MM-DD }
maps_to:                   # structural anchor — context must have a boundary.yaml
  context: <context-id>
  modules: [<repo/path/to/module>]
  rule: "<one-line invariant this decision establishes>"
delivers:                  # MANDATORY value facet
  capability: "<what is now possible that was not before>"
  benefit: "<the value created and why it matters>"
  beneficiary: []          # operator | developer | validator-agent | the-business
  # enables: ["<future capability unlocked>"]
  # addresses_problem: P1|P2|P3|P4
# source_pr: NN            # retro-extraction only
related:
  - "{doc_root}/architecture/contexts/<context-id>/boundary.yaml"
---

# ADR-NNNN — <decision name>

## Context

<What situation demanded a decision. Facts, not advocacy.>

## Options considered

1. **<option A>.** <analysis; why rejected/accepted>
2. **<option B (chosen)>.** <analysis>

## Decision

<The chosen option and its scope. What is explicitly out of scope.>

## Consequences

- **Positive:** <...>
- **Constraint introduced:** <the invariant this ADR governs — must match maps_to.rule and the
  context's boundary.yaml>
- **Negative / accepted:** <...>

## Value delivered

- **New capability:** <mirror delivers.capability>
- **Benefit:** <mirror delivers.benefit — why it is worth it>
- **Beneficiary:** <who gains>

## Maps to

Context `<context-id>`, module(s) `<paths>`. See the boundary record's rule and the context canvas.
