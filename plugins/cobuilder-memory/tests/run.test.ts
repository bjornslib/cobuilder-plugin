import { expect, test } from 'claude-code/testing'
import { HOW_TO_JUDGE } from '../hooks/result'
import { mcpBody, rawHit, settle, stubHaiku, stubHaikuSteps, stubRepo, stubSession, stubStore, USAGE } from './fakes'

// Haiku's reply is awaited through the engine's timers, so the global setTimeout is declared here
declare const setTimeout: (fn: (...args: any[]) => void, ms: number) => unknown

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

// Slice 2 cases. Haiku answers twice: step 1 writes the Need and Recall lines,
// step 2 picks the page. Each Hindsight call goes through the mcp.call stub below.

const BANK = 'coding-agent-think-with-ai'
const KEPT = 'KEPT-RECORD-MARK'
const SEARCH_HIT = { id: 'page-1', name: 'ADR index', snippet: 'the ADR list', updated_at: '2026-09-20T08:00:00Z' }
const PAGE_MARKDOWN = '---\nid: page-1\ntags: frontmatter-marker\n---\n\nPAGE BODY MARK\nsecond line'
const PAGE = { id: 'page-1', name: 'ADR index', markdown: PAGE_MARKDOWN, timestamp: '2026-09-20T08:00:00Z' }
const STEP1 = 'Need: NEED-MARK\nRecall: recall-query-xyz'

type Reply = (e: any) => any

// Answers each Hindsight call with its reply, and records every call. A tool with no reply answers with no results.
function stubHindsight(on: any, calls: any[], replies: Record<string, Reply>) {
  on('mcp.call', async (_$: any, e: any) => {
    calls.push(e)
    const reply = replies[e.tool]
    return reply ? await reply(e) : mcpBody({ results: [] })
  })
}

// The default answers: one kept record, one search hit, and the page
function defaults(over: Record<string, Reply> = {}): Record<string, Reply> {
  return {
    recall: () => mcpBody({ results: [rawHit(KEPT, 'gitlog:repo')] }),
    search_knowledge_base: () => mcpBody({ results: [SEARCH_HIT] }),
    get_knowledge_page: () => mcpBody(PAGE),
    ...over,
  }
}

// Runs the consult tool and returns its result text. A missing tool hook fails on an assertion.
async function consult($: any): Promise<{ text: string; error: string }> {
  const { value, error } = await settle(async () => $.tool.call({ tool: 'mcp__cobuilder-memory__consult' } as any))
  return { text: String(value?.result ?? ''), error }
}

test('the memory run searches the knowledge base with the Recall line, and recall and search start before either ends', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  stubHaikuSteps(on, [STEP1, 'Page: none'])
  const calls: any[] = []
  const events: string[] = []
  const slow = (name: string) => async () => {
    events.push('start:' + name)
    await new Promise((r) => setTimeout(r, 20))
    events.push('end:' + name)
    return mcpBody({ results: [] })
  }
  stubHindsight(on, calls, defaults({ recall: slow('recall'), search_knowledge_base: slow('search_knowledge_base') }))

  const { error } = await consult($)
  expect(error).toBe('')

  const search = calls.find((c) => c.tool === 'search_knowledge_base')
  expect(search !== undefined).toBe(true)
  expect(search.server).toBe('hindsight')
  expect(search.args).toEqual({ query: 'recall-query-xyz', bank_id: BANK, limit: 5 })

  // Both calls start before the first one finishes
  const firstEnd = events.findIndex((ev) => ev.startsWith('end:'))
  expect(firstEnd > -1).toBe(true)
  expect(events.indexOf('start:recall') < firstEnd).toBe(true)
  expect(events.indexOf('start:search_knowledge_base') < firstEnd).toBe(true)
})

test('Haiku step 2 reads the Need line, the recall query, the kept records, and each named page with its date and snippet', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  const prompts = stubHaikuSteps(on, ['Need: NEED-MARK\nRecall: recall-query-xyz', 'Page: none'])
  stubHindsight(
    on,
    [],
    defaults({
      search_knowledge_base: () =>
        mcpBody({
          results: [
            { id: 'page-1', name: 'PAGE-SHOWN-MARK', snippet: 'SNIPPET-SHOWN-MARK', updated_at: '2026-09-20T08:00:00Z' },
            { id: 'page-2', name: 'PAGE-EMPTY-MARK', snippet: '', updated_at: '2026-09-21T08:00:00Z' },
            { id: 'page-3', name: 'PAGE-PENDING-MARK', snippet: 'Generating content...', updated_at: '2026-09-22T08:00:00Z' },
          ],
        }),
    }),
  )

  const { error } = await consult($)
  expect(error).toBe('')
  expect(prompts.length).toBeGreaterThanOrEqual(2)
  const second = String(prompts[1] ?? '')
  expect(second.includes('NEED-MARK')).toBe(true)
  expect(second.includes('recall-query-xyz')).toBe(true)
  expect(second.includes(KEPT)).toBe(true)
  expect(second.includes('PAGE-SHOWN-MARK')).toBe(true)
  expect(second.includes('2026-09-20')).toBe(true)
  expect(second.includes('SNIPPET-SHOWN-MARK')).toBe(true)
  // A hit with an empty snippet, or with the pending snippet, never reaches Haiku
  expect(second.includes('PAGE-EMPTY-MARK')).toBe(false)
  expect(second.includes('PAGE-PENDING-MARK')).toBe(false)
})

test('a picked page is read by id, and its name, date, and body without frontmatter show after the recall section', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  stubHaikuSteps(on, [STEP1, 'Page: page-1\nContext: c'])
  const calls: any[] = []
  stubHindsight(on, calls, defaults())

  const { text, error } = await consult($)
  expect(error).toBe('')

  const reads = calls.filter((c) => c.tool === 'get_knowledge_page')
  expect(reads.length).toBe(1)
  expect(reads[0].server).toBe('hindsight')
  expect(reads[0].args).toEqual({ page_id: 'page-1', bank_id: BANK })

  expect(text.includes('ADR index')).toBe(true)
  expect(text.includes('2026-09-20')).toBe(true)
  expect(text.includes('PAGE BODY MARK')).toBe(true)
  expect(text.includes('second line')).toBe(true)
  expect(text.includes('frontmatter-marker')).toBe(false)

  // The page section comes after the recall section
  const recallAt = text.indexOf(KEPT)
  const pageAt = text.indexOf('Knowledge page:')
  expect(recallAt > -1).toBe(true)
  expect(pageAt > recallAt).toBe(true)
})

test('a page id that the search did not return is refused, and no page call is made', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  stubHaikuSteps(on, [STEP1, 'Page: page-9\nContext: c'])
  const calls: any[] = []
  stubHindsight(on, calls, defaults())

  const { text, error } = await consult($)
  expect(error).toBe('')
  // The search runs first, so the refusal is judged against its results
  expect(calls.some((c) => c.tool === 'search_knowledge_base')).toBe(true)
  expect(calls.some((c) => c.tool === 'get_knowledge_page')).toBe(false)
  expect(text.includes('Knowledge page: none picked.')).toBe(true)
})

test('Haiku picks no page with "Page: none", so no page call is made', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  stubHaikuSteps(on, [STEP1, 'Page: none\nContext: c'])
  const calls: any[] = []
  stubHindsight(on, calls, defaults())

  const { text, error } = await consult($)
  expect(error).toBe('')
  expect(calls.some((c) => c.tool === 'search_knowledge_base')).toBe(true)
  expect(calls.some((c) => c.tool === 'get_knowledge_page')).toBe(false)
  expect(text.includes('Knowledge page: none picked.')).toBe(true)
})

test('a picked page with an empty body after its frontmatter says the page is empty', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  stubHaikuSteps(on, [STEP1, 'Page: page-1\nContext: c'])
  stubHindsight(
    on,
    [],
    defaults({
      get_knowledge_page: () =>
        mcpBody({ id: 'page-1', name: 'EMPTY-PAGE-NAME', markdown: '---\nid: page-1\n---\n', timestamp: '2026-09-20T08:00:00Z' }),
    }),
  )

  const { text, error } = await consult($)
  expect(error).toBe('')
  expect(text.includes('Knowledge page: EMPTY-PAGE-NAME is empty.')).toBe(true)
})

test('a page body longer than 6,000 characters is cut to 6,000 characters', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  stubHaikuSteps(on, [STEP1, 'Page: page-1\nContext: c'])
  stubHindsight(
    on,
    [],
    defaults({
      get_knowledge_page: () =>
        mcpBody({
          id: 'page-1',
          name: 'ADR index',
          markdown: '---\nid: page-1\n---\n\n' + 'Q'.repeat(7000),
          timestamp: '2026-09-20T08:00:00Z',
        }),
    }),
  )

  const { text, error } = await consult($)
  expect(error).toBe('')
  // The longest run of Q in the result is the shown body
  const runs = (text.match(/Q+/g) ?? []).map((s) => s.length)
  expect(Math.max(0, ...runs)).toBe(6000)
})

test('a failed second Haiku call still shows the recall section, and its reason shows in place of the page section', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  // Call 1 answers the Need and Recall lines. Call 2 fails with the reason.
  let modelCalls = 0
  on('model.complete', () => {
    modelCalls++
    if (modelCalls === 1) return { value: { isAnswered: true, text: 'Need: n\nRecall: q', usage: USAGE } }
    return { deny: 'model timeout' }
  })
  const calls: any[] = []
  stubHindsight(on, calls, defaults())

  const { text, error } = await consult($)
  expect(error).toBe('')
  expect(text.includes(KEPT)).toBe(true)
  expect(text.includes('model timeout')).toBe(true)
  expect(calls.some((c) => c.tool === 'get_knowledge_page')).toBe(false)

  // The reason sits after the recall record, in the page section
  const recallAt = text.indexOf(KEPT)
  const pageAt = text.indexOf('Knowledge page:')
  const reasonAt = text.indexOf('model timeout')
  expect(pageAt > recallAt).toBe(true)
  expect(reasonAt > pageAt).toBe(true)
})

test('a failed page search still shows the recall section, and its reason shows in the page section', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  stubHaikuSteps(on, [STEP1, 'Page: page-1\nContext: c'])
  const calls: any[] = []
  stubHindsight(
    on,
    calls,
    defaults({ search_knowledge_base: () => ({ deny: 'the search timed out after 60 s' }) }),
  )

  const { text, error } = await consult($)
  expect(error).toBe('')
  expect(text.includes(KEPT)).toBe(true)
  expect(text.includes('the search timed out after 60 s')).toBe(true)

  // The reason sits after the recall record, and inside the page section
  const recallAt = text.indexOf(KEPT)
  const pageAt = text.indexOf('Knowledge page:')
  const reasonAt = text.indexOf('the search timed out after 60 s')
  expect(pageAt > recallAt).toBe(true)
  expect(reasonAt > pageAt).toBe(true)
  expect(calls.some((c) => c.tool === 'get_knowledge_page')).toBe(false)
})

// Slice 3 cases. Haiku's second call writes the page pick, the Context line, and up to three Reflect lines.
// Each reflect call goes through the mcp.call stub, the same as the other Hindsight calls.

const REFLECT_OK = (text: string) => () => mcpBody({ text })

// Runs the consult tool and returns the reflect calls in the order the plugin made them
function reflectCalls(calls: any[]): any[] {
  return calls.filter((c) => c.tool === 'reflect')
}

test('a Reflect line becomes one reflect call, for the first question, with the Context line and the contract arguments', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  stubHaikuSteps(on, [STEP1, 'Page: none\nContext: the moment decision\nReflect: why was the router cut\nReflect: what failed with the subagent'])
  const calls: any[] = []
  stubHindsight(on, calls, defaults({ reflect: REFLECT_OK('REFLECT-ANSWER') }))

  const { error } = await consult($)
  expect(error).toBe('')

  const reflects = reflectCalls(calls)
  expect(reflects.length).toBe(1)
  expect(reflects[0].server).toBe('hindsight')
  // The plugin adds no text to the question or the context. The one call carries the first question.
  expect(reflects[0].args).toEqual({
    query: 'why was the router cut',
    context: 'the moment decision',
    bank_id: BANK,
    budget: 'low',
    max_tokens: 1500,
  })
})

test('five Reflect lines make one reflect call, for the first question', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  stubHaikuSteps(on, [
    STEP1,
    'Page: none\nContext: c\nReflect: question one\nReflect: question two\nReflect: question three\nReflect: question four\nReflect: question five',
  ])
  const calls: any[] = []
  stubHindsight(on, calls, defaults({ reflect: REFLECT_OK('REFLECT-ANSWER') }))

  const { error } = await consult($)
  expect(error).toBe('')

  const queries = reflectCalls(calls).map((c) => c.args.query)
  expect(queries).toEqual(['question one'])
})

test('zero Reflect lines make no reflect call, and the result still shows the recall section', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  stubHaikuSteps(on, [STEP1, 'Page: none\nContext: c'])
  const calls: any[] = []
  stubHindsight(on, calls, defaults({ reflect: REFLECT_OK('REFLECT-ANSWER') }))

  const { text, error } = await consult($)
  expect(error).toBe('')
  expect(reflectCalls(calls).length).toBe(0)
  expect(text.includes(KEPT)).toBe(true)
  expect(text.includes('1 recall, 0 reflects')).toBe(true)
})

test('the page read and the one reflect call all start before either ends', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  stubHaikuSteps(on, [STEP1, 'Page: page-1\nContext: c\nReflect: question one\nReflect: question two'])
  const calls: any[] = []
  const events: string[] = []
  // Only the page read and the reflect calls take time, so only they write events
  const slow = (name: string, reply: Reply) => async (e: any) => {
    events.push('start:' + name)
    await new Promise((r) => setTimeout(r, 20))
    events.push('end:' + name)
    return reply(e)
  }
  stubHindsight(
    on,
    calls,
    defaults({
      get_knowledge_page: slow('page', () => mcpBody(PAGE)),
      reflect: slow('reflect', REFLECT_OK('REFLECT-ANSWER')),
    }),
  )

  const { error } = await consult($)
  expect(error).toBe('')
  expect(reflectCalls(calls).length).toBe(1)
  expect(calls.some((c) => c.tool === 'get_knowledge_page')).toBe(true)

  const firstEnd = events.findIndex((ev) => ev.startsWith('end:'))
  expect(firstEnd > -1).toBe(true)
  expect(events.indexOf('start:page') > -1 && events.indexOf('start:page') < firstEnd).toBe(true)
  expect(events.filter((ev) => ev === 'start:reflect').length).toBe(1)
  const reflectStarts = events.map((ev, i) => (ev === 'start:reflect' ? i : -1)).filter((i) => i > -1)
  for (const at of reflectStarts) expect(at < firstEnd).toBe(true)
})

test('the result lists the Context line, then the one question followed by its answer, and no second question', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  stubHaikuSteps(on, [STEP1, 'Page: page-1\nContext: CONTEXT-MARK\nReflect: QUESTION-ONE-MARK\nReflect: QUESTION-TWO-MARK'])
  const calls: any[] = []
  stubHindsight(
    on,
    calls,
    defaults({
      reflect: (e: any) =>
        mcpBody({ text: e.args.query === 'QUESTION-ONE-MARK' ? 'ANSWER-ONE-MARK' : 'ANSWER-TWO-MARK' }),
    }),
  )

  const { text, error } = await consult($)
  expect(error).toBe('')
  expect(text.includes('1 recall, 1 reflect. ')).toBe(true)
  // The second Reflect line is never asked, so its question never shows
  expect(text.includes('QUESTION-TWO-MARK')).toBe(false)

  // The page section comes first, then the context, then the one question with its answer
  const pageAt = text.indexOf('PAGE BODY MARK')
  const contextAt = text.indexOf('CONTEXT-MARK')
  const q1 = text.indexOf('QUESTION-ONE-MARK')
  const a1 = text.indexOf('ANSWER-ONE-MARK')
  expect(pageAt > -1).toBe(true)
  expect(contextAt > pageAt).toBe(true)
  expect(q1 > contextAt).toBe(true)
  expect(a1 > q1).toBe(true)
})

test('a reflect call that fails shows its reason in place of its answer, and the recall and page sections still show', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  stubHaikuSteps(on, [STEP1, 'Page: page-1\nContext: c\nReflect: QUESTION-FAILS-MARK'])
  const calls: any[] = []
  stubHindsight(on, calls, defaults({ reflect: () => ({ deny: 'MCP error -32001: Request timed out' }) }))

  const { text, error } = await consult($)
  expect(error).toBe('')
  expect(reflectCalls(calls).length).toBe(1)
  expect(text.includes('1 recall, 1 reflect. ')).toBe(true)
  expect(text.includes('MCP error -32001: Request timed out')).toBe(true)
  // The reason sits after its own question
  const failAt = text.indexOf('QUESTION-FAILS-MARK')
  const reasonAt = text.indexOf('MCP error -32001: Request timed out')
  expect(failAt > -1 && reasonAt > failAt).toBe(true)
  // The recall and page sections still show
  expect(text.includes(KEPT)).toBe(true)
  expect(text.includes('PAGE BODY MARK')).toBe(true)
})

test("Haiku's second-call prompt names the kept records' text and the recall query", async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  const prompts = stubHaikuSteps(on, [STEP1, 'Page: none\nContext: c\nReflect: q'])
  stubHindsight(on, [], defaults({ reflect: REFLECT_OK('REFLECT-ANSWER') }))

  const { error } = await consult($)
  expect(error).toBe('')
  expect(prompts.length).toBeGreaterThanOrEqual(2)
  const second = String(prompts[1] ?? '')
  expect(second.includes(KEPT)).toBe(true)
  expect(second.includes('recall-query-xyz')).toBe(true)
})

test('a reflect that answers with an error body shows the error in place of its answer, and the count still shows', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  stubHaikuSteps(on, [STEP1, 'Page: page-1\nContext: c\nReflect: QUESTION-QUOTA-MARK'])
  stubHindsight(on, [], defaults({ reflect: () => mcpBody({ error: 'Error code: 429 - quota used', text: '' }) }))

  const { text, error } = await consult($)
  expect(error).toBe('')
  // The reason sits after its own question, in place of its answer
  const questionAt = text.indexOf('QUESTION-QUOTA-MARK')
  const reasonAt = text.indexOf('Error code: 429 - quota used')
  expect(questionAt > -1 && reasonAt > questionAt).toBe(true)
  expect(text.includes('1 recall, 1 reflect. ')).toBe(true)
})

test('a reflect reply that is plain text shows that text as its reason, and no JSON parse error', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  stubHaikuSteps(on, [STEP1, 'Page: none\nContext: c\nReflect: QUESTION-PLAIN-MARK'])
  stubHindsight(
    on,
    [],
    defaults({
      reflect: () => ({ value: { content: [{ type: 'text', text: 'MCP error -32001: Request timed out' }], isError: false } }),
    }),
  )

  const { text, error } = await consult($)
  expect(error).toBe('')
  expect(text.includes('MCP error -32001: Request timed out')).toBe(true)
  expect(text.includes('JSON Parse error')).toBe(false)
  // The text is the reason of its own question, so it follows the question
  const questionAt = text.indexOf('QUESTION-PLAIN-MARK')
  const reasonAt = text.indexOf('MCP error -32001: Request timed out')
  expect(questionAt > -1 && reasonAt > questionAt).toBe(true)
})

test('recall records with the same text show once, the first one is kept, and the header counts the repeats', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on, [])
  stubHaiku(on, 'Need: n\nRecall: q')
  on('mcp.call', (_$: any, e: any) => {
    if (e.tool === 'recall') {
      return mcpBody({
        results: [
          rawHit('Slice 6 deletes current_columns.', 'plan:a'),
          rawHit('ADR-0010 makes the room the source.', 'adr:10'),
          rawHit('  slice 6   deletes CURRENT_COLUMNS. ', 'plan:b'),
          rawHit('Slice 6 deletes current_columns.', 'plan:c'),
        ],
      })
    }
    return mcpBody({ results: [] })
  })

  const { value, error } = await settle(async () => $.tool.call({ tool: 'mcp__cobuilder-memory__consult' } as any))
  expect(error).toBe('')
  const text = String(value?.result ?? '')

  expect(text).toContain('Results: 4, dropped from this session: 0, repeats dropped: 2, shown: 2.')
  expect(text).toContain('1. [2026-10-01] Slice 6 deletes current_columns. (plan:a)')
  expect(text).toContain('2. [2026-10-01] ADR-0010 makes the room the source. (adr:10)')
  expect(text).not.toContain('(plan:b)')
  expect(text).not.toContain('(plan:c)')
})
