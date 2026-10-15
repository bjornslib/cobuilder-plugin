import { expect, test } from 'claude-code/testing'
import { mcpBody, settle, stubRepo, stubSession, stubStore } from './fakes'

// The bank is reached through the memory-check command, which passes bank_id on every Hindsight call
test('the bank takes the main worktree name from the template', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  const calls: any[] = []
  on('mcp.call', (_$: any, e: any) => {
    calls.push(e)
    return mcpBody({ results: [] })
  })
  const { value, error } = await settle(async () => $.command.run({ command: 'memory-check', args: '' } as any))
  expect(error).toBe('')
  expect(calls.length).toBeGreaterThan(0)
  for (const c of calls) expect(c.args?.bank_id).toBe('coding-agent-think-with-ai')
  expect(String(value?.text ?? '').includes('coding-agent-think-with-ai')).toBe(true)
})

test('outside a git repository, memory-check names the missing repo and makes no Hindsight call', async ($, on) => {
  stubRepo(on, { exitCode: 128, stdout: '' })
  stubStore(on)
  stubSession(on)
  const calls: any[] = []
  on('mcp.call', (_$: any, e: any) => {
    calls.push(e)
    return mcpBody({ results: [] })
  })
  const { value, error } = await settle(async () => $.command.run({ command: 'memory-check', args: '' } as any))
  expect(error).toBe('')
  expect(String(value?.text ?? '')).toContain('No bank: this folder is not in a git repository.')
  expect(calls.length).toBe(0)
})

test('a template with an unknown placeholder makes memory-check name the template and make no Hindsight call', async ($, on) => {
  stubRepo(on, { template: 'coding-agent-{gitRepo}' })
  stubStore(on)
  stubSession(on)
  const calls: any[] = []
  on('mcp.call', (_$: any, e: any) => {
    calls.push(e)
    return mcpBody({ results: [] })
  })
  const { value, error } = await settle(async () => $.command.run({ command: 'memory-check', args: '' } as any))
  expect(error).toBe('')
  const text = String(value?.text ?? '')
  expect(text).toContain('coding-agent-{gitRepo}')
  // No bank resolved, so the check never names one and never calls Hindsight
  expect(text.includes('Memory check on bank')).toBe(false)
  expect(calls.length).toBe(0)
})
