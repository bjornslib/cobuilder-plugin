## Problem

The CoBuilder workflows consult Hindsight only through an optional build step. Three of 15 build plans opted in, and design mode never consults memory. The Hindsight Stop hook writes each transcript back as chat. Only an opted-in build writes a decision on its own, so recall returns mostly raw chat. The automatic memory folder never reaches Hindsight.

Claude Code 2.1.296 ships function hooks. A plugin can now run a small model at every prompt and stop. It can also fork the conversation, call an MCP server, and add a note that the model reads. Before this, memory ran only when the model chose to call it.

## Why this approach

A new opt-in plugin, `cobuilder-memory`, ships one hooks module. A Haiku router labels each person prompt and each stop: read none, recall, or reflect, and write none or retain. A label starts a quick run: a conversation fork writes a JSON recall plan, and the module makes each Hindsight call. Fixed workflow moments call the plugin's moment tool, which starts a deep run: a fork agent with read-only tools recalls and checks each claim. The module runs the cc-memory-mirror, appends one memory note, and writes one receipt per run. A spike tests the open facts first.

## Alternatives considered

- **Fixed moments and the cc-memory-mirror only, with no router** — rejected because the engineer wants memory at ordinary prompts and at every stop. Without a router, a prompt between two workflow moments gets no memory.
- **A deep run for every trigger** — rejected because each step of a fork agent reads the cached session again. A run at every prompt multiplies that cost.
- **A quick run for every trigger, workflow moments included** — rejected because a fork from `$.model.fork` has no tools. It cannot check a claim in the repo or ask a follow-up query, and workflow moments feed design decisions (D2).
- **Keep the opt-in H1 to H5 checkpoints with fixed query text** — rejected because three of 15 build plans opted in. Fixed text asks the same question at every gate, and the engineer retired it (D1).
- **Detect the design and build starts with a `command.run` hook** — rejected because no test shows that `command.run` fires for a plugin's markdown command. An explicit tool call at a named workflow step is testable and survives a renamed command.
- **Add `cobuilder-memory` to the umbrella plugin** — rejected because the plugin adds model calls at every prompt and writes to memory. A person must choose both, not get them as a side effect of the family install.
- **Copy the CLAUDE.md files into Hindsight as well** — rejected because the engineer chose the automatic memory folder (M1 b). CLAUDE.md files live in git, where review already governs each change.
- **Commit every receipt** — rejected because a receipt comes with every routed prompt, so committed receipts would bury real changes. A committed memory citation carries the run id and the memory id instead.
- **Reflect in every run** — rejected because one low-budget reflect on this 544-fact bank used 74,764 input tokens on the Hindsight server. A run allows one reflect, on a reflect label or in a deep run.
- **Recall with the default observation type** — rejected because this bank holds no observations, so an observation-only recall returns nothing. Every recall sets the world and experience types.
- **Tag a retained decision `kind:decision`** — rejected because the bank already tags extracted facts `knowledge:decision`. A second tag would give one kind two names.
- **Rename the plugin to memory, as the ADR-0016 addendum rule says** — rejected because a bare name collides with the built-in `/memory` command. Its tools would also share the mcp__memory__ prefix of the common memory MCP server.
- **A quick run with no fork, and the trimmed prompt as the query** — rejected because the queries lose the session context. It is faster and cheaper, and the engineer chose context.
- **The prompt and stop hooks wait for the quick run, with no queue and no timer** — rejected because the person's prompt would wait for the router and the run. The engineer chose that a note never waits (M3 a).

## Out of scope

- Any change to the Hindsight server, the hindsight-coding-agents runtime, or its three settings hooks.
- The review, maintenance, options, debug, and pr modes. They make no memory call in this design.
- An MCP server, an agent file, or a slash command of the plugin's own.
- A viewer surface for receipts.
- A copy of CLAUDE.md files, or of any file outside the automatic memory folder.
- The umbrella plugin's dependency list.
- The 0.90 accept rule in `slice-loop.md`. It stays an open question outside this design.

## Risks

- The hooks API is early access and changes between releases. Each engine call sits behind one adapter module, and spike S10 records the build it ran on.
- The router adds two small model calls to every exchange, and each recall label adds one fork that reads the cached session. Each receipt records both.
- A retain writes a wrong decision at once (M2 a). A toast shows it, and the receipt keeps the memory id, so a person can invalidate the record.
- A fork agent inherits the session's write tools. A `tool.call` guard denies each call outside the allow-list for that agent id. If the spike shows the guard fails, the deep run holds no tools (R2-2 a).
- A memory note could flow back into the bank. The Stop hook skips `isMeta` rows and strips the `hindsight_memories` tag, and a done_when item tests it.
- Hindsight is down or not installed. The router stays quiet while Hindsight does not answer, and the module checks again at each stop. A workflow moment writes a gap line.
- Recall returns this session's own transcript. The module drops each result whose document id is conversation plus this session id.
- One reflect costs about 75,000 input tokens on the Hindsight server. A session allows three reflects, and each receipt counts them.

## How this was tested

The spike runs the eleven checks in spike.md on Claude Code 2.1.296. `claude plugin test` runs the module's tests with model, fork, and MCP answers mocked beneath it. `uv run pytest tests -q` checks the packaging rule. A live run in this repo checks one routed prompt, one stop, one workflow moment, and one cc-memory-mirror change.

## Where to focus

- The install-surface amendment: does ADR-0039 keep agents/ for implement alone, and MCP servers forbidden for every plugin?
- The quick-run handover: does the fork prompt carry the trigger, the labels, and the new prompt, and nothing the fork already sees?
- The deep-run guard: does its allow-list hold read tools only?

The author flagged these parts as not fully understood:

- Does `command.run` fire for the built-in `/memory`, and does `next(e)` resolve when the person closes it?
- Does a hooks module's `classic.Stop` hook fire at every stop, a `/goal` iteration included, while `turn.complete` fires once per turn?
- Does a fork from `$.agent.spawn` report each tool call to the mod's `tool.call` hook with its agent id?
- Does a plugin-spawned fork's final answer reach the main conversation, or must the module append it?
- Do `$.model.fork` and `$.mcp.call` run from a timer that `session.start` started, and how much of the prefix does the cache serve?
- Does a retain with the same `document_id` replace the earlier document?
- Does a recall after a stop find no text of a memory note or of a deep-run result in the bank?
- Can the module find the automatic memory folder from the context's `AutoMem` entry?
- Does `prompt.submit` mark the person's own prompt with origin kind composer, and does a subagent's stop carry a field that names the agent?
- Does each $ call and event that ADR-0039 names exist in the build that ships, and does the shipped plugin layout load the hook?

---

Authorship: agent-assisted.
