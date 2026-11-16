# Epic E3: The reader holds an AskUserQuestion call in its pane

This addendum covers Gate 2b, the program design, and the epic design for
E3. The probe record decided the path: hold the call, with the wait inside
`$.process.spawn`. See `docs/architecture/designs/priority-ask-question/probe-record.md`.

## What the probe proved

- A `tool.call` hook has a fixed budget of 10 seconds of its own time. A
  wait on a plain promise counts, so the engine skips that hook.
- A wait inside a `$` call does not count. A hold inside
  `$.process.spawn` lasted 41 seconds with no cut-off.
- The result must match the tool's output schema:
  `{ questions, answers: { "<question text>": "<answer>" } }`. A
  multi-select answer is comma-joined.
- At the catch, the transcript already holds the `tool_use`.

## Gate 2b: the question card, on layout C

Layout C is the pane design of `priority-dev-cc-plugin`:
`docs/architecture/designs/priority-dev-cc-plugin/pane-design/layout-c.png`.
The pane keeps layout C: the fixed top (header, key row, note), then the
body. While a question is held, the question card replaces the newest
turn-end card at the top of the body.

```
Priority reader  ● on  #5  ⠹ reading…
s Send · e Edit · r Right · w Wrong · m Hide summary
Note: Type an observation

The agent asks you
1. Which store keeps the marks?            [Store]
   [•] $.store      Keeps marks per plugin
   [ ] JSONL file   One file per session
   Other: ____________

2. Which checks run on save?               [Checks] (several)
   [x] Unit
   [x] E2E
   [ ] Lint
   Other: ____________

Reading for this question
   P1 High · Waits for your answer
   1. You decide  Which store keeps the marks?  → $.store
```

- Each question shows its header chip, each option with its description,
  and one Other input. A multi-select question shows "(several)".
- A press on an option selects it. Other text replaces the picks of its
  question.
- `s` sends the answers. With a question that has no pick and no Other
  text, `s` shows "Answer each question first" and sends nothing.
- `Edit` is not used for a question card. The answer goes back as the
  tool result, not as a prompt.
- The reading fills in under the questions when it arrives. It never
  changes the person's picks.
- The pane opens and takes focus when the call is caught.

## Program design addendum

Files, all in `plugins/cobuilder-priority/`:

- `hooks/ask.ts` (new): the `tool.call` hook body. It catches, opens the
  pane, holds in the child, and returns the result.
- `hooks/hold.ts` (new): the answer paths, the `$.process.spawn` argv,
  the stdout drain, and the outcome. This is the probe's `spawn.ts`.
- `hooks/question.tsx` (new): the question card.
- `hooks/register.ts`: registers the hook.
- `hooks/reader.ts`: a question job that runs `priority digest`, then
  `priority interpret --open-question <file>`.
- `types/index.d.ts`: `Reading.stop_kind`, `Reading.questions`,
  `Mark.answers`, and the held-question atom.
- `tests/ask.test.ts`, `tests/question.test.tsx` (new).

```ts
type HeldQuestion = { toolUseId: string; questions: Question[]; picks: Record<number, string[]>; other: Record<number, string>; startedAt: number }
type AskResult = { questions: Question[]; answers: Record<string, string> }
function answerOf(held: HeldQuestion): AskResult
function holdPaths(dir: string, toolUseId: string): { answer: string; done: string }
```

Call stack: `tool.call (AskUserQuestion)` → reader on and main loop, else
`next(e)` → write the questions file → enqueue a question job → open and
focus the pane with the card → await `$.process.spawn` (the wait loop) →
Send writes the answer file, then the done file → parse stdout → return
`{ result }`. On Esc, return a refusal and make no `$` call. On a failed
child, log and return `next(e)`, so the dialog opens.

## Epic design

- **Outcome:** the person answers an agent's question in the pane, with a
  reading beside it, and the dialog never opens.
- **Scope:** main-loop calls only, with the reader on. A subagent call, or
  the reader off, passes the call on.
- **The reading:** it runs in the background, so a slow reading never
  holds the answer. The person may send before the reading arrives.
- **The mark:** the stored reading has `stop_kind: question` and the
  questions. The mark stores the person's answers beside right or wrong.
- **Fallback:** if the child fails to start or ends with an error, the
  hook returns `next(e)`, and the engine's dialog opens.

## Risks

- A hold of three minutes and Esc during a hold have no logged evidence.
  The live check of slice 4 covers both.
- The answer files need a folder. The probe used
  `<session cwd>/.cobuilder/ask-hold/`. The decision for E3 is open.
- The reader runs one job at a time. A question job waits behind a
  running turn-end reading.
