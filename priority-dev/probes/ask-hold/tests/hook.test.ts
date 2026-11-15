// Slice 1, the probe hook on AskUserQuestion: the mode decides, a held call waits for Send, and each event writes one log line.
import { expect, test } from 'claude-code/testing'
import { answerOf } from '../hooks/shapes'
import {
  HOLD,
  LOG,
  OPTIONS,
  PICKS,
  PICKS_OTHER,
  QUESTIONS,
  SEND_KEY,
  SHAPES,
  STUB,
  answerPane,
  askCall,
  labelsOf,
  logLines,
  openedPane,
  optKey,
  otherKey,
  pressKeys,
  setMode,
  shapeKey,
  snapshotOf,
  stubClock,
  stubFiles,
  stubOpen,
  stubTool,
  until,
} from './fakes'

// The picks that the held-call tests press: the first option of question 0, and two options of question 1.
const PRESSED: [number, string][] = [
  [0, 'Format'],
  [1, 'Unit'],
  [1, 'E2E'],
]

test('off by default, the call passes to the stub and no pane opens', { options: OPTIONS }, async ($, on) => {
  const calls = stubTool(on)
  const opened = stubOpen(on)
  const files = stubFiles(on)
  const outcome = await askCall($)
  expect(calls, 'the stub gets the call once').toHaveLength(1)
  expect(outcome, 'the stub answer comes back').toEqual(STUB)
  expect(opened, 'no pane opens').toHaveLength(0)
  expect(logLines(files), 'no log line is written').toHaveLength(0)
  await setMode($, 'off') // the probe command runs, so the probe is loaded in this test
})

test('pass mode passes the call to the stub and no pane opens', { options: OPTIONS }, async ($, on) => {
  const calls = stubTool(on)
  const opened = stubOpen(on)
  await setMode($, 'pass')
  const outcome = await askCall($)
  expect(calls, 'the stub gets the call once').toHaveLength(1)
  expect(outcome, 'the stub answer comes back').toEqual(STUB)
  expect(opened, 'no pane opens').toHaveLength(0)
})

test('pass mode logs one passed line, so the record shows the dialog path', { options: OPTIONS }, async ($, on) => {
  const files = stubFiles(on)
  stubTool(on)
  await setMode($, 'pass')
  await askCall($)
  expect(logLines(files).map((l) => l.kind), 'one passed line').toEqual(['passed'])
})

test('a subagent call passes to the stub in hold mode, with its agentId', { options: OPTIONS }, async ($, on) => {
  const calls = stubTool(on)
  const opened = stubOpen(on)
  await setMode($, 'hold')
  const outcome = await askCall($, 'sub-1')
  expect(calls, 'the stub gets the subagent call once').toHaveLength(1)
  expect(calls[0]?.agentId, 'the stub sees the subagent id').toBe('sub-1')
  expect(outcome, 'the stub answer comes back').toEqual(STUB)
  expect(opened, 'no pane opens for a subagent call').toHaveLength(0)
})

test('hold mode opens the pane ask-hold, with each question, option, Other input, shape, and Send', { ...HOLD }, async ($, on) => {
  stubTool(on)
  stubClock(on)
  const opened = stubOpen(on)
  await setMode($, 'hold')
  const pending = askCall($)
  const ui = await openedPane($, opened)
  const pane = await snapshotOf(ui) // one drawn snapshot, read for every check below
  const keys = [...QUESTIONS.flatMap((q, i) => q.options.map((o) => optKey(i, o.label))), ...SHAPES.map(shapeKey), SEND_KEY, otherKey(0), otherKey(1)]
  for (const key of keys) expect(pane.keys, `the pane draws ${key}`).toContain(key)
  for (const q of QUESTIONS) expect(pane.shown, `the pane shows the question ${q.question}`).toContain(q.question)
  expect(pane.inputs, 'one Other input per question').toBe(QUESTIONS.length)
  await pressKeys(ui, [SEND_KEY])
  await pending
})

test('Send resolves the held call to { result } of the chosen shape, and the stub is not called', { ...HOLD }, async ($, on) => {
  const calls = stubTool(on)
  stubClock(on)
  const opened = stubOpen(on)
  await setMode($, 'hold')
  const pending = askCall($)
  const ui = await openedPane($, opened)
  await answerPane(ui, 'answers-list', PRESSED)
  const outcome = (await pending) as any
  expect(calls, 'the stub is not called for a held call').toHaveLength(0)
  expect(outcome, 'the call resolves to { result } of answerOf for these picks').toEqual({ result: answerOf('answers-list', QUESTIONS, PICKS) })
  expect(outcome?.result?.answers?.[0], 'the first entry is the Format pick').toEqual({ question: 'Which lint?', answer: 'Format' })
  expect(labelsOf(outcome?.result?.answers?.[1]?.answer), 'the second entry holds the two checks').toEqual(['Unit', 'E2E'])
})

test('a free text typed under Other counts as one pick, in the text shape', { ...HOLD }, async ($, on) => {
  stubTool(on)
  stubClock(on)
  const opened = stubOpen(on)
  await setMode($, 'hold')
  const pending = askCall($)
  const ui = await openedPane($, opened)
  await ui.input({ key: otherKey(0), text: 'my own answer', kind: 'change' })
  await answerPane(ui, 'text', [
    [1, 'Unit'],
    [1, 'E2E'],
  ])
  const outcome = (await pending) as any
  expect(outcome, 'the call resolves to { result } of answerOf with the Other text').toEqual({ result: answerOf('text', QUESTIONS, PICKS_OTHER) })
  expect(String(outcome?.result ?? ''), 'the first line carries the Other text').toContain('Which lint?: my own answer')
})

test('the log holds caught, then answered with elapsedMs and shape, in the priority-dev log file', { ...HOLD }, async ($, on) => {
  stubTool(on)
  stubClock(on)
  const opened = stubOpen(on)
  const files = stubFiles(on)
  await setMode($, 'hold')
  const pending = askCall($)
  const ui = await openedPane($, opened)
  await answerPane(ui, 'answers-list', PRESSED)
  await pending
  expect(files.has(LOG), 'the probe writes reports/logs/ask-hold/probe.jsonl under the priority-dev folder').toBe(true)
  const lines = logLines(files)
  expect(lines.map((l) => l.kind), 'the log holds caught, then answered').toEqual(['caught', 'answered'])
  expect(typeof lines[0]?.inTranscript, 'caught says whether the transcript holds the tool_use_id').toBe('boolean')
  expect(typeof lines[1]?.elapsedMs, 'answered carries elapsedMs as a number').toBe('number')
  expect(lines[1]?.shape, 'answered names the shape that Send chose').toBe('answers-list')
})

test('a held call that outruns its budget logs cut-off with the timeout', { ...HOLD }, async ($, on) => {
  stubTool(on)
  stubClock(on)
  const opened = stubOpen(on)
  const files = stubFiles(on)
  await setMode($, 'hold')
  const pending = askCall($)
  await until(() => opened.length > 0)
  await pending.catch(() => undefined) // no press: the engine cuts the hook at its budget, and its .catch handler runs
  const cut = logLines(files).find((l) => l.kind === 'cut-off')
  expect(cut, 'the log holds a cut-off line').toBeDefined()
  expect(String(cut?.detail ?? ''), 'the cut-off line names the timeout').toMatch(/timeout/)
})

test('/ask-probe off stops the probe, so a call passes to the stub again', { options: OPTIONS }, async ($, on) => {
  const calls = stubTool(on)
  const opened = stubOpen(on)
  await setMode($, 'hold')
  await setMode($, 'off')
  const outcome = await askCall($)
  expect(calls, 'the stub gets the call after the off').toHaveLength(1)
  expect(outcome, 'the stub answer comes back').toEqual(STUB)
  expect(opened, 'no pane opens after the off').toHaveLength(0)
})
