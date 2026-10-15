import { expect, test } from 'claude-code/testing'
import { mcpBody, rawHit, settle, stubRepo, stubSession, stubStore } from './fakes'

// Each of the four tools answers with a body; reflect can be made to deny
function stubTools(on: any, reflectDeny: string | null = null) {
  on('mcp.call', (_$: any, e: any) => {
    if (e.tool === 'recall') return mcpBody({ results: [rawHit('a record', 'gitlog:repo')] })
    if (e.tool === 'search_knowledge_base') {
      return mcpBody({ results: [{ id: 'page-1', name: 'ADR index', snippet: 'the ADRs', updated_at: '2026-10-01T00:00:00Z' }] })
    }
    if (e.tool === 'get_knowledge_page') {
      return mcpBody({ id: 'page-1', name: 'ADR index', markdown: '---\nid: page-1\n---\n\nthe page body', timestamp: '2026-10-01T00:00:00Z' })
    }
    if (e.tool === 'reflect') {
      return reflectDeny === null ? mcpBody({ text: 'an answer' }) : { deny: reflectDeny }
    }
    return { deny: 'unknown tool' }
  })
}

// Runs /memory-check and returns its text. A missing command hook fails here, on an assertion.
async function runCheck($: any): Promise<string> {
  const { value, error } = await settle(async () => $.command.run({ command: 'memory-check', args: '' } as any))
  expect(error).toBe('')
  return String(value?.text ?? '')
}

function lineFor(text: string, tool: string): string {
  return text.split('\n').find((l) => l.includes(tool)) ?? ''
}

test('memory-check prints an ok line with a time for each of the four tools', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  stubTools(on)
  const text = await runCheck($)
  for (const tool of ['recall', 'search_knowledge_base', 'get_knowledge_page', 'reflect']) {
    const line = lineFor(text, tool)
    expect(line.includes('ok')).toBe(true)
    expect(line.includes('failed')).toBe(false)
    expect(/\d+\s*ms/.test(line)).toBe(true)
  }
})

test('memory-check names the bank', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  stubTools(on)
  const text = await runCheck($)
  expect(text.includes('coding-agent-think-with-ai')).toBe(true)
})

test('a denied reflect makes only the reflect line failed, with its reason', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  stubTools(on, 'reflect timed out')
  const text = await runCheck($)
  const reflectLine = lineFor(text, 'reflect')
  expect(reflectLine.includes('failed')).toBe(true)
  expect(reflectLine.includes('reflect timed out')).toBe(true)
  for (const tool of ['recall', 'search_knowledge_base', 'get_knowledge_page']) {
    const line = lineFor(text, tool)
    expect(line.includes('ok')).toBe(true)
    expect(line.includes('failed')).toBe(false)
  }
})
