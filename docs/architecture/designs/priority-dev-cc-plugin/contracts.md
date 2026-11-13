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

### Epic E1, slice E1.5: the install writes the settings

The first live run failed because `priority_dev_dir` and `program` were
empty. A `--plugin-dir` load shows no install screen, so nothing set them.

| Slice | What it adds | Check |
|---|---|---|
| E1.5 Install settings | The install step writes `pluginConfigs["cobuilder-priority@cobuilder-plugin"].options` in the user settings (a `--plugin-dir` load reads the key `cobuilder-priority@inline`): `priority_dev_dir` (the priority-dev checkout it finds), `program` (D1, `probes/programs/gepa-armC3s-seeded-budget5-seed7.json`), and `timeout_seconds` (180). It shows the change and asks before the write. It does not write `llm_api_key`. | A test runs the install step on a temporary settings file, and finds the three fields with these values. A second run changes nothing. |

Decided on 2026-11-12: the step is an optional step of
`/cobuilder-full-lifecycle:install`. The step first checks if
`cobuilder-priority` is installed. If it is not installed, the step does
nothing and writes nothing. The plugin stays opt-in and outside the umbrella
dependencies. The check for this rule: a test runs the step with the plugin
absent, and the settings file does not change.

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
  digest?: {              // the RunDigest that priority digest printed, when it did not abstain
    ran: string           // what the agent did, at most 600 characters
    result: string        // how the run ended, at most 300 characters
    open_items: string[]
    decisions: string[]
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
| `approve_permission` | yes | `Yes, go ahead.` With `scope: session`, the line adds `You may do the same for the rest of this session.` |
| `deny_permission` | yes | `No, do not do that.` and the `reason` |
| `pick_option` | yes | `Option <index + 1>.` |
| `notify` | no | none. From slice E3.9, the row above the prompt shows the message, and the card does not |
| `snooze`, `dismiss` | no | none. The card shows the kind |
| `interrupt` | no | none. A stop has no running turn to stop. The card shows it dimmed, with "no target at a stop" |

At a stop, no permission prompt or option dialog is open. The agent asked
in its reply text, so the answer goes back as text, the same as a `reply`.

The pane draws every selection and every answer. The module calls
`$.ui.ask` only for a question that the pane cannot draw. No step kind
needs it now, so the module does not call it, and it never asks a choice
twice.

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

The pane id is `priority-reader`, and its title is `Priority reader`.
`/priority-on` and `/priority-pane` open it with `focus: true`. In a wide
fullscreen terminal it is a sidebar beside the transcript, at most 45% of
the terminal width. The module asks for `columns: 60`. Otherwise it is a
framed region above the prompt.


### The chosen layout: C, split focus with an agent summary

The engineer chose layout C. The image model's mockup is in
`pane-design/layout-c.png`, and its HTML is in `pane-design/layout-c.html`.
The mockup is a picture, not a specification. Where the two differ, this
section rules.

Top to bottom:

1. **Header row.** `Priority reader`, the switch state (`● on` in green,
   `○ off` dim), the count of readings, and `running…` in yellow while a
   reading runs. An unset setting shows the field name here in red.
   Slice E3.6 (not built) adds a moving indicator to the left of
   `running…`, and the stale state below.
2a. **The stale state (slice E3.6, not built).** While a reading runs, the
   pane must not look finished. The summary, the newest card, and the draft
   block of the previous reading turn dim, and a dim row
   `Reading stop #<n+1>…` stands above them. Send and Edit do nothing while
   the new reading runs, because the previous steps describe a state that
   has passed. Right, Wrong and the note stay active on the previous card.
   When the new reading arrives, the pane draws it at full colour.
2. **Agent summary.** A bordered `Box` titled `▸ Agent completed`. It shows
   the digest of the newest reading: `ran`, then `result`, cut at three rows.
   Hotkey `m` closes it to its title row, and `m` again opens it. A reading
   with no digest shows `No digest for this stop` dim.
3. **The newest card.**
   - A title row: `#<n>`, the time, the priority on a red background, the
     status, and `needs you` in yellow on the right when `needs_human` is
     true.
   - The dim line `Proposed steps (1–9 to select)`.
   - One row for each step, in a `Box`. A selectable step is a `Button` with
     `plain: true` and the label `[x] 1. reply` or `[ ] 1. reply`. Its
     content follows on the next row. The focused step has a cyan border.
   - An `ask_human` `decide` step lists each question, then its options as
     toggle Buttons, `[•]` or `[ ]`. A single-choice question clears the
     other options. The question gets an `Input` labelled `Other` when
     `free_text` is true.
   - An `interrupt` step is a dim `Text`: `[-] n. interrupt (no target at a
     stop)`.
4. **The draft block.** A `Box` with a cyan border, titled
   `What will be sent`. It holds the exact draft. Its footer row shows the
   source steps, the length in characters, and the target, `session prompt`.
   With no step selected, it shows `Select a step` dim.
5. **The action row.** `s Send` on a cyan background, then `e Edit`,
   `r Right`, and `w Wrong`, as four Buttons with `plain: true`.
6. **The note.** An `Input` labelled `Note`, with submit label `save`.
7. **History.** The dim title `History`, then one row for each older
   reading: `#<n>`, time, status, priority, and the mark on the right (`✓`
   green, `✗` red, `-` dim). Pressing a row opens that card with marks only.

Three parts of the mockup are not in the design:

- **"Execution paused: waiting on priority reader decision".** At a stop
  the session is idle and waits for the next prompt, from the prompt box or
  from the pane. The Stop hook does not hold it longer. A mod does not
  write that line into the transcript, so the module sets the status line
  instead: `Priority reader · #<n> ready`, and `· needs you` when
  `needs_human` is true. The next prompt clears it.
- **"Target: bash stdin".** The draft goes to the session prompt.
- **"ACTIVE FOCUS", "READY", "interactive", and "DISABLED" tags.** The
  focus border and the dim style carry the same state. The module draws no
  tag that repeats them.

### Element budget

The terminal pane takes only `Box`, `Text`, `Button`, `Input`, `Select`,
`Link`, `Code`, `Markdown`, `Raster`, `Image`, and `Client`. The design uses
`Box`, `Text`, `Button`, and `Input`. There is no checkbox element, so a
selection is a `Button` with a `[x]` or `[ ]` label. There is no hover and
no icon set. Colors are theme keys or named colors. A hotkey is one digit
or one lowercase letter, and it works only while the pane has the focus.
The person moves the focus to the pane with ctrl+x tab or a click.

Step rows take the digits `1` to `9` in step order. A step after the ninth
has no hotkey. The letters `s`, `e`, `r`, `w`, and `m` are the action keys.

### Wireframe: the sidebar at 60 columns

```
┌ Priority reader  ● on               4 readings │ running… ┐
│ ┌ ▸ Agent completed ─────────────────────────── m ──────┐ │
│ │ Ran the full test suite. Found the missing table      │ │
│ │ hindsight_marks. Wrote a migration script.            │ │
│ └───────────────────────────────────────────────────────┘ │
│ #4 14:32  P1  blocked                          needs you  │
│ Proposed steps (1–9 to select)                            │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
│ ┃ [x] 1. reply                                          ┃ │
│ ┃     "Run the migration before the tests, then re-…"   ┃ │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
│ [ ] 2. continue_until · tests pass (5 turns, 20m)         │
│ [ ] 3. ask_human · decide                                 │
│     "Which store keeps the marks?"                        │
│     [•] $.store   [ ] a JSONL file   Other: ________      │
│ [ ] 4. approve_permission · once                          │
│ ┌ What will be sent ────────────────────────────────────┐ │
│ │ Run the migration before the tests, then re-run the   │ │
│ │ suite.                                                │ │
│ │ step 1 · 60 chars · session prompt                    │ │
│ └───────────────────────────────────────────────────────┘ │
│  s Send     e Edit     r Right     w Wrong                │
│ Note: ____________________________________________ save   │
│ History                                                   │
│ #3 14:20 working P3                                    ✓  │
│ #2 14:11 done P4                                       ✗  │
│ #1 14:02 abstain · no_agent_reply                      -  │
└───────────────────────────────────────────────────────────┘
```

In a narrow terminal, or without fullscreen rendering, the same tree draws
as a framed region above the prompt. The region takes a third of the height
by default. The module then draws the summary closed and the history cut to
one row.

## Epic E3: Act

**Outcome.** On the newest card, the person selects steps and answers the
questions of an `ask_human` step. The pane shows the exact draft. `Send`
submits it as a user prompt, `Edit` puts it in the prompt box, and the mark
records what was sent. The pane follows layout C, with the agent summary
at the top and a fixed key row under the header. Notifications move to a
row above the prompt, and a toast tells the person when a reading needs
them.

**Depends on.** E1 (the reading and the store) and E2 (the pane and the
marks). Both are built.

**Files.** `hooks/draft.ts` (new, pure functions), `hooks/pane.tsx`,
`hooks/reader.ts`, `hooks/register.ts`, `types/index.d.ts`, the tests in
`tests/`, and the plugin README. No file outside `plugins/cobuilder-priority/`
changes. Each file stays under 200 lines.

### Slices

| Slice | What it adds | Check |
|---|---|---|
| E3.1 Keep the digest | `reader.ts` stores the parsed `RunDigest` as `digest` on the reading. An abstain stores none. | A test stubs `$.process.run` with a digest JSON, drives `classic.Stop`, and finds `digest.ran` in the stored reading. |
| E3.2 Build the draft | `draft.ts` exports `draftOf(steps, selection, answers)`. It follows the step table and returns the text and the source step indexes. It sends no unselected step and no `interrupt`. | Unit tests for each selectable kind, two steps joined in order, a decide answer with free text, and an empty selection. |
| E3.3 Select on the card | The pane keeps the selection and the answers in `$.state`, for the newest reading only. Digits `1`–`9` toggle steps. A newer reading clears the selection. | Pane tests press `1` and `3`, and find `[x]` on both rows and both lines in the draft block. An older card renders no step Button. |
| E3.4 Send and Edit | `s` calls `$.prompt.submit({ text, asUser: true })`. `e` calls `$.prompt.fill({ text, mode: "replace" })`. Both write `sent` on the mark and clear the selection. With no selection, neither key calls anything. `isFilled: false` writes nothing and shows `The prompt box is not available`. | Pane tests stub both calls and check the arguments, the stored `sent`, and that no call happens without a press or with an empty selection. |
| E3.5 Layout C | The summary block with `m`, the title row, the focus border, the draft block with its footer, the action row, and the history list, as in the wireframe. | A render test finds the summary text, the draft footer `session prompt`, and the three history rows. A live look in a 160-column terminal, kept as a screenshot in the slice evidence. |
| E3.6 Show a running reading (not built) | From the engineer's live run: after the first reading, a new run was not clear. A moving one-cell indicator (`⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏`) stands to the left of `running…`. The reader starts `$.clock.every(120, …)` when a reading starts, and the callback adds 1 to the `tick` atom, which redraws the pane. `cancel()` runs when the reading ends. While the reading runs, the previous summary, card and draft turn dim under a `Reading stop #<n+1>…` row, and Send and Edit do nothing. | A pane test drives a Stop with a pending `$.process.run`, advances the mocked clock, and finds a new indicator frame, the `Reading stop` row, and no submit call on a press of `s`. When the stub resolves, the test finds the new card and no indicator. A live look confirms that the indicator moves. |
| E3.7 Fixed key row (not built) | The row `s Send · e Edit · r Right · w Wrong · m Summary` stands directly under the header, so the pane never cuts it off. A key that cannot act now is dim: Send and Edit with no selection or while a reading runs. The action row under the draft goes away. The note field stays at the bottom. | A pane test finds the key row as the second row, and finds `send` dim with no selection. |
| E3.8 Plain names (not built) | The pane shows each raw value of the model as plain text, from the table in "Plain names" below. The stored reading and the label file keep the raw values. | A unit test maps every value in the table. A pane test finds `Waits for your answer` and `P1 High`, and no raw value with an underscore. |

| E3.9 Row above the prompt (not built) | A `ui.render` hook on `{ component: 'AbovePrompt' }` draws the newest reading's `notify` messages, one row each, as `Notification: <message>`. The pane no longer shows `notify` steps. When the pane is not open at all, the hook also draws one summary row: `Priority reader · #<n> · P1 High · Waits for your answer · needs you`. With no reading and the pane open, the hook returns `next(e)`. | A render test with a `notify` step finds the message above the prompt and not in the pane. With the pane closed, the test finds the summary row. With no `notify` step and the pane open, the hook draws nothing. |
| E3.10 Toast when a reading needs the person (not built) | When a new reading has `needs_human: true`, the reader calls `$.ui.toast("Priority reader · #<n> needs you")` once. | A reader test finds one toast for a `needs_human` reading and none for the others. |
| E3.11 Record the answer labels (not built) | The engineer's concern: this repo's `CLAUDE.md` makes the agent split each answer into FYI, Summary, Next steps, and Decisions and questions. The digest may read well only because of that structure. Each reading records `labels`, the label words found at the start of lines in the last agent message, with no model call. The marks can then be split by `labels`, to show if the readings are worse in a repo without the structure. When the message has a `Summary` part, the reading also stores its text as `agentSummary`, and the summary block shows it under the digest summary as `Agent's own summary`, so the person can compare the two. The digest and the interpreter do not change. | A unit test finds the four labels and the Summary text in a labelled message, and none in a plain message. A reader test finds `labels` and `agentSummary` on the stored reading. A pane test finds both summaries in the block. |

Do not judge the digest's quality from this repo alone. After E3.11, a
week of use includes sessions in a repo with no response structure. If the right-rate of the marks with no labels is clearly lower,
the next design asks the digest to read the agent's own labelled parts.

### Plain names

The engineer chose these names on 2026-11-13. Only the pane uses them.

| Raw value | Pane text |
|---|---|
| `done`, `continuing` | Done, Still working |
| `waiting_answer`, `waiting_permission` | Waits for your answer, Waits for your permission |
| `blocked`, `failed` | Blocked, Failed |
| `P0` to `P4` | P0 Urgent, P1 High, P2 Normal, P3 Low, P4 Can wait |
| `reply`, `continue` | Reply, Continue |
| `continue_until` | Continue until: <goal> (<n> turns, <m> min) |
| `approve_permission` | Allow, or Allow for this session |
| `deny_permission` | Denied permission |
| `pick_option` | Pick option <n> |
| `approve_gate`, `send_feedback` | Approve the gate, Send feedback |
| `interrupt` | Stop the turn |
| `ask_human` with `decide`, `do`, `review` | You decide, You do this, You review |
| `snooze` | Wait until the session is idle, or Wait until the turn ends. The interpreter proposes it, so the person does not set it. |
| `dismiss` | Dismiss: done, out of date, duplicate, or read |
| `notify` | Notification |
| `no_agent_reply` | No agent reply to read |
| `invalid_output` | The model's answer could not be read |
| `model_error` | The model call failed |
| `brief_too_large` | The session is too long to read |
| `digest-current`, `digest-previous`, `no-digest` | (nothing), Summary of the previous stop, No summary |

### Done when

- The eleven slice checks pass under `claude plugin test plugins/cobuilder-priority`.
- `tsc` and `claude plugin validate` pass.
- In a live session, one press of `s` with two selected steps starts one
  user turn that holds both draft lines, and the next stop gets a new card.

### Risks

- A careless press can send model text that the person did not read. The
  draft block shows the exact text, and only the newest card can send.
- `asUser: true` makes the model read the draft as the person's words. The
  person chose this.
- `$.prompt.submit` waits until the session is idle. A press while a turn
  runs sends the draft after that turn, and the card may be stale by then.
