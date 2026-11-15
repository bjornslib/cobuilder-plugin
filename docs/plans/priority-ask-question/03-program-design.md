# Program Design: The priority reader answers an AskUserQuestion call

This program design covers E1 and E2. E3 gets its own addendum after the
probe record exists, because the record decides between hold and
fallback.

## Files

E1, the probe mod (test equipment, loaded with `--plugin-dir`):

- `priority-dev/probes/ask-hold/.claude-plugin/plugin.json`: the mod
  manifest, name `ask-hold-probe`.
- `priority-dev/probes/ask-hold/hooks/hooks.json`: names the module.
- `priority-dev/probes/ask-hold/hooks/register.tsx`: the commands, the
  `tool.call` hook, and the pane.
- `priority-dev/probes/ask-hold/hooks/shapes.ts`: the candidate answer
  shapes, as pure functions.
- `priority-dev/probes/ask-hold/tests/*.test.ts(x)`: `claude plugin test`.
- `docs/architecture/designs/priority-ask-question/probe-record.md`: the
  record, with one blank row for each question that the person fills
  after the live run.

E2, priority-dev:

- `priority-dev/src/priority/cli.py`: the `--open-question` option.
- `priority-dev/src/priority/brief/`: the open questions and `stop_kind`
  on the brief.
- `priority-dev/tests/`: pytest cases.

## Types & signatures

```ts
// shapes.ts
type Question = { question: string; header?: string; multiSelect?: boolean; options: { label: string; description?: string }[] }
type Picks = Record<number, string[]>          // question index -> chosen labels, or one free text
type ShapeId = 'answers-by-question' | 'answers-list' | 'text'
function answerOf(shape: ShapeId, questions: Question[], picks: Picks): unknown

// register.tsx
type Mode = 'hold' | 'pass'
type ProbeEvent = { at: string; kind: 'caught' | 'passed' | 'answered' | 'refused' | 'cut-off'; elapsedMs?: number; shape?: ShapeId; inTranscript?: boolean; detail?: string }
```

```python
# cli.py
def interpret(transcript, stop, log_dir, program, digest="previous", open_question: Path | None = None) -> int
# brief
StopBrief.stop_kind: Literal["turn_end", "question"]
StopBrief.open_questions: tuple[OpenQuestion, ...]
```

## Call stack

E1: `tool.call (AskUserQuestion)` → main loop and hold mode → log
`caught` with `inTranscript` → `$.ui.open` the probe pane → await the
press → `answerOf(shape)` → return `{ result }` → log `answered`, or log
`refused` with the engine error. A `.catch` handler logs `cut-off` when
the hook outruns its budget.

E2: `priority interpret --open-question f` → `build_brief(...,
open_questions=read(f))` → the brief text shows an `OPEN QUESTION`
section → the reading carries `stop_kind: question`.

## Test plan

- E1: `claude plugin test priority-dev/probes/ask-hold`. A stub beneath
  the plugin answers `tool.call`. Tests cover: pass mode calls `next`; a
  subagent call calls `next`; hold mode opens the pane and returns
  `{ result }` after a press; each shape function gives its documented
  shape; each event writes one log line.
- E2: pytest. With the flag, the brief has the section and `stop_kind`
  question. Without it, the brief equals the stored snapshot.

## Least confident decisions

- The answer shape: the probe offers three candidates, because no local
  type file holds the output schema.
- Whether a `.catch` handler fires on a budget cut-off for a `tool.call`
  hook. If it does not, the record relies on the person's report of a
  dialog.
- Whether `transcript_path` is readable from a `tool.call` hook. If not,
  the probe reads the newest transcript of the session folder.
