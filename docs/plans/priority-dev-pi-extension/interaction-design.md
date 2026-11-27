# Priority reader in Pi and OMP: Interaction Design Specification

**Version:** 1.0 (draft for Gate 2b)
**Date:** 2026-11-25
**Author:** design session for `priority-dev-pi-extension`, agent-assisted
**Product document:** `01-product.md` is not written yet. Gate 1 and Gate 2
have not run. The engineer asked for this gate first. Until those documents
exist, the design record stands in for them:
`docs/architecture/designs/priority-dev-pi-extension/` (`intent.json`,
`contracts.md`) and ADR-0053.

**Supplied design.** The engineer chose "the exact same functionality" as the
Claude Code plugin. The design source is therefore the approved Claude Code
pane, not a new mockup:

- Layout C: `docs/architecture/designs/priority-dev-cc-plugin/pane-design/layout-c.png`
  and `layout-c.html`.
- The pane contract and the 60-column wireframe:
  `docs/architecture/designs/priority-dev-cc-plugin/contracts.md`, sections
  "Acting on steps" and "The pane".
- The question card: `docs/plans/priority-ask-question/question-card.svg`.
- The running Claude Code module, `plugins/cobuilder-priority/hooks/*.tsx`,
  for every behaviour the mockup does not show.

Where this document differs from the Claude Code pane, section 1.2 lists the
difference and its reason. Each difference comes from the host, not from a
new idea.

---

## 1. Overview

The priority reader reads each main-loop stop of a coding session and shows
one card per reading. The card holds the status, the priority, the steps the
person may take, and a draft of what Send will submit. The person selects
steps, answers questions, marks the reading right or wrong, and sends the
draft. Nothing reaches the session without a press.

This document fixes how that pane behaves in Pi and in OMP. Both hosts load
one package, `pi/cobuilder-priority`. The card content, the draft text, and
the plain names come from `shared/priority-core`, so they are the same as in
Claude Code (split parity, ADR-0053). Only the drawing and the input handling
belong to this host adapter.

Scope: the reader pane, the question card, the status line, the notify band,
the toast, and the fallbacks for RPC and headless modes. Out of scope: the
agent-mode tool `priority_read`, which draws no UI, and the planned Pi
Durable orchestrator, which has no terminal surface.

### 1.1 Core Design Principles

1. **The card text is the core's, not the host's.** The host adapter draws
   the card view model from `shared/priority-core`. It never builds step
   names, draft lines, or status words itself.
2. **The keyboard is the contract.** Every action has a key. A mouse click is
   a convenience where the host gives mouse events, and no action needs one.
3. **The editor keeps the keyboard until the person asks for the pane.** A
   new reading never steals the focus. Only a held question and an explicit
   command or shortcut move the focus to the pane.
4. **Nothing sends without a press, and a press on stale content does
   nothing.** Send and Edit act only on the newest reading, and only while no
   newer reading runs (ADR-0051).
5. **Degrade by surface, never by behaviour.** When a host cannot draw the
   overlay, the same readings, marks, and draft reach the person through
   widgets and dialogs. No mode drops a reading in silence.

### 1.2 Differences from the Claude Code pane

| Claude Code | Pi and OMP | Reason |
|---|---|---|
| A docked side pane from the engine (`$.ui.open`) | A right-anchored overlay from `ctx.ui.custom(..., { overlay: true })` | Pi and OMP have no docked pane. The overlay is the nearest surface. |
| Inline `Input` rows for Note and Other | `n` and `o` open the host's `ctx.ui.input` dialog | A plain-object component would need its own cursor and line editor. The host dialog is in both hosts' common subset. |
| `Button` elements with hotkeys | One focused row, moved with `↑` and `↓`, plus the same letter and digit keys | The component draws lines. It has no button element. |
| Focus moves with ctrl+x tab | Focus moves with `/priority-pane` or the shortcut `alt+p`. `esc` gives the focus back | Pi has `pi.registerShortcut`. Probe E1 checks it in OMP. |
| The engine scrolls the pane body | The component keeps its own scroll offset | An overlay returns lines. It has no engine scroll window. |
| The `AbovePrompt` slot | `ctx.ui.setWidget(..., { placement: "aboveEditor" })` | The same place, through the common subset. |

---

## 2. Information Architecture

### 2.1 Navigation Structure

```
Session (Pi or OMP, TUI mode)
├── Editor and transcript (host-owned)
├── Status line: key "priority-reader"
├── Notify band: widget "priority-notify", above the editor
└── Reader pane: right overlay, id "priority-reader"
    ├── Fixed top: header, key row
    ├── Body (scrolls)
    │   ├── Stale row (while a reading runs)
    │   ├── Agent summary (digest)
    │   ├── Live card: title row, steps, open items, draft block
    │   │   or Question card (held question)
    │   └── History: one row per older reading
    └── Opened older card (replaces the live card, marks only)
```

### 2.2 Data Model

Every entity comes from the core. The pane reads them and writes only marks,
selections, and answers.

| Entity | Fields the pane reads | Fields the pane writes |
|---|---|---|
| `Reading` (core) | `n`, `at`, `state`, `result.status`, `result.priority`, `result.needs_human`, `result.steps[]`, `result.abstain`, `digest.ran`, `digest.result`, `digest.open_items`, `digest.decisions`, `stop_kind`, `questions`, `calibrated`, `host` | none |
| `Mark` (core) | `verdict`, `note`, `sent`, `answers` | `verdict`, `note`, `sent` |
| `Act` (core, per reading) | `steps`, `picks`, `other`, `summaryClosed`, `open`, `notice` | all of them |
| `HeldQuestion` (core) | `questions`, `picks`, `other`, `notice` | `picks`, `other` |
| `CardView` (core) | the rows, names, dim flags, draft text, source footer | none |
| Pane state (host) | `focusedRow`, `scrollOffset`, `focused`, `visible` | all of them |

The core stores readings and marks through its `StorePort`. In Pi and OMP the
port writes `pi.appendEntry("priority.reading", …)` and
`pi.appendEntry("priority.mark", …)`, and it rebuilds the state from
`ctx.sessionManager.getBranch()` at `session_start` (contracts.md, ADR-0053).

### 2.3 Declared Defaults

| Setting | Default value | Alternatives | Declared where |
|---|---|---|---|
| Reader switch | off in each new session | on | core, `on` key. `/priority-on` sets it |
| Pane on `/priority-on` | open and focused | open and unfocused | host adapter |
| Pane on a new reading | unchanged: stays as it is, focus stays where it is | open or focus | host adapter |
| Pane on a held question | open and focused | — | host adapter (ADR-0052) |
| Overlay anchor | `right-center` | `center` under 80 columns (section 9) | host adapter |
| Overlay width | 60 columns, never more than 45% of the terminal | — | host adapter |
| Agent summary | open | closed (`m`) | core, `Act.summaryClosed` |
| Card shown | the newest reading | an older reading from History | core, `Act.open = null` |
| Focused row on focus | the first selectable step of the live card. On a question card, the first option of question 1 | — | host adapter |
| Focus shortcut | `alt+p` | any free key the person sets in settings | host adapter. Probe E1 checks that it is free in both hosts |
| Key labels | words (`s Send`) at 56 columns or more, glyphs (`▶`) below | — | core, `KEY_LABEL_COLUMNS` |
| Theme | the host theme | — | host |

---

## 3. States

### 3.1 Screen States

| State | Trigger | What the person sees |
|---|---|---|
| Off, closed | new session | nothing from the reader |
| Off, open | `/priority-pane` with the switch off | header `○ off`, the hint `The reader is off. Run /priority-on to read each stop.` |
| On, empty | `/priority-on`, no reading yet | header `● on · 0 readings`, the hint `No reading yet. The next stop starts one.` |
| On, running (first reading) | a stop with no earlier reading | header with the moving indicator and `running…`, the empty hint below |
| On, populated | a reading saved | summary, live card, draft block, history |
| On, stale | a prompt was sent, or a newer reading runs | the stale row `Reading stop #<n+1>…`. The previous summary, card, and draft draw dim. Send and Edit do nothing |
| Held question | a main-loop question call held by the hook | the question card in place of the live card, focus in the pane |
| Settings missing | `priority_dev_dir` or `program` is empty | a failed reading card: `failed: Set priority_dev_dir and program in ~/.config/cobuilder-priority/settings.json.` |
| Reading failed | the CLI exits non-zero or prints no JSON | a card with `failed: <last stderr line>` in red, marks still active |
| Abstain | the reading abstains | a card with `abstain · <plain reason>`, no steps |
| Overlay unavailable | `ctx.mode` is not `tui`, or `custom()` returns no handle | section 7.3: the widget and dialog fallback |

### 3.2 Component States

Vocabulary: `default`, `hover`, `focus-visible`, `pressed`, `selected`,
`disabled`, `loading`, `error`, `empty`, `transient`. A terminal has no hover.
`hover` is "not applicable" in every table for that reason.

#### Reader pane (the overlay)

| State | Visual treatment | Initial | Timer arming |
|---|---|---|---|
| Default (open, unfocused) | thin border in the muted theme colour, no row highlight | Yes, when opened by a new reading | not applicable |
| Hover | not applicable: no hover in a terminal | No | not applicable |
| Focus-visible | border in the accent colour. The focused row draws inverse | Yes, when opened by `/priority-on`, `/priority-pane`, `alt+p`, or a held question | not applicable |
| Pressed | not applicable: a key press acts at once | No | not applicable |
| Selected | not applicable to the pane. Rows carry the selection | No | not applicable |
| Disabled | not applicable: the pane is hidden, not disabled | No | not applicable |
| Loading | header shows the frame indicator and `running…` in the warning colour | No | starts when the reader queue starts a job. Stops when the reading is saved or fails |
| Error | a failed card (section 3.1) | No | not applicable |
| Empty | the hint row of section 3.1 | No | not applicable |
| Transient | not applicable | No | not applicable |

#### Step row (selectable step on the live card)

| State | Visual treatment | Initial | Timer arming |
|---|---|---|---|
| Default | `[ ] <n>. <plain name>`, body on the next line, dim body | Yes | not applicable |
| Hover | not applicable | No | not applicable |
| Focus-visible | the row drawn inverse while the pane has the focus | No | not applicable |
| Pressed | not applicable | No | not applicable |
| Selected | `[x] <n>. <plain name>`, a box border in the accent colour around the row and its body | No | not applicable |
| Disabled | the whole card dims while the pane is stale. The row still toggles, and Send does nothing (Claude Code behaviour) | No | not applicable |
| Loading | not applicable | No | not applicable |
| Error | not applicable | No | not applicable |
| Empty | not applicable: a card with no steps draws no rows | No | not applicable |
| Transient | not applicable | No | not applicable |

A step that cannot send (`interrupt`, `snooze`, `dismiss`) draws `[-] <n>.
<name>` dim and takes no focus. An `interrupt` adds `(no target at a stop)`.
A `notify` step draws no row (it goes to the notify band).

#### Option row (decide question on a card, and the question card)

| State | Visual treatment | Initial | Timer arming |
|---|---|---|---|
| Default | `[ ] <label>`, the description dim on the next line | Yes | not applicable |
| Hover | not applicable | No | not applicable |
| Focus-visible | inverse row | No | not applicable |
| Pressed | not applicable | No | not applicable |
| Selected | single choice `[•] <label>`, multi-select `[x] <label>` | No | not applicable |
| Disabled | not applicable: an option is always pickable while the card is live | No | not applicable |
| Loading | not applicable | No | not applicable |
| Error | not applicable | No | not applicable |
| Empty | not applicable | No | not applicable |
| Transient | not applicable | No | not applicable |

Typed text under Other replaces the picks of that question (ADR-0052). The
Other row draws `Other: <text>` or `Other: o to type` dim.

#### Draft block

| State | Visual treatment | Initial | Timer arming |
|---|---|---|---|
| Default (nothing selected) | border, title `▸ WHAT WILL BE SENT`, body `Provide your response` dim | Yes | not applicable |
| Hover | not applicable | No | not applicable |
| Focus-visible | not applicable: the block takes no focus | No | not applicable |
| Pressed | not applicable | No | not applicable |
| Selected (lit) | the exact draft text at full colour, footer `Source: step <n> <name>` or `Source: steps 1, 3` | No | not applicable |
| Disabled | dim, while the pane is stale | No | not applicable |
| Loading | not applicable | No | not applicable |
| Error | a red `notice` row: `Nothing to send yet`, `Answer each question first`, or `The prompt box is not available` | No | the notice clears on the next press of any action key. No timer |
| Empty | gated: the block is absent when the card has no step that can send | No | not applicable |
| Transient | not applicable | No | not applicable |

#### Key row (fixed top)

| State | Visual treatment | Initial | Timer arming |
|---|---|---|---|
| Default | `s Send  e Edit  r Right  w Wrong  m Hide summary` | Yes | not applicable |
| Hover | not applicable | No | not applicable |
| Focus-visible | not applicable: keys act from anywhere in the focused pane | No | not applicable |
| Pressed | not applicable | No | not applicable |
| Selected | Right or Wrong drawn with `✓` after it when that verdict is set | No | not applicable |
| Disabled | Send and Edit dim when no step is selected or the pane is stale. Right and Wrong dim with no reading. On a question card, Edit is always dim | No | not applicable |
| Loading | not applicable | No | not applicable |
| Error | not applicable | No | not applicable |
| Empty | not applicable | No | not applicable |
| Transient | not applicable | No | not applicable |

#### Status line, notify band, toast

| Surface | State | Visual treatment | Initial | Timer arming |
|---|---|---|---|---|
| Status line | default | empty | Yes | not applicable |
| Status line | transient | `Priority reader · #<n> ready`, `· needs you` when `needs_human`, or `#<n> failed` | No | set when a reading is saved. The next submitted prompt clears it. No clock timer |
| Notify band | empty | absent | Yes | not applicable |
| Notify band | default | one warning-colour line per `notify` step: `Notification: <excerpt>`. With the pane closed, also `Priority reader · #<n> · <priority> · <status>` | No | shown when a reading is saved. The next submitted prompt removes the notify lines. The summary line stays until the pane opens |
| Toast | transient | `Priority reader · #<n> needs you` through `ctx.ui.notify(…, "warning")` | No | one toast per reading that is done, not abstained, and `needs_human`. The host owns its dwell |

### 3.3 Visibility Gating

| Control | Renders when | Removed when |
|---|---|---|
| Reader pane | `/priority-on`, `/priority-pane`, `alt+p`, or a held question, in TUI mode and when the overlay fits (section 9) | `/priority-off`, `esc` twice (first `esc` unfocuses, second hides), or the session ends |
| Stale row | a reading runs, and it is not the reading of a held question | the reading is saved or fails |
| Moving indicator and `running…` | a turn-end reading runs | the reading is saved or fails |
| `ready` in the header | the reading of a held question runs | that reading is saved |
| Summary body and digest lists | the summary is open | `m` closes it |
| Open items above the first decide step | the reading has a decide step and `open_items` | — |
| Draft block | the shown card is live and has a step that can send | the person opens an older card |
| Send link and key row Send and Edit | the shown card is live and has a step that can send | the person opens an older card |
| Question card | a main-loop question call is held | Send, Decline, `esc` on the held call, or the call ends |
| `calibrated: false` tag `uncalibrated` in the title row | the reading's `calibrated` is false | — (it stays for that reading) |
| History label and rows | at least one other reading exists | — |
| Notify band | the newest reading has `notify` steps and no prompt was sent since, or the pane is closed | the next prompt is submitted, and the pane is open |
| Fallback widget | the overlay is unavailable (section 7.3) | the overlay becomes available |

---

## 4. Transitions

### 4.1 Transition Table

| Trigger | From | To | Duration | Easing | Guard or reset |
|---|---|---|---|---|---|
| `/priority-on` | off | on, pane open and focused | `--motion-none` | none | writes the switch to the store |
| `/priority-off` | on | off, pane hidden | `--motion-none` | none | a running reading finishes and is saved. A waiting stop is dropped, and its pending record is cleared |
| `/priority-pane` or `alt+p` | pane hidden | pane open and focused | `--motion-none` | none | — |
| `alt+p` | pane open, unfocused | pane focused | `--motion-none` | none | — |
| `esc` | pane focused | pane open and unfocused, focus back in the editor | `--motion-none` | none | on a held question, `esc` declines nothing. It only unfocuses |
| `esc` | pane open, unfocused, and the editor is empty | pane hidden | `--motion-none` | none | the host may keep `esc` for itself. Probe E1 decides. Otherwise only `/priority-pane` toggles |
| Stop event (`agent_settled` in Pi, `session_stop` in OMP), switch on | populated or empty | running (stale if a card exists) | `--frame` per indicator step | linear | dedupe by session id plus leaf id. A stop with the same key is ignored |
| Prompt submitted (`input` event), switch on | populated | stale | `--motion-none` | none | the status line and the notify lines clear |
| Turn ends with no answer (abort or error, no reading) | stale | populated (previous card at full colour) | `--motion-none` | none | Pi `agent_settled.aborted`, or an OMP `session_stop` that leads to no reading |
| Reading saved | running or stale | populated with the new card on top, body scrolled to the top | `--motion-none` | none | focus does not move. The selection of the new card starts empty |
| Reading failed | running | populated with a failed card | `--motion-none` | none | — |
| `1`–`9` | live card | step toggled | `--motion-none` | none | a decide step selects through its answers, not its digit |
| `space` or `enter` on a focused row | live card | row toggled or option picked | `--motion-none` | none | — |
| `o` on a focused question or decide step | live card or question card | host input dialog open | host-owned | host-owned | submit writes `other`. Cancel writes nothing |
| `n` | any card | host input dialog for the note | host-owned | host-owned | submit saves the note on the mark |
| `s` | live card, steps selected, not stale | draft submitted as a user message, selection cleared, `sent` on the mark | `--motion-none` | none | no steps: notice `Nothing to send yet`. Stale: no effect |
| `e` | live card, steps selected, not stale | draft in the editor (`ctx.ui.setEditorText`), pane unfocused | `--motion-none` | none | the editor is unavailable: notice `The prompt box is not available` |
| `r` or `w` | any card with a reading | verdict set on the mark | `--motion-none` | none | pressing the set verdict again keeps it |
| `m` | any | summary open ↔ closed | `--motion-none` | none | the choice holds across readings |
| `h`, then `↑`/`↓` and `enter` on a History row | live card | that older card, marks only | `--motion-none` | none | `enter` on the newest row returns to the live card |
| `PgUp` / `PgDn` | pane focused | body scrolled one screen | `--motion-none` | none | fixed top never scrolls |
| Question call held (Pi `AskUserQuestion`, OMP `ask` only when probe E1 shows the hold works) | any | question card, pane open and focused | `--motion-none` | none | a subagent call, the switch off, or a failed hold passes the call to the host dialog. In OMP without the hold, the reader ignores the call |
| `s` on the question card | every question answered | call answered with the picks, question card removed, answers on the mark | `--motion-none` | none | not every question answered: notice `Answer each question first` |
| `d` on the question card | question card | call answered with "The user declined to answer these questions." and card removed | `--motion-none` | none | — |
| Person interrupts the turn during a held question | question card | card removed at the next prompt | `--motion-none` | none | the core's `dropHeld` |

### 4.2 Timing Tokens

The terminal draws no animated transition. Every state change is immediate.
The only motion is the running indicator.

| Token | Value | Used for |
|---|---|---|
| `--motion-none` | 0 ms | every state change in section 4.1 |
| `--frame` | 120 ms | one step of the braille indicator `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏` (core `FRAME_MS`) |

---

## 5. Interaction Flows

### 5.1 Switch the reader on and read a stop

**User goal:** get a reading of each stop of this session.

**Entry condition:** TUI mode, the package loaded, settings present.

**Flow:**

1. The person runs `/priority-on`. The pane opens focused and shows the empty
   hint. The person presses `esc` and goes on typing.
2. The agent ends a turn. The stop event fires. The pane header shows the
   indicator and `running…`.
3. The reader runs `priority read` in the priority-dev checkout. The session
   is free for the next prompt.
4. The reading is saved. The card appears on top, the status line reads
   `Priority reader · #1 ready`, and a reading that needs the person raises
   one toast.

**Edge cases:**

- If a second stop comes while a reading runs, the reader keeps only the
  newest waiting stop.
- If the settings are missing, the reading saves as failed and names the
  settings file.
- If the host fires both `agent_end` and its stop event for one turn, the
  dedupe key keeps one reading.
- If the session reloads during a reading, the next `session_start` saves a
  failed reading `Lost to a reload of the extension. The next stop reads
  again.` (core pending record).

### 5.2 Select steps and send the draft

**User goal:** act on the reading with one press.

**Entry condition:** a live card with at least one step that can send, and
no reading running.

**Flow:**

1. The person presses `alt+p`. The focus moves to the first selectable step.
2. The person presses `1` and `3`, or moves with `↑`/`↓` and presses `space`.
   The draft block lights and shows the exact text and its source.
3. For a decide step, the person moves to an option and presses `enter`, or
   presses `o` and types under Other in the host dialog.
4. The person presses `s`. The draft is submitted as the user's message. The
   selection clears, the mark records `sent`, and the pane turns stale until
   the next reading.

**Edge cases:**

- If the person presses `e` instead, the draft goes into the editor, the
  pane unfocuses, and nothing is submitted.
- If the person presses `s` with nothing selected, the notice reads
  `Nothing to send yet`.
- If the person presses `s` while the pane is stale, nothing happens.

### 5.3 Mark a reading

**User goal:** record if the reading was right, with a note.

**Entry condition:** any card with a reading, live or older.

**Flow:**

1. The person presses `r` or `w`. The key row shows the verdict with `✓`.
2. The person presses `n`, types a note in the host dialog, and submits.
3. The history row of that reading shows `✓`, `✗`, or `-`.

**Edge cases:**

- If the dialog is cancelled, the note does not change.
- Marks stay in the session file (`priority.mark` entries) and follow the
  branch. A marks entry on a branch that the person leaves is not shown on the
  other branch.

### 5.4 Answer a held question (Pi)

**User goal:** answer the agent's question with a reading beside it.

**Entry condition:** switch on, TUI mode, a main-loop call of the package's
`AskUserQuestion` tool.

**Flow:**

1. The tool's `execute()` holds the call. The pane opens focused on the
   question card: each question with its number, its header chip, and its
   options with their descriptions. The header shows `ready`.
2. A reading of this point runs with `--open-question`. Its summary fills in
   under the card when it arrives. It never changes the picks.
3. The person picks options, or presses `o` to type under Other.
4. The person presses `s`. The tool returns the answers in the Claude Code
   shape. The card goes, and the answers land on the reading's mark.

**Edge cases:**

- If the person presses `d`, the tool returns the decline text.
- If a subagent calls the tool, or the switch is off, the tool shows the host
  `select` and `input` dialogs, one per question, with no reading.
- If the reading is slow, Send still works at once (ADR-0052).

### 5.5 Answer a question in OMP

**User goal:** the same as 5.4, with OMP's own `ask` tool.

**Entry condition:** switch on, TUI mode, a main-loop `ask` call with a
`questions[]` input.

**Flow:** probe E1 decides if OMP question stops ship at all.

1. **Hold works** (an override of `ask`, or a raised `toolCallTimeoutMs`):
   the same as 5.4.
2. **Hold does not work:** the reader does not support OMP question stops.
   OMP's own dialog opens as usual, and the reader adds nothing to it: no
   question card, no question reading, no answers on a mark. The next
   turn-end stop reads as usual. The engineer decided this on 2026-11-25: a
   read-only card beside the OMP dialog is not worth shipping.

**Edge cases:**

- An `ask` call with only an HTML form gets no question card and no question
  reading, also when the hold works.

### 5.6 Open an older reading

**User goal:** look back at an earlier reading and mark it.

**Entry condition:** at least two readings.

**Flow:**

1. The person presses `h`. The focus moves to the first History row.
2. The person moves with `↑`/`↓` and presses `enter`. That card shows, marks
   only: no draft block, no Send, steps dim.
3. `enter` on the newest row, or `h` again, returns to the live card.

**Edge cases:**

- If a new reading arrives while an older card is open, the older card stays
  open. The header count rises, and the History list gains the new row.

---

## 6. Component Specifications

### 6.1 Reader pane

**Dimensions:** 60 columns, never more than 45% of the terminal width. Height
is the terminal height minus 2 rows of margin, with `maxHeight: "100%"`.
**Position:** overlay, `anchor: "right-center"`, `margin: 1`. Shown with
`nonCapturing: true` and focused through `OverlayHandle.focus()`.

**Layout (60 columns):**

```
┌ Priority reader  ● on   4 readings  ⠹ running… ─────────┐
│  s Send   e Edit   r Right   w Wrong   m Hide summary   │  fixed top
├──────────────────────────────────────────────────────────┤
│ Reading stop #5…                                        │  stale row
│ ┌ ▾ Agent completed ──────────────────────────────────┐ │
│ │ Ran the full test suite. Found the missing table.   │ │
│ │ Decisions                                           │ │
│ │ · Keep marks in the session file                    │ │
│ └─────────────────────────────────────────────────────┘ │
│ #4 14:32  P1 High  Blocked  needs you  uncalibrated     │
│ Proposed steps (1–9 to select)                          │
│ ╭─────────────────────────────────────────────────────╮ │
│ │ [x] 1. Reply                                        │ │
│ │     "Run the migration before the tests."           │ │
│ ╰─────────────────────────────────────────────────────╯ │
│ [ ] 2. Continue until: tests pass (5 turns, 20 min)     │
│ Open items                                              │
│ · The migration is not committed                        │
│     3. You decide                                       │
│     "Which store keeps the marks?"                      │
│     [•] session file   [ ] JSONL   Other: o to type     │
│ [-] 4. Stop the turn (no target at a stop)              │
│ ╭ ▸ WHAT WILL BE SENT ────────────────────────────────╮ │
│ │ Run the migration before the tests.                 │ │
│ │ Source: step 1 Reply                                │ │
│ ╰─────────────────────────────────────────────────────╯ │
│ History                                                 │
│ #3 14:20 Still working P3 Low                       ✓   │
│ #2 14:11 Done P4 Can wait                           ✗   │
│ Note: n to write                                        │
└──────────────────────────────────────────────────────────┘
```

**Behaviour:**

- The fixed top is the first two rows. The body scrolls under it.
- Keys work only while the pane has the focus. The digits `1` to `9` map to
  step numbers. `s`, `e`, `r`, `w`, `m`, `n`, `o`, `h`, `d` are action keys.
- In Pi, a mouse click on a row acts like `enter` on that row, through
  `handleMouse`. OMP mouse support is a probe E1 question.
- The note row sits at the foot of the body in Pi and OMP, not in the fixed
  top. A dialog edits it, so it needs no fixed input row.

### 6.2 Question card

**Dimensions and position:** inside the pane body, in place of the live card.

**Layout:**

```
│ 1. Which store keeps the marks?  Storage                │
│ [•] session file                                        │
│     One entry per mark in the session                   │
│ [ ] JSONL file                                          │
│ Other: o to type                                        │
│ 2. Ship it now? (several)                               │
│ [x] yes  [ ] after tests                                │
│ ╭ ▸ WHAT WILL BE SENT ────────────────────────────────╮ │
│ │ Which store keeps the marks? → session file          │ │
│ │ Source: 2 answers                                   │ │
│ ╰─────────────────────────────────────────────────────╯ │
│ s Send   d Decline to answer                            │
```

**Behaviour:** Send is dim until each question has an answer. Edit is always
dim, because a held answer goes back as the tool result, not as a prompt.

### 6.3 Status line, notify band, and toast

- Status line: `ctx.ui.setStatus("priority-reader", text)`. One line.
- Notify band: `ctx.ui.setWidget("priority-notify", lines, { placement:
  "aboveEditor" })`. At most 3 notify lines, then `+<k> more in the pane`.
- Toast: `ctx.ui.notify(text, "warning")`.

---

## 7. Error States and Edge Cases

### 7.1 The CLI fails or times out

**Scenario:** `priority read` exits non-zero, prints no JSON, or passes
`timeout_seconds`.

**Handling:** the reading saves as failed with the last stderr line. The card
shows `failed: <line>` in red. The status line reads `#<n> failed`. No toast.
The next stop reads again.

### 7.2 Two stop events for one turn

**Scenario:** a host fires its stop event twice, or OMP re-enters
`session_stop` after an advisory continuation.

**Handling:** the dedupe key (session id plus leaf id) drops the second. A
liveness line in the status line names the event that fired on the first
reading of the session: `Priority reader · stop event agent_settled`.

### 7.3 The overlay is unavailable

**Scenario:** RPC mode (`custom()` returns no handle), a terminal under 60
columns, or probe E1 shows that one host cannot draw the component.

**Handling:** the fallback surface keeps every action.

- The notify band shows the summary line of the newest reading.
- `/priority-pane` opens `ctx.ui.select` with the steps that can send. Each
  pick toggles a step. A last item `Send`, `Edit`, `Right`, `Wrong`, or
  `Note` acts like its key.
- A decide question opens `ctx.ui.select` for its options and
  `ctx.ui.input` for Other.

### 7.4 Headless modes

**Scenario:** print mode or JSON mode (`ctx.hasUI` is false).

**Handling:** the reader still reads each stop when the switch is on, and it
stores the reading. No surface draws. A held question is not held: the
`AskUserQuestion` tool returns an error result that says no person can
answer. Agent mode (`priority_read`) is the way to get readings in these
modes.

### 7.5 Session switch, fork, or branch

**Scenario:** the person resumes another session, forks, or moves on the
tree.

**Handling:** at `session_start` (and OMP `session_branch` and
`session_tree`), the adapter rebuilds readings and marks from
`getBranch()`. The pane redraws for the new branch. A reading that runs for
the old session saves to the old session's entries and does not draw.

### 7.6 Cases checked

| Case | Applies | Handling |
|---|---|---|
| No data | yes | the empty hints of section 3.1 |
| More data than the layout holds | yes | the body scrolls. History lists every reading |
| Timeout | yes | 7.1 |
| Offline | yes | the model call fails, as in 7.1 |
| Concurrent editing | no | one person per session |
| Reading arrives while an older card is open | yes | 5.6 edge case |
| Resource deleted while open | yes | 7.5 |
| Maximum limits | yes | steps after the ninth have no digit. They still take focus with `↑`/`↓` |

---

## 8. Accessibility

### 8.1 Keyboard Navigation

- `alt+p` or `/priority-pane` focuses the pane. `esc` returns the focus to
  the editor.
- `↑`/`↓` move the focused row over the rows that take focus: selectable
  steps, options, Other rows, and History rows (after `h`).
- `space` toggles a step or an option. `enter` picks an option or opens a
  History row.
- `1`–`9`, `s`, `e`, `r`, `w`, `m`, `n`, `o`, `h`, `d` act directly.
- `PgUp`/`PgDn` scroll the body.

### 8.2 Screen Reader Support

A terminal overlay has no accessibility tree. The status line and the toast
carry each state change as plain text, so a terminal screen reader reads the
reading number, the status, and `needs you` there.

### 8.3 Colour Independence

| Signal | Colour | Text that carries it |
|---|---|---|
| Switch on or off | success or dim | `● on`, `○ off` |
| Running | warning | `running…` |
| Needs the person | warning | `needs you` |
| Failed | error | `failed:` |
| Selected step | accent border | `[x]` |
| Picked option | — | `[•]` or `[x]` |
| Verdict | success or error | `✓`, `✗`, `-` |
| Stale | dim | the stale row `Reading stop #<n>…` |
| Uncalibrated | dim | `uncalibrated` |

### 8.4 Focus Management

- On open by command or shortcut: focus goes to the pane, on the row of
  section 2.3.
- On a new reading: the focus does not move. If the pane has the focus, the
  focused row moves to the first selectable step of the new card.
- On `e` (Edit): the pane unfocuses and the editor takes the focus with the
  draft in it.
- On `s` (Send): the focus stays in the pane.
- On a held question: the pane takes the focus. On Send or Decline, the focus
  returns to the editor.
- A host dialog (`n`, `o`, fallback `select`) takes the focus while open, and
  returns it to the pane on close.

---

## 9. Responsive Considerations

A terminal has columns, not pixels. The breakpoints are the terminal width.

### 9.1 Wide (110 columns or more)

The overlay sits at the right, 60 columns. The transcript stays readable on
the left.

### 9.2 Medium (80 to 109 columns)

The overlay sits at the right at 45% of the width (36 to 49 columns). Key
labels turn to glyphs below 56 columns. The summary starts closed.

### 9.3 Narrow (under 80 columns)

The overlay draws only while it has the focus, centred, at the full width
minus 2. Unfocused, it is hidden (`visible()` returns false), and the notify
band carries the summary line.

---

## 10. Animation Specifications

| Animation | Where | Duration | Easing |
|---|---|---|---|
| Running indicator | header, before `running…` | `--frame` per step | linear |

The indicator redraws through `tui.requestRender()`. It stops on every path,
also on a failed reading (core `withSpinner`). No other motion exists.

---

## 11. Layering, Hit Targets, and Scroll Ownership

### 11.1 Layering

| Layer | Token | Surfaces | Collision rule |
|---|---|---|---|
| Base | `--z-base` | transcript, editor, status line, notify band | the reader pane covers the right part of the transcript. The editor and the status line stay visible below |
| Panel | `--z-panel` | reader pane overlay | one reader pane per session. A second open call focuses the existing pane |
| Dialog | `--z-dialog` | host `select`, `input`, OMP `ask` dialog | above the reader pane. It takes the focus while open |
| Toast | `--z-toast` | host notification | the host decides. It never takes the focus |

### 11.2 Hit Targets

| Control | Element that receives the event | Clickable bounds | Ancestor pointer-events |
|---|---|---|---|
| Every key action | the reader pane component (`handleInput`) while focused | the whole pane | not applicable: a terminal has no pointer-events. The host routes keys to the focused component only |
| Step row (mouse, Pi) | the step row | the full row width, both lines of the step | not applicable |
| Option (mouse, Pi) | the option label | the label text and its marker | not applicable |
| History row (mouse, Pi) | the History row | the full row width | not applicable |
| Focus shortcut `alt+p` | the host shortcut registry | not applicable | not applicable |

The browser rule of this template ("a control inside `pointer-events: none`")
has a terminal twin: a key that the host keeps for itself never reaches the
component. Probe E1 records which of the pane keys each host keeps.

### 11.3 Scroll Ownership

| Region | Owns the wheel and the scroll keys | Other surface |
|---|---|---|
| Reader pane, focused | the pane (`capturesViewportInput: true`): `PgUp`, `PgDn`, the wheel | the transcript does not scroll |
| Reader pane, unfocused | the transcript | the pane does not scroll |
| Pane body under the fixed top | the body | the fixed top never scrolls |

---

## 12. Future Considerations

1. **Inline text input in the pane:** a focusable line editor would replace the
   `n` and `o` dialogs and match Claude Code exactly. Revisit when the host
   adapters share a line-editor component.
2. **A tmux or herdr side pane:** a real side pane through `ctx.ui.openTerminal`
   (OMP) or tmux would give a docked view. Revisit if the overlay hides too
   much of the transcript in use.
3. **An orchestrator view:** the planned Pi Durable orchestrator needs a
   surface for many children. It is a different screen, designed with epic E10.

---

## Document Validation Checklist

- [x] Every interactive component has a state table in Section 3.2.
- [x] Every component marks exactly one initial state. The pane marks two,
  one per entry route, and section 2.3 decides which.
- [x] Every timer names its arming event and its reset event (indicator,
  status line, notify band, notice).
- [x] Every control with a conditional existence appears in Section 3.3.
- [x] Every multi-valued setting appears in Section 2.3 with a default.
- [x] Every state change appears in Section 4.1 with a source and target state.
- [x] Every duration in Section 4.1 names a token from Section 4.2.
- [x] Every flow names its entry condition and its edge cases.
- [x] Every floating surface names a layer from Section 11.1.
- [x] Every control names its hit target element and its clickable bounds.
- [x] Every overlapping region names the surface that owns the gesture.
- [x] No section depends on the mockup for an answer.

## Decisions from the engineer (2026-11-25)

1. **Note and Other as dialogs (section 1.2).** Accepted. `n` and `o` open
   the host input dialog.
2. **The focus shortcut `alt+p`.** Accepted.
3. **Focus on `/priority-on`.** Accepted. The pane opens focused, as in
   Claude Code.
4. **OMP question flow (5.5).** If probe E1 shows that OMP cannot hold the
   `ask` call, OMP question stops are not supported. There is no read-only
   fallback card.

## Procedural notes

- The engineer asked for this gate before Gates 1 and 2. Gate 1
  (`01-product.md`) and Gate 2 (`02-architecture.md`) were then written on
  2026-11-25, and this document agrees with both.
- The tracker generates `00-status.md` when it seeds the program record.
  The `2b` line then records this gate.
- Step 2 (component research) and Step 3 (`ui-spec.jsonc`) wait for the
  approval of this document, as the design-to-code checkpoint requires.
