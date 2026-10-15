# Contracts: cobuilder-memory

These contracts describe epic E1. They come from the working spike in
`~/mods/cobuilder-memory`, which ran on 2026-10-14 in this repo and in
think-with-ai, and from the engineer's choices of 2026-10-15. Epic E2 (a
Jev gate) and epic E3 (a list of every Hindsight call) have no contract
yet.

The plugin is a mod: a plugin whose `hooks/hooks.json` names one hooks
module, `hooks/register.ts`. It also ships the module's tests, the
manifest, and the `shared` symlink. It ships no `agents/`, no MCP server,
and no reference file. A person installs it from this repo's marketplace
with `claude plugin install cobuilder-memory@cobuilder-plugin`, and
`--plugin-dir` stays a development aid.

## Endpoints

### The consult tool

The module registers the tool `consult` at `session.start` with
`$.tool.register`. Claude Code lists every tool that a plugin registers
under the prefix `mcp__<plugin>__`, so the main agent sees it as
`mcp__cobuilder-memory__consult`. The prefix comes from Claude Code. The
tool itself speaks no MCP. A `tool.call` hook answers it.

| Field | Value |
|---|---|
| Input | none (`{ "type": "object", "properties": {} }`) |
| Loading | `isDeferred: false`, so the main agent sees it from the start |
| Output | one text result, in the format under "The result" |
| Time | two Haiku calls of up to 60 s each, then the Hindsight calls. Slice 1 measures the engine's MCP timeout, which bounds each Hindsight call |

The tool takes no input on purpose. Haiku writes every query, so nothing
that the agent types reaches Hindsight unchanged.

### The command `/memory-recall`

The module registers the command at `session.start`. A `command.run` hook
runs the same memory run as the tool and returns its result as the
command text. The command also opens the memory pane, at any width.

### The command `/memory-check`

A diagnostic command for slice 1 and for set-up. A `command.run` hook calls
each of the four Hindsight tools once on the current bank, with no Haiku
call, and returns one line per tool: the tool name, `ok` or `failed`, the
time in ms, and a count or the reason. It searches with the fixed query
`memory check`, reads the first page that the search returns, and asks
reflect `What does this project remember most often?`. It also names the
bank and says whether the session lists the consult tool.

### The workflow steps

Design stage 1 and implement Gate 1 call the consult tool when the
session lists `mcp__cobuilder-memory__consult`. When the session does not
list it, the skill states that the tool is absent and goes on. A skill
names the tool, never a plugin path (ADR-0016). The implement skill holds
no H1 to H5 checkpoint after this change.

### The prompt store

A `prompt.submit` hook stores a prompt when all of these hold:

- `e.command` is empty, so a slash command is not stored.
- `e.isMeta` is false.
- `e.origin.kind` is `composer` (typed in the terminal) or `bridge` (sent
  through Remote Control). A prompt from the SDK, a plugin, a peer, or a
  notification is not stored, because a person did not write it.
- The text is not empty.

The store key is `prompts:<session id>` in `$.store`. Each entry is
`{ at: "YYYY-MM-DDTHH:MM", text }`, with the text cut to 2,000 characters.
The store keeps the newest 100 entries.

## The Hindsight calls

Every Hindsight call goes through `$.mcp.call("hindsight", <tool>, args)`
on the MCP server named `hindsight`, the full Hindsight API server. Each
call passes `bank_id`. `$.mcp.call` goes through the permission check. Under
auto mode, each of the four tools needs an allow rule, such as
`mcp__hindsight__search_knowledge_base`. Without the rule, auto mode refuses
the call, and the run shows that refusal as the reason. The call has no
timeout setting of its own. The engine's MCP limits apply. `MCP_TOOL_TIMEOUT`
defaults to 100,000,000 ms. An HTTP MCP server also stops each request
after 60 seconds, unless the server's `timeout` field or `MCP_TOOL_TIMEOUT`
is set above 60,000. This repo declares `hindsight` as an HTTP server, so a
Hindsight call that runs past 60 s fails, and the run shows the reason. The
live check on 2026-10-15 measured recall at 11.6 s to 13.2 s and reflect at
16.3 s.

| Tool | Arguments |
|---|---|
| `recall` | `query`, `bank_id`, `types: ["world", "experience"]`, `budget: "mid"`, `max_tokens: 2500` |
| `search_knowledge_base` | `query`, `bank_id`, `limit: 5` |
| `get_knowledge_page` | `page_id`, `bank_id` |
| `reflect` | `query`, `context`, `bank_id`, `budget: "low"`, `max_tokens: 1500` |

When the session has no MCP server named `hindsight`, or the server lacks
one of these tools, the run stops and names what to set up:
`Hindsight MCP server not found: add the server named "hindsight" with the
recall, reflect, search_knowledge_base, and get_knowledge_page tools.`

The MCP `reflect` tool takes no fact-type filter and no switch for mental
models. Reflect can therefore draw on consolidated observations and
knowledge pages, which can be stale.

## The memory run

One memory run has four steps. The tool and the command both start it.

1. **The recall query.** `$.model.complete` with `model: "haiku"`,
   `effort: "medium"`, `maxTokens: 400`, and `timeoutMs: 60000`. The prompt
   holds the stored prompts, newest kept, up to 8,000 characters, and the
   last 12,000 characters of `$.session.messages()`. The system text states
   why memory is consulted: insight for the design or the build of a new or
   revised capability. Haiku replies with two lines:
   - `Need: <the decision, and the prior knowledge that would change it>`
   - `Recall: <one search query on one topic>`
2. **Recall and page search,** side by side.
   - `recall` with the Recall line. The module drops each result whose
     `document_id` is `conversation:<current session id>`, then keeps the
     first 8.
   - `search_knowledge_base` with the Recall line. The module drops a
     result whose snippet is empty or reads `Generating content...`.
3. **The page and the reflect questions.** A second `$.model.complete`
   with the same model and effort, `maxTokens: 600`. The prompt holds the
   Need line, the recall query, the kept records, and each page's name,
   date, and snippet. Haiku replies with these lines:
   - `Page: <one page id, or none>`
   - `Context: <the context for reflect>`
   - one to three `Reflect: <question>` lines, each on one topic, naming
     the ADR ids and terms that the records use.

   The module keeps at most three questions. It accepts a page id only
   when the id is one of the search results.
4. **The page read and reflect,** side by side.
   - `get_knowledge_page` with the picked id. The module keeps the body,
     cut to 6,000 characters, and the timestamp. An empty body writes
     `Knowledge page: <name> is empty.` in place of the page.
   - `reflect` once per question, with the Context line.

A call that fails or times out writes its reason in place of its section,
and the other sections still show. The plugin adds no text of its own to
a Hindsight call. Every query and the context come from Haiku.

## The result

The result is plain text, in this order:

1. **How to judge this result.** Fixed rules for the main agent:
   - Recall lines are stored records, each with a date and a source. Treat them as the stronger evidence.
   - A knowledge page is a summary that the server built from many records. It is weaker than a recall record and stronger than a reflect answer. Check its update date.
   - Reflect answers come from a small model that reasons over part of the memory. Treat them as leads.
   - When reflect says the memory holds nothing and recall shows records, trust recall.
   - When two records disagree, prefer the newer source. A later chat that restates a record is not a newer source.
   - Check each claim against the code or the ADR file before you rely on it.
   - Tell the person what you used, what you left out, and why.
2. A header line: the bank, the count of recalls and reflects, and how many stored prompts Haiku read.
3. `Need: <line>`.
4. The recall section: the query, the counts (results, dropped from this session, shown), and each kept record as `<n>. [<date>] <text> (<document id>)`. With no kept record: `Prior art: none found outside this session.`
5. The knowledge page, when Haiku picked one: its name, its update date, and its body. With no page: `Knowledge page: none picked.`
6. The reflect context, then each reflect question with its answer.

## The memory pane

Each run opens or updates one pane, the memory pane: id `memory-run`,
title `🧠 Hindsight: CoBuilder Memory Run`. The approved mockup is
`docs/plans/cobuilder-memory/mockups/memory-pane.html`.

- **Opening.** The run opens the pane first, before the first Haiku call, so the person sees it from the start of a slow run (engineer, 2026-10-15). A run starts `$.ui.open({ id: "memory-run", title })`. When the agent's tool call starts the run, the open is unasked, so the pane appears only from 144 columns, or from 110 columns once the person has opened it in this session. `/memory-recall` is the person's own command, so its open is asked and the pane appears at any width. The run does not wait for the pane.
- **State.** One atom, `{ plugin: "cobuilder-memory", key: "run" }`, holds the newest run: its start time, the bank, the step it is on (`query`, `search`, `questions`, `reflect`, `done`, or `failed`), the Need line, the recall query and its counts and records, the picked page, and each reflect question with its answer, `running`, or its failure. Each step updates the atom, and so does each Hindsight call when it starts and when it ends, so the pane shows the calls in flight. While the run works, a one-second `$.clock` tick updates the elapsed time. Each update redraws the pane.
- **While a run works.** The pane shows the bank, the start time, the Need line, and one line per step with its state (done, running, or failed) and its counts.
- **When a run ends.** The pane shows the run time, the recall query and the first records, the picked page with its date, and each reflect question marked answered or failed. A last line says that the full result went to the agent.
- **Drawing.** A `ui.render` hook on `{ component: "Pane", requestId: "memory-run" }` draws the atom, fitted to the viewport rows. With no run yet, the pane says so.

The pane shows the same facts as the result. It adds no fact of its own.

## Data models

### Bank

The module reads `bankIdTemplate` from `~/.hindsight/coding-agent.json`,
with the default `coding-agent::{gitProject}`. `{gitProject}` is the base
name of the main worktree's root, from
`git rev-parse --path-format=absolute --git-common-dir`. This is the rule
that the Hindsight coding-agents runtime uses. Outside a git repo, the run
stops with `No bank: this folder is not in a git repository.` A template
with another placeholder stops the run with a reason. Per-directory bank
mappings are not read.

### Limits

| Name | Value |
|---|---|
| Session end read by Haiku | 12,000 characters |
| Stored prompts read by Haiku | 8,000 characters |
| Prompts kept per session | 100 |
| Recall `max_tokens` | 2,500 |
| Recall records shown | 8 |
| Page search results | 5 |
| Page body shown | 6,000 characters |
| Reflect questions per run | 3 |
| Reflect `max_tokens` | 1,500 |
| Reflect `budget` | `low` |

## Slice 1 checks

Slice 1 proves the base before any other slice starts. A marketplace
install reads `master` on GitHub, so slice 1 loads the repo folder with
`--plugin-dir plugins/cobuilder-memory`, and `claude plugin validate .`
checks the marketplace entry. After E1 merges, one install from the GitHub
marketplace checks the real install path. With the plugin loaded:

1. The session lists `mcp__cobuilder-memory__consult`.
2. `/memory-check` returns `ok` for each of the four tools: `recall`,
   `search_knowledge_base`, `get_knowledge_page`, and `reflect`.
3. The time of one `reflect` call is recorded, and so is what the engine
   does when an MCP call runs past its timeout.
4. A consult call returns the judging rules, the header, the Need line,
   and the recall records.
