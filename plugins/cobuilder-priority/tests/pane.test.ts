import { expect, test } from 'claude-code/testing'
import { ACTIONABLE, DIGESTED, OPTIONS, PANE, readings, stubEngine, stubStore, waitFor } from './fakes'

test('with no reading and the switch off, the pane says how to turn it on', async ($, on) => {
  stubEngine(on)
  on('session.id', () => ({ value: 'S1' }))
  stubStore(on)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /priority-on/ }))?.text).toMatch(/off/)
  await ui.unmount()
})

test('the header shows the switch state and the count of readings', { options: OPTIONS }, async ($, on) => {
  await readings($, on)
  await $.command.run({ command: 'priority-off' })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ key: 'state' }))?.text).toBe('○ off')
  expect((await ui.find({ key: 'count' }))?.text).toBe('1 readings')
  await ui.unmount()
})

test('the agent summary shows the digest, and m closes it', { options: OPTIONS }, async ($, on) => {
  await readings($, on)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ key: 'summary-body' }))?.text).toBe('The agent ran the tests. All pass.')
  await ui.press({ key: 'summary' })
  expect(await ui.find({ key: 'summary-body' })).toBeUndefined()
  await ui.unmount()
})

test('the newest card shows its number, priority, status, needs you, and each step', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, ACTIONABLE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ key: 'title' }))?.text).toMatch(/^#1 \d\d:\d\d$/)
  expect((await ui.find({ key: 'priority' }))?.text).toBe('P1')
  expect((await ui.find({ key: 'status' }))?.text).toBe('blocked')
  expect((await ui.find({ key: 'needs' }))?.text).toBe('needs you')
  expect((await ui.find({ key: 'step-0' }))?.text).toBe('[ ] 1. reply')
  expect((await ui.find({ key: 'step-0-body' }))?.text).toBe('"Run the migration before the tests."')
  expect((await ui.find({ key: 'step-4' }))?.text).toBe('[-] 5. interrupt (no target at a stop)')
  await ui.unmount()
})

test('an abstain and a failed reading show their reason on the card', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, { status: null, needs_human: null, priority: null, steps: [], abstain: { reason: 'model_error', detail: '429' } }])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ key: 'status' }))?.text).toBe('abstain · model_error (429)')
  await ui.unmount()
})

test('a failed reading names the unset setting, and offers no draft and no send', async ($, on) => {
  await readings($, on)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ key: 'status' }))?.text).toMatch(/^failed: .*priority_dev_dir/)
  expect(await ui.find({ key: 'draft' })).toBeUndefined()
  expect(await ui.find({ key: 'send' })).toBeUndefined()
  expect(await ui.find({ key: 'right-1' })).toBeDefined()
  await ui.unmount()
})

test('the card time is the local time of the stop', { options: OPTIONS }, async ($, on) => {
  const store = await readings($, on)
  const at = new Date((store.get('readings:S1') as any[])[0].at)
  const local = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ key: 'title' }))?.text).toBe(`#1 ${local}`)
  await ui.unmount()
})

test('right, wrong, and a note are stored per stop', { options: OPTIONS }, async ($, on) => {
  const store = await readings($, on)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'wrong-1' })
  await ui.input({ key: 'note-1', text: 'It missed the open question.' })
  await waitFor(() => Boolean((store.get('marks:S1') as any)?.['1']?.note))
  const mark = (store.get('marks:S1') as any)['1']
  expect(mark.verdict).toBe('wrong')
  expect(mark.note).toBe('It missed the open question.')
  await ui.unmount()
})

test('older readings are history rows, and a row opens its card with marks only', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, ACTIONABLE], 2)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ key: 'history-1' }))?.text).toMatch(/^#1 \d\d:\d\d blocked P1/)
  await ui.press({ key: 'history-1' })
  expect((await ui.find({ key: 'title' }))?.text).toMatch(/^#1 /)
  expect(await ui.find({ key: 'send' })).toBeUndefined()
  expect(await ui.find({ key: 'step-0' })).toBeUndefined()
  expect(await ui.find({ key: 'right-1' })).toBeDefined()
  await ui.unmount()
})
