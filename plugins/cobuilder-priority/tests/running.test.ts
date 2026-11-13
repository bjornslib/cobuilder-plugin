// E3.6: a running reading. The header moves a frame, the previous turn goes stale, and Send and Edit wait.
import { expect, test } from 'claude-code/testing'
import { ACTIONABLE, DIGESTED, FRAMES, OPTIONS, PANE, childNodes, keyOfNode, parentOfKey, rowsUnder, startReader, stop, waitFor, walk } from './fakes'
import type { Node } from './fakes'

// A gate the test opens by hand, so a reading runs until the test lets it finish.
function gate() {
  let open = () => {}
  const wait = new Promise<void>((resolve) => { open = resolve })
  return { wait, open: () => open() }
}

// After the reading ends, the mocked clock moves on and the drawn pane must hold still.
// The test kit shows no count of active timers, so this checks the drawing, not the timer.
async function expectPaneHoldsStill(ui: any, clock: { advance: (ms: number) => Promise<void> }) {
  const drawn = JSON.stringify(await ui.drawn())
  await clock.advance(1000)
  expect(JSON.stringify(await ui.drawn()), 'the drawn pane holds still after the reading ends').toBe(drawn)
}

test('while a reading runs, the header draws a moving frame before running…', { options: OPTIONS }, async ($, on) => {
  const hold = gate()
  const { calls, clock } = await startReader($, on, [DIGESTED, ACTIONABLE], hold.wait)
  await stop($)
  await waitFor(() => calls.length >= 1)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })

  const first = (await ui.find({ key: 'spinner' }))?.text
  expect(FRAMES, 'the spinner shows one braille frame').toContain(first)
  const siblings = childNodes(parentOfKey((await ui.drawn()) as Node, 'spinner') ?? {})
  const at = (key: string) => siblings.findIndex((n) => keyOfNode(n) === key)
  expect(at('spinner'), 'the spinner sits in the header row').toBeGreaterThanOrEqual(0)
  expect(at('running'), 'running… follows the spinner in the header row').toBeGreaterThan(at('spinner'))

  await clock.advance(120)
  const second = (await ui.find({ key: 'spinner' }))?.text
  expect(FRAMES, 'after 120 ms the spinner shows a braille frame').toContain(second)
  expect(second, 'after 120 ms the frame differs').not.toBe(first)

  hold.open()
  await ui.unmount()
})

test('when a reading resolves, the frame and the running row go, and the pane holds still',{ options: OPTIONS }, async ($, on) => {
  const hold = gate()
  const { store, calls, clock } = await startReader($, on, [DIGESTED, ACTIONABLE], hold.wait)
  await stop($)
  await waitFor(() => calls.length >= 1)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ key: 'spinner' }), 'the frame draws while the reading runs').toBeDefined()

  hold.open()
  await waitFor(() => ((store.get('readings:S1') as unknown[]) ?? []).length >= 1)
  expect(await ui.find({ key: 'spinner' }), 'no frame once the reading resolves').toBeUndefined()
  expect(await ui.find({ key: 'running' }), 'no running row once the reading resolves').toBeUndefined()
  await expectPaneHoldsStill(ui, clock)
  await ui.unmount()
})

test('when a reading fails, the frame and the running row go, and the pane holds still',{ options: OPTIONS }, async ($, on) => {
  const hold = gate()
  const { store, calls, clock } = await startReader($, on, [new Error('uv: command not found')], hold.wait)
  await stop($)
  await waitFor(() => calls.length >= 1)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ key: 'spinner' }), 'the frame draws while the reading runs').toBeDefined()

  hold.open()
  await waitFor(() => ((store.get('readings:S1') as unknown[]) ?? []).length >= 1)
  expect((store.get('readings:S1') as any[])[0].state, 'the reading failed').toBe('failed')
  expect(await ui.find({ key: 'spinner' }), 'no frame once the reading fails').toBeUndefined()
  expect(await ui.find({ key: 'running' }), 'no running row once the reading fails').toBeUndefined()
  await expectPaneHoldsStill(ui, clock)
  await ui.unmount()
})

test('while a reading runs, the previous turn dims under a stale row, and the new card lights up when it arrives', { options: OPTIONS }, async ($, on) => {
  const hold = gate()
  const { store, calls } = await startReader($, on, [DIGESTED, ACTIONABLE, DIGESTED, ACTIONABLE], hold.wait, 3)
  await stop($)
  await waitFor(() => ((store.get('readings:S1') as unknown[]) ?? []).length >= 1)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'step-0' })
  await stop($)
  await waitFor(() => calls.length >= 3)

  let root = (await ui.drawn()) as Node
  expect((await ui.find({ key: 'stale' }))?.text, 'a row says the next stop is being read').toBe('Reading stop #2…')
  const order = walk(root).map(keyOfNode)
  expect(order.indexOf('stale'), 'the stale row is drawn').toBeGreaterThanOrEqual(0)
  expect(order.indexOf('stale'), 'the stale row stands above the summary').toBeLessThan(order.indexOf('summary-box'))
  for (const key of ['stale', 'summary-box', 'card-1', 'draft-block']) {
    const rows = rowsUnder(root, key)
    expect(rows.length, `${key} holds text`).toBeGreaterThan(0)
    for (const row of rows) expect(row.props?.dimColor, `every ${row.type} under ${key} is dim`).toBe(true)
  }

  hold.open()
  await waitFor(() => ((store.get('readings:S1') as unknown[]) ?? []).length >= 2)
  root = (await ui.drawn()) as Node
  expect(await ui.find({ key: 'stale' }), 'the stale row goes when the new reading arrives').toBeUndefined()
  expect(rowsUnder(root, 'title').length, 'the new card is drawn').toBeGreaterThan(0)
  for (const key of ['title', 'summary-body']) {
    for (const row of rowsUnder(root, key)) expect(row.props?.dimColor ?? false, `${row.type} under ${key} is not dim`).toBe(false)
  }
  await ui.unmount()
})

test('while a reading runs, Send and Edit are dim and submit nothing, and Right still marks the previous card', { options: OPTIONS }, async ($, on) => {
  const hold = gate()
  const { store, sent, calls } = await startReader($, on, [DIGESTED, ACTIONABLE, DIGESTED, ACTIONABLE], hold.wait, 3)
  await stop($)
  await waitFor(() => ((store.get('readings:S1') as unknown[]) ?? []).length >= 1)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'step-0' })
  await stop($)
  await waitFor(() => calls.length >= 3)

  for (const key of ['send', 'edit']) {
    const button = await ui.find({ key })
    expect(button, `${key} is drawn`).toBeDefined()
    expect(button?.props?.dimColor, `${key} is dim while the reading runs`).toBe(true)
  }
  await ui.press({ key: 'send' })
  await ui.press({ key: 'edit' })
  expect(sent, 'neither Send nor Edit reaches the prompt while the reading runs').toEqual([])

  await ui.press({ key: 'right-1' })
  await waitFor(() => (store.get('marks:S1') as any)?.['1']?.verdict === 'right')
  expect((store.get('marks:S1') as any)['1'].verdict, 'Right still marks the previous card').toBe('right')

  hold.open()
  await ui.unmount()
})
