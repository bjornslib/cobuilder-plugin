import { expect, test } from 'claude-code/testing'
import { HOW_TO_JUDGE } from '../hooks/result'
import { mcpBody, rawHit, settle, stubHaiku, stubRepo, stubSession, stubStore } from './fakes'

test('the consult tool returns the judging rules, the bank, the Need line, and the old record only', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on, [])
  const calls: { model: string; effort: string }[] = []
  stubHaiku(on, 'Need: n\nRecall: q', calls)
  on('mcp.call', (_$: any, e: any) => {
    if (e.tool === 'recall') {
      return mcpBody({
        results: [rawHit('old decision', 'gitlog:repo'), rawHit('said today', 'conversation:S1')],
      })
    }
    return mcpBody({ results: [] })
  })

  // A missing tool hook fails on the first assertion, not on a thrown engine error
  const { value, error } = await settle(async () => $.tool.call({ tool: 'mcp__cobuilder-memory__consult' } as any))
  expect(error).toBe('')
  const text = String(value?.result ?? '')

  // The judging rules come first, from the one constant in result.ts
  expect(HOW_TO_JUDGE.length).toBeGreaterThan(0)
  expect(text.startsWith(HOW_TO_JUDGE)).toBe(true)
  expect(text).toContain('coding-agent-think-with-ai')
  expect(text).toContain('Need: n')
  expect(text).toContain('old decision')
  expect(text).not.toContain('said today')

  // Every Haiku call runs on haiku at medium effort
  expect(calls.length).toBeGreaterThan(0)
  for (const c of calls) expect(c).toEqual({ model: 'haiku', effort: 'medium' })
})
