// E3.6 and E3.7: a held question gets a reading in the background, and the mark stores the answers.
import { expect, test } from 'claude-code/testing'
import { ASKED, HOLD, askCall, markOf, mountPane, pressSend, pressText, readingsOf, settle, startAsk } from './ask-fakes'
import { draftText } from './ask-tree'

test('a question job runs priority digest, then priority interpret with an --open-question file of the asked questions', HOLD, async ($, on) => {
  const ctx = await startAsk($, on)
  const pending = askCall($)
  await settle(() => ctx.calls.length >= 2)
  const argvs = ctx.calls.map((c) => c.argv.slice(0, 4))
  expect(argvs.slice(0, 2), 'the job runs digest, then interpret').toEqual([
    ['uv', 'run', 'priority', 'digest'],
    ['uv', 'run', 'priority', 'interpret'],
  ])
  const argv: string[] = ctx.calls[1]?.argv ?? []
  const at = argv.indexOf('--open-question')
  expect(at, 'interpret takes the --open-question flag').toBeGreaterThanOrEqual(0)
  const file = argv[at + 1] ?? ''
  expect(JSON.parse(ctx.disk.files.get(file) ?? 'null'), 'the file holds the asked questions as a list').toEqual(ASKED)
  const ui = await mountPane($)
  await pressText(ui, '$.store')
  await pressText(ui, 'Unit')
  await pressSend(ui)
  await pending
})

test('a reading that never arrives does not hold the answer: Send still returns the result', HOLD, async ($, on) => {
  const ctx = await startAsk($, on, { gate: new Promise<void>(() => {}), from: 2 })
  const pending = askCall($)
  await settle(() => ctx.spawns.length > 0)
  const ui = await mountPane($)
  await pressText(ui, '$.store')
  await pressText(ui, 'Unit')
  await pressSend(ui)
  expect(await pending, 'the call resolves with the answers before any reading').toEqual({
    result: { questions: ASKED, answers: { 'Which store keeps the marks?': '$.store', 'Which checks run on save?': 'Unit' } },
  })
})

test('the stored reading is a question stop with its questions, the picks stay when it arrives, and Send marks the answers', HOLD, async ($, on) => {
  let open = () => {}
  const gate = new Promise<void>((resolve) => { open = resolve })
  const ctx = await startAsk($, on, { gate, from: 2 })
  const pending = askCall($)
  await settle(() => ctx.spawns.length > 0)
  const ui = await mountPane($)
  await pressText(ui, '$.store')
  await pressText(ui, 'Unit')
  await pressText(ui, 'E2E')
  open()
  await settle(() => readingsOf(ctx.store).length >= 1)
  const reading = readingsOf(ctx.store)[0]
  expect(reading?.stop_kind, 'the stored reading is a question stop').toBe('question')
  expect(reading?.questions?.map((q: { question: string }) => q.question), 'the stored reading holds the asked questions').toEqual(ASKED.map((q) => q.question))
  const draft = await draftText(ui)
  expect(draft, 'the first pick is still in the draft after the reading arrives').toContain('$.store')
  expect(draft, 'the checks picks are still in the draft after the reading arrives').toContain('Unit, E2E')
  await pressSend(ui)
  await pending
  expect(markOf(ctx.store)?.answers, 'the mark stores the answers by question text').toEqual({
    'Which store keeps the marks?': '$.store',
    'Which checks run on save?': 'Unit, E2E',
  })
})
