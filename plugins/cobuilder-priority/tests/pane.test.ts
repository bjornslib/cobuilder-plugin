import { expect, test } from 'claude-code/testing'
import { ACTIONABLE, DIGESTED, LABELLED, LABELLED_SUMMARY, NO_REPLY, OPTIONS, PANE, PLAIN, WAITING, childNodes, keyOfNode, nodeByKey, parentOfKey, readings, stubEngine, stubStore, waitFor, walk } from './fakes'
import type { Node } from './fakes'

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
  expect((await ui.find({ key: 'summary' }))?.text, 'the open summary offers to hide it').toMatch(/Hide summary/)
  await ui.press({ key: 'summary' })
  expect(await ui.find({ key: 'summary-body' })).toBeUndefined()
  expect((await ui.find({ key: 'summary' }))?.text, 'the closed summary offers to show it').toMatch(/Show summary/)
  await ui.unmount()
})

test('the draft block has no title row', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, ACTIONABLE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ key: 'draft' }), 'the draft block is drawn').toBeDefined()
  expect(await ui.find({ type: 'Text', text: /What will be sent/ })).toBeUndefined()
  await ui.unmount()
})

test('the newest card shows its number, priority, status, needs you, and each step', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, ACTIONABLE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ key: 'title' }))?.text).toMatch(/^#1 \d\d:\d\d$/)
  expect((await ui.find({ key: 'priority' }))?.text).toBe('P1 High')
  expect((await ui.find({ key: 'status' }))?.text).toBe('Blocked')
  expect((await ui.find({ key: 'needs' }))?.text).toBe('needs you')
  expect((await ui.find({ key: 'step-0' }))?.text).toBe('[ ] 1. Reply')
  expect((await ui.find({ key: 'step-0-body' }))?.text).toBe('"Run the migration before the tests."')
  expect((await ui.find({ key: 'step-4' }))?.text).toBe('[-] 5. Stop the turn (no target at a stop)')
  await ui.unmount()
})

test('an abstain and a failed reading show their reason on the card', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, { status: null, needs_human: null, priority: null, steps: [], abstain: { reason: 'model_error', detail: '429' } }])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ key: 'status' }))?.text).toBe('abstain · The model call failed (429)')
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
  expect((await ui.find({ key: 'history-1' }))?.text).toMatch(/^#1 \d\d:\d\d Blocked P1 High/)
  await ui.press({ key: 'history-1' })
  expect((await ui.find({ key: 'title' }))?.text).toMatch(/^#1 /)
  expect(await ui.find({ key: 'send' })).toBeUndefined()
  expect(await ui.find({ key: 'step-0' })).toBeUndefined()
  expect(await ui.find({ key: 'right-1' })).toBeDefined()
  await ui.unmount()
})

// E3.7: the fixed key row. Its key is `keys`, and it sits under the header.
test('the key row sits directly under the header and holds the five keys', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, ACTIONABLE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const root = (await ui.drawn()) as Node
  const parent = parentOfKey(root, 'header')
  expect(parent, 'the header is drawn inside a parent').toBeDefined()
  const siblings = childNodes(parent ?? {})
  const after = siblings[siblings.findIndex((n) => keyOfNode(n) === 'header') + 1]
  expect(keyOfNode(after ?? {}), 'the element after the header is the key row').toBe('keys')
  const hotkeys = walk(nodeByKey(root, 'keys') ?? {}).map((n) => n.props?.hotkey)
  for (const k of ['s', 'e', 'r', 'w', 'm']) expect(hotkeys, `the key row holds hotkey ${k}`).toContain(k)
  await ui.unmount()
})

test('Send and Edit are dim with no step selected, and lit once a step is picked', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, ACTIONABLE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ key: 'send' }))?.props.dimColor, 'Send is dim with no selection').toBe(true)
  expect((await ui.find({ key: 'edit' }))?.props.dimColor, 'Edit is dim with no selection').toBe(true)
  await ui.press({ key: 'step-0' })
  expect((await ui.find({ key: 'send' }))?.props.dimColor, 'Send is lit after a pick').toBeFalsy()
  expect((await ui.find({ key: 'edit' }))?.props.dimColor, 'Edit is lit after a pick').toBeFalsy()
  await ui.unmount()
})

test('the old action row under the draft is gone, and the note stays in the card', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, ACTIONABLE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const root = (await ui.drawn()) as Node
  expect(nodeByKey(root, 'card-1'), 'the newest card is drawn').toBeDefined()
  const inCard = walk(nodeByKey(root, 'card-1') ?? {}).map((n) => n.props?.hotkey)
  for (const k of ['s', 'e', 'r', 'w']) expect(inCard, `no hotkey ${k} under the draft`).not.toContain(k)
  expect((await ui.find({ key: 'note-1' }))?.type, 'the note input stays').toBe('Input')
  await ui.unmount()
})

// E3.8: plain names. The pane names each raw value. The stored reading keeps the raw values.
test('the pane shows plain names, and no raw value with an underscore', { options: OPTIONS }, async ($, on) => {
  const store = await readings($, on, [DIGESTED, WAITING])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ key: 'status' }))?.text, 'the status is named').toBe('Waits for your answer')
  expect((await ui.find({ key: 'priority' }))?.text, 'the priority is named').toBe('P1 High')
  const raw = JSON.stringify(await ui.drawn()).match(/"[^"]*[a-z]_[a-z][^"]*"/g) ?? []
  expect(raw, 'no drawn text holds a raw value').toEqual([])
  expect((store.get('readings:S1') as any[])[0].result, 'the store keeps the raw values').toMatchObject({ status: 'waiting_answer', priority: 'P1' })
  await ui.unmount()
})

test('an abstain shows its reason in plain words', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, NO_REPLY])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ key: 'status' }))?.text).toBe('abstain · No agent reply to read')
  await ui.unmount()
})

// E3.11: the reading stores the agent's own Summary, but the pane does not draw it.
test('the pane does not draw the agent Summary, and the reading keeps it', { options: OPTIONS }, async ($, on) => {
  const store = await readings($, on, [DIGESTED, WAITING], 1, true, LABELLED)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ key: 'agent-summary' }), 'no agent summary row').toBeUndefined()
  expect(await ui.find({ type: 'Text', text: LABELLED_SUMMARY }), 'no agent summary text').toBeUndefined()
  expect((store.get('readings:S1') as { agentSummary?: string }[])[0]?.agentSummary).toBe(LABELLED_SUMMARY)
  await ui.unmount()
})

test('a plain last message draws no agent summary row', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGESTED, WAITING], 1, true, PLAIN)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ key: 'summary-body' }))?.text).toBe('The agent ran the tests. All pass.')
  expect(await ui.find({ key: 'agent-summary' })).toBeUndefined()
  await ui.unmount()
})
