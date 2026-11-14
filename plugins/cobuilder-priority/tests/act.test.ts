import { expect, test } from 'claude-code/testing'
import { ACTIONABLE, DIGESTED, OPTIONS, PANE, drain, readings, stop, waitFor } from './fakes'

const sentMark = (store: Map<string, unknown>) => (store.get('marks:S1') as any)?.['1']?.sent

test('selecting two steps toggles their rows and fills the draft block', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, ACTIONABLE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ key: 'draft' }))?.text).toBe('Provide your response')
  await ui.press({ key: 'step-0' })
  await ui.press({ key: 'step-3' })
  expect((await ui.find({ key: 'step-0' }))?.text).toBe('[x] 1. Reply')
  expect((await ui.find({ key: 'draft' }))?.text).toBe('Run the migration before the tests.\n\nYes, go ahead. You may do the same for the rest of this session.')
  expect((await ui.find({ key: 'draft-footer' }))?.text).toMatch(/^steps 1, 4 · \d+ chars · session prompt$/)
  await ui.unmount()
})

test('an option pick on a decide question selects the step and enters the draft', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, ACTIONABLE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'opt-2-0-0' })
  expect((await ui.find({ key: 'opt-2-0-0' }))?.text).toBe('[•] $.store')
  expect((await ui.find({ type: 'Text', text: '3. You decide' }))?.text, 'the decide step is a heading, not a toggle').toBe('3. You decide')
  expect(await ui.find({ type: 'Button', text: 'You decide' }), 'no Button toggles the decide step').toBeUndefined()
  await ui.input({ key: 'other-2-0', text: 'per session' })
  expect((await ui.find({ key: 'draft' }))?.text).toBe('Which store keeps the marks? → $.store; per session')
  await ui.unmount()
})

test('Send submits the draft as the person, records it on the mark, and clears the selection', { options: OPTIONS }, async ($, on) => {
  const store = await readings($, on, [DIGESTED, ACTIONABLE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'step-0' })
  await ui.press({ key: 'send' })
  await waitFor(() => Boolean(sentMark(store)))
  expect(store.sent).toHaveLength(1)
  expect(store.sent[0]).toMatchObject({ how: 'submit', text: 'Run the migration before the tests.', asUser: true })
  expect(sentMark(store)).toMatchObject({ how: 'submit', steps: [0], text: 'Run the migration before the tests.' })
  expect((await ui.find({ key: 'step-0' }))?.text).toBe('[ ] 1. Reply')
  await ui.unmount()
})

test('Edit puts the draft in the prompt box and submits nothing', { options: OPTIONS }, async ($, on) => {
  const store = await readings($, on, [DIGESTED, ACTIONABLE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'step-1' })
  await ui.press({ key: 'edit' })
  await waitFor(() => Boolean(sentMark(store)))
  expect(store.sent.map((s) => s.how)).toEqual(['fill'])
  expect(store.sent[0]).toMatchObject({ mode: 'replace' })
  expect(sentMark(store).how).toBe('fill')
  await ui.unmount()
})

test('with no selection, Send and Edit call nothing', { options: OPTIONS }, async ($, on) => {
  const store = await readings($, on, [DIGESTED, ACTIONABLE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'send' })
  await ui.press({ key: 'edit' })
  await drain()
  expect(store.sent).toHaveLength(0)
  expect(store.get('marks:S1')).toBeUndefined()
  await ui.unmount()
})

test('a refused fill writes no mark and says the prompt box is not available', { options: OPTIONS }, async ($, on) => {
  const store = await readings($, on, [DIGESTED, ACTIONABLE], 1, false)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'step-0' })
  await ui.press({ key: 'edit' })
  await drain()
  expect(store.get('marks:S1')).toBeUndefined()
  expect((await ui.find({ key: 'notice' }))?.text).toBe('The prompt box is not available')
  await ui.unmount()
})

test('a newer reading clears the selection of the older one', { options: OPTIONS }, async ($, on) => {
  const store = await readings($, on, [DIGESTED, ACTIONABLE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'step-0' })
  await stop($)
  await waitFor(() => ((store.get('readings:S1') as unknown[]) ?? []).length >= 2)
  expect((await ui.find({ key: 'title' }))?.text).toMatch(/^#2 /)
  expect((await ui.find({ key: 'step-0' }))?.text).toBe('[ ] 1. Reply')
  expect((await ui.find({ key: 'draft' }))?.text).toBe('Provide your response')
  await ui.unmount()
})
