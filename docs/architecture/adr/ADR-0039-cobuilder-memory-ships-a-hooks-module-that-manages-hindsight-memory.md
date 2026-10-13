---
# --- doc-gardener required frontmatter ---
title: "ADR-0039 — cobuilder-memory ships a hooks module that manages Hindsight memory"
status: active
type: architecture
last_verified: 2026-10-13
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0039
name: "cobuilder-memory ships a hooks module that manages Hindsight memory"
state: decided
groups: [workflow, packaging]
approved_by: ""
problem: "The CoBuilder workflows consult Hindsight memory only through an optional step in the build skill, and design mode never consults it. The Hindsight Stop hook writes each transcript back as chat, so recall returns mostly raw chat. The automatic memory folder never reaches Hindsight. ADR-0025 lets only implement ship a hook, and no hook in the family runs at a prompt or a stop."
decision: "Ship a sixth plugin, cobuilder-memory, as an opt-in install outside the umbrella. It ships one hooks module, three reference files, and the shared symlink, and no agents/ and no MCP server. This amends ADR-0025: implement and cobuilder-memory may ship hooks/, and only implement may ship agents/. A Haiku router labels each person prompt and each stop, and a label starts a quick run. The design and build skills call the plugin's moment tool at fixed moments. A read moment starts a deep run in a fork agent that a guard holds to read-only tools. If the spike shows that the guard fails, the deep run holds no tools. The module runs the cc-memory-mirror, appends one memory note per run, and writes one receipt per run."
alternatives:
  - option: "Fixed moments and the cc-memory-mirror only, with no router"
    rejected_because: "The engineer wants memory at ordinary prompts and at every stop. Without a router, a prompt between two workflow moments gets no memory."
  - option: "A deep run for every trigger"
    rejected_because: "Each step of a fork agent reads the cached session again. A run at every prompt multiplies that cost."
  - option: "A quick run for every trigger, workflow moments included"
    rejected_because: "A fork from $.model.fork has no tools. It cannot check a claim in the repo or ask a follow-up query, and workflow moments feed design decisions (D2)."
  - option: "Keep the opt-in H1 to H5 checkpoints with fixed query text"
    rejected_because: "Three of 15 build plans opted in. Fixed text asks the same question at every gate, and the engineer retired it (D1)."
  - option: "Detect the design and build starts with a command.run hook"
    rejected_because: "No test shows that command.run fires for a plugin's markdown command. An explicit tool call at a named workflow step is testable and survives a renamed command."
  - option: "Add cobuilder-memory to the umbrella plugin"
    rejected_because: "The plugin adds model calls at every prompt and writes to memory. A person must choose both, not get them as a side effect of the family install."
  - option: "Copy the CLAUDE.md files into Hindsight as well"
    rejected_because: "The engineer chose the automatic memory folder (M1 b). CLAUDE.md files live in git, where review already governs each change."
  - option: "Commit every receipt"
    rejected_because: "A receipt comes with every routed prompt, so committed receipts would bury real changes. A committed memory citation carries the run id and the memory id instead."
  - option: "Reflect in every run"
    rejected_because: "One low-budget reflect on this 544-fact bank used 74,764 input tokens on the Hindsight server. A run allows one reflect, on a reflect label or in a deep run."
  - option: "Recall with the default observation type"
    rejected_because: "This bank holds no observations, so an observation-only recall returns nothing. Every recall sets the world and experience types."
  - option: "Tag a retained decision kind:decision"
    rejected_because: "The bank already tags extracted facts knowledge:decision. A second tag would give one kind two names."
  - option: "Rename the plugin to memory, as the ADR-0016 addendum rule says"
    rejected_because: "A bare name collides with the built-in /memory command. Its tools would also share the mcp__memory__ prefix of the common memory MCP server."
  - option: "A quick run with no fork, and the trimmed prompt as the query"
    rejected_because: "The queries lose the session context. It is faster and cheaper, and the engineer chose context."
  - option: "The prompt and stop hooks wait for the quick run, with no queue and no timer"
    rejected_because: "The person's prompt would wait for the router and the run. The engineer chose that a note never waits (M3 a)."
forces:
  - "Only a hook sees every prompt and every stop. A skill runs only when the model or the person starts it."
  - "The hooks API is early access. Its declaration file is the authority for each Claude Code build."
  - "A hook that fires at every prompt or stop costs every session that installs it, so it must filter itself down. ADR-0025 states the same force for the implement hook."
  - "A fork from $.model.fork sees the whole session but has no tools. A fork agent from $.agent.spawn keeps its tools, but each of its steps reads the cached session again."
  - "A hook's own time budget is 10 seconds, and a $ call does not count against it. A hook cannot wait for a background agent."
  - "The Hindsight Stop hook already writes each transcript back. The plugin must not write chat a second time."
  - "ADR-0016 lets plugins meet only at the bundle and by name. A skill names the plugin's tool, never a plugin path."
  - "The packaging test requires a shared symlink in every plugin folder (tests/test_plugin_manifests.py)."
related_decisions:
  - { type: is-related-to, target: ADR-0025 }
  - { type: is-related-to, target: ADR-0016 }
  - { type: is-related-to, target: ADR-0017 }
  - { type: is-related-to, target: ADR-0035 }
  - { type: is-related-to, target: ADR-0012 }
related_concerns: []
history:
  - { state: decided, date: 2026-10-13, note: "Drafted by design mode for the cobuilder-memory design. In session, the engineer chose the router at prompts and stops, the /memory moment, and the cc-memory-mirror (M1 b). The engineer also chose retain at once (M2 a), no wait for the note (M3 a), the retired H1 to H5 (D1), and the checked memory claim (D2)." }
maps_to:
  context: cobuilder-packaging
  modules: [plugins/cobuilder-memory, tests/test_plugin_manifests.py, .claude-plugin/marketplace.json]
  rule: "implement and cobuilder-memory may ship hooks/. Only implement may ship agents/. No plugin ships an MCP server. A cobuilder-memory hook acts only on the main loop and on the person's own prompts."
delivers:
  capability: "A session reads and writes Hindsight memory at each prompt and stop that needs it, and at fixed workflow moments, with a receipt for each run."
  benefit: "Past decisions reach a design or a build without the model having to remember to ask. A reader can trace each memory claim that a decision used."
  beneficiary: [developer, operator]
  enables: ["A design stage-4 challenge that cites a confirmed memory claim (D2)"]
  addresses_problem: P1
source_pr: null
related:
  - "docs/architecture/contexts/cobuilder-packaging/boundary.yaml"
---

# ADR-0039 — cobuilder-memory ships a hooks module that manages Hindsight memory

## Context

The CoBuilder workflows reach Hindsight memory in one place. The build skill
asks the engineer whether to check memory, and then runs five fixed
checkpoints, H1 to H5. Three of 15 build plans recorded yes. Design mode
makes no memory call.

Hindsight's own runtime adds three settings hooks to each session. Its Stop
hook writes the whole transcript back after each turn, as a chat document.
Nothing writes a decision on its own, except a build that opted in. A
recall on this repo's bank therefore returns mostly chat. In one test run,
five of six kept results came from the running session's own transcript.

Claude Code also keeps an automatic memory folder. The engine's own memory
writer adds files to it. None of those files reaches Hindsight.

Claude Code 2.1.296 ships function hooks. A plugin's hooks module can now
make these calls:

- `$.model.complete` runs a small model.
- `$.model.fork` forks the conversation.
- `$.agent.spawn` starts a fork agent.
- `$.mcp.call` calls an MCP server.
- `$.session.append` adds a row that the model reads.
- `$.tool.register` adds a tool that the model calls.

ADR-0025 lets only `implement` ship `hooks/`. The packaging test enforces
that rule.

## Options considered

1. **Fixed moments and the cc-memory-mirror only, with no router.** Cheaper and fully predictable. Rejected: the engineer wants memory at ordinary prompts and at every stop.
2. **A deep run for every trigger.** One run kind and a check on every claim. Rejected: each step of a fork agent reads the cached session again.
3. **A quick run for every trigger.** One run kind at a low cost. Rejected: a tool-less fork cannot check a claim, and workflow moments feed decisions.
4. **Keep the opt-in H1 to H5 checkpoints.** No new plugin. Rejected: three of 15 plans opted in, and the engineer retired the fixed text.
5. **Detect the design and build starts with a `command.run` hook.** No skill change. Rejected: no test shows that the hook fires for a plugin's markdown command.
6. **Add the plugin to the umbrella.** One install for the family. Rejected: model calls and memory writes need an explicit choice.
7. **Chosen: the router, two run kinds, the tool, and the cc-memory-mirror.** Each trigger gets the run kind that fits its cost.

The `alternatives` list above holds eight more rejected options, each with
its reason. They are a CLAUDE.md copy, committed receipts, a reflect in
every run, observation-only recall, and a second decision tag. They also
include the bare name `memory`, a quick run with no fork, and hooks that wait
for the quick run.

## Decision

**Packaging.** A sixth plugin, `cobuilder-memory`, ships from this
marketplace as an opt-in install. The umbrella does not depend on it. The
plugin holds:

- `.claude-plugin/plugin.json`, with the options `bank` and `server`.
- `hooks/hooks.json`, which names one hooks module.
- The hooks module and its adapter modules.
- `references/router.md`, `references/plan.md`, and
  `references/deep-run.md`. The module reads them at session start from
  `$.plugin.root`.
- The `shared` symlink that the packaging test requires of every plugin. The
  module uses no shared script.

The plugin ships no `agents/` and no MCP server. The module's own
`tool.call` hook serves its tool.

This amends ADR-0025. `implement` and `cobuilder-memory` may ship `hooks/`.
Only `implement` may ship `agents/`. No plugin ships an MCP server. The
packaging test changes to this rule.

The name keeps the `cobuilder-` prefix, as a named exception to the ADR-0016
addendum. A bare `memory` would collide with the built-in `/memory` command.
Its tools would also share the `mcp__memory__` prefix of the common `memory`
MCP server.

The build epic adds an amended-by entry to the history of ADR-0025 and of
ADR-0016, whose forces say that no plugin ships a hook. It updates the plugin
count in `CLAUDE.md`, `DDD-VOCABULARY.md`, `README.md`, and the umbrella's
router skill. It also updates `CLAUDE.md` principle 5 and the `CLAUDE.md`
layout line, which name `implement` as the only plugin with a hook.

**Triggers.** The module acts on five triggers:

1. A prompt that the person submits. The router labels it.
2. A stop, a `/goal` iteration included. The router labels it, and the
   cc-memory-mirror scans the automatic memory folder.
3. A workflow moment. A skill calls the `moment` tool.
4. The `/memory` command. The cc-memory-mirror scans, and a quick run starts with
   recall and retain set.
5. A change in the automatic memory folder, found by the scan.

A prompt from a plugin, a peer, or a task notification starts no run. A
subagent's stop starts no run. While Hindsight does not answer, the router
stays quiet, and the module checks Hindsight again at each stop.

**Queue.** Each trigger hook puts one job on a queue and returns at once. A
timer that `session.start` starts drains the queue. So no hook waits on a
model or on Hindsight (M3 a).

**Router.** The module makes one Haiku call for each person prompt and for
each stop. The call returns a read label (none, recall, or reflect) and a
write label (none or retain). A
workflow moment, the `/memory` command, and a memory-folder change start no
router call. Its system prompt is
`references/router.md`.

**Quick run.** `$.model.fork` writes a JSON recall plan from the whole session. The
module then makes each Hindsight call itself, drops each result from this
session's own transcript, and keeps twelve results at most.

**Deep run.** `$.agent.spawn` starts a fork agent with the prompt from
`references/deep-run.md`. The fork recalls, reads the repo, and marks each
claim: confirmed, contradicted, not applied, or cannot check. A `tool.call`
guard denies each tool call from the fork's agent id outside an
allow-list. The module builds the list at session start from the `server`
option: `Read`, plus `mcp__<server>__` with `recall`, `reflect`, `get_memory`,
`get_document`, `list_tags`, and `get_bank_stats`. The fork makes its own
Hindsight calls, and the receipt lists each one.

**Deep-run fallback.** If spike S3 shows that the guard cannot hold the fork
agent, the deep run holds no tools. The module recalls, reads each cited
file line itself, and one `$.model.complete` call judges each claim (R2-2 a).

**Reflect limits.** A run allows one reflect. A session allows three reflect
calls in total, across quick and deep runs. When the session cap is spent, the
module or the guard denies the reflect, and the note says so.

**cc-memory-mirror.** Each file of the automatic memory folder becomes one Hindsight
document, `memory-file:<file name>`. A changed file replaces its document. A
removed file deletes its document.

**Output.** Each run appends one memory note with `$.session.append` and
writes one receipt under `.cobuilder-memory/runs/`, which git ignores. That
folder is the one derived store outside the bundle, because a receipt holds
session data that no reader of the bundle needs. A
retain raises a toast with its memory id (M2 a). A note never waits: it
arrives before the person's next prompt (M3 a).

A named later step reads each deep-run note. Design stage 4 reads the
`design-start` note. The Gate 1 approval reads the `implement-start` note.
The approval of an epic design reads its `epic-design` note. Each of these
steps comes after the engineer's reply. If the note has not arrived, the step
writes `Memory: run <run id> pending.`

**Workflow.** Design stage 0 calls the `design-start` moment after the name
and the outcome exist. The build skill calls `implement-start` before Gate 1
and `epic-design` for each epic design. A slice that passes calls
`slice-accepted`. An approved design calls `design-approved`.

The build skill retires H1 to H5 (D1). Design-mode section 7.3 accepts a
confirmed memory claim as a challenge citation, with its memory id and the
checked file (D2). A decision that uses a memory claim carries a committed
memory citation. The line alone carries the memory id, the date, and the
evidence. Its run id opens a receipt only in the checkout that made it.

**Out of scope.** The Hindsight server and runtime, the other modes, a
viewer surface for receipts, and the 0.90 accept rule in `slice-loop.md`.

## Decision ids

The session settled these choices. The ids appear in this ADR and in the
design record.

| Id | Choice |
|---|---|
| D1 | The build skill retires the H1 to H5 checkpoints. |
| D2 | A confirmed memory claim counts as a challenge citation. |
| D3 | Where a raw brief lives. The receipt replaced the brief in this design. |
| D4 | A person reviews the first runs before the router stays. |
| M1 b | The plugin copies the automatic memory folder into Hindsight. |
| M2 a | A retain writes at once, with a toast. |
| M3 a | A memory note never makes the prompt wait. |
| N1 a | The name keeps the `cobuilder-` prefix. |
| N2 a | The quick run keeps its fork. |
| N3 a | A note arrives before the next prompt, and a named step reads it. |
| N4 a | The receipt counts the fork's cost, and a session allows three reflects. |
| R2-1 a | The hooks do not wait for the quick run. |
| R2-2 a | A deep run with no tools is the fallback when spike S3 fails. |

## Consequences

- **Positive:** Memory reaches design and build at fixed moments without the model having to ask. Decisions enter the bank as decisions, not as chat. Each run leaves a receipt, so a gap never looks like a clean check.
- **Constraint introduced:** A `cobuilder-memory` hook acts only on the main loop and on the person's own prompts. It does nothing while Hindsight does not answer. The guard denies each tool call of a deep-run fork outside its allow-list. Only `implement` ships `agents/`. No plugin ships an MCP server.
- **Negative / accepted:** Each exchange costs two Haiku calls, one at the prompt and one at the stop. Each recall label adds one fork that reads the cached session. The plugin follows an early-access API, so each Claude Code build needs `claude plugin validate` and the plugin's tests. A wrong retain enters the bank at once, and a person must invalidate it.

## Value delivered

- **New capability:** A session reads and writes Hindsight memory at each
  prompt and stop that needs it, and at fixed workflow moments.
- **Benefit:** Past decisions reach a design or a build without a manual
  step. A reader can trace each memory claim that a decision used.
- **Beneficiary:** The developer who designs and builds, and the operator who
  reads the receipts.

## Maps to

Context `cobuilder-packaging`, modules `plugins/cobuilder-memory`,
`tests/test_plugin_manifests.py`, and `.claude-plugin/marketplace.json`. The
boundary record's install-surface entry changes with this rule. The
`cobuilder-memory` context gets its own boundary record after the build,
through describe mode.
