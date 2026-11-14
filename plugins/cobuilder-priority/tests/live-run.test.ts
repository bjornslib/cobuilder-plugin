// E3.12: the fixes from the live run of 0.3.0 (contracts.md, Epic E3). Decide heading, empty send,
// visible numbering, and the scroll of the pane, which the engine moves one row at a time.
import { expect, test } from 'claude-code/testing'
import { scrollPaneToTop } from '../hooks/reader'
import { ACTIONABLE, DIGESTED, OPTIONS, PANE, childNodes, drain, keyOfNode, nodeByKey, readings, stop, waitFor, walk } from './fakes'
import type { Node } from './fakes'
import { LIVE_DECIDE, NOTIFY_GAP, TALL_CARD } from './fixtures'

// The pane's body window in rows. The mount and the scroll input carry the same value.
const BODY_ROWS = 6

// The text drawn under a node, in document order.
function textOf(x: unknown): string[] {
  if (typeof x === 'string') return [x]
  const kids = (x as Node | undefined)?.children
  return Array.isArray(kids) ? kids.flatMap(textOf) : []
}

// The key of the Button that reads `text`. A missing Button fails the test.
async function buttonKey(ui: any, text: string): Promise<string> {
  const found = await ui.find({ type: 'Button', text })
  expect(found, `a Button reads ${text}`).toBeDefined()
  return found?.key ?? ''
}

// The stored `sent` of the first stop, once a prompt has been sent or filled.
const sentMark = (store: Map<string, unknown>) => (store.get('marks:S1') as any)?.['1']?.sent

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

// Scroll (E3.12). The engine owns the body's window and moves it one row at a time. The plugin draws
// the fixed top at that offset, as the last child, and draws every body block under a spacer.

// The rows of the fixed top: the header, the key row, one blank row, and the note input.
const FIXED_TOP_ROWS = 4

// The pane mounted with the engine's window at `offset`.
const mountAt = ($: any, offset: number) =>
  $.ui.mount({ ...PANE, surface: 'terminal', props: { ...PANE.props, scroll: { offset, bodyRows: BODY_ROWS } } })

// The fixed top is the last child of the pane root. A missing child reads as an empty node.
const fixedOf = (root: Node): Node => childNodes(root).at(-1) ?? {}

// The body is every child between the spacer at the top and the fixed top at the bottom.
const bodyOf = (root: Node): Node[] => childNodes(root).slice(1, -1)

// The keys under the nodes, in document order. An unkeyed node reads as an empty key.
const keysUnder = (nodes: Node[]): string[] => nodes.flatMap(walk).map((n) => keyOfNode(n) ?? '')

// The input the engine raises for the person's wheel on the pane. The kit has no wheel, so the test calls the event.
const scrollPane = ($: any, offset: number, by: number) =>
  $.ui.scroll({ component: 'Pane', requestId: 'priority-reader', offset, by, bodyRows: BODY_ROWS, contentRows: 30, origin: { kind: 'person' } })

// Two stops: the older one is a history row, and the newest card is open.
const TWO_STOPS = [DIGESTED, ACTIONABLE, DIGESTED, ACTIONABLE]

test('the fixed top is the last child, at the engine offset, and holds the header, the keys, and the note', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, ACTIONABLE])
  for (const offset of [0, 5]) {
    const ui = await mountAt($, offset)
    const fixed = fixedOf((await ui.drawn()) as Node)
    expect(keyOfNode(fixed), `offset ${offset}: the last child is the fixed top`).toBe('fixed-top')
    expect(fixed.props?.position, `offset ${offset}: the fixed top is absolute`).toBe('absolute')
    expect(fixed.props?.top, `offset ${offset}: the fixed top sits at the engine offset`).toBe(offset)
    expect(nodeByKey(fixed, 'header'), `offset ${offset}: the header is in the fixed top`).toBeDefined()
    expect(nodeByKey(fixed, 'keys'), `offset ${offset}: the key row is in the fixed top`).toBeDefined()
    expect(nodeByKey(fixed, 'note-1')?.type, `offset ${offset}: the note input is in the fixed top`).toBe('Input')
    await ui.unmount()
  }
})

test('every body block is drawn at both offsets, under a spacer as tall as the fixed top, and the note stays in the fixed top', { options: OPTIONS }, async ($, on) => {
  await readings($, on, TWO_STOPS, 2)
  for (const offset of [0, 5]) {
    const ui = await mountAt($, offset)
    const root = (await ui.drawn()) as Node
    expect(childNodes(root)[0]?.props?.height, `offset ${offset}: the spacer is as tall as the fixed top`).toBe(FIXED_TOP_ROWS)
    const keys = keysUnder(bodyOf(root))
    for (const key of ['summary-box', 'step-0', 'step-1', 'step-2', 'step-3', 'step-4', 'draft-block', 'history-label', 'history-1']) {
      expect(keys, `offset ${offset}: ${key} is drawn in the body`).toContain(key)
    }
    expect(walk(root).map((n) => keyOfNode(n)).filter((k) => k?.startsWith('note-')), `offset ${offset}: one note input is drawn`).toEqual(['note-2'])
    expect(keys, `offset ${offset}: no body block holds the note input`).not.toContain('note-2')
    expect(keysUnder([fixedOf(root)]), `offset ${offset}: the note input is in the fixed top`).toContain('note-2')
    await ui.unmount()
  }
})

test('a card taller than the window keeps its first and last step rows and its draft block in the body', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, TALL_CARD])
  for (const offset of [0, 5]) {
    const ui = await mountAt($, offset)
    const root = (await ui.drawn()) as Node
    expect(keyOfNode(fixedOf(root)), `offset ${offset}: the last child is the fixed top`).toBe('fixed-top')
    const keys = keysUnder(bodyOf(root))
    expect(keys, `offset ${offset}: the first step row is in the body`).toContain('step-0')
    expect(keys, `offset ${offset}: the last step row is in the body`).toContain('step-11')
    expect(keys, `offset ${offset}: the draft block is in the body`).toContain('draft-block')
    await ui.unmount()
  }
})

test('a person scroll of the pane reaches the engine, so no plugin hook answers it', { options: OPTIONS }, async ($, on) => {
  const reached: any[] = []
  on('ui.scroll', { requestId: 'priority-reader' }, (_$: any, e: any) => { reached.push(e); return {} })
  await readings($, on, [DIGESTED, ACTIONABLE])
  const ui = await mountAt($, 0)
  await scrollPane($, 0, 5)
  expect(reached, 'the engine gets the person scroll once').toHaveLength(1)
  expect(reached[0]?.by, 'the engine gets the rows asked').toBe(5)
  await ui.unmount()
})

// The kit does not dispatch a scroll that the plugin itself starts, so this checks the call.
test('a new reading asks the engine to scroll the pane to its first row', async () => {
  const calls: unknown[] = []
  await scrollPaneToTop({ ui: { scroll: async (a: unknown) => { calls.push(a) } } })
  expect(calls, 'one scroll of the reader pane to its start').toEqual([{ to: 'start', in: 'priority-reader' }])
  await scrollPaneToTop({ ui: { scroll: async () => { throw new Error('refused') } } })
})
