// Slice 2, the hold-spawn mode: the held call waits inside $.process.spawn, and the child reads the answer file that Send writes.
import { expect, test } from 'claude-code/testing'
import { answerOf } from '../hooks/shapes'
import {
  CWD,
  HOLD,
  PICKS,
  QUESTIONS,
  SEND_KEY,
  SHAPES,
  STUB,
  answerPane,
  askCall,
  logLines,
  openedPane,
  optKey,
  otherKey,
  pressKeys,
  setMode,
  shapeKey,
  sleep,
  snapshotOf,
  stubClock,
  stubCwd,
  stubOpen,
  stubTool,
  stubWrites,
} from './fakes'

// The picks that the held-call tests press: the first option of question 0, and two options of question 1.
const PRESSED: [number, string][] = [
  [0, 'Format'],
  [1, 'Unit'],
  [1, 'E2E'],
]

const DIR = `${CWD}/.cobuilder/ask-hold/`
const SCRIPT = 'until [ -e "$1" ]; do sleep 0.2; done; cat "$2"'

// Plays the child of the sh command. It waits until the done file exists, then prints the answer file. Each wait lasts `beatMs`, so no one pull outruns the hook budget. With `exit`, it ends at once with that status.
function stubChild(on: any, files: Map<string, string>, beatMs: number, exit?: { code: number | null; signal: string | null }) {
  const calls: any[] = []
  on('process.spawn', async function* (_$: any, e: any) {
    calls.push(e)
    if (exit) return { value: exit }
    const [donePath, answerPath] = e.argv.slice(4)
    while (!files.has(donePath)) {
      await sleep(beatMs)
      yield { stream: 'stderr', text: '.' }
    }
    yield { stream: 'stdout', text: files.get(answerPath) ?? '' }
    return { value: { code: 0, signal: null } }
  })
  return calls
}

// The stubs of a hold-spawn test: the session folder, the clock, the dialog, the pane, the files, and the child.
function stubs(on: any, beatMs = 20, exit?: { code: number | null; signal: string | null }) {
  stubCwd(on)
  stubClock(on)
  const dialog = stubTool(on)
  const opened = stubOpen(on)
  const disk = stubWrites(on)
  const spawns = stubChild(on, disk.files, beatMs, exit)
  return { dialog, opened, disk, spawns }
}

test('hold-spawn opens the pane ask-hold, and runs process.spawn once with the sh argv and the two paths', { ...HOLD }, async ($, on) => {
  const { opened, spawns } = stubs(on)
  await setMode($, 'hold-spawn')
  const pending = askCall($)
  const ui = await openedPane($, opened)
  await answerPane(ui, 'answers-list', PRESSED)
  await pending
  expect(spawns, 'process.spawn runs once').toHaveLength(1)
  const argv = spawns[0].argv
  expect(argv.slice(0, 4), 'the sh command, its script, and the $0 name').toEqual(['/bin/sh', '-c', SCRIPT, 'sh'])
  const [donePath, answerPath] = argv.slice(4)
  const id = String(donePath).slice(DIR.length, -'.done'.length)
  expect(id.length > 0, 'the file names carry the tool_use_id').toBe(true)
  expect(donePath, 'the done file is <id>.done in the ask-hold folder under the session').toBe(`${DIR}${id}.done`)
  expect(answerPath, 'the answer file is <id>.answer.json in the same folder').toBe(`${DIR}${id}.answer.json`)
})

test('Send writes the answer file first, then the empty done file', { ...HOLD }, async ($, on) => {
  const { opened, disk, spawns } = stubs(on)
  await setMode($, 'hold-spawn')
  const pending = askCall($)
  const ui = await openedPane($, opened)
  await answerPane(ui, 'answers-list', PRESSED)
  await pending
  expect(spawns, 'process.spawn runs once').toHaveLength(1)
  const [donePath, answerPath] = spawns[0].argv.slice(4)
  const answerAt = disk.writes.indexOf(answerPath)
  const doneAt = disk.writes.indexOf(donePath)
  expect(answerAt, 'the answer file is written').toBeGreaterThanOrEqual(0)
  expect(doneAt, 'the done file is written').toBeGreaterThanOrEqual(0)
  expect(answerAt < doneAt, 'the answer file is written before the done file').toBe(true)
  expect(JSON.parse(disk.files.get(answerPath) ?? 'null'), 'the answer JSON is answerOf for these picks').toEqual(answerOf('answers-list', QUESTIONS, PICKS))
  expect(disk.files.get(donePath), 'the done file is empty').toBe('')
})

test('the child stdout, parsed, becomes { result }, and the dialog stub is not called', { ...HOLD }, async ($, on) => {
  const { dialog, opened } = stubs(on)
  await setMode($, 'hold-spawn')
  const pending = askCall($)
  const ui = await openedPane($, opened)
  await answerPane(ui, 'answers-list', PRESSED)
  const outcome = (await pending) as any
  expect(dialog, 'the dialog stub is not called for a held call').toHaveLength(0)
  expect(outcome, 'the call resolves to { result } of answerOf for these picks').toEqual({ result: answerOf('answers-list', QUESTIONS, PICKS) })
})

test('a child that exits with code 1 logs cut-off, and the call passes to the dialog', { ...HOLD }, async ($, on) => {
  const { dialog, disk } = stubs(on, 20, { code: 1, signal: null })
  await setMode($, 'hold-spawn')
  const outcome = await askCall($)
  expect(dialog, 'the dialog stub is called once').toHaveLength(1)
  expect(outcome, 'the dialog answer comes back').toEqual(STUB)
  const cut = logLines(disk.files).find((l) => l.kind === 'cut-off')
  expect(cut, 'the log holds a cut-off line').toBeDefined()
  expect(String(cut?.detail ?? ''), 'the cut-off line names the exit code 1').toMatch(/\b1\b/)
})

test('a child ended by a signal logs cut-off that names the signal, and the call passes to the dialog', { ...HOLD }, async ($, on) => {
  const { dialog, disk } = stubs(on, 20, { code: null, signal: 'SIGTERM' })
  await setMode($, 'hold-spawn')
  const outcome = await askCall($)
  expect(dialog, 'the dialog stub is called once').toHaveLength(1)
  expect(outcome, 'the dialog answer comes back').toEqual(STUB)
  const cut = logLines(disk.files).find((l) => l.kind === 'cut-off')
  expect(cut, 'the log holds a cut-off line').toBeDefined()
  expect(String(cut?.detail ?? ''), 'the cut-off line names the signal').toMatch(/SIGTERM/)
})

test('a subagent call in hold-spawn passes on with no spawn and no pane, and the next main-loop call holds', { ...HOLD }, async ($, on) => {
  const { dialog, opened, spawns } = stubs(on)
  await setMode($, 'hold-spawn')
  const outcome = await askCall($, 'sub-1')
  expect(dialog, 'the dialog stub gets the subagent call once').toHaveLength(1)
  expect(dialog[0]?.agentId, 'the dialog stub sees the subagent id').toBe('sub-1')
  expect(outcome, 'the dialog answer comes back').toEqual(STUB)
  expect(spawns, 'no process.spawn for a subagent call').toHaveLength(0)
  expect(opened, 'no pane for a subagent call').toHaveLength(0)
  const pending = askCall($)
  const ui = await openedPane($, opened)
  await answerPane(ui, 'answers-list', PRESSED)
  await pending
  expect(spawns, 'the main-loop call after it runs process.spawn once').toHaveLength(1)
})

test('a child that stays quiet for 12 s is not cut at the 10 s budget, and the call returns its result', { ...HOLD }, async ($, on) => {
  const { opened, disk } = stubs(on, 4000)
  await setMode($, 'hold-spawn')
  const pending = askCall($)
  const ui = await openedPane($, opened)
  await sleep(12000) // real time: the held call waits inside process.spawn for 12 s
  await answerPane(ui, 'answers-list', PRESSED)
  const outcome = (await pending) as any
  const lines = logLines(disk.files)
  expect(lines.map((l) => l.kind), 'no cut-off line: the log holds caught, then answered').toEqual(['caught', 'answered'])
  expect(outcome, 'the call resolves to { result } of answerOf for these picks').toEqual({ result: answerOf('answers-list', QUESTIONS, PICKS) })
  expect(Number(lines[1]?.elapsedMs ?? 0) >= 12000, 'answered carries the 12 s wait').toBe(true)
})

test('the log holds caught, then answered with elapsedMs, shape, and via spawn', { ...HOLD }, async ($, on) => {
  const { opened, disk } = stubs(on)
  await setMode($, 'hold-spawn')
  const pending = askCall($)
  const ui = await openedPane($, opened)
  await answerPane(ui, 'answers-list', PRESSED)
  await pending
  const lines = logLines(disk.files)
  expect(lines.map((l) => l.kind), 'the log holds caught, then answered').toEqual(['caught', 'answered'])
  expect(typeof lines[0]?.inTranscript, 'caught says whether the transcript holds the tool_use_id').toBe('boolean')
  expect(typeof lines[1]?.elapsedMs, 'answered carries elapsedMs as a number').toBe('number')
  expect(lines[1]?.shape, 'answered names the shape that Send chose').toBe('answers-list')
  expect(lines[1]?.via, 'answered says it came through the spawn').toBe('spawn')
})

test('hold-spawn opens the pane with each question, option, Other input, shape, and Send', { ...HOLD }, async ($, on) => {
  const { opened } = stubs(on)
  await setMode($, 'hold-spawn')
  const pending = askCall($)
  const ui = await openedPane($, opened)
  const pane = await snapshotOf(ui)
  const keys = [...QUESTIONS.flatMap((q, i) => q.options.map((o) => optKey(i, o.label))), ...SHAPES.map(shapeKey), SEND_KEY, otherKey(0), otherKey(1)]
  for (const key of keys) expect(pane.keys, `the pane draws ${key}`).toContain(key)
  for (const q of QUESTIONS) expect(pane.shown, `the pane shows the question ${q.question}`).toContain(q.question)
  expect(pane.inputs, 'one Other input per question').toBe(QUESTIONS.length)
  await pressKeys(ui, [SEND_KEY])
  await pending
})
