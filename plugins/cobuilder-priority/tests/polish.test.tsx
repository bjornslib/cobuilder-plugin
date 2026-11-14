// The 0.3.4 polish: the fixed top, the clear on the next prompt, the gap between questions, and the digest lists.
import { expect, test } from 'claude-code/testing'
import { ACTIONABLE, DIGESTED, NOTIFYING, OPTIONS, PANE, childNodes, drain, keyOfNode, nodeByKey, readings, rowsUnder, stop, stubPanes, waitFor, walk } from './fakes'
import type { Node } from './fakes'
import { DIGEST_LISTS, TWO_QUESTIONS } from './fixtures'

const BAND = {
  plugin: 'cobuilder-priority',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 9 }, view: {} },
} as const

// The engine beneath the plugin, so a band that passes its drawing on shows an engine row.
function engineBeneath(on: any) {
  on('ui.render', ($: any, e: any) => {
    const { Box, Text } = $.ui.resolve(e)
    return <Box key="engine"><Text>engine</Text></Box>
  })
}

const fixedOf = (root: Node): Node => childNodes(root).at(-1) ?? {}

// True when every Text and Button under the keyed node is dim, and there is at least one.
const allDim = (root: Node, key: string): boolean => {
  const rows = rowsUnder(root, key)
  return rows.length > 0 && rows.every((row) => row.props?.dimColor === true)
}

// True when no Text or Button under the keyed node is dim.
const noneDim = (root: Node, key: string): boolean => rowsUnder(root, key).every((row) => !row.props?.dimColor)

// E3.13, item 2: the fixed top holds the header, the key row, one empty row, and the note.

// E3.14, item 1: no color paints the fixed top. A cover of spaces under it hides the body rows in any theme.
const textOf = (n: Node): string => (n.children ?? []).filter((c): c is string => typeof c === 'string').join('')

test('the fixed top names no color, and a cover of spaces spans the body under it', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, ACTIONABLE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const root = (await ui.drawn()) as Node
  const fixed = fixedOf(root)
  expect(keyOfNode(fixed), 'the last child is the fixed top').toBe('fixed-top')
  expect(walk(fixed).filter((n) => n.props?.backgroundColor !== undefined), 'no node of the fixed top names a color').toEqual([])
  expect(childNodes(root).map(keyOfNode).slice(-2), 'the cover sits under the fixed top').toEqual(['fixed-cover', 'fixed-top'])
  const cover = nodeByKey(root, 'fixed-cover')
  expect(cover?.props?.width, 'the cover is as wide as the body').toBe(60)
  expect(cover?.props?.height, 'the cover is as tall as the fixed top').toBe(4)
  const rows = childNodes(cover ?? {})
  expect(rows, 'the cover has one row per fixed row').toHaveLength(4)
  for (const row of rows) expect(textOf(row), 'each cover row is as wide as the body').toBe(' '.repeat(60))
  await ui.unmount()
})

// E3.14, item 2: the fixed top stays four rows in a narrow pane, and the key row keeps one letter per key.
test('at 30 columns the fixed top stays four rows, and the key row keeps its five hotkeys', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, ACTIONABLE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal', props: { ...PANE.props, bodyColumns: 30 } })
  const root = (await ui.drawn()) as Node
  expect(nodeByKey(root, 'fixed-spacer')?.props?.height, 'the spacer is four rows').toBe(4)
  expect(nodeByKey(root, 'fixed-top')?.props?.height, 'the fixed top is four rows').toBe(4)
  expect(nodeByKey(root, 'fixed-top')?.props?.overflow, 'the fixed top clips a row past its four').toBe('hidden')
  for (const key of ['header', 'keys', 'fixed-gap']) expect(nodeByKey(root, key)?.props?.height, `${key} is one row`).toBe(1)
  const keys = nodeByKey(root, 'keys') ?? {}
  for (const k of ['s', 'e', 'r', 'w', 'm']) expect(walk(keys).map((n) => n.props?.hotkey), `hotkey ${k} stays`).toContain(k)
  for (const n of walk(keys).filter((x) => x.type === 'Button')) expect(String(n.props?.label ?? '').length, 'a narrow key has no word label').toBeLessThanOrEqual(1)
  for (const n of walk(nodeByKey(root, 'header') ?? {}).filter((x) => x.type === 'Text')) expect(n.props?.wrap, 'a header text cuts at the edge').toBe('truncate-end')
  await ui.unmount()
})

test('at 30 columns Right and Wrong keep their own glyphs', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, ACTIONABLE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal', props: { ...PANE.props, bodyColumns: 30 } })
  const right = String((await ui.find({ key: 'right-1' }))?.props?.label ?? '')
  const wrong = String((await ui.find({ key: 'wrong-1' }))?.props?.label ?? '')
  expect(right, 'Right and Wrong differ').not.toBe(wrong)
  await ui.unmount()
})

test('inside the fixed top, the note input sits under the key row with one empty row between', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, ACTIONABLE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const fixed = fixedOf((await ui.drawn()) as Node)
  expect(childNodes(fixed).map(keyOfNode), 'the order is header, keys, the gap, then the note').toEqual(['header', 'keys', 'fixed-gap', 'note-1'])
  expect(nodeByKey(fixed, 'fixed-gap')?.props?.height, 'the gap is one row').toBe(1)
  await ui.unmount()
})

// E3.13, item 3: a prompt ends the wait for the reading.

test('a prompt clears the notify rows of the band, and dims the card until the next reading arrives', { options: OPTIONS }, async ($, on) => {
  stubPanes(on, true)
  engineBeneath(on)
  const store = await readings($, on, [DIGESTED, NOTIFYING, DIGESTED, NOTIFYING])
  const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await band.find({ key: 'notify-0' }), 'the notify row shows before the prompt').toBeDefined()
  expect(allDim((await pane.drawn()) as Node, 'title'), 'the card is not dim before the prompt').toBe(false)

  await $.prompt.submit({ text: 'Go on.', asUser: true })
  expect(await band.find({ key: 'notify-0' }), 'no notify row after the prompt').toBeUndefined()
  let root = (await pane.drawn()) as Node
  expect(allDim(root, 'title'), 'the card title is dim after the prompt').toBe(true)
  expect(allDim(root, 'summary-body'), 'the summary is dim after the prompt').toBe(true)

  await stop($)
  await waitFor(() => ((store.get('readings:S1') as unknown[]) ?? []).length >= 2)
  expect(await band.find({ key: 'notify-0' }), 'the next reading brings its notify row back').toBeDefined()
  root = (await pane.drawn()) as Node
  expect(noneDim(root, 'title'), 'the new card title is not dim').toBe(true)
  expect(noneDim(root, 'summary-body'), 'the new summary is not dim').toBe(true)
  await band.unmount()
  await pane.unmount()
})

test('while the reader waits for the next reading, Send and Edit are dim and submit nothing', { options: OPTIONS }, async ($, on) => {
  const store = await readings($, on, [DIGESTED, ACTIONABLE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'step-0' })
  await $.prompt.submit({ text: 'Go on.', asUser: true })
  const before = store.sent.length
  for (const key of ['send', 'edit']) expect(await ui.find({ key })).toBeDefined()
  expect((await ui.find({ key: 'send' }))?.props.dimColor, 'Send is dim while waiting').toBe(true)
  expect((await ui.find({ key: 'edit' }))?.props.dimColor, 'Edit is dim while waiting').toBe(true)
  await ui.press({ key: 'send' })
  await ui.press({ key: 'edit' })
  await drain()
  expect(store.sent, 'neither Send nor Edit reaches the prompt while waiting').toHaveLength(before)
  await ui.unmount()
})

// E3.13, item 4: one empty row above each question after the first.

test('the second question of a decide step has one empty row above it, and the first has none', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, TWO_QUESTIONS])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const root = (await ui.drawn()) as Node
  expect(nodeByKey(root, 'q-0-0')?.props?.marginTop ?? 0, 'the first question follows its step row').toBe(0)
  expect(nodeByKey(root, 'q-0-1')?.props?.marginTop, 'the second question has one empty row above it').toBe(1)
  await ui.unmount()
})

// E3.13, item 6: the digest lists under an open summary.

test('an open summary lists the open items and the decisions of the digest, as dim rows', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGEST_LISTS, ACTIONABLE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const root = (await ui.drawn()) as Node
  expect((await ui.find({ key: 'open-items' }))?.text).toBe('Open items')
  expect((await ui.find({ key: 'open-item-0' }))?.text).toBe('· Ship the fix')
  expect((await ui.find({ key: 'open-item-1' }))?.text).toBe('· Ask the owner')
  expect((await ui.find({ key: 'decisions' }))?.text).toBe('Decisions')
  expect((await ui.find({ key: 'decision-0' }))?.text).toBe('· Keep $.store')
  for (const key of ['open-items', 'open-item-0', 'decisions', 'decision-0']) {
    expect(allDim(root, key), `${key} is a dim row`).toBe(true)
  }
  await ui.press({ key: 'summary' })
  for (const key of ['open-items', 'open-item-0', 'decisions', 'decision-0']) {
    expect(await ui.find({ key }), `${key} is hidden when the summary is closed`).toBeUndefined()
  }
  await ui.unmount()
})

test('a digest with no open items and no decisions draws neither list', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, ACTIONABLE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  for (const key of ['open-items', 'open-item-0', 'decisions', 'decision-0']) {
    expect(await ui.find({ key }), `${key} is not drawn for an empty list`).toBeUndefined()
  }
  await ui.unmount()
})
