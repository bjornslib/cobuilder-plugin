import { expect, test } from 'claude-code/testing'
import { abstainName, briefName, priorityName, statusName, stepName } from '../hooks/names'

// E3.8: the plain names of the pane, from the "Plain names" table of contracts.md.

test('statusName names each model status in plain words', () => {
  const rows: [string, string][] = [
    ['done', 'Done'],
    ['continuing', 'Still working'],
    ['waiting_answer', 'Waits for your answer'],
    ['waiting_permission', 'Waits for your permission'],
    ['blocked', 'Blocked'],
    ['failed', 'Failed'],
  ]
  for (const [raw, plain] of rows) expect(statusName(raw), raw).toBe(plain)
})

test('priorityName names P0 to P4 in plain words', () => {
  const rows: [string, string][] = [
    ['P0', 'P0 Urgent'],
    ['P1', 'P1 High'],
    ['P2', 'P2 Normal'],
    ['P3', 'P3 Low'],
    ['P4', 'P4 Can wait'],
  ]
  for (const [raw, plain] of rows) expect(priorityName(raw), raw).toBe(plain)
})

test('stepName names each step kind that has one fixed name', () => {
  const rows: [Record<string, unknown>, string][] = [
    [{ kind: 'reply', text: 'Run it.' }, 'Reply'],
    [{ kind: 'continue' }, 'Continue'],
    [{ kind: 'deny_permission', reason: 'Not on main.' }, 'Denied permission'],
    [{ kind: 'approve_gate', gate: 'G1' }, 'Approve the gate'],
    [{ kind: 'send_feedback', gate: 'G2', notes: 'Split it.' }, 'Send feedback'],
    [{ kind: 'interrupt' }, 'Stop the turn'],
    [{ kind: 'notify', excerpt: 'Done.' }, 'Notification'],
    [{ kind: 'dismiss', reason: 'done' }, 'Dismiss: done, out of date, duplicate, or read'],
  ]
  for (const [step, plain] of rows) expect(stepName(step), String(step.kind)).toBe(plain)
})

test('stepName puts the fields of continue_until and pick_option into the name', () => {
  expect(stepName({ kind: 'continue_until', goal: 'tests pass', max_turns: 5, max_minutes: 20 })).toBe('Continue until: tests pass (5 turns, 20 min)')
  expect(stepName({ kind: 'pick_option', index: 1 })).toBe('Pick option 2')
})

test('stepName names a permission by its scope', () => {
  expect(stepName({ kind: 'approve_permission', scope: 'session' })).toBe('Allow for this session')
  expect(stepName({ kind: 'approve_permission', scope: 'once' })).toBe('Allow')
  expect(stepName({ kind: 'approve_permission' })).toBe('Allow')
})

test('stepName names an ask_human step by its role', () => {
  expect(stepName({ kind: 'ask_human', detail: { role: 'decide' } })).toBe('You decide')
  expect(stepName({ kind: 'ask_human', detail: { role: 'do' } })).toBe('You do this')
  expect(stepName({ kind: 'ask_human', detail: { role: 'review' } })).toBe('You review')
})

test('stepName names a snooze by the event it waits for', () => {
  expect(stepName({ kind: 'snooze', until_event: 'session_idle' })).toBe('Wait until the session is idle')
  expect(stepName({ kind: 'snooze', until_event: 'turn_end' })).toBe('Wait until the turn ends')
})

test('abstainName names each abstain reason in plain words', () => {
  const rows: [string, string][] = [
    ['model_error', 'The model call failed'],
    ['invalid_output', "The model's answer could not be read"],
    ['no_agent_reply', 'No agent reply to read'],
    ['brief_too_large', 'The session is too long to read'],
  ]
  for (const [raw, plain] of rows) expect(abstainName(raw), raw).toBe(plain)
})

test('briefName names each brief shape, and digest-current has no name', () => {
  const rows: [string, string][] = [
    ['digest-current', ''],
    ['digest-previous', 'Summary of the previous stop'],
    ['no-digest', 'No summary'],
  ]
  for (const [raw, plain] of rows) expect(briefName(raw), raw).toBe(plain)
})

test('an unknown raw value passes through each name unchanged', () => {
  expect(statusName('mystery_state')).toBe('mystery_state')
  expect(priorityName('P9')).toBe('P9')
  expect(stepName({ kind: 'mystery_step' })).toBe('mystery_step')
  expect(abstainName('new_reason')).toBe('new_reason')
  expect(briefName('digest-later')).toBe('digest-later')
})
