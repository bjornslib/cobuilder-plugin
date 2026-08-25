window.ADRS = {
  "ADR-0014": {
    "id": "ADR-0014",
    "title": "ActiveGraph event-sourced graph as shared agent state; DOT becomes a compiled projection",
    "state": "approved",
    "source_pr": 79,
    "approved_by": "bjoerns",
    "problem": "Pipeline state is split across DOT files, checkpoints, signal files, and beads, with no single auditable source of truth shared by planner, worker, and guardian agents.",
    "decision": "Adopt the ActiveGraph event-sourced reactive graph as the single source of truth for agent work state; the DOT file is demoted to a read-only visualization projection compiled from the graph.",
    "alternatives": [
      {
        "option": "Keep DOT files as source of truth, add ActiveGraph as a mirror only",
        "rejected_because": "Two writable sources of truth invite drift; replay/fork/diff only deliver value when the graph is authoritative."
      },
      {
        "option": "Extend beads (bd) into the shared runtime state store",
        "rejected_because": "Beads is an issue tracker with git-sync semantics, not a reactive runtime \u2014 it has no event subscriptions, replay, fork, or scoped views for agent dispatch."
      },
      {
        "option": "Build a bespoke event log inside execution_engine",
        "rejected_because": "Reinvents replay/fork/diff/approvals/policies that activegraph 1.x already provides with a determinism contract and pack ecosystem."
      }
    ],
    "forces": [
      "Agent-swarm economics \u2014 a frontier planner with cheap workers requires shared state that scales decomposition dynamically",
      "Guardian validation requires auditable, replayable history independent of agent self-reporting",
      "Existing tooling (pipeline-watch, tmux-nav, cli.py watch) consumes DOT and signal files and must keep working during migration",
      "Determinism contract: all side effects (pi-SDK dispatch, tool calls) must route through recorded tools or replay diverges"
    ],
    "delivers": {
      "capability": "Replayable, forkable, diffable shared agent state with reactive dispatch \u2014 crash recovery via Runtime.load, counterfactual runs via fork/diff, and coordination via event subscriptions instead of a polling orchestrator loop.",
      "benefit": "One auditable log replaces DOT + checkpoint + signal-file triple bookkeeping; guardian validation gains verifiable history; dynamic decomposition replaces fixed pipeline templates.",
      "beneficiary": [
        "developer",
        "validator-agent",
        "operator"
      ]
    },
    "maps_to": "cobuilder",
    "body": "## Context\n\nPipeline execution state currently lives in four places: the DOT file (topology plus node states, mutated in place), checkpoint files (resume state), signal files (worker completion reports), and beads (issue tracking). No component holds the full history; crash recovery depends on checkpoints staying in sync with the DOT file; and the guardian validates against agent self-reports rather than an independent record.\n\nThe exploration in `examples/activegraph_shared_state/` demonstrated on activegraph 1.10.0 that the harness's goal \u2192 epic \u2192 task flow, dependency unblocking, and guardian gap closure express naturally as reactive behaviors over one event-sourced graph, with replay reconstructing exact state from the log and fork/diff producing auditable counterfactuals.\n\n## Options considered\n\n1. **Keep DOT authoritative, mirror into ActiveGraph.** Lowest risk, but two writable sources of truth drift, and replay/fork are meaningless when the mirror is not authoritative. Acceptable only as a transitional phase.\n2. **Extend beads into the runtime store.** Beads' flat-issues-plus-typed-edges model is the right shape (see ADR-0015) but bd is a tracker, not a reactive runtime: no subscriptions, replay, fork, views, or approvals.\n3. **Bespoke event log in execution_engine.** Full control, but re-implements what activegraph provides under a tested determinism contract, and forfeits the pack ecosystem.\n4. **ActiveGraph authoritative, DOT compiled (chosen).** The graph is the single writable state; a small exporter compiles DOT for pipeline-watch and human review. Migration runs through option 1 as a shadow phase.\n\n## Decision\n\nAdopt ActiveGraph as the single source of truth for agent work state, in three phases:\n\n- **Phase A (shadow):** an ActiveGraph EventSink backend on the existing pipeline event bus mirrors all 19 event types into an ActiveGraph run. No new adapter surface, no behavior change. This is what PR #79 delivers.\n- **Phase B (authoritative):** dispatch becomes a behavior reacting to `task.ready` events; pi-SDK dispatch wraps as a recorded tool so replay serves cached results; a graph \u2192 DOT exporter feeds pipeline-watch. `wait.human` gates map to ActiveGraph approvals; `wait.cobuilder` gates are retired in favor of a red \u2192 green \u2192 validate \u2192 replan task-state flow.\n- **Phase C (retire):** checkpoint files and hand-authored pipeline DOT are removed; templates are replaced by planner behaviors that create milestone/task objects.\n\nOut of scope: replacing beads as the human-facing tracker, and FalkorDB scaling.\n\n## Consequences\n\n- **Positive:** one auditable log; free crash recovery via `Runtime.load`; counterfactual evaluation via fork/diff; dynamic decomposition depth; failures become events that policies can react to.\n- **Constraint introduced:** agent work state is written only as ActiveGraph events; DOT and signal files are compiled projections, never hand-edited sources.\n- **Negative / accepted:** the determinism contract requires wrapping every side effect as a recorded tool (the main engineering cost); existing DOT tooling needs a projection adapter during Phase B; activegraph is a young 1.x dependency and must be version-pinned.\n\n## Value delivered\n\nReplayable, forkable, diffable shared agent state with reactive dispatch. It eliminates triple bookkeeping, gives the guardian verifiable history instead of self-reports, and unlocks planner-generated task graphs. Beneficiaries: developer, validator-agent, operator.\n\n## Maps to\n\nDistrict `cobuilder` (the CoBuilder Engine), module `cobuilder/execution_engine`.\n\n_Record transcribed from the repo's own ADR-0014 as it stands on this open PR's branch; approval history is the repo's, not inferred._"
  },
  "ADR-0015": {
    "id": "ADR-0015",
    "title": "Work hierarchy shape: project \u2192 milestone \u2192 task spine with satellite action/artifact/evaluation",
    "state": "approved",
    "source_pr": 79,
    "approved_by": "bjoerns",
    "problem": "The ActiveGraph-backed work model needs a settled vocabulary and shape: is it goal \u2192 epic \u2192 story \u2192 task \u2192 action \u2192 artifact \u2192 evaluation as nested levels, or something else?",
    "decision": "Adopt the team_ops containment spine verbatim \u2014 project (= goal) \u2192 milestone (= epic) \u2192 task, with tasks nesting recursively instead of a fixed story level \u2014 plus action, artifact, and evaluation as satellite objects attached by typed relations, never as hierarchy levels.",
    "alternatives": [
      {
        "option": "Fixed seven-level ladder: goal \u2192 epic \u2192 story \u2192 task \u2192 action \u2192 artifact \u2192 evaluation",
        "rejected_because": "Conflates two axes: action/artifact/evaluation are execution records, outputs and judgments attached BY relation, not units of work below task. A fixed story level forces padding on small features and is too shallow for large ones."
      },
      {
        "option": "Beads-style single issue type with unlimited parent-child nesting, no named levels",
        "rejected_because": "Goal and epic carry distinct spec contracts and distinct planner behaviors; erasing the named levels loses the 1:1 mapping to specs and to bd's epic type."
      },
      {
        "option": "Bespoke goal/epic object types in a thin cobuilder pack, alongside unused team_ops project/milestone",
        "rejected_because": "Two container vocabularies for the same levels guarantees drift and forfeits team_ops ecosystem behaviors (milestone_tracker, task_triager)."
      }
    ],
    "forces": [
      "Beads as role model: flat store plus typed edges, with ready-state derived rather than stored; local bd data shows epic/task carry 99% of work volume and story does not exist",
      "ActiveGraph core pack contract: task/action/artifact/evaluation with executes/generates/evaluates relations \u2014 adopting packs verbatim maximizes ecosystem reuse",
      "Decomposition depth must be dynamic \u2014 the tree grows to the problem's contours",
      "Guardian gradient scoring (accept only above 0.90) needs evaluation as a first-class scored object, not a log line"
    ],
    "delivers": {
      "capability": "A settled, pack-aligned vocabulary for all agent work state \u2014 every planner, worker, and guardian behavior reads and writes the same object types and relations.",
      "benefit": "Specs, beads, and runtime state stop diverging: goal \u2194 BS, epic \u2194 TS, task \u2194 bd task, evaluation \u2194 guardian scorecard \u2014 one graph carries what four systems tracked separately.",
      "beneficiary": [
        "developer",
        "validator-agent",
        "operator"
      ]
    },
    "maps_to": "cobuilder",
    "body": "## Context\n\nADR-0014 makes an ActiveGraph run the shared state for all agents. That state needs a settled shape. The proposal on the table was a seven-level ladder: goal \u2192 epic \u2192 story \u2192 task \u2192 action \u2192 artifact \u2192 evaluation.\n\nTwo reference models inform the answer. Beads, the harness's tracker, uses a flat issue store with few types and typed dependency edges, deriving ready-state rather than storing it. ActiveGraph's own core pack already defines task/action/artifact/evaluation with executes/generates/evaluates relations.\n\n## Decision\n\nWork containment is `project` \u2192 `milestone` \u2192 `task`, with tasks nesting recursively via `parent_of`. `action`, `artifact` and `evaluation` attach to that spine only via `executes`, `generates`, `evaluates` and `discovered_from` \u2014 they are never hierarchy levels.\n\n## Consequences\n\n- Decomposition depth becomes a property of the problem rather than of the template.\n- Guardian scores become first-class `evaluation` objects that can be queried and compared, not log lines.\n- The vocabulary is inherited rather than invented, so team_ops behaviors (milestone_tracker, task_triager) apply without adaptation.\n\n## Value delivered\n\nOne vocabulary shared by planner, worker and guardian, mapping cleanly onto the specs and tracker that already exist. Beneficiaries: developer, validator-agent, operator.\n\n## Maps to\n\nDistrict `cobuilder`, modules `cobuilder/execution_engine` and `.cobuilder/templates`.\n\n_Record transcribed from the repo's own ADR-0015 as it stands on this open PR's branch._"
  },
  "ADR-0016": {
    "id": "ADR-0016",
    "title": "ActiveGraph event-bus sink: additive, default-off backend",
    "state": "decided",
    "source_pr": 79,
    "problem": "Phase A of ADR-0014 adds an ActiveGraph backend under the published events format path, which is governed by a path-based gate. The gate requires a record naming affected consumers \u2014 is the events JSONL contract changing?",
    "decision": "Add ActiveGraphEmitter as a fourth EventEmitter backend plus two default-off EventBusConfig fields (activegraph_enabled, activegraph_store). The published events JSONL format is NOT changed; the new sink is a parallel consumer of the same PipelineEvent stream, so ADR-0007's consumers (cobuilder-frontend, sidecar) are unaffected.",
    "alternatives": [
      {
        "option": "Change the events JSONL schema to embed graph ids",
        "rejected_because": "Would break the ADR-0007 published contract and force cobuilder-frontend and sidecar changes \u2014 unnecessary, since the sink derives its own object ids internally."
      },
      {
        "option": "Bypass the format gate since the change is additive",
        "rejected_because": "The gate is path-based by design (ADR-0008); recording the no-impact-on-consumers fact IS the value, and a silent bypass defeats the governance ADR-0007 established."
      }
    ],
    "forces": [
      "The events directory is a published contract (ADR-0007): any change needs a record naming consumers",
      "ADR-0014 (approved) mandates ActiveGraph as the event sink; this is its Phase A landing",
      "Existing runs must be byte-for-byte unchanged \u2014 the backend defaults OFF",
      "EventEmitter is a structural protocol, so a new backend needs zero call-site changes"
    ],
    "delivers": {
      "capability": "Pipeline runs can additionally mirror their full event history \u2014 including agent.* session trajectories \u2014 into a replayable ActiveGraph run, without touching the published JSONL format.",
      "benefit": "Delivers ADR-0014 Phase A (auditable, replayable shared state) at zero risk to the Python/TypeScript format seam ADR-0007 protects.",
      "beneficiary": [
        "developer",
        "validator-agent",
        "operator"
      ]
    },
    "maps_to": "cobuilder",
    "body": "## Context\n\nADR-0014 specifies Phase A as an EventSink on the existing pipeline event bus. That bus lives under `cobuilder/execution_engine/events/`, a path the arch-governance gate protects because ADR-0007 declared the events JSONL a published contract consumed cross-language by cobuilder-frontend and the sidecar. Landing spike 1 therefore requires this record.\n\n## Options considered\n\n1. **Change the JSONL schema.** Rejected \u2014 breaks ADR-0007's contract and its consumers for no benefit; the sink mints its own ActiveGraph object ids.\n2. **Bypass the gate.** Rejected \u2014 the gate is path-based by design; the honest record that consumers are unaffected is exactly the value.\n3. **Additive default-off backend (chosen).** A new `ActiveGraphEmitter` implementing the structural `EventEmitter` protocol, appended in `build_emitter()` only when `activegraph_enabled` and `activegraph_store` are both set. Nothing existing changes.\n\n## Decision\n\nAdd `ActiveGraphEmitter` and the two default-off `EventBusConfig` fields. The published events JSONL format is unchanged. The new backend is a parallel consumer of the `PipelineEvent` stream \u2014 the same objects `EventBuilder` already produces \u2014 so cobuilder-frontend and sidecar are unaffected.\n\n## Consequences\n\n- **Positive:** ADR-0014 Phase A lands (full history, including `agent.*` session trajectories, in a replayable graph) at zero format risk.\n- **Constraint introduced:** future consumers of the event stream are added as EventEmitter backends, never by mutating the JSONL schema; a real format change still requires its own ADR-0007 record.\n- **Negative / accepted:** two more `EventBusConfig` fields, and `activegraph` becomes a new optional dependency \u2014 import-guarded, degrading to a no-op when absent.\n\n## Value delivered\n\nAn opt-in replayable ActiveGraph mirror of pipeline runs, delivering Phase A of the approved ADR-0014 without disturbing the format seam. Beneficiaries: developer, validator-agent, operator.\n\n## Maps to\n\nDistrict `cobuilder`, module `cobuilder/execution_engine/events`.\n\n_Record transcribed from the repo's own ADR-0016 as it stands on this open PR's branch; state is `decided`, not yet approved, matching the source record._"
  }
};
