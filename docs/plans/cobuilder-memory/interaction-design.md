# Memory pane: Interaction Design Specification

Feature: cobuilder-memory, epic E1, slice 4.
Source design: `mockups/memory-pane.html`, approved by the engineer on
2026-10-15. Contract: `docs/architecture/designs/cobuilder-memory/contracts.md`,
section "The memory pane".

## 1. Overview

The memory pane is one terminal pane in a Claude Code session. It shows the
person what one memory run does while the agent waits for it, and what the
run found when it ends. It is read-only. The full result goes to the agent
as the tool result. The pane only mirrors it.

### 1.1 Core Design Principles

- **Open first.** The pane opens before the first Haiku call, because a run
  can take minutes.
- **Show activity.** Each step and each Hindsight call shows its state while
  it runs.
- **Add no fact.** The pane shows only facts that the result also holds.

## 2. Information Architecture

### 2.1 Navigation Structure

One pane, id `memory-run`, title `🧠 Hindsight: CoBuilder Memory Run`. It has
no navigation and no second view. Each new run replaces the content of the
pane.

### 2.2 Data Model

The pane draws one atom, `{ plugin: "cobuilder-memory", key: "run" }`:

| Field | Meaning |
|---|---|
| `startedAt` | the run's start time, `HH:MM` |
| `elapsedSec` | seconds since the start, updated each second while the run works |
| `bank` | the bank id |
| `step` | `query`, `search`, `questions`, `reflect`, `done`, or `failed` |
| `need` | Haiku's Need line, or empty before step `search` |
| `calls` | one entry per Hindsight call: name, state (`running`, `done`, `failed`), and a short count or reason |
| `recall` | the query, the counts (results, this session, kept), and the kept records |
| `page` | the picked page's name and date, or none |
| `reflects` | each question with its state and, when done, the first line of its answer |
| `error` | the reason, when `step` is `failed` |

### 2.3 Declared Defaults

| Item | Default |
|---|---|
| Content before the first run | the line `No memory run yet. The agent or /memory-recall starts one.` |
| Recall records shown when done | the first 2, then `… N more` |
| Reflect answer shown | the question cut to one row, then its state mark |
| Elapsed time format | `m:ss` |
| Width | the pane's own columns. Long lines cut at the edge with `…` |

## 3. States

### 3.1 Screen States

| State | Shown when | Content |
|---|---|---|
| Empty | no run yet in this session | the default line from 2.3 |
| Working | `step` is `query`, `search`, `questions`, or `reflect` | header, Need, one row per step with its mark and counts, running calls |
| Done | `step` is `done` | header with run time, recall query and records, page, reflect rows, last line `The full result went to the agent.` |
| Failed | `step` is `failed` | header, the completed steps, and the reason in red |

### 3.2 Component States

#### Step row

| State | Mark | Colour |
|---|---|---|
| waiting | (row hidden) | none |
| running | `◐` | yellow |
| done | `✓` | green |
| failed | `✗` | red |

#### Reflect row

| State | Mark | Colour |
|---|---|---|
| running | `◐` | yellow |
| answered | `✓` | green |
| failed or timed out | `✗` with the reason after the question | red |

### 3.3 Visibility Gating

- A step row shows once its step starts. A later step stays hidden until then.
- The Need line shows once Haiku's first call returns.
- The page row shows only in the Done state, and reads `none picked` when
  Haiku picked no page.
- The last line `The full result went to the agent.` shows only in the Done
  state.

## 4. Transitions

### 4.1 Transition Table

| From | Event | To |
|---|---|---|
| Empty or Done or Failed | a run starts | Working, `step` `query` |
| Working `query` | Haiku returns the Need and Recall lines | Working `search` |
| Working `search` | recall and page search both end | Working `questions` |
| Working `questions` | Haiku returns the page and the questions | Working `reflect` |
| Working `reflect` | the page read and every reflect end | Done |
| Working, any step | the bank cannot be found, Haiku fails, or the `hindsight` server is missing | Failed |

A single Hindsight call that fails does not move the run to Failed. It marks
its own row, and the run goes on.

### 4.2 Timing Tokens

| Token | Value |
|---|---|
| `tick` | 1 s: the elapsed time redraws once a second while the run works |
| `open` | 0 s: the pane opens before the first Haiku call |
| `haiku-timeout` | 60 s per Haiku call |
| `mcp-timeout` | the engine's MCP timeout, measured in slice 1 |

## 5. Interaction Flows

### 5.1 The agent starts a run

1. The agent calls the consult tool.
2. The pane opens unasked and shows the Working state at step `query`.
3. Each step and call updates its row as it starts and ends.
4. The pane shows the Done state. The agent receives the result.

### 5.2 The person starts a run

1. The person types `/memory-recall`.
2. The pane opens asked, at any width, and the flow continues as in 5.1.

## 6. Component Specifications

### 6.1 Memory pane

- Title row, in every state: `🧠 Hindsight: CoBuilder Memory Run` in bold.
  The engine shows a pane title only as a tab when two or more panes are
  open, so the pane draws its own.
- Header row: the bank in dim text, then `·`, the start time, and in the
  Done state `·` and the run time.
- A blank row, then `Need:` and its text, wrapped to the pane width with a
  6-column indent on later rows.
- Step rows: the mark, the step name padded to 10 columns, then its counts.
- Done content: `Recall` with the query in quotes, the records as
  `n [date] text…`, `Page` with its name and date, then `Reflect` and one
  row per question.

## 7. Error States and Edge Cases

### 7.1 The pane cannot open

When the pane cannot be placed, the run goes on. The tool result still
reaches the agent.

### 7.2 Cases to Check

- No `hindsight` MCP server: Failed state with the set-up message.
- Outside a git repo: Failed state with `No bank: this folder is not in a git repository.`
- The reflect times out: Done state with one `✗` reflect row and its reason.
- A second run while the first runs: the second run replaces the atom.

## 8. Accessibility

### 8.1 Keyboard Navigation

The pane takes no input and no focus. It opens without focus.

### 8.2 Screen Reader Support

Each mark has a word beside it in the row (`done`, `running`, `failed` in the
counts text), so the state does not rest on the symbol alone.

### 8.3 Colour Independence

Each state has its own mark as well as its colour.

### 8.4 Focus Management

The pane never takes focus from the prompt.

## 9. Responsive Considerations

### 9.1 Desktop (over 1200 px)

A terminal of 144 columns or more places the pane when the agent's tool
call opens it.

### 9.2 Tablet (768 px to 1200 px)

A terminal from 110 to 143 columns places it only after the person has
opened it once in the session.

### 9.3 Mobile (under 768 px)

A narrower terminal places it only through `/memory-recall`.

## 10. Animation Specifications

None. The elapsed time changes once a second, and nothing moves.

## 11. Layering, Hit Targets, and Scroll Ownership

### 11.1 Layering

The engine places the pane beside the transcript. The plugin draws only the
pane's content.

### 11.2 Hit Targets

None. The pane has no button and no link.

### 11.3 Scroll Ownership

The pane does not scroll. It fits its content to the viewport rows, and it
cuts the record list first, then the reflect rows, with `… N more`.

## 12. Future Considerations

Epic E3 adds a list of every Hindsight call of the session to this pane.
