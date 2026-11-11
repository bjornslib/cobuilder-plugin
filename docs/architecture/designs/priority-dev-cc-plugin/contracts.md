# Contracts: priority-dev-cc-plugin

These contracts describe epics E1 and E2. Each entry is a prediction from
ADR-0049 and from the mod API of Claude Code 2.1.322, not a check.

The plugin `cobuilder-priority` is a mod. `hooks/hooks.json` names one
hooks module, `hooks/register.ts`. The plugin also ships its tests, the
manifest, a type contract in `types/index.d.ts`, and the `shared` symlink.
It ships no `agents/` and no MCP server.

## Endpoints

### Settings (`userConfig`)

| Field | Type | Required | Default | Use |
|---|---|---|---|---|
| `priority_dev_dir` | string | no | none | The priority-dev checkout. The process runs here. |
| `program` | string | no | none | The saved program file, such as D1. A relative path starts at `priority_dev_dir`. |
| `timeout_seconds` | number | no | 180 | The limit for each of the two commands. The module caps it at 600. |
| `llm_api_key` | string, sensitive | no | none | Passed as `LLM_API_KEY` in `env`. Without it, the CLI reads `priority-dev/.env`. |

No field is required, so the module always loads. A reading that needs an
unset field stops before any process starts, and the pane names the field.

### Commands

| Command | Effect |
|---|---|
| `/priority-on` | Turns the reader on for this session, and opens the pane. |
| `/priority-off` | Turns the reader off for this session. A running reading ends normally, and a waiting stop is dropped. |
| `/priority-pane` | Opens the pane. |

### The Stop hook

The module hooks `classic.Stop`. Claude Code fires `Stop` for the main loop
only. Subagent turns fire `SubagentStop`, which the module does not hook.

1. When the switch is off, the hook returns `next(e)` and does nothing.
2. When the switch is on, the hook puts the stop in the queue and returns
   `next(e)` at once. It does not await the reading.
3. The queue holds at most one waiting stop. A newer stop replaces it.
4. When no reading runs, the module starts the next one, if the switch is still on.

The hook never returns `block` and never adds context, so the model never
sees a reading.

### The priority CLI

The module runs two commands with `$.process.run`, in
`priority_dev_dir`, each with `timeoutMs` set from `timeout_seconds`:

```
uv run priority digest <transcript_path> --log-dir reports/logs/live
uv run priority interpret <transcript_path> --log-dir reports/logs/live --program <program> --digest current
```

`reports/logs/` is Git-ignored. The digest command saves the digest of
this stop. The interpret command reads it.

When the digest command prints an Abstain, it saves nothing. The stored
digest is then that of an earlier stop, or there is none. The module runs
interpret with `--digest previous`, so the label stays true. It stores the
brief shape as `digest-previous` when a digest of this session succeeded
before (store key `digested:<session_id>`), and as `no-digest` when none did.

### The new `--digest` flag

`priority interpret` gets `--digest {previous,current}`, with the default
`previous`. With `current`, the brief labels the saved digest
`CURRENT RUN:`. With `previous`, it stays `PREVIOUS RUN:`. No other command
changes.

## Data models

### A reading

The module keeps each reading in `$.store` under `readings:<session_id>`,
as a list in stop order. `types/index.d.ts` holds the type.

```ts
type Reading = {
  n: number               // 1-based count of stored readings in the session
  sessionId: string
  at: string              // ISO time of the Stop event
  repo: string            // the session root
  program: string         // the program path that ran
  brief: "digest-current" | "digest-previous" | "no-digest" // the brief shape, so marks can be split later
  state: "done" | "failed"
  result?: {              // the JSON that priority interpret prints
    status: string | null
    needs_human: boolean | null
    priority: string | null
    steps: unknown[]
    abstain: { reason: string, detail?: string } | null
  }
  error?: string          // the exit code and the last stderr line, when failed
  ms: number              // the time for both commands
}
```

### A mark

The module keeps the marks of a session in `$.store` under
`marks:<session_id>`, as a map from the reading number to its mark.

```ts
type Mark = { verdict: "right" | "wrong" | null, note: string, at: string }
```

### Session state

`$.state` holds the switch and a redraw tick, and a hot reload keeps them.
The queue and the busy flag are module values, so a reload clears them. A
reading in flight then ends on its own and stores its result. If a stop comes
before it ends, a second reading can run beside it, and the two store writes
can race. A reload is a development event, so the module accepts this.

## The pane

The pane title is `Priority reader`. Its first line shows the switch state
and the count of readings. It shows one card per reading of this session,
newest first. A card shows the reading number, the time, the status, the priority, and needs-human. It lists each
step with its kind and its content. An abstain shows its reason. A failed
reading shows its error. Each card holds `right`, `wrong`, and a note
field.
