// E3.9: the row above the prompt. The band draws each notify message, and a summary row while the pane is closed.
// The engine's hooks are registered before the first call on `$`, as the harness requires.
import { expect, test } from 'claude-code/testing'
import { DIGESTED, NOTIFYING, NO_HUMAN, OPTIONS, PANE, WAITING, readings, stubEngine, stubPanes, stubStore } from './fakes'

const BAND = {
  plugin: 'cobuilder-priority',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 9 }, view: {} },
} as const

// The engine beneath the plugin. A drawing the plugin passes on comes out as an `engine` row.
function engineBeneath(on: any) {
  on('ui.render', ($: any, e: any) => {
    const { Box, Text } = $.ui.resolve(e)
    return <Box key="engine"><Text>engine</Text></Box>
  })
}

test('with the pane open, a notify step draws its message above the prompt', { options: OPTIONS }, async ($, on) => {
  stubPanes(on, true)
  engineBeneath(on)
  await readings($, on, [DIGESTED, NOTIFYING])
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ key: 'notify-0' }))?.text, 'the notify message is one row above the prompt').toBe('Notification: Tests pass.')
  expect(await ui.find({ key: 'band-summary' }), 'the pane is open, so no summary row').toBeUndefined()
  await ui.unmount()
})

test('each notify step draws its own row', { options: OPTIONS }, async ($, on) => {
  const two = { ...WAITING, steps: [{ kind: 'notify', excerpt: 'First.' }, { kind: 'notify', excerpt: 'Second.' }] }
  stubPanes(on, true)
  engineBeneath(on)
  await readings($, on, [DIGESTED, two])
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ key: 'notify-0' }))?.text).toBe('Notification: First.')
  expect((await ui.find({ key: 'notify-1' }))?.text).toBe('Notification: Second.')
  await ui.unmount()
})

test('the pane no longer draws the notify step', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, NOTIFYING])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ key: 'step-1' }), 'no row for the notify step, which is step 2').toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /Notification|Tests pass/ }), 'no drawn text of the notify step').toBeUndefined()
  await ui.unmount()
})

test('with the pane closed, the band adds a summary row for the newest reading', { options: OPTIONS }, async ($, on) => {
  stubPanes(on, false)
  engineBeneath(on)
  await readings($, on, [DIGESTED, WAITING])
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ key: 'band-summary' }))?.text).toBe('Priority reader · #1 · P1 High · Waits for your answer · needs you')
  await ui.unmount()
})

test('the summary row drops needs you when the reading does not need the person', { options: OPTIONS }, async ($, on) => {
  stubPanes(on, false)
  engineBeneath(on)
  await readings($, on, [DIGESTED, NO_HUMAN])
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ key: 'band-summary' }))?.text).toBe('Priority reader · #1 · P1 High · Waits for your answer')
  await ui.unmount()
})

test('with the pane closed, the notify rows stay and the summary row joins them', { options: OPTIONS }, async ($, on) => {
  stubPanes(on, false)
  engineBeneath(on)
  await readings($, on, [DIGESTED, NOTIFYING])
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ key: 'notify-0' }))?.text).toBe('Notification: Tests pass.')
  expect((await ui.find({ key: 'band-summary' }))?.text).toBe('Priority reader · #1 · P1 High · Waits for your answer · needs you')
  await ui.unmount()
})

test('with the pane open and no notify step, the band draws nothing of its own', { options: OPTIONS }, async ($, on) => {
  stubPanes(on, true)
  engineBeneath(on)
  await readings($, on, [DIGESTED, WAITING])
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: 'engine' }))?.text, 'the hook passes the drawing on to the engine').toBe('engine')
  expect(await ui.find({ key: 'band-summary' })).toBeUndefined()
  expect(await ui.find({ key: 'notify-0' })).toBeUndefined()
  await ui.unmount()
})

test('with the pane open and no reading, the band passes the drawing on', { options: OPTIONS }, async ($, on) => {
  stubEngine(on)
  on('session.id', () => ({ value: 'S1' }))
  stubStore(on)
  stubPanes(on, true)
  engineBeneath(on)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: 'engine' }))?.text, 'the hook passes the drawing on to the engine').toBe('engine')
  await ui.unmount()
})
