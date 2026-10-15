# Contracts: cobuilder-memory

These contracts describe epic E1. They come from the working spike in
`~/mods/cobuilder-memory`, which ran on 2026-10-14 in this repo and in
think-with-ai. Epic E2 (the workflow wiring and the Jev gate) has no
contract yet.

The plugin ships `hooks/hooks.json`, which names one hooks module,
`hooks/register.ts`. It also ships the module's tests, the manifest, and
the `shared` symlink. It ships no `agents/`, no MCP server,
and no reference file.

## Endpoints

### The tool `recall_memory`

The module registers the tool at `session.start` with `$.tool.register`.
Its full name is `mcp__cobuilder-memory__recall_memory`. A `tool.call` hook
answers it.

| Field | Value |
|---|---|
| Input | none (`{ "type": "object", "properties": {} }`) |
| Loading | `isDeferred: false`, so the main agent sees it from the start |
| Output | one text result, in the format under "The result" |
| Time | up to about five and a half minutes: two Haiku calls of up to 60 s each, recall and page search side by side of up to 30 s, then the page read and up to three reflects side by side of up to 170 s |

The tool takes no input on purpose. Haiku writes every query, so nothing
that the agent types reaches Hindsight unchanged.

### The command `/memory-recall`

The module registers the command at `session.start`. A `command.run` hook
runs the same run as the tool and returns its result as the command text.
The command also opens the pane, at any width.

### The prompt store

A `prompt.submit` hook stores a prompt when all of these hold:

- `e.command` is empty, so a slash command is not stored.
- `e.isMeta` is false.
- `e.origin.kind` is `composer`, `bridge`, or `sdk`. A prompt from a plugin, a peer, or a notification is not stored.
- The text is not empty.

The store key is `prompts:<session id>` in `$.store`. Each entry is
`{ at: "YYYY-MM-DDTHH:MM", text }`, with the text cut to 2,000 characters.
The store keeps the newest 100 entries.

## The run

One run has four steps. The tool and the command both call it.

1. **The recall query.** `$.model.complete` with `model: "haiku"`,
   `effort: "medium"`, `maxTokens: 400`, and `timeoutMs: 60000`. The prompt
   holds the stored prompts, newest kept, up to 8,000 characters, and the
   last 12,000 characters of `$.session.messages()`. The system text states
   why memory is consulted: insight for the design or the build of a new or
   revised capability. Haiku replies with two lines:
   - `Need: <the decision, and the prior knowledge that would change it>`
   - `Recall: <one search query on one topic>`
2. **Recall and page search.** These two calls run side by side through
   `$.http.fetch`.
   - Recall: `POST <apiUrl>/v1/default/banks/<bank>/memories/recall`, with this body:
     ```json
     { "query": "<Recall line>", "types": ["world", "experience"], "budget": "mid", "max_tokens": 2500 }
     ```
     The module drops each result whose `document_id` is
     `conversation:<current session id>`, then keeps the first 8.
   - Page search: `GET <apiUrl>/v1/default/banks/<bank>/knowledge-base/search?q=<Recall line>&limit=5`.
     Each result holds `id`, `name`, `snippet`, `score`, and `updated_at`.
     The module drops a result whose snippet is empty or reads
     `Generating content...`.
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
4. **The page read and reflect.** These run side by side.
   - Page read: `GET <apiUrl>/v1/default/banks/<bank>/knowledge-base/pages/<id>`
     through `$.http.fetch`. The module keeps the `body`, cut to 6,000
     characters, and `timestamp`. An empty body writes
     `Knowledge page: <name> is empty.` in place of the page.
   - Reflect: each question goes to
     `POST <apiUrl>/v1/default/banks/<bank>/reflect` through `curl` in
     `$.process.run`, with `--max-time 170`.
     ```json
     { "query": "<Reflect line>", "context": "<Context line>", "budget": "low",
       "max_tokens": 1500, "fact_types": ["world", "experience"], "exclude_mental_models": true }
     ```

The plugin adds no text of its own to a Hindsight call. Every query and
the context come from Haiku.

### Why reflect goes through curl

Recall, the page search, and the page read use `$.http.fetch`. Each one
answered in a few seconds in the spike. A call that reaches the 30-second
limit writes its reason in place of its section.

The engine stops every `$.http.fetch` call at 30 seconds. One `low`
reflect took 17 seconds alone, and parallel reflects took longer than 30.
`$.process.run` allows up to 10 minutes.

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

A failed step writes its reason in place of its section. A Hindsight
outage writes `Hindsight is not available: <reason>`, never an empty list.

## The pane

Each run opens or updates one pane, the memory pane: id `memory-run`, title `Memory run`.

- **Opening.** A run starts `$.ui.open({ id: "memory-run", title: "Memory run" })`. When the agent's tool call starts the run, the open is unasked, so the pane appears only from 144 columns. `/memory-recall` is the person's own command, so its open is asked and the pane appears at any width. The run does not wait for the pane.
- **State.** One atom, `{ plugin: "cobuilder-memory", key: "run" }`, holds the newest run: its start time, the bank, the step it is on (`query`, `search`, `questions`, `reflect`, `done`, or `failed`), the Need line, the recall query and its counts and records, the picked page, and each reflect question with its answer or `running`. Each step updates the atom, and the update redraws the pane.
- **Drawing.** A `ui.render` hook on `{ component: "Pane", requestId: "memory-run" }` draws the atom. The record and answer lines fit the viewport rows, newest step last. With no run yet, the pane says so.

The pane shows the same facts as the result. It adds no fact of its own.

## Data models

### Bank and server

The module reads `~/.hindsight/coding-agent.json`:

| Key | Use | Default |
|---|---|---|
| `apiUrl` | The Hindsight HTTP API | `http://localhost:8888` |
| `bankIdTemplate` | The bank name | `coding-agent::{gitProject}` |

`{gitProject}` is the base name of the main worktree's root, from
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
| Reflect time limit | 170 s |

## Permissions

The plugin calls no MCP tool, so it needs no MCP allow rule. Under auto
mode, the person may need to allow the `curl` process and the HTTP call
to the Hindsight address. The spike in an interactive session needed
neither rule.
