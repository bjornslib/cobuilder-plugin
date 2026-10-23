---
# --- doc-gardener required frontmatter ---
title: "ADR-0045 — The priority-dev spike measures its unknowns, probes first"
status: active
type: architecture
last_verified: 2026-10-24
owner: bjoerns
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0045
name: "The priority-dev spike measures its unknowns, probes first"
state: decided
groups: [workflow, verification]
approved_by: ""
problem: "The design of priority.dev rests on unmeasured guesses about a small model, the Claude Code hooks, and tmux. The policy and the actuator would send text into live sessions on those guesses."
decision: "A spike program of 4 epics and 13 slices, built with implement, measures each unknown. The probes come first, each unknown is a criterion in a blind rubric, and the code lives in an isolated priority-dev/ folder."
alternatives:
  - option: "A deterministic interpreter with no model, from hook fields and regex"
    rejected_because: "It retires no model unknown, and it breaks the decision to use Nemo and Inkling."
  - option: "An evidence-grade hash chain over every record"
    rejected_because: "Nobody audits a spike, and the chain delays the first slices. Model id, prompt hash, and raw reply are kept without a chain."
  - option: "The event log envelope first, as the only durable contract"
    rejected_because: "The envelope depends on real hook payloads and transcript lag, which the probes measure."
  - option: "One 60-line script as the whole spike"
    rejected_because: "It skips the hook and tmux unknowns. It is kept as slice 1 only."
  - option: "A claims.yaml ledger file with pass lines"
    rejected_because: "A hidden blind rubric already carries each measure, and a second file would drift from it."
  - option: "A pd command-line tool and a runbook inside the spike"
    rejected_because: "They add polish before the unknowns are measured. Only the hook timeout and the bypass file are kept."
  - option: "Keep the first draft order, with the hook slices last"
    rejected_because: "The hook and tmux results change how the adapter works, so late probes risk rework."
forces:
  - "A slice passes only at 0.90 or better against a blind rubric (ADR-0012)."
  - "Workflow state goes through the tracker port (ADR-0040, ADR-0031)."
  - "The plugin repository is not an app, and its install surface stays narrow (ADR-0025)."
  - "The engineer chose Nemo and Inkling through OpenRouter, DSPy, no Jev, and real local fixtures."
related_decisions:
  - { type: depends-on, target: ADR-0012 }
  - { type: depends-on, target: ADR-0040 }
  - { type: is-related-to, target: ADR-0031 }
  - { type: is-related-to, target: ADR-0025 }
related_concerns: []
history:
  - { state: decided, date: 2026-10-24 }
maps_to:
  context: cobuilder-packaging
  modules: [priority-dev/]
  rule: "Code under priority-dev/ never imports from plugins/ or shared/, and the plugin tests never collect it."
delivers:
  capability: "Each unknown of priority.dev gets a measured answer before the policy and the actuator exist."
  benefit: "Later phases build on facts. A refuted claim costs a slice, not a rewrite of the actuator."
  beneficiary: [developer, the-business]
related:
  - "docs/architecture/designs/priority-dev-spike/goal.json"
---

# ADR-0045 — The priority-dev spike measures its unknowns, probes first

## Context

The design of priority.dev went through ten rounds and holds documents only. Six things are unmeasured. They include whether a small model (Nemo) fails on nested action payloads. The free Inkling tier may rate-limit a run. The Claude Code hooks may not behave as the documentation reads. A paste into a tmux pane may be lost. A wrong guess here reaches the actuator, which sends text into live sessions.

## Options considered

1. **A model-free interpreter.** Rejected. It retires no model unknown.
2. **A hash chain over every record.** Rejected. Nobody audits a spike.
3. **The event log first.** Rejected. The envelope depends on real payloads.
4. **One script as the whole spike.** Rejected as a whole. Kept as slice 1.
5. **A claims ledger file.** Rejected by the engineer. The blind rubrics carry the claims.
6. **A runbook command-line tool.** Rejected for the spike. Only the timeout and the bypass file stay.
7. **The first draft order.** Rejected by the engineer. The hook and tmux probes come early.
8. **The chosen option.** A spike program of 4 epics and 13 slices, probes first, built with implement.

## Decision

The program `priority-dev-spike` has four epics. E1 holds three probes: a model probe, a hook probe, and a tmux probe. E2 holds the stop brief, Interpret, Digest, and the replay report. E3 holds the event log. E4 holds the adapter to the log. Each unknown is a criterion in the blind rubric of its slice. A rubric scores the honesty and completeness of a report, not the size of a number.

After slice 7, the engineer decides go or no-go from the replay report. Three merges apply. Every stored model call records its model id, prompt hash, and raw reply. Every hook exits within a few seconds on any failure, and a bypass file turns all hooks into no-ops. A failed model call ends as an Abstain with a logged reason, proved by injected failures.

Out of scope: Jev, the policy, the actuator, the attention queue, the notifier, a second harness, and a real program for later phases. Later phases are planned epics until each has its own design.

The interpreter input is named the stop brief, so that slice keeps its CoBuilder meaning.

## Consequences

- **Positive:** The first model signal arrives in slice 1. The hook and tmux unknowns are measured before any database exists.
- **Constraint introduced:** Code under `priority-dev/` never imports from `plugins/` or `shared/`, and the plugin tests never collect it. One module reads the model key.
- **Negative / accepted:** The beads data of this repository holds priority.dev records. A probe slice may refute its claim and still pass its rubric.

## Value delivered

- **New capability:** Each unknown of priority.dev gets a measured answer before the policy and the actuator exist.
- **Benefit:** Later phases build on facts. A refuted claim costs a slice, not a rewrite.
- **Beneficiary:** The developer, and the business that relies on a safe actuator.

## Maps to

Context `cobuilder-packaging`, module `priority-dev/`. The context has no boundary rule for this folder yet. The design records that gap, and describe mode closes it once code exists.
