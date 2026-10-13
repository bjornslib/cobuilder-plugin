# Contracts: cobuilder-memory

Every entry below is a prediction, grounded in ADR-0039. No code exists yet.
The spike in `spike.md` tests the entries that rest on an open fact.

## Endpoints

### The moment tool

The model calls the tool as `mcp__cobuilder-memory__moment`. The module
registers it with `$.tool.register` and answers it in its own `tool.call`
hook. It is not an MCP server.

Input:

```json
{
  "type": "object",
  "properties": {
    "moment": {
      "type": "string",
      "enum": ["design-start", "implement-start", "epic-design", "slice-accepted", "design-approved"]
    },
    "name": { "type": "string", "description": "The design name or the plan slug." },
    "outcome": { "type": "string", "description": "The goal outcome, in one sentence." },
    "scope": {
      "type": "object",
      "properties": {
        "files": { "type": "array", "items": { "type": "string" } },
        "adrs": { "type": "array", "items": { "type": "string" } },
        "districts": { "type": "array", "items": { "type": "string" } }
      }
    }
  },
  "required": ["moment", "name"]
}
```

Result:

```json
{ "run_id": "string", "kind": "deep | quick", "status": "started | unavailable | refused", "message": "string" }
```

- A read moment (`design-start`, `implement-start`, `epic-design`) starts a deep run.
- A write moment (`slice-accepted`, `design-approved`) starts a quick run with the write label set to retain.
- The tool returns at once. The memory note arrives later in the conversation.
- A named later step reads the note. Design stage 4 reads the `design-start` note. The Gate 1 approval reads the `implement-start` note. The approval of an epic design reads its `epic-design` note.
- If the note has not arrived by that step, the step writes a gap line (see Gap lines).

### The router call

```text
$.model.complete({ model: "haiku", system: <references/router.md>,
  prompt: <the last 1,500 characters of the last reply, then the new prompt or the stop>,
  maxTokens: 40, effort: "low", timeoutMs: 8000 })
```

The answer is one JSON line:

```json
{ "read": "none | recall | reflect", "write": "none | retain" }
```

A reply that does not parse counts as `none` and `none`.

### The recall-plan fork

```text
$.model.fork({ prompt: <references/plan.md, the trigger, the labels,
  the newest prompt, and the decisions this session already retained> })
```

The answer is one JSON object:

```json
{
  "recall": [{ "id": "Q1", "text": "string" }],
  "reflect": [{ "id": "R1", "text": "string" }],
  "retain": [{ "content": "string", "date": "YYYY-MM-DD", "about": "a file, an ADR, or a term" }],
  "skip": "string"
}
```

Limits: six recall queries, one reflect on a reflect label only, and three
retain records on a retain label only. A session allows three reflect calls in
total, across quick and deep runs. A reflect after the cap writes a gap line.

### The deep run

```text
$.agent.spawn({ subagentType: "fork",
  prompt: <references/deep-run.md and the moment input>,
  description: "cobuilder-memory deep run <run id>" })
```

The fork keeps the session's tools. The module's `tool.call` guard allows
only these tool names, as the `tool.call` hook receives them, for the fork's
agent id. The module builds the list at session start from the `server`
option: `Read`, plus `mcp__<server>__` with `recall`, `reflect`, `get_memory`,
`get_document`, `list_tags`, and `get_bank_stats`. The guard denies every
other call. It allows one `reflect` per deep run, and none after the session
cap. A test runs the guard with a server name other than `hindsight`.

If spike S3 fails, the deep run holds no tools (R2-2 a). The module makes the
recall calls itself, reads each cited file line, and sends the excerpts to one
`$.model.complete` call. That call returns the same `checks` object.

The final answer is one JSON object:

```json
{
  "checks": [
    {
      "memory_id": "string",
      "document_id": "string",
      "date": "YYYY-MM-DD",
      "query_ids": ["Q1"],
      "quote": "25 words or fewer",
      "summary": "one plain sentence",
      "check": "confirmed | contradicted | not applied | cannot check",
      "evidence": "path:line, or an empty string"
    }
  ],
  "nothing_kept": ["Q2"]
}
```

`not applied` marks a decided change that the repo does not carry yet.

### The Hindsight calls

The module makes each of its own calls through `$.mcp.call(<server>, <tool>, <args>)`.
A deep run's fork calls the same tools as its own tools. The receipt lists
each fork call in `deep_run.tool_calls`.

| Call | Arguments |
|---|---|
| `get_bank_stats` | `{ bank_id }`, at session start, and again at each stop while Hindsight does not answer |
| `recall` | `{ bank_id, query, types: ["world", "experience"], budget: "mid", max_tokens: 2048 }` |
| `reflect` | `{ bank_id, query, context: "design decision; answer as a report, not a fix", budget: "low", include_based_on: true }` |
| `retain`, a decision | `{ bank_id, content, context: "a decision the person stated in a Claude Code session", document_id: "decision:<session id>:<n>", tags: ["source:cobuilder-memory", "knowledge:decision", "session:<session id>"], timestamp }` |
| `retain`, the cc-memory-mirror | `{ bank_id, content: <file text>, context: "an entry of the automatic memory folder", document_id: "memory-file:<file name>", tags: ["source:cobuilder-memory", "source:auto-memory"] }` |
| `delete_document` | `{ bank_id, document_id: "memory-file:<file name>" }`, when a copied file goes |

### The memory note

```text
$.session.append({ message: { type: "user", content: [{ type: "text", text: <note> }] } })
```

The engine stores the row as `isMeta`. The note text sits inside a
`hindsight_memories` tag pair, which the Hindsight Stop hook strips.

## Data models

### Receipt

One JSON file per run, at
`.cobuilder-memory/runs/<session id>/<run id>.json` under the repo root.
The folder holds a `.gitignore` that reads `*`. A receipt holds memory ids,
counts, and query text. It holds no memory text.

```json
{
  "run_id": "string",
  "session_id": "string",
  "trigger": "prompt | stop | moment | memory-command | cc-memory-mirror",
  "moment": "design-start | implement-start | epic-design | slice-accepted | design-approved | null",
  "router": { "read": "string", "write": "string", "usage": {} },
  "recall_plan": { "recall": ["string"], "reflect": ["string"], "retain_count": 0 },
  "fork": { "reason": "answered | nothing-to-fork | api-error | empty-reply | aborted", "usage": {}, "cache_read_input_tokens": 0 },
  "reflect_calls_this_session": 0,
  "deep_run": { "agent_id": "string", "mode": "fork-agent | no-tools", "tool_calls": [{ "tool": "string", "allowed": true, "returned": 0 }], "usage": {} },
  "bank": "string",
  "bank_counts": { "facts": 0, "observations": 0, "pending": 0 },
  "calls": [{ "id": "Q1", "tool": "recall", "returned": 0, "dropped_self": 0, "kept": ["memory id"] }],
  "checks": [{ "memory_id": "string", "state": "confirmed | contradicted | not applied | cannot check", "evidence": "path:line" }],
  "retained": ["document id"],
  "cc_memory_mirror": { "changed": ["file name"], "deleted": ["file name"] },
  "note_appended": true,
  "status": "complete | partial | failed | unavailable",
  "started_at": "ISO-8601 time",
  "ended_at": "ISO-8601 time"
}
```

`router`, `recall_plan`, `fork`, and `deep_run` are null when the run did not use
them.

### Memory note

```text
<hindsight_memories>
Hindsight note · run <run id> · <trigger>
Past claims, not facts. Check a claim in the repo before you use it.
Cite a used claim as: Memory <id>, <date>. Evidence: <file>:<line>. Run: <run id>.
Q1 <query text>
  - <memory id> · <date> · <document id> · <check>: "<quote, 25 words or fewer>"
Q2 <query text>: nothing kept (<n> returned, <d> from this session)
R1 <reflect text>: <120 words or fewer> (sources: <k>, outside this session: <j>)
Retained: <document ids>
</hindsight_memories>
```

A run that cannot finish at a workflow moment appends one line instead:
`Hindsight note · run <run id> · <moment> · did not run: <reason>`.

### Memory citation

A design record or a plan's status file carries one committed line for each
memory claim that a decision used:

```text
Memory <memory id>, <date>. Evidence: <file>:<line>. Used for: <decision>. Run: <run id>.
```

The committed line alone carries the memory id, the date, and the
evidence. Git ignores receipts, so its run id opens a receipt only in the
checkout that made it.


### Gap lines

A skill or a note writes one of these lines when memory did not reach a decision:

| Line | When |
|---|---|
| `Memory: not installed.` | The skill finds no moment tool. |
| `Memory: unavailable.` | The moment tool returns the status `unavailable`. |
| `Memory: run <run id> pending.` | The reading step comes before the note. |
| `Hindsight note · run <run id> · <moment> · did not run: <reason>` | A run at a workflow moment cannot finish. |
| `R1 skipped: the session's three reflects are spent.` | A reflect comes after the session cap. |

### cc-memory-mirror state

`$.store` key `cobuilder-memory:cc-memory-mirror:<bank>` holds
`{ "<file name>": "<sha256>" }`. The scan compares the hashes at each stop and
after `/memory`.

### Plugin options

| Option | Type | Default | Meaning |
|---|---|---|---|
| `bank` | string | `coding-agent-{repo}` | The bank id. `{repo}` is the name that `$.session.repo()` gives. |
| `server` | string | `hindsight` | The MCP server name, as `/mcp` lists it. |
