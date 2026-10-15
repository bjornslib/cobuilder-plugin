---
# --- doc-gardener required frontmatter ---
title: "ADR-0039 — cobuilder-memory ships a memory tool for the main agent"
status: active
type: architecture
last_verified: 2026-10-15
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0039
name: "cobuilder-memory ships a memory tool for the main agent"
state: decided
groups: [workflow, packaging]
approved_by: ""
problem: "The CoBuilder workflows reach Hindsight through one optional build step, and design mode never does. When the main agent queries Hindsight itself, it writes the query from its own guess, and recall returns mostly the current chat. ADR-0025 lets only implement ship a hook, and a tool, a prompt store, and a pane all need one."
decision: "Ship a sixth plugin, cobuilder-memory, as an opt-in install outside the umbrella. It ships one hooks module and the shared symlink, and no agents/ and no MCP server. This amends ADR-0025: implement and cobuilder-memory may ship hooks/, and only implement may ship agents/. The module registers one tool, recall_memory, and one command, /memory-recall. Haiku writes a recall query from the person's prompts and the session. Recall and a knowledge-page search run over HTTP. Haiku picks at most one page and writes one to three reflect questions from the records. The page read and the reflects run side by side. The result marks recall as evidence and reflect as leads, and a pane shows each run."
alternatives:
  - option: "The 2026-10-13 design: a router, a deep run, and the cc-memory-mirror"
    rejected_because: "The spike showed that a plugin cannot start its own subagent. The engineer cut the design to what the spike proved (round 4)."
  - option: "Call Hindsight through $.mcp.call"
    rejected_because: "The server named hindsight differs per repo. In think-with-ai it lacked recall and reflect, and one recall result exceeded the MCP result size limit."
  - option: "A fixed reflect context in the plugin"
    rejected_because: "Fixed text asked reflect to say when memory holds nothing, and the small model overused it. Haiku writes the context from the recall records."
  - option: "Run recall and the reflects side by side"
    rejected_because: "Reflect questions written before recall cannot name the ADR ids that recall finds. The engineer chose recall first (R1 a)."
  - option: "Recall only, with no reflect"
    rejected_because: "Reflect links records that recall returns apart. The engineer keeps it, and the main agent judges each answer."
  - option: "Reflect through $.http.fetch"
    rejected_because: "The engine stops $.http.fetch at 30 seconds. Parallel low reflects took longer, so reflect runs curl through $.process.run."
  - option: "A skill and a script that the agent runs through Bash, with no hooks"
    rejected_because: "ADR-0025 would stay unchanged. But no hook would store the prompts, register the tool, or draw the pane."
  - option: "Ship an MCP server"
    rejected_because: "ADR-0025 forbids an MCP server in any plugin."
  - option: "Rename the plugin to memory, as the ADR-0016 addendum rule says"
    rejected_because: "A bare name collides with the built-in /memory command and with the common memory MCP server prefix."
  - option: "Add cobuilder-memory to the umbrella plugin"
    rejected_because: "Each run costs model calls on two servers. A person must choose that, not get it with the family install."
  - option: "Show the result only in the pane"
    rejected_because: "The main agent decides what to use, so it must read the result. The pane serves the person."
  - option: "Wire recall_memory into the design and build skills now"
    rejected_because: "The engineer moved the wiring to epic E2, together with a Jev decision gate every n tool calls."
forces:
  - "Only a hook can store each prompt, register a tool, and draw a pane. A skill runs only when the model or the person starts it."
  - "The hooks API is early access. Its declaration file is the authority for each Claude Code build."
  - "The MCP server named hindsight differs per repo, so a plugin cannot rely on its tool names."
  - "The engine stops $.http.fetch at 30 seconds. A reflect on a large bank can take longer."
  - "The Hindsight Stop hook keeps reply text and drops tool results."
  - "ADR-0016 lets plugins meet only at the bundle and by name."
  - "The packaging test requires a shared symlink in every plugin folder (tests/test_plugin_manifests.py)."
related_decisions:
  - { type: is-related-to, target: ADR-0025 }
  - { type: is-related-to, target: ADR-0016 }
  - { type: is-related-to, target: ADR-0017 }
related_concerns: []
history:
  - { state: decided, date: 2026-10-13, note: "Drafted by design mode for the cobuilder-memory design. In session, the engineer chose the router at prompts and stops, the /memory moment, and the cc-memory-mirror (M1 b). The engineer also chose retain at once (M2 a), no wait for the note (M3 a), the retired H1 to H5 (D1), and the checked memory claim (D2)." }
  - { state: decided, date: 2026-10-15, note: "Revised by design mode after the 2026-10-14 tool spike. The engineer cut the design to the recall_memory tool, the prompt store, and a pane. The router, the deep run, the cc-memory-mirror, the moment tool, and retain left the design. Epic E2 holds the workflow wiring and a Jev gate. The engineer added a knowledge-page source (D-B a), as the hindsight-memory create-agent skill reads pages first, and epic E3, a pane list of every Hindsight call." }
maps_to:
  context: cobuilder-packaging
  modules: [plugins/cobuilder-memory, tests/test_plugin_manifests.py, .claude-plugin/marketplace.json]
  rule: "implement and cobuilder-memory may ship hooks/. Only implement may ship agents/. No plugin ships an MCP server."
delivers:
  capability: "The main agent asks Hindsight about the work at hand through one tool, and a small model writes the questions."
  benefit: "Past decisions reach a design or a build with their dates and sources, and the main agent knows how far to trust each answer."
  beneficiary: [developer]
  enables: ["Epic E2: memory at fixed workflow points and a Jev gate every n tool calls", "Epic E3: a pane list of every Hindsight call in the session"]
  addresses_problem: P1
source_pr: null
related:
  - "docs/architecture/contexts/cobuilder-packaging/boundary.yaml"
  - "docs/architecture/designs/cobuilder-memory/contracts.md"
---

# ADR-0039 — cobuilder-memory ships a memory tool for the main agent

## Context

Hindsight holds what past sessions decided and learned. The CoBuilder
workflows reach it through one optional step in the build skill (H1 to
H5), and design mode never reaches it. When the main agent calls a
Hindsight tool itself, it writes the query from its own guess. A raw
recall then returns mostly the chat of the current session.

A first version of this ADR (2026-10-13) designed a router at every
prompt and stop, a deep run, a mirror of the automatic memory folder, and
a moment tool for the skills. A spike on 2026-10-14 built a smaller tool
instead, in `~/mods/cobuilder-memory`, and ran it in this repo and in
think-with-ai. The spike showed four facts:

1. A small model writes better queries than the agent's own guess when it
   reads the person's prompts and the session end.
2. Reflect questions written from the recall records name the right ADR
   ids. Reflect answers still contradict recall at times.
3. In think-with-ai, the main agent kept dated recall records, such as
   ADR-0028 and ADR-0041, and rejected reflect leads that contradicted
   them.
4. A plugin cannot start its own subagent, the MCP server named
   `hindsight` differs per repo, and `$.http.fetch` stops at 30 seconds.

ADR-0025 lets only `implement` ship a hook. A tool, a prompt store, and a
pane all need a hook.

## Options considered

The frontmatter lists twelve options with their reasons. Three of them
shaped the decision most:

- **The 2026-10-13 design.** The spike could not start a subagent, and
  the router and the mirror stayed untested.
- **A skill and a script, with no hooks.** ADR-0025 would stay unchanged,
  but nothing could store the prompts, register the tool, or draw the
  pane.
- **Recall only.** Reflect links records that recall returns apart. The
  engineer keeps reflect, and the main agent judges it.

## Decision

Ship a sixth plugin, `cobuilder-memory`, as an opt-in install outside the
umbrella.

**Install surface.** The plugin ships `hooks/hooks.json`, which names one
hooks module, `hooks/register.ts`. It also ships the module's tests, the
manifest, and the `shared` symlink. It ships no `agents/`, no MCP server,
and no reference file. This amends ADR-0025: `implement` and
`cobuilder-memory` may ship `hooks/`. Only `implement` may ship
`agents/`. No plugin ships an MCP server.

**The tool.** The module registers `recall_memory` with no input. The
main agent calls it before a design or build decision, or when the
person asks what the project knows. The person runs the same run with
`/memory-recall`.

**The prompt store.** A prompt hook stores each prompt that the person
sends, per session, for the query writer. A prompt counts as the
person's when it comes from the composer, from remote control, or through
the SDK.

**The run.** One run has four steps:

1. Haiku reads the stored prompts and the session end. It names the next
   decision and writes one recall query.
2. Recall and a knowledge-page search run side by side over the
   Hindsight HTTP API. The module drops the results from the current
   session's own transcript, and pages that have no content yet.
3. Haiku reads the kept records and the page snippets. It picks at most
   one page, and it writes one context and one to three reflect questions
   that name the ADR ids and terms of the records.
4. The page read and the reflects run side by side. Each reflect runs
   through `curl`, with fact types world and experience, and with mental
   models excluded.

The plugin adds no text of its own to a Hindsight call.

**The result.** The result opens with fixed judging rules. Recall records
are evidence. A knowledge page is a dated summary, weaker than a record. Reflect answers are leads. A later chat that restates a
record is not a newer source. The main agent checks each claim against
the code and tells the person what it used and why.

**The pane.** Each run opens or updates one pane that shows its steps
while it runs and its result when it is done.

**The bank.** The module reads `apiUrl` and `bankIdTemplate` from
`~/.hindsight/coding-agent.json`. It fills `{gitProject}` with the base
name of the main worktree's root, the rule that the Hindsight runtime
uses.

`contracts.md` in the design folder holds each request, limit, and format.

## Consequences

- The packaging test must read the amended rule in the same slice that
  adds the plugin folder.
- The same slice adds this ADR to the history of ADR-0025. It also
  updates CLAUDE.md principle 5, its Layout line, and the plugin count in
  CLAUDE.md, README.md, and DDD-VOCABULARY.md.
- A run can take up to about five and a half minutes, and the main agent waits for it. The pane
  shows the progress.
- Each run costs two Haiku calls and up to three reflects on the
  Hindsight model. The plugin stays opt-in for this reason.
- The main agent's replies restate memory, and the Hindsight Stop hook
  stores them. The judging rules guard against this echo.
- Memory reaches the workflows only when the agent or the person calls
  the tool. Epic E2 adds fixed workflow points and a Jev gate.

## Value delivered

A design or a build gets past decisions with their dates and sources,
from a query written for the decision at hand. The main agent knows how
far to trust each part of the answer, and the person sees each run in a
pane.

## Maps to

The `cobuilder-packaging` context, because the decision changes the
install surface. The plugin gets its own context and boundary record
after the build.
