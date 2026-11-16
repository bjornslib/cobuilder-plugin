// E3 fixes: the transcript path, question readings in the pane, the option rows, the Decline row, and a quiet Esc.
import { expect, test } from 'claude-code/testing'
import { DIGESTED, OPTIONS, nodeByKey, parentOfKey, startReader, stubEngine, stubProcess, stubStore, walk } from './fakes'
import type { Node } from './fakes'
import { ASKED, HOLD, QUESTION_READING, STUB, askCall, mountPane, pressText, settle, startAsk, stubTool, stubWrites } from './ask-fakes'
import { allText } from './ask-tree'

const declined = 'The user declined to answer these questions.'

test('the transcript path of UserPromptSubmit reaches priority digest and priority interpret', HOLD, async ($, on) => {
  on('classic.UserPromptSubmit', () => ({}))
  const ctx = await startAsk($, on)
  await $.classic.UserPromptSubmit({ session_id: 'S1', transcript_path: '/t/s.jsonl', cwd: '/work/app', prompt: 'hi' })
  const pending = askCall($)
  await settle(() => ctx.calls.length >= 2)
  expect(ctx.calls[0]?.argv, 'digest takes the recorded transcript path').toContain('/t/s.jsonl')
  expect(ctx.calls[1]?.argv, 'interpret takes the recorded transcript path').toContain('/t/s.jsonl')
  expect(ctx.calls[0]?.argv, 'digest never takes an empty path').not.toContain('')
  const ui = await mountPane($)
  await pressText(ui, '$.store')
  await pressText(ui, 'Unit')
  await ui.press({ key: 'send' })
  await pending
})

const question = (n: number) => ({ n, sessionId: 'S1', at: '2026-11-17T07:40:00.000Z', repo: '/work/app', program: 'p', brief: 'no-digest', state: 'done', result: QUESTION_READING, stop_kind: 'question', questions: ASKED, ms: 5 })
const plain = (n: number) => ({ ...question(n), stop_kind: undefined, result: undefined, digest: DIGESTED, brief: 'digest-current' })

test('a question reading never draws No digest for this stop in the summary box', { options: OPTIONS }, async ($, on) => {
  const { store } = await startReader($, on)
  store.set('readings:S1', [question(1)])
  const ui = await mountPane($)
  const texts = allText((await ui.drawn()) as Node)
  expect(texts, 'the summary box does not claim a missing digest').not.toContain('No digest for this stop')
  await ui.unmount()
})

test('the history row of a question reading starts with its number and time, then Question', { options: OPTIONS }, async ($, on) => {
  const { store } = await startReader($, on)
  store.set('readings:S1', [plain(1), question(2), plain(3)])
  const ui = await mountPane($)
  expect((await ui.find({ key: 'history-2' }))?.text, 'the row reads #2 hh:mm Question').toMatch(/^#2 \d\d:\d\d Question/)
  await ui.unmount()
})

test('an option description is its own dim row after the option row, not inside it', HOLD, async ($, on) => {
  const ctx = await startAsk($, on)
  const pending = askCall($)
  await settle(() => ctx.spawns.length > 0)
  const ui = await mountPane($)
  const root = (await ui.drawn()) as Node
  const button = nodeByKey(root, 'opt-0-0')
  const desc = nodeByKey(root, 'desc-0-0')
  expect(desc, 'the description is drawn').toBeDefined()
  const text = walk(desc ?? {}).find((n) => n.type === 'Text')
  expect(text?.props?.dimColor, 'the description is grey').toBe(true)
  const row = parentOfKey(root, 'opt-0-0')
  expect(walk(row ?? {}), 'the option row does not hold the description').not.toContain(desc)
  const order = walk(root)
  expect(order.indexOf(desc as Node), 'the description follows the option').toBeGreaterThan(order.indexOf(button as Node))
  await pressText(ui, '$.store')
  await pressText(ui, 'Unit')
  await ui.press({ key: 'send' })
  await pending
})

test('Decline to answer resolves the call with no answers, writes no mark, and removes the card', HOLD, async ($, on) => {
  const ctx = await startAsk($, on)
  const pending = askCall($)
  await settle(() => ctx.spawns.length > 0)
  const ui = await mountPane($)
  const found = await ui.find({ key: 'decline' })
  expect(found, 'a Decline key is drawn').toBeDefined()
  expect(found?.type, 'the key is a Button').toBe('Button')
  expect(allText(found), 'the Button reads Decline to answer').toContain('Decline to answer')
  await ui.press({ key: 'decline' })
  expect(await pending, 'the call resolves with no answers and the response text').toEqual({ result: { questions: ASKED, answers: {}, response: declined } })
  expect((ctx.store.get('marks:S1') as any)?.['1']?.answers, 'no answer is stored').toBeUndefined()
  expect(await ui.find({ key: 'decline' }), 'the card is gone').toBeUndefined()
  expect(await ui.find({ key: 'send' }), 'the Send key is gone').toBeUndefined()
})

// A quiet Esc has no test: the kit cannot abort a hook, and a stub that throws is skipped by the engine
// before the hook sees an abort. The live check covers Esc.
