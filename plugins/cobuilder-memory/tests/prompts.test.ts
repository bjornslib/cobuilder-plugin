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

test('the session tail holds the last 12,000 characters of the session', () => {
  const messages = Array.from({ length: 30 }, (_, i) => ({
    role: 'user',
    text: `[${i}]` + 'x'.repeat(1000),
    toolUses: [],
  }))
  const tail = sessionTail(messages as any)
  expect(tail.length).toBeLessThan(12001)
  expect(tail.length).toBeGreaterThan(11000)
  expect(tail).toContain('[29]')
  expect(tail).not.toContain('[0]')
})
