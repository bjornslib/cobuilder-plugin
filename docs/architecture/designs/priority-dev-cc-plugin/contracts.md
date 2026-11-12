# Contracts: priority-dev-cc-plugin

These contracts describe epics E1, E2, and E3. Each entry is a prediction from
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

### The priority-dev CLI

The priority-dev CLI installs one command, `priority`
(`priority-dev/pyproject.toml`). The module runs two commands with `$.process.run`, in
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
type Mark = {
  verdict: "right" | "wrong" | null
  note: string
  at: string
  sent?: {                // set when the person sends a draft from this reading
    how: "submit" | "fill"
    steps: number[]       // the indexes of the selected steps
    text: string          // the exact text that went to the session
    at: string
  }
}
```

A sent draft is a label signal. The person acted on the reading, and the
`steps` list says which steps they took.

### Session state

`$.state` holds the switch and a redraw tick, and a hot reload keeps them.
The queue and the busy flag are module values, so a reload clears them. A
reading in flight then ends on its own and stores its result. If a stop comes
before it ends, a second reading can run beside it, and the two store writes
can race. A reload is a development event, so the module accepts this.

## Acting on steps

The person selects steps on a card, and the module sends one draft to the
main session. The module never sends without a press. Only the newest card
can send, because an older reading describes a session state that has
passed.

### What each step kind gives

| Step kind | Selectable | Draft text |
|---|---|---|
| `reply` | yes | the `text` |
| `continue` | yes | `Continue.` |
| `continue_until` | yes | `Continue until: <goal>. Proof: <proof.show or proof.command>. Stop after <max_turns> turns or <max_minutes> minutes.` |
| `send_feedback` | yes | the `notes`, after `Feedback on <gate>:` when `gate` is set |
| `approve_gate` | yes | `Approved: <gate>.` and the `notes` |
| `ask_human`, `decide` | yes, through its answers | one line for each question: `<ask> → <picked labels>; <free text>` |
| `ask_human`, `do` or `review` | yes | `Done: <steps or artifact>.` and the free text |
| `notify` | no | none. The card shows the excerpt |
| `snooze`, `dismiss` | no | none. The card shows the kind |
| `approve_permission`, `deny_permission`, `pick_option`, `interrupt` | no | none. A stop has no open prompt, dialog, or turn for them. The card shows them dimmed, with "no target at a stop" |

The module joins the draft lines of the selected steps in step order, with
one blank line between them.

### The two send actions

| Button | Hotkey | Call | Effect |
|---|---|---|---|
| `Send` | `s` | `$.prompt.submit({ text, asUser: true })` | A new user turn with the draft. It runs when the session is idle. |
| `Edit` | `e` | `$.prompt.fill({ text, mode: "replace" })` | The draft goes into the prompt box. The person edits it and presses Enter. |

`Send` and `Edit` are disabled while no step is selected. After either
call, the module writes `sent` on the mark of that reading and clears the
selection. `Edit` that returns `isFilled: false` writes nothing, and the
pane shows "The prompt box is not available".

`asUser: true` is correct because the person read and chose the exact text.
The transcript still names the plugin as the origin.

## The pane

The pane id is `cobuilder-priority`, and its title is `Priority reader`.
`/priority-on` and `/priority-pane` open it with `focus: true`. In a wide
fullscreen terminal it is a sidebar beside the transcript, at most 45% of
the terminal width. The module asks for `columns: 56`. Otherwise it is a
framed region above the prompt.

### Layout, top to bottom

1. **Header row.** The switch state (`● on` in green, `○ off` dim), the
   count of readings, and a `running` marker while a reading runs.
2. **The newest card, open.**
   - A title row: `#<n>`, the time, the status, the priority, and
     `needs you` when `needs_human` is true.
   - One row for each step. A selectable step is a `Button` with
     `plain: true`, drawn `[x]` or `[ ]` before its kind and a short form of
     its content. A step that cannot be sent is a dim `Text`.
   - For an `ask_human` `decide` step: each question, then its options as
     toggle Buttons. A single-choice question clears the other options. The
     question gets an `Input` for free text when `free_text` is true.
   - The draft preview: a dim `Text` of the joined draft, cut at six rows.
   - The action row: `Send (s)`, `Edit (e)`, `Right (r)`, `Wrong (w)`.
   - The note `Input`, one row, with submit label `save`.
3. **Older cards, closed.** One row each: `#<n>`, time, status, priority,
   and the mark (`✓`, `✗`, or nothing). Pressing the row opens that card
   with marks only, and no send actions.
4. **Errors.** A failed reading shows its error in red on its card. An
   unset setting shows the field name in the header row.

### Element budget

The terminal pane takes only `Box`, `Text`, `Button`, `Input`, `Select`,
`Link`, `Code`, `Markdown`, `Raster`, `Image`, and `Client`. The design uses
the first five. There is no checkbox element, so a selection is a `Button`
with a `[x]` or `[ ]` label. There is no hover and no icon set. Colors are
theme keys or named colors. A hotkey is one digit or one lowercase letter,
and it works only while the pane has the focus. The person moves the focus
to the pane with ctrl+x tab or a click.

Step rows take the digits `1` to `9` as hotkeys in step order. A step after
the ninth has no hotkey.

### Wireframe: the sidebar at 56 columns

This wireframe is the baseline. The image prompt in `pane-image-prompt.md`
asks for other options inside the same element budget.

```
┌ Priority reader ─────────────────────────────────────┐
│ ● on   4 readings   running…                         │
│                                                      │
│ #4  14:32  blocked  P1  needs you                    │
│ 1 [x] reply   "Run the migration before the tests…"  │
│ 2 [ ] continue_until  tests pass · 5 turns · 20 min  │
│ 3 ask_human · decide                                 │
│     Which store keeps the marks?                     │
│     [x] $.store   [ ] a JSONL file                   │
│     Other: ________________________________          │
│   approve_permission   no target at a stop           │
│                                                      │
│ Draft                                                │
│   Run the migration before the tests, then …         │
│   Which store keeps the marks? → $.store             │
│                                                      │
│ [Send s]  [Edit e]      [Right r]  [Wrong w]         │
│ Note: ______________________________________ save    │
│                                                      │
│ #3  14:20  working   P3   ✓                          │
│ #2  14:11  done      P4   ✗                          │
│ #1  14:02  abstain · no_agent_reply                  │
└──────────────────────────────────────────────────────┘
```

In a narrow terminal, or without fullscreen rendering, the same tree draws
as a framed region above the prompt. The region takes a third of the
height by default, so the older-card rows are the first to fall off.
