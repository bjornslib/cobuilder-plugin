// E3.4 and E3.5: the reader holds a main-loop AskUserQuestion call in its pane, and Send answers it.
// The hold runs inside process.spawn; the child waits for the done file and prints the answer file.
import { expect, test } from 'claude-code/testing'
import { OPTIONS } from './fakes'
import { ANSWERS, ASK_DIR, ASK_SCRIPT, ASKED, HOLD, STUB, askCall, mountPane, pathsOf, pressSend, pressText, settle, sleep, startAsk, typeOther } from './ask-fakes'
import { draftText } from './ask-tree'

test('with the reader on, a main-loop AskUserQuestion opens the pane with focus and holds in process.spawn', HOLD, async ($, on) => {
  const ctx = await startAsk($, on)
  const before = ctx.opened.length
  const pending = askCall($)
  await settle(() => ctx.spawns.length > 0)
  const panes = ctx.opened.slice(before).filter((o) => o.id === 'priority-reader')
  expect(panes, 'the pane priority-reader opens once for the call').toHaveLength(1)
  expect(panes[0]?.focus, 'the pane takes focus').toBe(true)
  expect(ctx.spawns, 'process.spawn runs once, and the call waits in it').toHaveLength(1)
  const argv = ctx.spawns[0]?.argv ?? []
  expect(argv.slice(0, 4), 'the sh command, its wait script, and the $0 name').toEqual(['/bin/sh', '-c', ASK_SCRIPT, 'sh'])
  const { donePath, answerPath } = pathsOf(ctx)
  const id = donePath.slice(ASK_DIR.length, -'.done'.length)
  expect(id.length > 0, 'the file names carry the tool_use_id').toBe(true)
  expect(donePath, 'the done file is <id>.done in the ask folder under priority_dev_dir').toBe(`${ASK_DIR}${id}.done`)
  expect(answerPath, 'the answer file is <id>.answer.json in the same folder').toBe(`${ASK_DIR}${id}.answer.json`)
  const ui = await mountPane($)
  await pressText(ui, '$.store')
  await pressText(ui, 'Unit')
  await pressSend(ui)
  await pending
})

test('with the reader off, a main-loop call passes to the dialog, with no pane and no process.spawn', { options: OPTIONS }, async ($, on) => {
  const ctx = await startAsk($, on, { reader: false })
  const outcome = await askCall($)
  expect(ctx.dialog, 'the dialog stub gets the call once').toHaveLength(1)
  expect(outcome, 'the dialog answer comes back').toEqual(STUB)
  expect(ctx.spawns, 'no process.spawn').toHaveLength(0)
  expect(ctx.opened, 'no pane opens').toHaveLength(0)
})

test('a subagent call passes to the dialog with no pane and no spawn, and the next main-loop call holds', HOLD, async ($, on) => {
  const ctx = await startAsk($, on)
  const before = ctx.opened.length
  const outcome = await askCall($, 'sub-1')
  expect(ctx.dialog, 'the dialog stub gets the subagent call once').toHaveLength(1)
  expect(ctx.dialog[0]?.agentId, 'the dialog stub sees the subagent id').toBe('sub-1')
  expect(outcome, 'the dialog answer comes back').toEqual(STUB)
  expect(ctx.spawns, 'no process.spawn for a subagent call').toHaveLength(0)
  expect(ctx.opened.slice(before), 'no pane for a subagent call').toHaveLength(0)
  const pending = askCall($)
  await settle(() => ctx.spawns.length > 0)
  expect(ctx.spawns, 'the main-loop call after it holds in process.spawn').toHaveLength(1)
  const ui = await mountPane($)
  await pressText(ui, '$.store')
  await pressText(ui, 'Unit')
  await pressSend(ui)
  await pending
})

test('Send writes the answer file, then the done file, and the result is { questions, answers }', HOLD, async ($, on) => {
  const ctx = await startAsk($, on)
  const pending = askCall($)
  await settle(() => ctx.spawns.length > 0)
  const { donePath, answerPath } = pathsOf(ctx)
  const ui = await mountPane($)
  await pressText(ui, 'JSONL file')
  await pressText(ui, 'Unit')
  await pressText(ui, 'E2E')
  await pressSend(ui)
  const outcome = await pending
  const answerAt = ctx.disk.writes.indexOf(answerPath)
  const doneAt = ctx.disk.writes.indexOf(donePath)
  expect(answerAt, 'the answer file is written').toBeGreaterThanOrEqual(0)
  expect(doneAt, 'the done file is written').toBeGreaterThanOrEqual(0)
  expect(answerAt < doneAt, 'the answer file is written before the done file').toBe(true)
  expect(JSON.parse(ctx.disk.files.get(answerPath) ?? 'null'), 'the answer file holds the questions and the answers').toEqual({ questions: ASKED, answers: ANSWERS })
  expect(outcome, 'the call resolves to { result } with the same shape').toEqual({ result: { questions: ASKED, answers: ANSWERS } })
  expect(ctx.dialog, 'the dialog is not called for a held call').toHaveLength(0)
})

test('an Other text replaces the picks of its question', HOLD, async ($, on) => {
  const ctx = await startAsk($, on)
  const pending = askCall($)
  await settle(() => ctx.spawns.length > 0)
  const ui = await mountPane($)
  await pressText(ui, '$.store')
  await typeOther(ui, 0, 'per session')
  await pressText(ui, 'Unit')
  await pressSend(ui)
  expect(await pending, 'the Other text is the answer of its question').toEqual({
    result: { questions: ASKED, answers: { 'Which store keeps the marks?': 'per session', 'Which checks run on save?': 'Unit' } },
  })
})

test('a question with no answer blocks Send: nothing is written, and the draft block says Answer each question first', HOLD, async ($, on) => {
  const ctx = await startAsk($, on)
  const pending = askCall($)
  await settle(() => ctx.spawns.length > 0)
  const ui = await mountPane($)
  await pressText(ui, '$.store')
  await pressSend(ui)
  await settle(async () => (await draftText(ui)).includes('Answer each question first'))
  expect(await draftText(ui), 'the draft block says Answer each question first').toContain('Answer each question first')
  const { donePath, answerPath } = pathsOf(ctx)
  const written = ctx.disk.writes.filter((p) => p === answerPath || p === donePath)
  expect(written, 'Send writes neither the answer file nor the done file').toHaveLength(0)
  await pressText(ui, 'Lint')
  await pressSend(ui)
  await pending
})

test('a hold that lasts 12 s is not cut at the 10 s hook budget, and Send still answers it', HOLD, async ($, on) => {
  const ctx = await startAsk($, on)
  const pending = askCall($)
  await settle(() => ctx.spawns.length > 0)
  const ui = await mountPane($)
  await sleep(12000) // real time: the call waits inside process.spawn for 12 s
  await pressText(ui, '$.store')
  await pressText(ui, 'Unit')
  await pressSend(ui)
  expect(await pending, 'the call resolves to { result } with the picks').toEqual({
    result: { questions: ASKED, answers: { 'Which store keeps the marks?': '$.store', 'Which checks run on save?': 'Unit' } },
  })
  expect(ctx.dialog, 'the dialog is not called for a held call').toHaveLength(0)
})

test('a child that exits with code 1 passes the call to the dialog, which is called once',{ options: OPTIONS, timeoutMs: 30000 }, async ($, on) => {
  const ctx = await startAsk($, on, { exit: { code: 1, signal: null } })
  const outcome = await askCall($)
  expect(ctx.spawns, 'the child starts for the held call').toHaveLength(1)
  expect(ctx.dialog, 'the dialog stub is called once').toHaveLength(1)
  expect(outcome, 'the dialog answer comes back').toEqual(STUB)
})

test('a child that prints a valid answer but exits with code 1 still passes the call to the dialog', { options: OPTIONS, timeoutMs: 30000 }, async ($, on) => {
  const printed = JSON.stringify({ questions: ASKED, answers: {} })
  const ctx = await startAsk($, on, { exit: { code: 1, signal: null, stdout: printed } })
  const outcome = await askCall($)
  expect(ctx.dialog, 'the exit code, not the output, decides: the dialog is called once').toHaveLength(1)
  expect(outcome, 'the dialog answer comes back').toEqual(STUB)
})

test('a child ended by a signal passes the call to the dialog, which is called once', { options: OPTIONS, timeoutMs: 30000 }, async ($, on) => {
  const ctx = await startAsk($, on, { exit: { code: null, signal: 'SIGTERM' } })
  const outcome = await askCall($)
  expect(ctx.spawns, 'the child starts for the held call').toHaveLength(1)
  expect(ctx.dialog, 'the dialog stub is called once').toHaveLength(1)
  expect(outcome, 'the dialog answer comes back').toEqual(STUB)
})
