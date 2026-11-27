---
# --- doc-gardener required frontmatter ---
title: "ADR-0053 — The priority reader runs in Pi and OMP on a shared core and priority transcripts"
status: active
type: architecture
last_verified: 2026-11-25
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0053
name: "The priority reader runs in Pi and OMP on a shared core and priority transcripts"
state: decided
groups: [workflow, packaging]
approved_by: ""
problem: "Many coding agents run in parallel, and nothing ranks what they need. The priority reader works only in Claude Code. priority-dev reads only Claude Code transcripts, and the plugin runs on the Claude Code mod engine. The fleet moves to Pi, OMP, and later Pi Durable."
decision: "priority-dev reads each harness through one transcript adapter for each dialect, which writes a priority transcript. priority read prints one Reading as JSON for any agent. A shared TypeScript core holds the reading contract and a pure evaluate. The Claude Code plugin and a new Pi package for Pi and OMP use the core. A Pi Durable orchestrator may answer for the person only when evaluate allows the action. This amends ADR-0051, ADR-0052, and ADR-0016."
alternatives:
  - option: "A separate Pi extension with no code from the Claude Code plugin"
    rejected_because: "Two hand copies of the card and draft logic drift apart. The engineer chose one shared core for Claude Code, Pi, and OMP."
  - option: "The extension flattens the Pi branch into a Claude Code JSONL file"
    rejected_because: "An agent outside Pi could not read a Pi session. The engineer chose transcript adapters in priority-dev, so the design stays uniform."
  - option: "Port the D1 program to a TypeScript runner"
    rejected_because: "The 0.654 score holds only for its model, provider, and DSPy prompt. A second reader drifts from the first."
  - option: "A long-lived reader service that every host posts turn records to"
    rejected_because: "The repo has no deploy step. A service that receives full transcripts weakens the per-session opt-in of ADR-0051."
  - option: "Byte-identical readings for the same transcript in every host"
    rejected_because: "The model is not deterministic. Parity is exact from a reading to its card text, and by score from a transcript to a reading."
  - option: "A spot check of the cards by eye"
    rejected_because: "It catches no drift between the hosts."
  - option: "The orchestrator LLM decides by judgment, and its prompt is the rule"
    rejected_because: "The rule must be recorded and testable. The priority-dev design says that the model proposes and a pure evaluate decides."
  - option: "A rule table only, with no LLM in the choice"
    rejected_because: "The engineer wants the orchestrator to judge when an answer is obvious. The gate still has the last word."
  - option: "Control stays in Python behind a priority-dev endpoint"
    rejected_because: "A Durable Object runs no Python, and the actuator runs evaluate again just before each send."
  - option: "A priority_ask tool in both hosts, with the OMP ask tool blocked"
    rejected_because: "The engineer chose to hook the question tool of each host, in its own data shape."
  - option: "Leave question stops out"
    rejected_because: "ADR-0052 already reads question stops in Claude Code, so Pi and OMP would fall behind."
  - option: "The Pi package as a sub-folder of plugins/cobuilder-priority"
    rejected_because: "Each Claude Code install would carry a Pi package that it cannot load."
  - option: "The Pi package inside priority-dev"
    rejected_because: "It adds a second runtime to priority-dev, which ADR-0045 keeps as a Python leaf."
  - option: "Build the core and the Pi package before D1 is scored on Pi stops"
    rejected_because: "Abort gate 3 would fire after the build is spent. The engineer took the reviewer's survivor to score D1 first, in E4."
  - option: "A deny list stricter than schemas.md section 4"
    rejected_because: "The priority-dev design already sets a starting verdict for each action kind. The engineer chose two guards on top of it, not a second table."
forces:
  - "brief/transcript.py reads only the Claude Code JSONL shape. A Pi or OMP session is a tree of entries with a session header."
  - "D1 scored 0.654 on 56 Claude Code stops. No score exists for Pi or OMP stops."
  - "OMP loads a Pi extension unchanged. It rewrites the Pi import names and reads the pi manifest key."
  - "Pi fires agent_settled at a stop. OMP fires session_stop. An event that a host does not know never fires and raises no error."
  - "Pi has no question tool. OMP has a built-in ask tool, and its tool_call handlers fail closed after 30 seconds."
  - "OMP bundles its own pi-tui, so a pi-tui component class would force a fork."
  - "Pi Durable 1.6 is experimental. Its extensions are a separate model, a Worker runs no Python, and no push from a child to its parent is documented."
  - "tests/test_plugin_manifests.py requires a Claude Code manifest in each folder under plugins/."
  - "priority-dev/docs/design/components.md section 2: the interpreter proposes, a pure evaluate decides, and the actuator executes and checks again."
related_decisions:
  - { type: is-related-to, target: ADR-0051 }
  - { type: is-related-to, target: ADR-0052 }
  - { type: is-related-to, target: ADR-0045 }
  - { type: is-related-to, target: ADR-0016 }
  - { type: is-related-to, target: ADR-0017 }
  - { type: is-related-to, target: ADR-0025 }
related_concerns: []
history:
  - { state: decided, date: 2026-11-25, note: "Drafted by design mode for the priority-dev-pi-extension design. The engineer chose transcript adapters, split parity, a shared TypeScript core, propose and gate with evaluate in the core, a question hook for each host, and a top-level pi/ folder." }
  - { state: decided, date: 2026-11-25, note: "Review round 1 (draft review 0.68). The engineer took the survivor that scores D1 first (E4), named a container child the first E8 route, and set the starting policy to schemas.md section 4 with two guards." }
  - { state: decided, date: 2026-11-25, note: "Gate 2b feedback. If probe E1 shows that OMP cannot hold its ask call, OMP question stops are not supported. The engineer rejected a read-only card beside the OMP dialog." }
maps_to:
  context: cobuilder-priority
  modules: [shared/priority-core, plugins/cobuilder-priority, pi/cobuilder-priority, priority-dev/src/priority/brief, priority-dev/src/priority/cli.py]
  rule: "A host adapter calls priority-dev only as a process, and it gives cards only through the shared core. Only evaluate may allow an answer that no person pressed."
delivers:
  capability: "The priority reader works in Claude Code, Pi, and OMP from one contract. Any coding agent can read a session and get the cards as JSON."
  benefit: "The engineer gets readings for the sessions they now run, and a later orchestrator can act on the same cards under a tested rule."
  beneficiary: [developer]
  enables: ["A Pi Durable orchestrator that answers obvious cards and notifies the person about the rest", "A reading for any harness that gets a transcript adapter"]
  addresses_problem: P1
source_pr: null
related:
  - "docs/architecture/designs/priority-dev-pi-extension/contracts.md"
  - "docs/architecture/contexts/cobuilder-priority/boundary.yaml"
  - "docs/architecture/contexts/priority-dev/boundary.yaml"
  - "priority-dev/docs/design/components.md"
  - "priority-dev/docs/design/schemas.md"
---

# ADR-0053 — The priority reader runs in Pi and OMP on a shared core and priority transcripts

## Context

The priority reader of ADR-0051 reads each main-loop stop of a Claude Code
session. ADR-0052 adds question stops. Two parts tie the reader to Claude
Code. The brief builder in priority-dev reads only Claude Code transcripts.
The plugin runs on the Claude Code mod engine, and only three of its files
are free of the engine.

The engineer now runs agents in Pi and OMP. Pi Durable 1.6 and the
Cloudflare PiHarness make a durable orchestrator possible. The priority-dev
design already names the parts of that orchestrator: an interpreter that
proposes, a policy that decides, an actuator that sends, an attention queue,
and notifiers (`priority-dev/docs/design/components.md`, `schemas.md`).

## Options considered

The frontmatter lists each option with its reason. Four shaped the decision:

1. **A separate extension with no shared code.** It keeps the Claude Code
   plugin untouched, but two copies of the card text drift.
2. **Flatten Pi into Claude Code JSONL in the extension.** priority-dev does
   not change, but no agent outside Pi can read a Pi session.
3. **A TypeScript port of D1.** It removes Python from the path, but the
   score of D1 does not carry over to a new model call.
4. **The chosen option.** Transcript adapters in priority-dev, one shared
   core, thin host adapters, and an orchestrator under a pure evaluate.

## Decision

**Priority transcript.** priority-dev gets one transcript adapter for each
harness dialect: `claude-code` and `pi`. The `pi` adapter also reads OMP
sessions. Each adapter turns a session file into a priority transcript. That
is the active branch as an ordered list of human, client, agent, and tool
result records, plus the session id, the leaf id, and the dialect. The brief
builder reads only the priority transcript. The `claude-code` adapter must
give byte-identical briefs on the 56 scored stops.

**Agent mode.** The new command `priority read <session-file>` runs the
digest, then the interpretation, and prints one Reading as JSON. The Reading
holds the digest and the cards. Any coding agent, any host adapter, and the
orchestrator use this command. Redaction runs inside the brief builder, as
today. The reader switch gates only the host hooks. A call of `priority read`
is an explicit choice, so the call is the opt-in. The next brief leaves out
each earlier reading: a `priority_read` tool result in the `pi` dialect, and
a Bash call of `priority read` in the `claude-code` dialect.

**Shared core.** `shared/priority-core/` holds the Reading types, the plain
names, the answer labels, the card view model, the draft text, the reader
queue, the pending record, and `evaluate`. The core imports no host engine.
It reaches the process, the store, and the clock through ports. The core
reaches each plugin through the `shared` symlink of ADR-0017.

**Host adapters.** `plugins/cobuilder-priority` moves onto the core and keeps
each behaviour of ADR-0051 and ADR-0052. A new Pi package,
`pi/cobuilder-priority`, loads in Pi and OMP with no fork. It catches a stop
on `agent_settled` (Pi) and `session_stop` (OMP), and it dedupes by leaf id.
It draws the pane with a plain-object component that imports no pi-tui.
It registers the `priority_read` tool, which returns the Reading in
`details`. Probe E1 confirms each host fact before the slices that depend on
it. The Pi package has its own install contract: a `pi` manifest key, the
install command of each host, and one settings file for `priority_dev_dir`,
`program`, and `timeout_seconds`. In the repo it reaches the core through a
`shared` symlink. A published copy carries a vendored copy of the core,
because npm does not pack a symlink. This amends the `cobuilder-priority`
boundary record, which today allows only the Claude Code engine.

**Parity.** Parity is exact from a Reading to its card and draft text. One
set of golden Readings runs in the tests of both host adapters. Parity from
a transcript to a Reading is a score. Epic E4 scores D1 on a labelled sample
of Pi and OMP stops before any host code exists. Its result goes into a
calibration file in priority-dev, keyed by program and dialect, and
`priority read` copies it into the `calibrated` field of each Reading.

**Questions.** Each host adapter hooks the question tool of its host, in that
tool's data shape. In Pi, the package supplies an `AskUserQuestion` tool in
the Claude Code shape. In OMP, the hook targets the built-in `ask` tool and
maps its `questions[]` input to the question file of `--open-question`. An
`ask` call with only an HTML form gets no question reading. In Pi, when the
hold fails, the host dialog opens and the reading shows beside it, as in
ADR-0052. In OMP, when probe E1 shows that the `ask` call cannot be held, the
reader does not support OMP question stops. The OMP dialog opens as usual,
and the reader adds nothing to it.

**Orchestrator.** A Pi Durable orchestrator runs as planned epics E8 to E10.
It adds detail to the priority-dev design and does not replace it. Probe E8
picks the route from a child to the orchestrator and to a reader, because a
Worker runs no Python and Pi Durable documents no push from a child. The
first candidate is a container child that runs the real Pi agent with this
Pi package. A native Pi Durable extension is the second, and its
`api.entries` transcript would be a third dialect. The orchestrator model
proposes an answer or a notification. `evaluate(action, state)` in the core
decides. The first DENY wins, then ASK, then ALLOW, and no match gives ASK.
The starting verdicts are the ones in `schemas.md` section 4. ADR-0053 adds
two guards. An answer to a question stop gives ASK. Any ALLOW needs a
calibrated, newest Reading with no `needs_human` and no abstain. The
actuator writes the intent, runs `evaluate` again, sends with `submit`,
`steer`, or `signal`, and writes the effect. Its idempotency key is the
action hash. ASK and DENY open an attention item, which a notifier sends at
the level that `schemas.md` section 7 sets.

**Layout.** A new top-level `pi/` folder holds Pi packages. `plugins/` stays
for Claude Code plugins only. This amends ADR-0016.

**Out of scope.** The build of the orchestrator, a change to D1 or to the
optimiser, a hosted reader service, subagent stops, and permission prompts in
Pi and OMP.

## Consequences

- **Positive:** One contract serves Claude Code, Pi, and OMP. Any agent can
  read a session with `priority read`. The orchestrator reuses a decision
  model that priority-dev already designed.
- **Constraint introduced:** A host adapter calls priority-dev only as a
  process, and it gives cards only through the shared core. Only `evaluate`
  may allow an answer that no person pressed.
- **Negative / accepted:**
  - The approved Claude Code plugin moves onto the core. Its 25 test files
    must pass unchanged.
  - `shared/` carries TypeScript for the first time, and each plugin gets it
    through the symlink.
  - Pi Durable is experimental. The orchestrator epics pin its minor version
    and open with a probe.
  - Readings in Pi and OMP stay uncalibrated until epic E4 scores them.
- This record amends ADR-0051: an answer may reach a session with no press
  when `evaluate` allows it. An authorization record then names the actor,
  the rule id, the policy hash, the action hash, the state digest, and the
  draft hash. It amends ADR-0052: the question hook targets the question tool
  of each host. It amends ADR-0016: a top-level `pi/` folder holds Pi
  packages. It amends the `cobuilder-priority` boundary record: the host
  adapters may import `shared/priority-core`.
- The build updates `CLAUDE.md`, `README.md`, and the layout, because the
  repo gains a second install surface.

## Value delivered

- **New capability:** The priority reader works in Claude Code, Pi, and OMP
  from one contract, and any coding agent can read a session as JSON.
- **Benefit:** The engineer gets readings for the sessions they now run. A
  later orchestrator can act on the same cards under a tested rule.
- **Beneficiary:** developer.

## Maps to

Context `cobuilder-priority`, modules `shared/priority-core`,
`plugins/cobuilder-priority`, and `pi/cobuilder-priority`. Context
`priority-dev`, modules `priority-dev/src/priority/brief` and
`priority-dev/src/priority/cli.py`. See the boundary records of both
contexts.
