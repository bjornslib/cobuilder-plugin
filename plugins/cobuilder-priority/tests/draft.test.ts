import { expect, test } from 'claude-code/testing'
import { canSend, draftOf } from '../hooks/draft'
import { ACTIONABLE } from './fakes'

const steps = ACTIONABLE.steps as Record<string, unknown>[]

test('a reply sends its text, and continue_until names the goal, the proof, and the limits', async () => {
  expect(draftOf(steps, [0], {}, {}).text).toBe('Run the migration before the tests.')
  expect(draftOf(steps, [1], {}, {}).text).toBe('Continue until: tests pass. Proof: npm test. Stop after 5 turns or 20 minutes.')
})

test('two selected steps join in step order with one blank line', async () => {
  const draft = draftOf(steps, [3, 0], {}, {})
  expect(draft.steps).toEqual([0, 3])
  expect(draft.text).toBe('Run the migration before the tests.\n\nYes, go ahead. You may do the same for the rest of this session.')
})

test('a decide step sends each answered question with its picks and the free text', async () => {
  const draft = draftOf(steps, [2], { '2.0': ['$.store'] }, { '2.0': 'keep it per session' })
  expect(draft.text).toBe('Which store keeps the marks? → $.store; keep it per session')
  expect(draftOf(steps, [2], {}, {}).steps).toEqual([])
})

test('permission, option, feedback, and gate steps become short text answers', async () => {
  const more = [
    { kind: 'deny_permission', reason: 'Not on main.' },
    { kind: 'pick_option', index: 1 },
    { kind: 'send_feedback', gate: 'G2', notes: 'Split the epic.' },
    { kind: 'approve_gate', gate: 'G1', notes: '' },
    { kind: 'continue' },
  ]
  expect(draftOf(more, [0, 1, 2, 3, 4], {}, {}).text).toBe(
    'No, do not do that. Not on main.\n\nOption 2.\n\nFeedback on G2: Split the epic.\n\nApproved: G1.\n\nContinue.',
  )
})

test('interrupt, notify, snooze, and dismiss never enter a draft', async () => {
  const quiet = [{ kind: 'interrupt' }, { kind: 'notify', excerpt: 'Done.' }, { kind: 'snooze', until_event: 'none' }, { kind: 'dismiss', reason: 'done' }]
  for (const step of quiet) expect(canSend(step)).toBe(false)
  expect(draftOf(quiet, [0, 1, 2, 3], {}, {})).toEqual({ text: '', steps: [] })
  expect(draftOf(steps, [], {}, {})).toEqual({ text: '', steps: [] })
})

test('a do or review request sends Done with the free text', async () => {
  const human = [
    { kind: 'ask_human', why_escalated: '', detail: { role: 'do', steps: ['Rotate the key'], where: '', done_check: '' } },
    { kind: 'ask_human', why_escalated: '', detail: { role: 'review', artifact: 'docs/plan.md', check_items: [] } },
  ]
  expect(draftOf(human, [0, 1], {}, { '0.0': 'rotated at 14:00' }).text).toBe('Done: Rotate the key. rotated at 14:00\n\nDone: reviewed docs/plan.md.')
})
