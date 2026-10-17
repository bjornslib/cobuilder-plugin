import { expect, test } from 'claude-code/testing'
import { dropOwnSession, type Hit } from '../hooks/hindsight'
import { mcpBody, settle, stubHaiku, stubRepo, stubSession, stubStore } from './fakes'

const SETUP_MESSAGE =
  'Hindsight MCP server not found: add the server named "hindsight" with the recall, reflect, search_knowledge_base, and get_knowledge_page tools.'

// The consult tool drives every Hindsight call, so each call reaches the mcp.call stub
test('recall calls the hindsight server with the bank and the contract arguments', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  stubHaiku(on, 'Need: n\nRecall: q')
  const calls: any[] = []
  on('mcp.call', (_$: any, e: any) => {
    calls.push(e)
    return mcpBody({ results: [] })
  })
  const { error } = await settle(async () => $.tool.call({ tool: 'mcp__cobuilder-memory__consult' } as any))
  expect(error).toBe('')
  // The run's recall carries Haiku's Recall line as its query. Other recall calls may run too.
  const recall = calls.find((c) => c.tool === 'recall' && c.args?.query === 'q')
  expect(recall !== undefined).toBe(true)
  expect(recall.server).toBe('hindsight')
  expect(recall.args).toEqual({
    query: 'q',
    bank_id: 'coding-agent-think-with-ai',
    types: ['world', 'experience'],
    budget: 'mid',
    max_tokens: 2500,
  })
})

test('a recall the server refuses shows the refusal in the recall section, and no JSON parse text', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  stubHaiku(on, 'Need: n\nRecall: q')
  const REFUSAL = 'Blocked by the auto mode classifier: no rule allows this tool call'
  on('mcp.call', (_$: any, e: any) => {
    if (e.tool === 'recall') return { deny: REFUSAL }
    return mcpBody({ results: [] })
  })
  const { value, error } = await settle(async () => $.tool.call({ tool: 'mcp__cobuilder-memory__consult' } as any))
  expect(error).toBe('')
  const text = String(value?.result ?? '')
  expect(text.includes(REFUSAL)).toBe(true)
  expect(text.includes('Add "mcp__hindsight__recall" to permissions.allow in your settings.')).toBe(true)
  expect(text.includes('JSON Parse error')).toBe(false)
  // The refusal sits in the recall section, after the recall query and before the page section
  const queryAt = text.indexOf('Recall: q')
  const refusalAt = text.indexOf(REFUSAL)
  expect(queryAt > -1 && refusalAt > queryAt).toBe(true)
  expect(refusalAt < text.indexOf('Knowledge page:')).toBe(true)
})

test('the current session transcript is dropped from the recall hits', () => {
  const hits: Hit[] = [
    { text: 'old decision', date: '2026-10-01', doc: 'gitlog:repo' },
    { text: 'said today', date: '2026-10-15', doc: 'conversation:S1' },
    { text: 'another session', date: '2026-10-14', doc: 'conversation:S2' },
  ]
  expect(dropOwnSession(hits, 'S1').map((h) => h.doc)).toEqual(['gitlog:repo', 'conversation:S2'])
})

test('a missing Hindsight server gives the set-up message', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  stubHaiku(on, 'Need: n\nRecall: q')
  on('mcp.call', () => ({ deny: 'no connected MCP tool "recall" on a server named "hindsight"' }))
  const { value, error } = await settle(async () => $.tool.call({ tool: 'mcp__cobuilder-memory__consult' } as any))
  expect(error).toBe('')
  expect(String(value?.result ?? '').includes(SETUP_MESSAGE)).toBe(true)
})

function lineFor(text: string, tool: string): string {
  return text.split('\n').find((l) => l.includes(tool)) ?? ''
}

// The server answers four tools, but lacks get_knowledge_page
test('memory-check fails the get_knowledge_page line and names the set-up, others stay ok', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  on('mcp.call', (_$: any, e: any) => {
    if (e.tool === 'recall') return mcpBody({ results: [{ text: 'a record', mentioned_at: '2026-10-01T00:00:00Z', document_id: 'gitlog:repo' }] })
    if (e.tool === 'search_knowledge_base') {
      return mcpBody({ results: [{ id: 'page-1', name: 'ADR index', snippet: 'the ADRs', updated: '2026-10-01' }] })
    }
    if (e.tool === 'reflect') return mcpBody({ text: 'an answer' })
    if (e.tool === 'get_knowledge_page') {
      return { deny: 'no connected MCP tool "get_knowledge_page" on a server named "hindsight"' }
    }
    return { deny: 'unknown tool' }
  })
  const { value, error } = await settle(async () => $.command.run({ command: 'memory-check', args: '' } as any))
  expect(error).toBe('')
  const text = String(value?.text ?? '')
  expect(lineFor(text, 'get_knowledge_page').includes('failed')).toBe(true)
  expect(text.includes(SETUP_MESSAGE)).toBe(true)
  for (const tool of ['recall', 'search_knowledge_base', 'reflect']) {
    const line = lineFor(text, tool)
    expect(line.includes('ok')).toBe(true)
    expect(line.includes('failed')).toBe(false)
  }
})

// Only recall is missing here, and the other three tools answer
test('consult with recall missing as a tool returns the set-up message', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  stubHaiku(on, 'Need: n\nRecall: q')
  on('mcp.call', (_$: any, e: any) => {
    if (e.tool === 'recall') return { deny: 'no connected MCP tool "recall" on a server named "hindsight"' }
    return mcpBody({ results: [] })
  })
  const { value, error } = await settle(async () => $.tool.call({ tool: 'mcp__cobuilder-memory__consult' } as any))
  expect(error).toBe('')
  expect(String(value?.result ?? '').includes(SETUP_MESSAGE)).toBe(true)
})

// A server error can run to many kilobytes. The result keeps its start and drops the rest.
test('a long reflect error shows its first 300 characters, and the rest is cut', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  stubHaiku(on, 'Need: n\nRecall: q\nPage: none\nContext: c\nReflect: why')
  const HEAD = 'Error code: 402 - out of credits. '
  const LONG = HEAD + 'x'.repeat(400) + 'TAIL-MARK' + 'y'.repeat(9000)
  on('mcp.call', (_$: any, e: any) => {
    if (e.tool === 'reflect') return { value: { content: [{ type: 'text', text: LONG }], isError: true } }
    return mcpBody({ results: [] })
  })
  const { value, error } = await settle(async () => $.tool.call({ tool: 'mcp__cobuilder-memory__consult' } as any))
  expect(error).toBe('')
  const text = String(value?.result ?? '')
  expect(text.includes(HEAD)).toBe(true)
  expect(text.includes('TAIL-MARK')).toBe(false)
  expect(text.length < 4000).toBe(true)
})

test('a long refusal is cut, and the allow rule hint still shows', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  stubHaiku(on, 'Need: n\nRecall: q')
  const REFUSAL = 'Blocked by the auto mode classifier: ' + 'z'.repeat(2000)
  on('mcp.call', (_$: any, e: any) => {
    if (e.tool === 'recall') return { deny: REFUSAL }
    return mcpBody({ results: [] })
  })
  const { value } = await settle(async () => $.tool.call({ tool: 'mcp__cobuilder-memory__consult' } as any))
  const text = String(value?.result ?? '')
  expect(text.includes('z'.repeat(1000))).toBe(false)
  expect(text.includes('Add "mcp__hindsight__recall" to permissions.allow in your settings.')).toBe(true)
})
