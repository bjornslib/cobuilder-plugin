import { expect, test } from 'claude-code/testing'
import { resolveBank } from '../hooks/bank'
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

test('outside a git repository, the bank is an error, never a guess', async ($, on) => {
  stubRepo(on, { exitCode: 128, stdout: '' })
  const r: any = await resolveBank($)
  expect('bank' in r).toBe(false)
  expect(String(r.error ?? '')).toContain('not in a git repository')
})

test('a template with an unknown placeholder gives an error, never a guess', async ($, on) => {
  stubRepo(on, { template: 'coding-agent-{gitRepo}' })
  const r: any = await resolveBank($)
  expect('bank' in r).toBe(false)
  expect('error' in r).toBe(true)
})
