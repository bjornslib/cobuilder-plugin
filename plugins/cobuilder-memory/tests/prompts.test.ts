import { expect, test } from 'claude-code/testing'
import { promptBlock, sessionTail, shouldStore } from '../hooks/prompts'
import { settle, stubSession, stubStore } from './fakes'

const typed = { text: 'a typed prompt', command: '', isMeta: false, origin: { kind: 'composer' } } as any

test('a prompt typed in the terminal is stored', () => {
  expect(shouldStore(typed)).toBe(true)
})

test('a prompt sent through Remote Control is stored', () => {
  expect(shouldStore({ ...typed, origin: { kind: 'bridge' } } as any)).toBe(true)
})

test('an SDK prompt is not stored', () => {
  expect(shouldStore({ ...typed, origin: { kind: 'sdk' } } as any)).toBe(false)
})

test('a plugin prompt is not stored', () => {
  expect(shouldStore({ ...typed, origin: { kind: 'plugin' } } as any)).toBe(false)
})

test('a meta prompt is not stored', () => {
  expect(shouldStore({ ...typed, isMeta: true } as any)).toBe(false)
})

test('a slash command is not stored', () => {
  expect(shouldStore({ ...typed, text: '/memory-check' } as any)).toBe(false)
  expect(shouldStore({ ...typed, command: 'memory-check' } as any)).toBe(false)
})

// Prompts go in through the prompt.submit hook, so the store is reached through the plugin
test('the store keeps the newest 100 prompts, each cut to 2,000 characters', async ($, on) => {
  const data = stubStore(on)
  stubSession(on)
  // The bottom handler stands in for the engine and passes the prompt on
  on('prompt.submit', (_$: any, e: any) => ({ text: e.text }))
  for (let i = 0; i < 105; i++) {
    const text = i === 104 ? 'x'.repeat(2500) : 'p' + i
    const { error } = await settle(async () =>
      $.prompt.submit({ text, origin: { kind: 'composer' }, wait: false } as any),
    )
    expect(error).toBe('')
  }
  const kept = data.get('prompts:S1') as { at: string; text: string }[]
  expect(Array.isArray(kept)).toBe(true)
  expect(kept.length).toBe(100)
  expect(kept[0]?.text).toBe('p5')
  expect(kept[kept.length - 1]?.text).toBe('x'.repeat(2000))
  expect(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(kept[0]?.at ?? '')).toBe(true)
})

test('the prompt block holds the newest prompts within 8,000 characters', () => {
  const prompts = Array.from({ length: 20 }, (_, i) => ({
    at: '2026-10-15T09:00',
    text: `[${i}]` + 'x'.repeat(1000),
  }))
  const block = promptBlock(prompts)
  expect(block.length).toBeLessThan(8001)
  expect(block).toContain('[19]')
  expect(block).not.toContain('[0]')
})

// Slice 8 cases: the session tail keeps the last six real messages, with injected blocks removed,
// and at most the newest 12,000 characters of them

// A list of user messages, with the text of each one from its index
function turns(count: number, text: (i: number) => string): any[] {
  return Array.from({ length: count }, (_, i) => ({ role: 'user', text: text(i), toolUses: [] }))
}

test('the session tail holds only the last six messages', () => {
  const messages = turns(30, (i) => `[${i}]` + 'x'.repeat(1000))
  const tail = sessionTail(messages as any)
  expect(tail.length).toBeLessThan(12001)
  expect(tail).toContain('[29]')
  expect(tail).toContain('[24]')
  expect(tail).not.toContain('[23]')
})

test('the session tail keeps the last six of ten short messages, and the 4th-from-oldest is not one of them', () => {
  const messages = turns(10, (i) => `MSG-0${i} short text`)
  const tail = sessionTail(messages as any)
  expect(tail).toContain('user: MSG-09 short text')
  expect(tail).toContain('MSG-04 short text')
  expect(tail).not.toContain('MSG-03 short text')
  expect(tail).not.toContain('MSG-00 short text')
})

test('the session tail keeps the newest 12,000 characters of six long messages', () => {
  const messages = turns(6, (i) => 'M' + i + ':' + 'x'.repeat(2997))
  const tail = sessionTail(messages as any)
  expect(tail.length).toBeLessThanOrEqual(12000)
  expect(tail.trimEnd().endsWith(messages[5].text)).toBe(true)
})

test('a message that holds only an injected block does not count toward the six', () => {
  const texts = [
    'MSG-00 real',
    '<system-reminder>x</system-reminder>',
    'MSG-02 real',
    'MSG-03 real',
    'MSG-04 real',
    'MSG-05 real',
    'MSG-06 real',
  ]
  const tail = sessionTail(texts.map((text) => ({ role: 'user', text, toolUses: [] })) as any)
  expect(tail).toContain('MSG-00 real')
  expect(tail).toContain('MSG-06 real')
  expect(tail).not.toContain('system-reminder')
})

test('the session tail drops each injected block type and keeps the text around it', () => {
  const text =
    'KEEP-A <system-reminder>REMIND-MARK</system-reminder> KEEP-B ' +
    '<local-command-caveat>CAVEAT-MARK</local-command-caveat> KEEP-C ' +
    '<local-command-stdout>STDOUT-MARK</local-command-stdout> KEEP-D ' +
    '<task-notification>TASK-MARK</task-notification> KEEP-E'
  const tail = sessionTail([{ role: 'user', text, toolUses: [] }] as any)
  for (const kept of ['KEEP-A', 'KEEP-B', 'KEEP-C', 'KEEP-D', 'KEEP-E']) expect(tail).toContain(kept)
  for (const dropped of ['REMIND-MARK', 'CAVEAT-MARK', 'STDOUT-MARK', 'TASK-MARK']) expect(tail).not.toContain(dropped)
})

test('a hindsight_ block is dropped and the text of its message is kept', () => {
  const text = 'KEEP-TEXT-MARK<hindsight_knowledge_refresh>REFRESH-MARK</hindsight_knowledge_refresh>'
  const tail = sessionTail([{ role: 'assistant', text, toolUses: [] }] as any)
  expect(tail).toContain('KEEP-TEXT-MARK')
  expect(tail).not.toContain('REFRESH-MARK')
  expect(tail).not.toContain('hindsight_knowledge_refresh')
})
