## Problem

The CoBuilder workflows reach Hindsight through one optional build step, and design mode never does. When the main agent queries Hindsight itself, it writes the query from its own guess, and recall returns mostly the chat of the current session.

The 2026-10-14 spike worked in two repos. In think-with-ai, the main agent kept dated recall records and rejected reflect leads that contradicted them. The spike also fixed four faults that the paper design missed.

## Why this approach

An opt-in plugin, cobuilder-memory, ships one hooks module with one tool, recall_memory, and one command, /memory-recall. A prompt hook stores the person's prompts. Haiku writes a recall query. Recall and a knowledge-page search run over HTTP. Haiku then picks at most one page and writes one to three reflect questions from the records. The page read and the reflects run side by side. The result tells the main agent how far to trust each part, and a pane shows the newest run.

## Alternatives considered

- **The 2026-10-13 design: a router, a deep run, and the cc-memory-mirror** — rejected because the spike showed that a plugin cannot start its own subagent. The engineer cut the design to what the spike proved (round 4).
- **Call Hindsight through $.mcp.call** — rejected because the server named hindsight differs per repo. In think-with-ai it lacked recall and reflect, and one recall result exceeded the MCP result size limit.
- **A fixed reflect context in the plugin** — rejected because fixed text asked reflect to say when memory holds nothing, and the small model overused it. Haiku writes the context from the recall records.
- **Run recall and the reflects side by side** — rejected because reflect questions written before recall cannot name the ADR ids that recall finds. The engineer chose recall first (R1 a).
- **Recall only, with no reflect** — rejected because reflect links records that recall returns apart. The engineer keeps it, and the main agent judges each answer.
- **Reflect through $.http.fetch** — rejected because the engine stops $.http.fetch at 30 seconds. Parallel low reflects took longer, so reflect runs curl through $.process.run.
- **A skill and a script that the agent runs through Bash, with no hooks** — rejected because ADR-0025 would stay unchanged. But no hook would store the prompts, register the tool, or draw the pane.
- **Ship an MCP server** — rejected because ADR-0025 forbids an MCP server in any plugin.
- **Rename the plugin to memory, as the ADR-0016 addendum rule says** — rejected because A bare name collides with the built-in /memory command and with the common memory MCP server prefix.
- **Add cobuilder-memory to the umbrella plugin** — rejected because each run costs model calls on two servers. A person must choose that, not get it with the family install.
- **Show the result only in the pane** — rejected because the main agent decides what to use, so it must read the result. The pane serves the person.
- **Wire recall_memory into the design and build skills now** — rejected because the engineer moved the wiring to epic E2, together with a Jev decision gate every n tool calls.

## Out of scope

- Any change to the Hindsight server or to the hindsight-coding-agents runtime and its hooks.
- The router, the deep run, the cc-memory-mirror, the moment tool, and retain from the 2026-10-13 design.
- Any change to the architect or implement skills. H1 to H5 stay until epic E2 wires recall_memory in.
- The Jev decision gate. Epic E2 holds it.
- The viewer and the umbrella plugin's dependency list.
- The 0.90 accept rule in slice-loop.md.

## Risks

- The hooks API is early access. The plugin tests pin each engine call, and the manifest names the build it ran on.
- Reflect answers can contradict recall and each other. The judging rules tell the main agent to trust recall and to check each claim.
- The Hindsight Stop hook keeps reply text. A reply that restates memory returns later with a newer date, so the judging rules say a restatement is not newer evidence.
- A run can take up to about five and a half minutes, and the main agent waits for it. The pane shows each step while it runs.
- Each run makes two Haiku calls, one recall, and up to three reflects. One low reflect used about 95,000 input tokens on the Hindsight model.
- Consolidation stopped on 2026-09-26 behind a dead worker. The backlog drains at 100 facts per round, so reflect quality grows slowly.
- The plugin fills only {gitProject} in bankIdTemplate. A per-directory bank mapping in the Hindsight config is not read.
- A pane that the agent's run opens appears only from 144 columns. The transcript still holds the full result.
- A knowledge page can be stale or still read "Generating content...". The run skips an empty page, and the result shows each page's update date.

## How this was tested

claude plugin test runs the module with model, HTTP, process, and session answers stubbed. The packaging test reads the amended install rule. Live runs in this repo and in think-with-ai on one design question let the engineer judge the value.

## Where to focus

- The install-surface amendment: does ADR-0039 keep agents/ for implement alone, and MCP servers forbidden for every plugin?
- The judging rules: do they stop the main agent from treating reflect or a restatement as evidence?
- The pane: does it show what the person needs to follow a slow run?
