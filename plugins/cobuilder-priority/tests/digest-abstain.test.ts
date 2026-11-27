// The digest abstain: a stop with no digest says why. The reading keeps `digestAbstain`
// ({ reason, detail }) and the open summary box shows the reason, not only "No digest for this stop".
import { expect, test } from 'claude-code/testing'
import type { Reading } from '../types'
import { DIGESTED, DONE, OPTIONS, PANE, readings } from './fakes'

type WithAbstain = Reading & { digestAbstain?: { reason: string; detail?: string } }

const ABSTAIN = { reason: 'invalid_output', detail: 'digest: ValidationError: 1 validation error for RunDigest' }

test('a digest abstain is kept in the reading as digestAbstain', { options: OPTIONS }, async ($, on) => {
  const store = await readings($, on, [ABSTAIN, DONE])
  const reading = (store.get('readings:S1') as WithAbstain[])[0]!
  expect(reading.state).toBe('done')
  expect(reading.digest, 'an abstain gives no digest').toBeUndefined()
  expect(reading.digestAbstain).toEqual(ABSTAIN)
})

test('a digest abstain with no detail keeps its reason', { options: OPTIONS }, async ($, on) => {
  const store = await readings($, on, [{ reason: 'model_error' }, DONE])
  const reading = (store.get('readings:S1') as WithAbstain[])[0]!
  expect(reading.digestAbstain?.reason).toBe('model_error')
})

test('the open summary box shows the reason of the digest abstain', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [ABSTAIN, DONE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const body = (await ui.find({ key: 'summary-body' }))?.text ?? ''
  expect(body, 'the summary body names the reason').toContain('invalid_output')
  await ui.unmount()
})

test('each reason of the digest abstain reaches the summary box', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [{ reason: 'brief_too_large', detail: 'brief' }, DONE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(((await ui.find({ key: 'summary-body' }))?.text ?? '')).toContain('brief_too_large')
  await ui.unmount()
})

test('a reading with a real digest keeps no digestAbstain and shows the digest body', { options: OPTIONS }, async ($, on) => {
  const store = await readings($, on, [DIGESTED, DONE])
  const reading = (store.get('readings:S1') as WithAbstain[])[0]!
  expect(reading.digestAbstain).toBeUndefined()
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ key: 'summary-body' }))?.text).toBe('The agent ran the tests. All pass.')
  await ui.unmount()
})
