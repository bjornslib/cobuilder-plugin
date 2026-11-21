// A hot reload must not lose a reading in silence. The testing kit has no reload call, so a test
// queues a stop with a process that never answers, then runs session.start again. The reload runs
// register and session.start again, and the module values then hold nothing of the old job. The
// pending record must sit in $.store or $.state, which a reload keeps. The store is the test's own,
// map answers keys as well as get and set.
import { expect, mock, test } from 'claude-code/testing'
import type { Reading } from '../types'
import { DIGESTED, DONE, OPTIONS, commandRun, stop, stubEngine, stubPrompt, stubProcess, stubStore, waitFor, drain } from './fakes'

const NEVER = new Promise<void>(() => {})
const START = { cwd: '/work/app', surface: 'terminal' as const, isInteractive: true }

let data = new Map<string, unknown>()

async function begin($: any, on: any, answers: object[], gate?: Promise<void>, storeOf: (on: any) => Map<string, unknown> = stubStore) {
  stubEngine(on)
  on('session.id', () => ({ value: 'S1' }))
  data = storeOf(on)
  // A reader that keeps a pending record may list the keys of the store to find it again after a reload.
  on('store.keys', () => ({ value: [...data.keys()] }))
  mock.clock(on)
  stubPrompt(on)
  const calls = stubProcess(on, answers, gate)
  await $.session.start(START)
  await $.command.run({ command: 'priority-on' })
  return calls
}

// The readings of a session, read from the store that the test's hooks keep.
const saved = async (_$: any, session: string) => ((data.get(`readings:${session}`) as Reading[] | undefined) ?? [])

test('a stop whose reading ran at a reload gets a failed reading that names the reload', { options: OPTIONS }, async ($, on) => {
  const calls = await begin($, on, [DIGESTED, DONE], NEVER)
  await stop($)
  await waitFor(() => calls.length >= 1)
  expect(await saved($, 'S1'), 'no reading yet while the process runs').toEqual([])

  await $.session.start(START)
  await waitFor(() => false, 3)
  const list = await saved($, 'S1')
  expect(list.length, 'one reading for the lost stop').toBe(1)
  expect(list[0]?.state).toBe('failed')
  expect(list[0]?.error ?? '').toMatch(/reload/i)
  expect(list[0]?.n).toBe(1)
  expect(list[0]?.sessionId).toBe('S1')
})

test('a stop that waited in the queue at a reload also gets a failed reading', { options: OPTIONS }, async ($, on) => {
  const calls = await begin($, on, [DIGESTED, DONE], NEVER)
  await stop($, 'S1')
  await waitFor(() => calls.length >= 1)
  // A later time stamp, so the second stop has its own pending record.
  for (const first = Date.now(); Date.now() === first; );
  await stop($, 'S1')
  await waitFor(() => false, 3)

  await $.session.start(START)
  await waitFor(() => false, 3)
  const list = await saved($, 'S1')
  expect(list.map((r) => r.state), 'the running stop and the waiting stop each fail').toEqual(['failed', 'failed'])
  for (const r of list) expect(r.error ?? '').toMatch(/reload/i)
})

test('a reload leaves the pending stop of another session alone', { options: OPTIONS }, async ($, on) => {
  const calls = await begin($, on, [DIGESTED, DONE], NEVER)
  await stop($, 'S2')
  await waitFor(() => calls.length >= 1)

  await $.session.start(START)
  await waitFor(() => false, 3)
  expect(await saved($, 'S2'), 'another session may still read its stop').toEqual([])
  expect([...data.keys()].some((key) => key.startsWith('pending:S2:')), 'its pending record stays').toBe(true)
})

test('a stop whose reading was saved gets no failed reading at a reload', { options: OPTIONS }, async ($, on) => {
  await begin($, on, [DIGESTED, DONE])
  await stop($)
  for (let i = 0; i < 50 && (await saved($, 'S1')).length === 0; i++) await drain()
  expect((await saved($, 'S1')).length, 'the reading is saved').toBe(1)

  await $.session.start(START)
  await waitFor(() => false, 3)
  const list = await saved($, 'S1')
  expect(list.length, 'a reload adds no reading').toBe(1)
  expect(list[0]?.state).toBe('done')
})

test('a second reload does not add a second failed reading', { options: OPTIONS }, async ($, on) => {
  const calls = await begin($, on, [DIGESTED, DONE], NEVER)
  await stop($)
  await waitFor(() => calls.length >= 1)

  await $.session.start(START)
  await waitFor(() => false, 3)
  await $.session.start(START)
  await waitFor(() => false, 3)
  const list = await saved($, 'S1')
  expect(list.map((r) => r.state)).toEqual(['failed'])
})

test('a stop of a reader switched off before the reload gets no reading, and its record goes', { options: OPTIONS }, async ($, on) => {
  const calls = await begin($, on, [DIGESTED, DONE], NEVER)
  await stop($)
  await waitFor(() => calls.length >= 1)
  await $.command.run(commandRun('priority-off'))

  await $.session.start(START)
  await waitFor(() => false, 3)
  expect(await saved($, 'S1'), 'the person chose to skip the stop').toEqual([])
  expect([...data.keys()].some((key) => key.startsWith('pending:S1:')), 'no pending record is left').toBe(false)
})

test('the digest command gets three timeouts, and interpret gets one', { options: OPTIONS }, async ($, on) => {
  const calls = await begin($, on, [DIGESTED, DONE])
  await stop($)
  await waitFor(() => calls.length >= 2)
  expect(calls[0]?.argv).toContain('digest')
  expect(calls[0]?.timeoutMs, 'three attempts of 120 s').toBe(360_000)
  expect(calls[1]?.timeoutMs, 'one attempt of 120 s').toBe(120_000)
})

test('a queued stop skipped by /priority-off leaves no pending record', { options: OPTIONS }, async ($, on) => {
  let open!: () => void
  const gate = new Promise<void>((resolve) => { open = resolve })
  const calls = await begin($, on, [DIGESTED, DONE], gate)
  await stop($)
  await waitFor(() => calls.length >= 1)
  // A later time stamp, so the second stop has its own pending record.
  for (const first = Date.now(); Date.now() === first; );
  await stop($)
  await $.command.run(commandRun('priority-off'))
  open()
  for (let i = 0; i < 50 && (await saved($, 'S1')).length === 0; i++) await drain()
  await waitFor(() => false, 10)
  expect((await saved($, 'S1')).map((r) => r.state), 'only the running stop gets a reading').toEqual(['done'])
  expect([...data.keys()].some((key) => key.startsWith('pending:S1:')), 'the skipped stop leaves no pending record').toBe(false)
})

// A store for the order tests. It refuses each write that `refuse` names, and holds each delete that `hold` names.
function orderedStore(refuse: (key: string) => boolean, hold: (key: string) => Promise<void> | undefined) {
  return (on: any) => {
    const map = new Map<string, unknown>()
    on('store.get', (_$: any, e: any) => ({ value: map.get(e.key) }))
    on('store.set', (_$: any, e: any) => {
      if (refuse(e.key)) return { deny: 'The store refused the write.' }
      map.set(e.key, e.value)
      return { value: undefined }
    })
    on('store.delete', async (_$: any, e: any) => {
      await hold(e.key)
      map.delete(e.key)
      return { value: undefined }
    })
    return map
  }
}

test('a store that refuses the reading keeps its stop pending', { options: OPTIONS }, async ($, on) => {
  // The refusal covers the readings key only. The pending record is a different key, so it is not refused.
  await begin($, on, [DIGESTED, DONE], undefined, orderedStore((key) => key === 'readings:S1', () => undefined))
  await stop($)
  await waitFor(() => false, 20)
  expect(await saved($, 'S1'), 'the store refused the reading').toEqual([])
  expect([...data.keys()].some((key) => key.startsWith('pending:S1:')), 'the stop stays pending for the next start').toBe(true)
})

test('a waiting stop that a newer stop replaces gets no reading, even while its record waits to clear', { options: OPTIONS }, async ($, on) => {
  let open!: () => void
  const gate = new Promise<void>((resolve) => { open = resolve })
  let release!: () => void
  const held = new Promise<void>((resolve) => { release = resolve })
  // The delete of the second stop's record waits on `held`, so the swap must already have happened.
  let heldKey = ''
  const calls = await begin($, on, [DIGESTED, DONE], gate, orderedStore(() => false, (key) => (key === heldKey ? held : undefined)))
  await stop($)
  await waitFor(() => calls.length >= 1)
  // A later time stamp, so each stop has its own pending record.
  for (const first = Date.now(); Date.now() === first; );
  const before = new Set(data.keys())
  await stop($)
  heldKey = [...data.keys()].find((key) => !before.has(key)) ?? ''
  for (const first = Date.now(); Date.now() === first; );
  const third = stop($)
  await waitFor(() => false, 5)
  open()
  for (let i = 0; i < 100 && (await saved($, 'S1')).length < 2; i++) await drain()
  release()
  await third
  await waitFor(() => false, 10)
  const list = await saved($, 'S1')
  expect(list.length, 'the running stop and the newest stop get a reading').toBe(2)
  expect(list.map((r) => r.at), 'the replaced stop gets no reading').not.toContain(heldKey.slice('pending:S1:'.length))
  expect([...data.keys()].some((key) => key.startsWith('pending:S1:')), 'no pending record is left').toBe(false)
})
