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

// Slice 2: a refused search names the allow rule on its own line
test('memory-check puts the allow-rule hint on the search line when the permission check refuses the search', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  on('mcp.call', (_$: any, e: any) => {
    if (e.tool === 'search_knowledge_base') {
      return { deny: 'Blocked by the auto mode classifier: no rule allows this tool call' }
    }
    if (e.tool === 'recall') return mcpBody({ results: [] })
    if (e.tool === 'reflect') return mcpBody({ text: 'an answer' })
    if (e.tool === 'get_knowledge_page') return mcpBody({ id: 'page-1', name: 'ADR index', markdown: '', timestamp: '' })
    return { deny: 'unknown tool' }
  })
  const text = await runCheck($)
  const searchLine = lineFor(text, 'search_knowledge_base')
  expect(searchLine.includes('auto mode classifier')).toBe(true)
  expect(
    searchLine.includes('Add "mcp__hindsight__search_knowledge_base" to permissions.allow in your settings.'),
  ).toBe(true)
})

test('memory-check marks the reflect line failed when reflect answers with an error body', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  on('mcp.call', (_$: any, e: any) => {
    if (e.tool === 'recall') return mcpBody({ results: [rawHit('a record', 'gitlog:repo')] })
    if (e.tool === 'search_knowledge_base') {
      return mcpBody({ results: [{ id: 'page-1', name: 'ADR index', snippet: 'the ADRs', updated_at: '2026-10-01T00:00:00Z' }] })
    }
    if (e.tool === 'get_knowledge_page') {
      return mcpBody({ id: 'page-1', name: 'ADR index', markdown: '---\nid: page-1\n---\n\nthe page body', timestamp: '2026-10-01T00:00:00Z' })
    }
    if (e.tool === 'reflect') return mcpBody({ error: 'Error code: 429 - quota used', text: '' })
    return { deny: 'unknown tool' }
  })
  const text = await runCheck($)
  const line = lineFor(text, 'reflect')
  expect(line.includes('failed')).toBe(true)
  expect(line.includes('Error code: 429 - quota used')).toBe(true)
  expect(line.includes('answered')).toBe(false)
})

test('memory-check shows a plain-text reflect reply as the reason on its reflect line, and no JSON parse error', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  on('mcp.call', (_$: any, e: any) => {
    if (e.tool === 'recall') return mcpBody({ results: [rawHit('a record', 'gitlog:repo')] })
    if (e.tool === 'search_knowledge_base') {
      return mcpBody({ results: [{ id: 'page-1', name: 'ADR index', snippet: 'the ADRs', updated_at: '2026-10-01T00:00:00Z' }] })
    }
    if (e.tool === 'get_knowledge_page') return mcpBody({ id: 'page-1', name: 'ADR index', markdown: '', timestamp: '' })
    if (e.tool === 'reflect') {
      return { value: { content: [{ type: 'text', text: 'MCP error -32001: Request timed out' }], isError: false } }
    }
    return { deny: 'unknown tool' }
  })
  const text = await runCheck($)
  const line = lineFor(text, 'reflect')
  expect(line.includes('failed')).toBe(true)
  expect(line.includes('MCP error -32001: Request timed out')).toBe(true)
  expect(line.includes('JSON Parse error')).toBe(false)
})
