<!-- PR body skeleton. Fields come from the `intent` block:
     references/interview-guide.md §1. -->
## Problem

A design drafted in design mode never states how the system will hold together at runtime. Three diagrams carry the overview, the message flow, and the types. Nothing shows the boundaries the system will defend, the protocol crossing each one, or the data stores and external systems the design adds. Nothing validates the draft before the engineer reads it, so the only independent eyes available are the session that wrote it. And a design that introduces an endpoint surface or an entity model scatters those contracts across prose that no view can read as a whole.

The comparison against Nexus's architecture pipeline surfaced the gap on both sides at once. Nexus's architecture prompt specifies the runtime diagram contract and its pass-cube evaluation gate. This family has the review loop and a record index, but no runtime picture, no draft review, and no contracts artifact.

## Why this approach

Harnesses and models now follow skill instructions well enough that three borrowings need no new machinery. The runtime diagram is one named file compiled to one record key; the reviewer is one session spawn under the pattern diagram authoring already uses; contracts.md rides the projection path pr-draft.md already walks. The RED/GREEN/VALIDATE roles prove independent review works without a shipped agent, and `model: glm-5.3-flash:cloud` covers the subagent spawns per the engineer's standing directive. Not one DAG runtime, not one new install surface, and not one renumbered level.

## Alternatives considered

- **`diagrams/level-0.mmd` with renumbered levels** — rejected because the level keys are load-bearing in build_index, the viewer tile filter, and the readiness check, and the engineer asked for the overview to keep leading.
- **A fourth narrative level** — rejected because designs carry three levels when they have no diff, and a fourth level crowds the file-changes slot the PR contract reserves.
- **A per-PR level-1 brief upgrade** — rejected at engineer instruction: PR stage is too late; the runtime diagram belongs to architecture:design.
- **A hard pass-cube gate at design review** — deferred, not dropped: pre-code findings are predictions, so the reviewer enters stage 6 as advisory challenges; the hard form stays available for implement Gate 2.
- **Endpoints and data models inside intent.json** — rejected because intent.json is the interview record and stage two deliberately collects five topics only.

## Out of scope

- A DAG execution workflow or any orchestration engine.
- Changes to the per-PR diagram contract or build_diagrams.py validation.
- Glossary work on Non-Goals, already covered by intent.out_of_scope and goal.abort_if.
- Any new agent file or hook outside implement.

## Risks

- Mermaid's C4 clustered-boundary rendering is weaker than Graphviz's dot clusters, so the 8-to-30-node cap may bind harder here than it did in Nexus.
- The stage-6 reviewer adds spawn latency to every design round and shares the churn budget with it.
- A blind rubric from goal.json alone is thinner pre-code than post-diff, so scores can inflate; mandatory citation and the advisory classification carry that risk.

## How this was tested

Design-stage checks, all predictions: the record index compiled with the self bundle carrying the new artifacts, the viewer design route rendered the runtime tile ahead of the class tile, pytest on the touched build_index and viewer tests, and a real end-to-end run against the visualisation-decision-memory design in the think-with-ai repository.

## Where to focus

The record-index shape: does record["diagrams"]["runtime"] break any call site that filters or reads the diagrams dict. The blind rubric derivation: does the reviewer read goal.json and intent.json before the draft and never the ADR. The contracts skip rule: a design with no public surface states its skip rather than going silent.

The author flagged these parts as not fully understood: whether the viewer's inline-SVG tile renders acceptably across themes, and whether one reviewer spawn per round is enough or the round budget needs a configurable k before the reviewer epic ships.