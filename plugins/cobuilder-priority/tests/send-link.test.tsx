// The 0.4.3 Send link: a cyan Send beside Decline on a question card, and under each turn-end card.
// The summary box draws only digest content.
import { expect, test } from 'claude-code/testing'
import { ACTIONABLE, DIGESTED, LABELLED, LABELLED_SUMMARY, OPTIONS, PANE, childNodes, drain, keyOfNode, nodeByKey, parentOfKey, readings, walk } from './fakes'
import type { Node } from './fakes'
import { ANSWERS, HOLD, askCall, markOf, mountPane, pressText, settle, startAsk } from './ask-fakes'
import { allText } from './ask-tree'

test('on a question card, the Send link sits left of Decline to answer in one row, and it is dim until every question has an answer', HOLD, async ($, on) => {
  const ctx = await startAsk($, on)
  const pending = askCall($)
  await settle(() => ctx.spawns.length > 0)
  const ui = await mountPane($)
  const root = (await ui.drawn()) as Node
  const row = parentOfKey(root, 'send-link')
  expect(keyOfNode(row ?? {}), 'Send and Decline share one row').toBe('answer-row')
  expect(childNodes(row ?? {}).map(keyOfNode), 'Send is left of Decline').toEqual(['send-link', 'decline'])
  expect(nodeByKey(root, 'send-link')?.props?.dimColor, 'Send is dim before any answer').toBe(true)
  await pressText(ui, '$.store')
  await pressText(ui, 'Unit')
  await ui.press({ key: 'send' })
  await pending
  await ui.unmount()
})

test('a turn-end card holds a Send link under its draft block', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, ACTIONABLE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const keys = walk((await ui.drawn()) as Node).map(keyOfNode)
  expect(keys, 'the draft block is drawn').toContain('draft-block')
  expect(keys, 'the Send link is drawn').toContain('send-link')
  expect(keys.indexOf('send-link'), 'the Send link sits under the draft block').toBeGreaterThan(keys.indexOf('draft-block'))
  await ui.unmount()
})

test('the Send link on a turn-end card submits the same draft as the s key, and is dim until a step is picked', { options: OPTIONS }, async ($, on) => {
  const store = await readings($, on, [DIGESTED, ACTIONABLE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(nodeByKey((await ui.drawn()) as Node, 'send-link')?.props?.dimColor, 'Send is dim with no step picked').toBe(true)
  await ui.press({ key: 'step-0' })
  await ui.press({ key: 'send-link' })
  await drain()
  expect(store.sent, 'the Send link submits one prompt').toHaveLength(1)
  await ui.press({ key: 'step-0' })
  await ui.press({ key: 'send' })
  await drain()
  expect(store.sent, 'the s key submits one more prompt').toHaveLength(2)
  expect(store.sent[0]?.how, 'the Send link submits').toBe('submit')
  expect(store.sent[1]?.text, 'the s key sends the same draft as the Send link').toBe(store.sent[0]?.text)
  await ui.unmount()
})

test('the Send link on a question card answers like the s key', HOLD, async ($, on) => {
  const ctx = await startAsk($, on)
  const pending = askCall($)
  await settle(() => ctx.spawns.length > 0)
  const ui = await mountPane($)
  await pressText(ui, 'JSONL file')
  await pressText(ui, 'Unit')
  await pressText(ui, 'E2E')
  await ui.press({ key: 'send-link' })
  await pending
  expect(markOf(ctx.store)?.answers, 'the Send link stores the answers, as s does').toEqual(ANSWERS)
  await ui.unmount()
})

test('the summary box draws no brief row, even when the digest is from the previous stop', { options: OPTIONS }, async ($, on) => {
  const store = await readings($, on, [DIGESTED, ACTIONABLE])
  const [reading] = store.get('readings:S1') as any[]
  store.set('readings:S1', [{ ...reading, brief: 'digest-previous' }])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const root = (await ui.drawn()) as Node
  expect(nodeByKey(root, 'brief'), 'no brief row is drawn').toBeUndefined()
  expect(allText(nodeByKey(root, 'summary-box')), 'no brief line is in the summary box').not.toContain('Summary of the previous stop')
  await ui.unmount()
})

test('the summary box draws the digest, and not the agent reply', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, ACTIONABLE], 1, true, LABELLED)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const texts = allText(nodeByKey((await ui.drawn()) as Node, 'summary-box'))
  expect(texts, 'the digest text is drawn').toContain(`${DIGESTED.ran} ${DIGESTED.result}`)
  expect(texts.join('\n'), 'the agent Summary part is not drawn').not.toContain(LABELLED_SUMMARY)
  await ui.unmount()
})
