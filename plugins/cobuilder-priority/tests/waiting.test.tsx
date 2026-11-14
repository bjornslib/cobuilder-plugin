// E3.14, item 3: the wait for a reading ends at the saved reading, at the switch off, and at a turn that ends without an answer.
import { expect, test } from 'claude-code/testing'
import { ACTIONABLE, DIGESTED, NO_REPLY, NOTIFYING, OPTIONS, PANE, drain, readings, rowsUnder, stop, stubPanes, waitFor } from './fakes'
import type { Node } from './fakes'

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

// True when every Text under the card title is dim.
const titleDim = (root: Node): boolean => {
  const rows = rowsUnder(root, 'title')
  return rows.length > 0 && rows.every((row) => row.props?.dimColor === true)
}

// Waits for the reading count to reach `count`.
const saved = (store: Map<string, unknown>, count: number) => waitFor(() => ((store.get('readings:S1') as unknown[]) ?? []).length >= count)

test('a failed reading ends the wait, and the card lights up', { options: OPTIONS }, async ($, on) => {
  const store = await readings($, on, [DIGESTED, ACTIONABLE, new Error('model down')])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await $.prompt.submit({ text: 'Go on.', asUser: true })
  expect(titleDim((await ui.drawn()) as Node), 'the card is dim while it waits').toBe(true)
  await stop($)
  await saved(store, 2)
  expect((await ui.find({ key: 'status' }))?.text, 'the new reading failed').toMatch(/^failed/)
  expect(titleDim((await ui.drawn()) as Node), 'the card is lit after the failed reading').toBe(false)
  await ui.unmount()
})

test('an abstained reading ends the wait, and the card lights up', { options: OPTIONS }, async ($, on) => {
  const store = await readings($, on, [DIGESTED, ACTIONABLE, DIGESTED, NO_REPLY])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await $.prompt.submit({ text: 'Go on.', asUser: true })
  expect(titleDim((await ui.drawn()) as Node), 'the card is dim while it waits').toBe(true)
  await stop($)
  await saved(store, 2)
  expect((await ui.find({ key: 'status' }))?.text, 'the new reading abstains').toMatch(/^abstain/)
  expect(titleDim((await ui.drawn()) as Node), 'the card is lit after the abstain').toBe(false)
  await ui.unmount()
})

test('/priority-off after a prompt ends the wait, and the notify rows come back', { options: OPTIONS }, async ($, on) => {
  stubPanes(on, true)
  engineBeneath(on)
  await readings($, on, [DIGESTED, NOTIFYING])
  const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await $.prompt.submit({ text: 'Go on.', asUser: true })
  expect(await band.find({ key: 'notify-0' }), 'no notify row while it waits').toBeUndefined()
  expect(titleDim((await pane.drawn()) as Node), 'the card is dim while it waits').toBe(true)
  await $.command.run({ command: 'priority-off' })
  await drain()
  expect(await band.find({ key: 'notify-0' }), 'the notify row is back after the off').toBeDefined()
  expect(titleDim((await pane.drawn()) as Node), 'the card is lit after the off').toBe(false)
  await band.unmount()
  await pane.unmount()
})

test('a prompt while the reader is off starts no wait', { options: OPTIONS }, async ($, on) => {
  stubPanes(on, true)
  engineBeneath(on)
  await readings($, on, [DIGESTED, NOTIFYING])
  await $.command.run({ command: 'priority-off' })
  const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await $.prompt.submit({ text: 'Go on.', asUser: true })
  await drain()
  expect(await band.find({ key: 'notify-0' }), 'the notify row still draws').toBeDefined()
  expect(titleDim((await pane.drawn()) as Node), 'the card is not dim').toBe(false)
  await band.unmount()
  await pane.unmount()
})


test('a turn that the person interrupts ends the wait, and the card lights up', { options: OPTIONS }, async ($, on) => {
  on('turn.complete', () => ({ text: '' }))
  await readings($, on, [DIGESTED, ACTIONABLE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await $.prompt.submit({ text: 'Go on.', asUser: true })
  expect(titleDim((await ui.drawn()) as Node), 'the card is dim while it waits').toBe(true)
  await $.turn.complete({ reason: 'aborted', answer: '', durationMs: 1, isAborted: true, turnId: 't1' })
  await drain()
  expect(titleDim((await ui.drawn()) as Node), 'the card is lit after the interrupt').toBe(false)
  await ui.unmount()
})
