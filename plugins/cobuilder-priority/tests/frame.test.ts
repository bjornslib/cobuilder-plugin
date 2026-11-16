// E3.8: the "What will be sent" frame and the key row, in every case (question-card.svg, frames A, B, C).
import { expect, test } from 'claude-code/testing'
import { ACTIONABLE, DIGESTED, OPTIONS, PANE, nodeByKey, readings } from './fakes'
import type { Node } from './fakes'
import { HOLD, askCall, mountPane, pressText, settle, startAsk } from './ask-fakes'
import { allText, colourOf, textNode } from './ask-tree'

const TITLE = '▸ WHAT WILL BE SENT'
const BANNED = ['READY', 'Length', 'Target']

test('a turn-end draft block has the title row and a Source footer that names the step', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, ACTIONABLE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'step-0' })
  const block = nodeByKey((await ui.drawn()) as Node, 'draft-block') as Node
  expect(allText(block), 'the draft block holds the title row').toContain(TITLE)
  expect(allText(block).filter((t) => t.startsWith('Source:')), 'the Source footer names step 1 Reply').toEqual(['Source: step 1 Reply'])
  await ui.unmount()
})

test('with nothing chosen on a turn-end card, the title row is dim and the block says Provide your response', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, ACTIONABLE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const root = (await ui.drawn()) as Node
  expect(textNode(root, TITLE), 'the title row is drawn').toBeDefined()
  expect(textNode(root, TITLE)?.props?.dimColor, 'the title row is dim with nothing chosen').toBe(true)
  expect(allText(nodeByKey(root, 'draft-block')), 'the block says Provide your response').toContain('Provide your response')
  await ui.unmount()
})

test('the turn-end key row colours s cyan, r green, and w red', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, ACTIONABLE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const root = (await ui.drawn()) as Node
  expect(colourOf(root, 's'), 'the s key is cyan').toBe('cyan')
  expect(colourOf(root, 'r'), 'the r key is green').toBe('green')
  expect(colourOf(root, 'w'), 'the w key is red').toBe('red')
  await ui.unmount()
})

test('the question key row colours s cyan, r green, and w red', HOLD, async ($, on) => {
  const ctx = await startAsk($, on)
  const pending = askCall($)
  await settle(() => ctx.spawns.length > 0)
  const ui = await mountPane($)
  const root = (await ui.drawn()) as Node
  expect(colourOf(root, 's'), 'the s key is cyan on a question card').toBe('cyan')
  expect(colourOf(root, 'r'), 'the r key is green on a question card').toBe('green')
  expect(colourOf(root, 'w'), 'the w key is red on a question card').toBe('red')
  await pressText(ui, '$.store')
  await pressText(ui, 'Unit')
  await ui.press({ key: 'send' })
  await pending
})

test('no drawn text on a turn-end card says READY, Length, or Target', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, ACTIONABLE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'step-0' })
  const text = allText((await ui.drawn()) as Node).join('\n')
  for (const word of BANNED) expect(text.includes(word), `the turn-end card has no ${word}`).toBe(false)
  await ui.unmount()
})

test('no drawn text on a question card says READY, Length, or Target', HOLD, async ($, on) => {
  const ctx = await startAsk($, on)
  const pending = askCall($)
  await settle(() => ctx.spawns.length > 0)
  const ui = await mountPane($)
  const text = allText((await ui.drawn()) as Node).join('\n')
  for (const word of BANNED) expect(text.includes(word), `the question card has no ${word}`).toBe(false)
  await pressText(ui, '$.store')
  await pressText(ui, 'Unit')
  await ui.press({ key: 'send' })
  await pending
})
