// E3.8: the question card, held in the reader pane (question-card.svg, frame A).
import { expect, test } from 'claude-code/testing'
import type { Node } from './fakes'
import { ASKED, HOLD, askCall, mountPane, pressText, settle, startAsk } from './ask-fakes'
import { allText, draftText, textNode } from './ask-tree'

const TITLE = '▸ WHAT WILL BE SENT'

test('the card shows each question with its number and text, and its header chip', HOLD, async ($, on) => {
  const ctx = await startAsk($, on)
  const pending = askCall($)
  await settle(() => ctx.spawns.length > 0)
  const ui = await mountPane($)
  const texts = allText((await ui.drawn()) as Node)
  expect(texts, 'question 1 shows its number and text').toContain('1. Which store keeps the marks?')
  expect(texts, 'question 2 shows its number and text').toContain('2. Which checks run on save?')
  expect(texts, 'question 1 shows its header chip').toContain('Store')
  expect(texts, 'question 2 shows its header chip').toContain('Checks')
  await pressText(ui, '$.store')
  await pressText(ui, 'Unit')
  await ui.press({ key: 'send' })
  await pending
})

test('a multi-select question shows (several), and each option shows its label and its description', HOLD, async ($, on) => {
  const ctx = await startAsk($, on)
  const pending = askCall($)
  await settle(() => ctx.spawns.length > 0)
  const ui = await mountPane($)
  const texts = allText((await ui.drawn()) as Node)
  expect(texts.filter((t) => t === '(several)'), 'only the multi-select question shows (several)').toHaveLength(1)
  for (const q of ASKED) {
    for (const o of q.options) {
      expect(texts.some((t) => t.includes(o.label)), `the option ${o.label} is drawn`).toBe(true)
      expect(texts.some((t) => t.includes(o.description)), `the description of ${o.label} is drawn`).toBe(true)
    }
  }
  await pressText(ui, '$.store')
  await pressText(ui, 'Unit')
  await ui.press({ key: 'send' })
  await pending
})

test('the card holds one Other input per question, and Edit is dim while the question is held', HOLD, async ($, on) => {
  const ctx = await startAsk($, on)
  const pending = askCall($)
  await settle(() => ctx.spawns.length > 0)
  const ui = await mountPane($)
  const others = (await ui.findAll({ type: 'Input' })).filter((n: Node) => n.props?.label === 'Other')
  expect(others, 'one Other input per question').toHaveLength(ASKED.length)
  expect((await ui.find({ key: 'edit' }))?.props.dimColor, 'Edit is dim on a question card').toBe(true)
  await pressText(ui, '$.store')
  await pressText(ui, 'Unit')
  await ui.press({ key: 'send' })
  await pending
})

test('with nothing chosen, the draft block title is dim, the block says Provide your response, and Send is dim', HOLD, async ($, on) => {
  const ctx = await startAsk($, on)
  const pending = askCall($)
  await settle(() => ctx.spawns.length > 0)
  const ui = await mountPane($)
  const root = (await ui.drawn()) as Node
  expect(textNode(root, TITLE), 'the title row is drawn').toBeDefined()
  expect(textNode(root, TITLE)?.props?.dimColor, 'the title row is dim with nothing chosen').toBe(true)
  expect(await draftText(ui), 'the block says Provide your response').toContain('Provide your response')
  expect((await ui.find({ key: 'send' }))?.props.dimColor, 'Send is dim with nothing chosen').toBe(true)
  await pressText(ui, '$.store')
  await pressText(ui, 'Unit')
  await ui.press({ key: 'send' })
  await pending
})

test('once both questions are answered, the block is lit and its Source footer reads 2 answers', HOLD, async ($, on) => {
  const ctx = await startAsk($, on)
  const pending = askCall($)
  await settle(() => ctx.spawns.length > 0)
  const ui = await mountPane($)
  await pressText(ui, '$.store')
  await pressText(ui, 'Unit')
  const root = (await ui.drawn()) as Node
  expect(textNode(root, TITLE)?.props?.dimColor, 'the title row is lit once Send can act').toBeFalsy()
  const footers = allText(root).filter((t) => t.startsWith('Source:'))
  expect(footers, 'the Source footer reads 2 answers').toEqual(['Source: 2 answers'])
  await ui.press({ key: 'send' })
  await pending
})
