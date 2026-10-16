## Problem

The CoBuilder workflows reach Hindsight through one optional build step, and design mode never does. When the main agent queries Hindsight itself, it writes the query from its own guess, and recall returns mostly the chat of the current session.

The 2026-10-14 spike worked in two repos. In think-with-ai, the main agent kept dated recall records and rejected reflect leads that contradicted them. The spike also fixed four faults that the paper design missed.

## Why this approach

An opt-in plugin, cobuilder-memory, ships one hooks module with one tool, consult, and one command, /memory-recall. A prompt hook stores the person's prompts. Haiku writes a recall query. Recall and a knowledge-page search run through the Hindsight MCP server. Haiku then picks at most one page and writes reflect questions from the records. The page read and the reflects follow. Design stage 1 and implement Gate 1 call the tool, and a pane shows each run.

## Alternatives considered

- **The 2026-10-13 design: a router, a deep run, and the cc-memory-mirror** — rejected because the spike showed that a plugin cannot start its own subagent. The engineer cut the design to what the spike proved (round 4).
- **Call the Hindsight HTTP API directly, and run reflect through curl** — rejected because the engineer chose the standard Hindsight MCP tools: one interface the session already has. Slice 1 proves each MCP tool from the installed plugin before any other slice.
- **A fixed reflect context in the plugin** — rejected because fixed text asked reflect to say when memory holds nothing, and the small model overused it. Haiku writes the context from the recall records.
- **Run recall and the reflects side by side** — rejected because reflect questions written before recall cannot name the ADR ids that recall finds. The engineer chose recall first (R1 a).
- **Recall only, with no reflect** — rejected because reflect links records that recall returns apart. The engineer keeps it, and the main agent judges each answer.
- **A skill and a script that the agent runs through Bash, with no hooks** — rejected because ADR-0025 would stay unchanged. But no hook would store the prompts, register the tool, or draw the pane.
- **Ship an MCP server** — rejected because ADR-0025 forbids an MCP server in any plugin.
- **Rename the plugin to memory, as the ADR-0016 addendum rule says** — rejected because A bare name collides with the built-in /memory command and with the common memory MCP server prefix.
- **Add cobuilder-memory to the umbrella plugin** — rejected because each run costs model calls on two servers. A person must choose that, not get it with the family install.
- **Show the result only in the pane** — rejected because the main agent decides what to use, so it must read the result. The pane serves the person.
- **Name the tool without the mcp__ prefix** — rejected because claude Code adds the prefix mcp__<plugin>__ to every tool a plugin registers. The plugin chooses only the last part, consult.
- **Store prompts from the SDK as well** — rejected because an SDK or headless prompt comes from a script or a test, not from the person (Q-B a).

## Out of scope

- Any change to the Hindsight server or to the hindsight-coding-agents runtime and its hooks.
- The router, the deep run, the cc-memory-mirror, the moment tool, and retain from the 2026-10-13 design.
- The Jev decision gate. Epic E2 holds it.
- A list of every Hindsight call of the session. Epic E3 holds it.
- The viewer and the umbrella plugin's dependency list.
- The 0.90 accept rule in slice-loop.md.

## Risks

- The hooks API is early access. The plugin tests pin each engine call, and the manifest names the build it ran on.
- The plugin needs an MCP server named hindsight with recall, reflect, search_knowledge_base, and get_knowledge_page. Without it, the run names what to set up.
- $.mcp.call has no timeout setting. Slice 1 measures the engine's MCP timeout, and a call that times out writes its reason.
- The MCP reflect tool has no fact-type filter, so reflect can draw on stale summaries. The judging rules treat reflect as leads.
- Reflect answers can contradict recall and each other. The judging rules tell the main agent to trust recall and to check each claim.
- The Hindsight Stop hook keeps reply text. A reply that restates memory returns later with a newer date, so the judging rules say a restatement is not newer evidence.
- Each run makes two Haiku calls, one recall, one page search, and one reflect. One low reflect used about 95,000 input tokens on the Hindsight model.
- Consolidation stopped on 2026-09-26 behind a dead worker. In the H1 run, two of three reflects timed out while it caught up.
- A knowledge page can be stale or empty. The run skips an empty page, and the result shows each page's update date.
- A pane that the agent's run opens appears only from 144 columns. The transcript still holds the full result.

## How this was tested

claude plugin test runs the module with model, MCP, and session answers stubbed. Slice 1 proves the installed plugin and each Hindsight MCP tool live. The packaging test reads the amended install rule, and live runs in two repos let the engineer judge the value.

## Where to focus

- The install-surface amendment: does ADR-0039 keep agents/ for implement alone, and MCP servers forbidden for every plugin?
- The judging rules: do they stop the main agent from treating reflect or a restatement as evidence?
- The pane: does it show what the person needs to follow a slow run, as the approved mockup does?
