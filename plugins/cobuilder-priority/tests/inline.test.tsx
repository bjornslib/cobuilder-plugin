// A pane seated inline cannot scroll. The pane says so, so a lost fullscreen does not go unseen.
import { expect, test } from 'claude-code/testing'
import { INLINE_WARNING } from '../hooks/pane'
import { ACTIONABLE, DIGESTED, OPTIONS, PANE, readings } from './fakes'

const INLINE = { ...PANE, surface: 'terminal', props: { ...PANE.props, placement: 'inline' } } as const

test('an inline pane with a reading shows the scroll warning', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, ACTIONABLE])
  const ui = await $.ui.mount(INLINE)
  expect((await ui.find({ key: 'inline-warning' }))?.text).toBe(INLINE_WARNING)
  await ui.unmount()
})

test('an inline pane with no reading shows the scroll warning', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [])
  const ui = await $.ui.mount(INLINE)
  expect((await ui.find({ key: 'inline-warning' }))?.text).toBe(INLINE_WARNING)
  await ui.unmount()
})

test('a docked pane shows no scroll warning', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, ACTIONABLE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ key: 'inline-warning' })).toBeUndefined()
  await ui.unmount()
})
