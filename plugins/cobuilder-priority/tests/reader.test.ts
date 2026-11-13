import { expect, test } from 'claude-code/testing'
import { DIGESTED, DONE, LABELLED, LABELLED_SUMMARY, NO_HUMAN, NO_REPLY, OPTIONS, PLAIN, stop, stubEngine, stubProcess, stubStore, waitFor } from './fakes'

const KEY = 'readings:S1'
const TRANSCRIPT = '/home/me/.claude/projects/x/S1.jsonl'

test('a reading keeps the digest that priority digest printed', { options: OPTIONS }, async ($, on) => {
  stubEngine(on)
  const store = stubStore(on)
  stubProcess(on, [DIGESTED, DONE])
  await switchOn($)
  await stop($)
  await waitFor(() => Array.isArray(store.get(KEY)))
  expect((store.get(KEY) as any[])[0].digest).toEqual(DIGESTED)
})

test('a stored reading sets the status line, with needs you when the reading needs the person', { options: OPTIONS }, async ($, on) => {
  const lines = stubEngine(on)
  const store = stubStore(on)
  stubProcess(on, [DIGESTED, DONE])
  await switchOn($)
  await stop($)
  await waitFor(() => Array.isArray(store.get(KEY)))
  expect(lines).toContain('Priority reader · #1 ready · needs you')
})

test('a failed reading sets the status line to failed, not ready', async ($, on) => {
  const lines = stubEngine(on)
  const store = stubStore(on)
  stubProcess(on, [DIGESTED, DONE])
  await switchOn($)
  await stop($)
  await waitFor(() => Array.isArray(store.get(KEY)))
  expect(lines).toContain('Priority reader · #1 failed')
})

async function switchOn($: any) {
  await $.session.start({ cwd: '/work/app', surface: 'terminal', isInteractive: true })
  await $.command.run({ command: 'priority-on' })
}

test('session start registers the priority-on, priority-off, and priority-pane commands', async ($, on) => {
  const names: string[] = []
  stubEngine(on, { commands: false })
  on('command.register', (_$: any, e: any) => { names.push(e.name); return { value: { command: e.name } } })
  await $.session.start({ cwd: '/work/app', surface: 'terminal', isInteractive: true })
  expect(names.sort()).toEqual(['priority-off', 'priority-on', 'priority-pane'])
})

test('with the switch off, a stop starts no process', { options: OPTIONS }, async ($, on) => {
  stubEngine(on)
  const store = stubStore(on)
  const calls = stubProcess(on, [DIGESTED, DONE])
  await $.session.start({ cwd: '/work/app', surface: 'terminal', isInteractive: true })
  await stop($)
  await waitFor(() => false, 3)
  expect(calls.length).toBe(0)
  expect(store.get(KEY)).toBe(undefined)
})

test('with the switch on, a stop runs digest then interpret, and stores the reading', { options: { ...OPTIONS, llm_api_key: 'k-1' } }, async ($, on) => {
  stubEngine(on)
  const store = stubStore(on)
  const calls = stubProcess(on, [DIGESTED, DONE])
  await switchOn($)
  await stop($)
  await waitFor(() => Array.isArray(store.get(KEY)))

  expect(calls.map((c) => c.argv.slice(0, 4))).toEqual([
    ['uv', 'run', 'priority', 'digest'],
    ['uv', 'run', 'priority', 'interpret'],
  ])
  const interpret = calls[1]
  expect(interpret.argv.includes('--program')).toBe(true)
  expect(interpret.argv[interpret.argv.indexOf('--program') + 1]).toBe(OPTIONS.program)
  expect(interpret.argv[interpret.argv.indexOf('--digest') + 1]).toBe('current')
  expect(interpret.argv[4]).toBe('/home/me/.claude/projects/x/S1.jsonl')
  expect(interpret.cwd).toBe(OPTIONS.priority_dev_dir)
  expect(interpret.timeoutMs).toBe(120_000)
  expect(interpret.env?.LLM_API_KEY).toBe('k-1')

  const readings = store.get(KEY) as any[]
  expect(readings.length).toBe(1)
  expect(readings[0].state).toBe('done')
  expect(readings[0].n).toBe(1)
  expect(readings[0].brief).toBe('digest-current')
  expect(readings[0].result.priority).toBe('can_wait')
})

test('a first digest abstain is stored as a brief with no digest', { options: OPTIONS }, async ($, on) => {
  stubEngine(on)
  const store = stubStore(on)
  const calls = stubProcess(on, [{ reason: 'model_error', detail: '429' }, DONE])
  await switchOn($)
  await stop($)
  await waitFor(() => Array.isArray(store.get(KEY)))
  expect(calls[1].argv[calls[1].argv.indexOf('--digest') + 1]).toBe('previous')
  expect((store.get(KEY) as any[])[0].brief).toBe('no-digest')
})

test('a digest abstain after a stored digest makes interpret label it previous', { options: OPTIONS }, async ($, on) => {
  stubEngine(on)
  const store = stubStore(on)
  const calls = stubProcess(on, [DIGESTED, DONE, { reason: 'model_error' }, DONE])
  await switchOn($)
  await stop($)
  await waitFor(() => ((store.get(KEY) as any[]) ?? []).length === 1)
  await stop($)
  await waitFor(() => ((store.get(KEY) as any[]) ?? []).length === 2)
  expect(calls[3].argv[calls[3].argv.indexOf('--digest') + 1]).toBe('previous')
  expect((store.get(KEY) as any[])[1].brief).toBe('digest-previous')
})

test('the stop hook returns while the reading still runs', { options: OPTIONS }, async ($, on) => {
  stubEngine(on)
  stubStore(on)
  const calls = stubProcess(on, [DIGESTED, DONE], new Promise<void>(() => {}))
  await switchOn($)
  await stop($)
  await waitFor(() => calls.length > 0)
  expect(calls.length).toBe(1)
})

test('the off command drops a stop that waits', { options: OPTIONS }, async ($, on) => {
  stubEngine(on)
  const store = stubStore(on)
  let open = () => {}
  const gate = new Promise<void>((resolve) => { open = resolve })
  const calls = stubProcess(on, [DIGESTED, DONE], gate)
  await switchOn($)
  await stop($)
  await stop($)
  await waitFor(() => calls.length > 0)
  await $.command.run({ command: 'priority-off' })
  open()
  await waitFor(() => ((store.get(KEY) as any[]) ?? []).length >= 1)
  await waitFor(() => false, 3)
  expect(calls.length).toBe(2)
  expect((store.get(KEY) as any[]).length).toBe(1)
})

test('one reading runs at a time, and only the newest waiting stop runs next', { options: OPTIONS }, async ($, on) => {
  stubEngine(on)
  const store = stubStore(on)
  let open = () => {}
  const gate = new Promise<void>((resolve) => { open = resolve })
  const calls = stubProcess(on, [DIGESTED, DONE], gate)
  await switchOn($)
  await stop($)
  await stop($)
  await stop($)
  await waitFor(() => calls.length > 0)
  expect(calls.length).toBe(1)
  open()
  await waitFor(() => ((store.get(KEY) as any[]) ?? []).length >= 2)
  expect(calls.length).toBe(4)
  expect((store.get(KEY) as any[]).length).toBe(2)
})

test('missing settings fail the reading before any process starts', async ($, on) => {
  stubEngine(on)
  const store = stubStore(on)
  const calls = stubProcess(on, [DIGESTED, DONE])
  await switchOn($)
  await stop($)
  await waitFor(() => Array.isArray(store.get(KEY)))
  expect(calls.length).toBe(0)
  const reading = (store.get(KEY) as any[])[0]
  expect(reading.state).toBe('failed')
  expect(reading.error).toMatch(/priority_dev_dir/)
  expect(reading.error).toMatch(/program/)
})

test('a process that cannot run fails the reading with its reason', { options: OPTIONS }, async ($, on) => {
  stubEngine(on)
  const store = stubStore(on)
  stubProcess(on, [new Error('uv: command not found')])
  await switchOn($)
  await stop($)
  await waitFor(() => Array.isArray(store.get(KEY)))
  const reading = (store.get(KEY) as any[])[0]
  expect(reading.state).toBe('failed')
  expect(reading.error).toMatch(/uv: command not found/)
})

test('the off command stops later readings', { options: OPTIONS }, async ($, on) => {
  stubEngine(on)
  stubStore(on)
  const calls = stubProcess(on, [DIGESTED, DONE])
  await switchOn($)
  await $.command.run({ command: 'priority-off' })
  await stop($)
  await waitFor(() => false, 3)
  expect(calls.length).toBe(0)
})

// E3.10: a reading that needs the person raises one toast with its number. The other readings raise none.
test('a reading that needs the person raises one toast with its number', { options: OPTIONS }, async ($, on) => {
  const toasts: string[] = []
  stubEngine(on, { toasts })
  const store = stubStore(on)
  stubProcess(on, [DIGESTED, DONE])
  await switchOn($)
  await stop($)
  await waitFor(() => Array.isArray(store.get(KEY)))
  await waitFor(() => false, 3)
  expect(toasts).toEqual(['Priority reader · #1 needs you'])
})

test('a reading that does not need the person raises no toast', { options: OPTIONS }, async ($, on) => {
  const toasts: string[] = []
  stubEngine(on, { toasts })
  const store = stubStore(on)
  stubProcess(on, [DIGESTED, NO_HUMAN])
  await switchOn($)
  await stop($)
  await waitFor(() => Array.isArray(store.get(KEY)))
  await waitFor(() => false, 3)
  expect((store.get(KEY) as any[]).length).toBe(1)
  expect(toasts).toEqual([])
})

test('a failed reading raises no toast', { options: OPTIONS }, async ($, on) => {
  const toasts: string[] = []
  stubEngine(on, { toasts })
  const store = stubStore(on)
  stubProcess(on, [new Error('uv: command not found')])
  await switchOn($)
  await stop($)
  await waitFor(() => Array.isArray(store.get(KEY)))
  await waitFor(() => false, 3)
  expect((store.get(KEY) as any[])[0].state).toBe('failed')
  expect(toasts).toEqual([])
})

test('an abstain raises no toast', { options: OPTIONS }, async ($, on) => {
  const toasts: string[] = []
  stubEngine(on, { toasts })
  const store = stubStore(on)
  stubProcess(on, [DIGESTED, NO_REPLY])
  await switchOn($)
  await stop($)
  await waitFor(() => Array.isArray(store.get(KEY)))
  await waitFor(() => false, 3)
  expect((store.get(KEY) as any[])[0].result.abstain).toBeTruthy()
  expect(toasts).toEqual([])
})

// E3.11: each reading records the answer labels of the last agent message, with no model call.
test('a labelled last message stores its labels and its Summary text', { options: OPTIONS }, async ($, on) => {
  stubEngine(on)
  const store = stubStore(on)
  stubProcess(on, [DIGESTED, DONE])
  await switchOn($)
  await stop($, 'S1', LABELLED)
  await waitFor(() => Array.isArray(store.get(KEY)))
  const reading = (store.get(KEY) as any[])[0]
  expect(reading.labels).toEqual(['FYI', 'Summary', 'Next steps', 'Decisions and questions'])
  expect(reading.agentSummary).toBe(LABELLED_SUMMARY)
})

test('a plain last message stores no labels and no agent summary', { options: OPTIONS }, async ($, on) => {
  stubEngine(on)
  const store = stubStore(on)
  stubProcess(on, [DIGESTED, DONE])
  await switchOn($)
  await stop($, 'S1', PLAIN)
  await waitFor(() => Array.isArray(store.get(KEY)))
  const reading = (store.get(KEY) as any[])[0]
  expect(reading.labels).toEqual([])
  expect(reading.agentSummary).toBeUndefined()
})

// A guard: the labels do not change the two CLI calls, so this passes before and after E3.11.
test('the digest and interpret calls keep their argv when the message is labelled', { options: OPTIONS }, async ($, on) => {
  stubEngine(on)
  const store = stubStore(on)
  const calls = stubProcess(on, [DIGESTED, DONE])
  await switchOn($)
  await stop($, 'S1', LABELLED)
  await waitFor(() => Array.isArray(store.get(KEY)))
  expect(calls.map((c) => c.argv)).toEqual([
    ['uv', 'run', 'priority', 'digest', TRANSCRIPT, '--log-dir', 'reports/logs/live'],
    ['uv', 'run', 'priority', 'interpret', TRANSCRIPT, '--log-dir', 'reports/logs/live', '--program', OPTIONS.program, '--digest', 'current'],
  ])
})
