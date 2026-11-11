import { expect, test } from 'claude-code/testing'
import { DIGESTED, DONE, OPTIONS, stop, stubEngine, stubProcess, stubStore, waitFor } from './fakes'

const PANE = {
  plugin: 'cobuilder-priority',
  component: 'Pane',
  requestId: 'priority-reader',
  props: { title: 'Priority reader: on', isFocused: false, bodyColumns: 80, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
} as const

async function oneReading($: any, on: any, answers: object[] = [DIGESTED, DONE]) {
  stubEngine(on)
  on('session.id', () => ({ value: 'S1' }))
  const store = stubStore(on)
  stubProcess(on, answers)
  await $.session.start({ cwd: '/work/app', surface: 'terminal', isInteractive: true })
  await $.command.run({ command: 'priority-on' })
  await stop($)
  await waitFor(() => Array.isArray(store.get('readings:S1')))
  return store
}

test('with no reading and the switch off, the pane says how to turn it on', async ($, on) => {
  stubEngine(on)
  on('session.id', () => ({ value: 'S1' }))
  stubStore(on)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /priority-on/ }))?.text).toMatch(/off/)
  await ui.unmount()
})

test('a card shows the status, the priority, and each step with its content', { options: OPTIONS }, async ($, on) => {
  await oneReading($, on)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /can_wait/ }))?.text).toBe('waiting_answer · can_wait · needs human')
    expect((await ui.find({ type: 'Text', text: /ask_human/ }))?.text).toMatch(/Ship it now\?/)
    expect((await ui.find({ type: 'Text', text: /notify/ }))?.text).toMatch(/Tests pass\./)
    await ui.unmount()
  }
})

test('a card names its reading number, and the pane shows the switch state', { options: OPTIONS }, async ($, on) => {
  await oneReading($, on)
  await $.command.run({ command: 'priority-off' })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /^Reading 1 · / }))).toBeDefined()
  expect((await ui.find({ type: 'Text', text: /^Reader: / }))?.text).toMatch(/^Reader: off/)
  await ui.unmount()
})

test('an abstain shows its reason', { options: OPTIONS }, async ($, on) => {
  await oneReading($, on, [DIGESTED, { status: null, needs_human: null, priority: null, steps: [], abstain: { reason: 'model_error', detail: '429' } }])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /abstain/ }))?.text).toBe('abstain: model_error (429)')
  await ui.unmount()
})

test('right, wrong, and a note are stored per stop', { options: OPTIONS }, async ($, on) => {
  const store = await oneReading($, on)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'wrong-1' })
  await ui.input({ key: 'note-1', text: 'It missed the open question.' })
  await waitFor(() => (store.get('marks:S1') as any)?.['1']?.note !== undefined && (store.get('marks:S1') as any)['1'].note !== '')
  const mark = (store.get('marks:S1') as any)['1']
  expect(mark.verdict).toBe('wrong')
  expect(mark.note).toBe('It missed the open question.')
  await ui.unmount()
})

test('a failed reading shows its error', async ($, on) => {
  await oneReading($, on)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /failed/ }))?.text).toMatch(/priority_dev_dir/)
  await ui.unmount()
})
