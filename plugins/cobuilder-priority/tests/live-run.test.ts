// E3.12: the fixes from the live run of 0.3.0 (contracts.md, Epic E3). Decide heading, empty send,
// visible numbering, and the scroll hook of the pane.
import { expect, test } from 'claude-code/testing'
import { ACTIONABLE, DIGESTED, OPTIONS, PANE, childNodes, drain, keyOfNode, nodeByKey, readings, waitFor, walk } from './fakes'
import type { Node } from './fakes'
import { LIVE_DECIDE, NOTIFY_GAP } from './fixtures'

// The pane's body window in rows. The mount and the scroll input carry the same value.
const BODY_ROWS = 6

// The text drawn under a node, in document order.
function textOf(x: unknown): string[] {
  if (typeof x === 'string') return [x]
  const kids = (x as Node | undefined)?.children
  return Array.isArray(kids) ? kids.flatMap(textOf) : []
}

// The keys of the first two rows the pane draws.
const firstTwo = (root: Node) => childNodes(root).slice(0, 2).map((n) => keyOfNode(n))

// The text under the rows after the header and the key row.
const bodyText = (root: Node) => childNodes(root).slice(2).flatMap(textOf)

// The key of the Button that reads `text`. A missing Button fails the test.
async function buttonKey(ui: any, text: string): Promise<string> {
  const found = await ui.find({ type: 'Button', text })
  expect(found, `a Button reads ${text}`).toBeDefined()
  return found?.key ?? ''
}

// The stored `sent` of the first stop, once a prompt has been sent or filled.
const sentMark = (store: Map<string, unknown>) => (store.get('marks:S1') as any)?.['1']?.sent

// The input the engine sends to the pane's ui.scroll hook. The kit has no person's wheel, so the test
// calls $.ui.scroll with that input. A call that no hook answers throws; the throw is returned, so the assertion names it.
async function scrollPane($: any, offset: number, by: number): Promise<unknown> {
  const input = { component: 'Pane', requestId: 'priority-reader', offset, by, bodyRows: BODY_ROWS, contentRows: 30, origin: { kind: 'person' } }
  try {
    return await $.ui.scroll(input)
  } catch (err) {
    return { threw: String(err) }
  }
}

const SMALL_BODY = { ...PANE, props: { ...PANE.props, scroll: { offset: 0, bodyRows: BODY_ROWS } } }

// Decide heading (E3.12, item 1).

test('a decide step is a heading with no toggle, and its option rows stay Buttons', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, LIVE_DECIDE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const root = (await ui.drawn()) as Node
  const heading = await ui.find({ type: 'Text', text: '1. You decide' })
  expect(heading, 'the decide step is a heading Text').toBeDefined()
  expect(heading?.text, 'the heading reads 1. You decide, with no mark').toBe('1. You decide')
  expect(await ui.find({ type: 'Button', text: 'You decide' }), 'no Button toggles the decide step').toBeUndefined()
  expect(walk(root).filter((n) => n.props?.hotkey === '1'), 'no digit hotkey is on the decide step').toEqual([])
  expect((await ui.find({ type: 'Button', text: 'Fix the flagged lines' }))?.type, 'the option row stays a Button').toBe('Button')
  await ui.unmount()
})

test('a press on option 0 fills the draft and lights Send, and the other option switches the answer', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, LIVE_DECIDE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: await buttonKey(ui, 'Fix the flagged lines') })
  expect((await ui.find({ key: 'draft' }))?.text, 'the pick fills the draft').toBe('Fix the flagged lines? → Fix the flagged lines')
  expect((await ui.find({ key: 'send' }))?.props.dimColor, 'Send is lit once the pick selects the step').toBeFalsy()
  expect((await ui.find({ key: 'draft-footer' }))?.text, 'the decide step is visible step 1, the only one').toMatch(/^step 1 · \d+ chars · session prompt$/)
  await ui.press({ key: await buttonKey(ui, 'Leave CLAUDE.md unchanged') })
  expect((await ui.find({ key: 'draft' }))?.text, 'the other option switches the answer').toBe('Fix the flagged lines? → Leave CLAUDE.md unchanged')
  await ui.unmount()
})

// Empty send (E3.12, item 2).

test('Send and Edit with nothing selected call nothing, and the draft block says Nothing to send yet', { options: OPTIONS }, async ($, on) => {
  const store = await readings($, on, [DIGESTED, LIVE_DECIDE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  for (const key of ['send', 'edit']) {
    await ui.press({ key })
    await drain()
    expect(store.sent, `a press of ${key} with nothing selected reaches no prompt call`).toHaveLength(0)
    const block = nodeByKey((await ui.drawn()) as Node, 'draft-block')
    expect(block, 'the draft block is drawn').toBeDefined()
    expect(textOf(block), `a press of ${key} shows the notice in the draft block`).toContain('Nothing to send yet')
  }
  expect(store.get('marks:S1'), 'no mark is written').toBeUndefined()
  await ui.unmount()
})

test('the Nothing to send yet notice clears after the next selection', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, LIVE_DECIDE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'send' })
  expect(textOf(nodeByKey((await ui.drawn()) as Node, 'draft-block'))).toContain('Nothing to send yet')
  await ui.press({ key: await buttonKey(ui, 'Fix the flagged lines') })
  expect(textOf(nodeByKey((await ui.drawn()) as Node, 'draft-block')), 'the notice is gone after a selection').not.toContain('Nothing to send yet')
  await ui.unmount()
})

// Numbering (E3.12, item 3).

test('visible steps read 1 and 2 past a notify step, and the digit hotkeys sit on those rows', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, NOTIFY_GAP])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const root = (await ui.drawn()) as Node
  expect((await ui.find({ type: 'Button', text: '[ ] 1. Reply' }))?.text, 'the reply row reads 1').toBe('[ ] 1. Reply')
  expect((await ui.find({ type: 'Button', text: '[ ] 2. Allow' }))?.text, 'the permission row reads 2').toBe('[ ] 2. Allow')
  expect(walk(root).find((n) => n.props?.hotkey === '1')?.props?.label, 'digit 1 sits on the reply row').toBe('[ ] 1. Reply')
  expect(walk(root).find((n) => n.props?.hotkey === '2')?.props?.label, 'digit 2 sits on the permission row').toBe('[ ] 2. Allow')
  await ui.unmount()
})

test('selecting both visible steps stores the reading indexes 1 and 3 on the mark, and the footer names 1 and 2', { options: OPTIONS }, async ($, on) => {
  const store = await readings($, on, [DIGESTED, NOTIFY_GAP])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: await buttonKey(ui, '[ ] 1. Reply') })
  await ui.press({ key: await buttonKey(ui, '[ ] 2. Allow') })
  expect((await ui.find({ key: 'draft-footer' }))?.text, 'the footer names the visible numbers').toMatch(/^steps 1, 2 · \d+ chars · session prompt$/)
  await ui.press({ key: 'send' })
  await waitFor(() => Boolean(sentMark(store)))
  expect(sentMark(store), 'the mark keeps the reading indexes').toMatchObject({ how: 'submit', steps: [1, 3] })
  expect(store.sent[0]?.text, 'the draft joins the two steps').toBe('Run the tests.\n\nYes, go ahead.')
  await ui.unmount()
})

// Scroll (E3.12, item 4). The header and the key row stay drawn first; the rows under them move.

test('the pane answers a scroll of its body with an empty result, so no deny', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, ACTIONABLE])
  const ui = await $.ui.mount({ ...SMALL_BODY, surface: 'terminal' })
  expect(await scrollPane($, 5, 5), 'the ui.scroll hook of priority-reader keeps the window').toEqual({})
  await ui.unmount()
})

test('a scroll down by 5 keeps the header and the key row first and moves the rows under them, and scrolling back restores them', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, ACTIONABLE])
  const ui = await $.ui.mount({ ...SMALL_BODY, surface: 'terminal' })
  const before = (await ui.drawn()) as Node
  expect(firstTwo(before), 'before the scroll the header then the key row').toEqual(['header', 'keys'])

  await scrollPane($, 5, 5)
  const down = (await ui.drawn()) as Node
  expect(firstTwo(down), 'after a scroll by 5 the header then the key row are still first').toEqual(['header', 'keys'])
  expect(bodyText(down)[0], 'the first row under the key row moved').not.toBe(bodyText(before)[0])

  await scrollPane($, 0, -5)
  const back = (await ui.drawn()) as Node
  expect(firstTwo(back), 'after scrolling back the header then the key row are still first').toEqual(['header', 'keys'])
  expect(bodyText(back), 'scrolling back restores the rows under the key row').toEqual(bodyText(before))
  await ui.unmount()
})

// A card taller than the window: every step row and the draft block must come to the top of the body by scrolling.
const TALL = { ...ACTIONABLE, steps: Array.from({ length: 12 }, (_, k) => ({ kind: 'reply', text: `Reply ${k + 1}.` })) }

test('a card taller than the window can scroll every step row and the draft block to the top of the body', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, TALL])
  const ui = await $.ui.mount({ ...SMALL_BODY, surface: 'terminal' })
  const seen = new Set<string>()
  for (let k = 0; k < 40; k++) {
    const root = (await ui.drawn()) as Node
    expect(firstTwo(root), 'the header then the key row stay first').toEqual(['header', 'keys'])
    const top = childNodes(root)[2]
    if (top) for (const n of walk(top)) { const key = keyOfNode(n); if (key) seen.add(key) }
    if (seen.has('step-11') && seen.has('draft-block')) break
    await scrollPane($, k + 1, 1)
  }
  expect(seen.has('step-11'), 'the last step row reaches the top of the body').toBe(true)
  expect(seen.has('draft-block'), 'the draft block reaches the top of the body').toBe(true)
  const last = (await ui.drawn()) as Node
  expect(walk(childNodes(last)[2] as Node).some((n) => keyOfNode(n) === 'step-0'), 'scrolled past the first step, it is no longer at the top').toBe(false)
  await ui.unmount()
})
