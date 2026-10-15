import { expect, mock, test } from 'claude-code/testing'
import { HOW_TO_JUDGE } from '../hooks/result'
import { mcpBody, rawHit, settle, stubRepo, stubSession, stubStore, USAGE } from './fakes'

// Haiku's reply is awaited through the engine's timers, so the global setTimeout is declared here
declare const setTimeout: (fn: (...args: any[]) => void, ms: number) => unknown

// Slice 4 cases: the memory pane. Each run opens the pane, the pane draws the run's state,
// and a refused open never stops the run. Every case fails on an assertion until pane.tsx exists.

const PANE_TITLE = '🧠 Hindsight: CoBuilder Memory Run'
const EMPTY = 'No memory run yet. The agent or /memory-recall starts one.'
const NO_BANK = 'No bank: this folder is not in a git repository.'
const LAST_LINE = 'The full result went to the agent.'
const NEED = 'NEED-PANE-MARK'
const KEPT = 'KEPT-RECORD-MARK'
const Q_OK = 'QUESTION-OK-MARK'
const Q_FAIL = 'QUESTION-FAIL-MARK'
const REASON = 'MCP error -32001: Request timed out'
const STEP1 = 'Need: ' + NEED + '\nRecall: recall-query-xyz'
const PLAN = 'Page: page-1\nContext: c\nReflect: ' + Q_OK
const SEARCH_HIT = { id: 'page-1', name: 'ADR index', snippet: 'the ADR list', updated_at: '2026-09-20T08:00:00Z' }
const PAGE = { id: 'page-1', name: 'ADR index', markdown: '---\nid: page-1\n---\n\nPAGE BODY\n', timestamp: '2026-09-20T08:00:00Z' }
const VIEWPORT = { columns: 120, rows: 40 }

type Reply = (e: any) => any

// The Hindsight answers: one kept record, one page hit, the page, and a reflect answer
function defaults(over: Record<string, Reply> = {}): Record<string, Reply> {
  return {
    recall: () => mcpBody({ results: [rawHit(KEPT, 'gitlog:repo')] }),
    search_knowledge_base: () => mcpBody({ results: [SEARCH_HIT] }),
    get_knowledge_page: () => mcpBody(PAGE),
    reflect: () => mcpBody({ text: 'ANSWER-OK-MARK' }),
    ...over,
  }
}

function stubHindsight(on: any, replies: Record<string, Reply>) {
  on('mcp.call', async (_$: any, e: any) => {
    const reply = replies[e.tool]
    return reply ? await reply(e) : mcpBody({ results: [] })
  })
}

// Haiku answers in order, and every model call adds 'haiku' to the shared order list.
// The call at index hold.at waits until the test releases it.
function stubModel(on: any, order: string[], texts: string[], hold?: { at: number; wait: () => Promise<void> }) {
  let calls = 0
  on('model.complete', async () => {
    order.push('haiku')
    const i = calls++
    if (hold && i === hold.at) await hold.wait()
    const text = texts[Math.min(i, texts.length - 1)]
    return { value: { isAnswered: true, text, usage: USAGE } }
  })
}

// A call that stays open until the test releases it. It says when the call reaches it.
function gate() {
  let started!: () => void
  let release!: () => void
  const startedP = new Promise<void>((r) => (started = r))
  const releaseP = new Promise<void>((r) => (release = r))
  return {
    startedP,
    release,
    wait: async () => {
      started()
      await releaseP
    },
  }
}

// The text of the step row that names the step. Rows with a later step's name are not this row.
async function stepRow(ui: any, name: string, later: string[]): Promise<string> {
  return leaves(rowOf(await ui.drawn(), name, later)).join('\n')
}

// The pane open: each call adds 'open' to the shared order list, and the answer is the test's choice
function stubOpen(on: any, order: string[], opens: any[], answer: (e: any) => any = () => ({ value: { isPlaced: true } })) {
  on('ui.open', (_$: any, e: any) => {
    order.push('open')
    opens.push(e)
    return answer(e)
  })
}

// Runs the consult tool. A missing tool hook fails on an assertion, not on a thrown error.
async function consult($: any): Promise<{ text: string; error: string }> {
  const { value, error } = await settle(async () => $.tool.call({ tool: 'mcp__cobuilder-memory__consult' } as any))
  return { text: String(value?.result ?? ''), error }
}

// Mounts the memory pane as the render hook sees it: id memory-run, on a 120-column terminal
async function mountPane($: any): Promise<any> {
  const { value, error } = await settle(async () =>
    $.ui.mount({
      plugin: 'cobuilder-memory',
      surface: 'terminal',
      component: 'Pane',
      props: {} as any,
      requestId: 'memory-run',
      viewport: VIEWPORT,
    } as any),
  )
  expect(error).toBe('')
  return value
}

async function hasText(ui: any, text: string): Promise<boolean> {
  return Boolean(await ui.find({ type: 'Text', text }))
}

// A reflect call that stays open until the test releases it, and says when it starts
function holdReflect() {
  let started!: () => void
  let release!: () => void
  const startedP = new Promise<void>((r) => (started = r))
  const releaseP = new Promise<void>((r) => (release = r))
  const reply = async () => {
    started()
    await releaseP
    return mcpBody({ text: 'ANSWER-OK-MARK' })
  }
  return { startedP, release, reply }
}

// Resolves when p resolves, or after ms, so a missing call fails on an assertion instead of hanging
function waitOr(p: Promise<void>, ms: number): Promise<void> {
  return Promise.race([p, new Promise<void>((r) => setTimeout(r, ms))])
}

// Every string under a node, in order
function leaves(node: any): string[] {
  if (typeof node === 'string') return [node]
  if (node && typeof node === 'object') return Object.values(node).flatMap(leaves)
  return []
}

// The largest object that holds the marker and none of the other markers: one reflect row
function rowOf(node: any, marker: string, others: string[]): any {
  if (node === null || typeof node !== 'object') return undefined
  const all = leaves(node).join('\n')
  if (!all.includes(marker)) return undefined
  if (!others.some((o) => all.includes(o))) return node
  for (const child of Object.values(node)) {
    const hit = rowOf(child, marker, others)
    if (hit !== undefined) return hit
  }
  return undefined
}

test('a consult run opens the memory pane as memory-run before the first model call', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  const order: string[] = []
  const opens: any[] = []
  stubOpen(on, order, opens)
  stubModel(on, order, [STEP1, PLAN])
  stubHindsight(on, defaults())

  const { error } = await consult($)
  expect(error).toBe('')
  expect(opens.length).toBe(1)
  expect(opens[0].id).toBe('memory-run')
  expect(opens[0].title).toBe(PANE_TITLE)
  expect(order.indexOf('open') >= 0).toBe(true)
  expect(order.indexOf('open') < order.indexOf('haiku')).toBe(true)
})

// Gap: PaneOpenArgs has no asked field. The engine tells an asked open from the command or prompt
// behind it, and a hook argument does not show it. This case checks the two opens only.
test('a memory-recall command run and a consult run each open the memory pane', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  const order: string[] = []
  const opens: any[] = []
  stubOpen(on, order, opens)
  stubModel(on, order, [STEP1, PLAN])
  stubHindsight(on, defaults())

  const command = await settle(async () => $.command.run({ command: 'memory-recall', args: '' } as any))
  expect(command.error).toBe('')
  expect(opens.length).toBe(1)
  expect(opens[0].id).toBe('memory-run')
  // The engine decides asked from the person's command behind the open (ui.open doc: "Asked, the
  // person's command, prompt or press behind it ... placed at any width"). The plugin passes no asked
  // field. The open is made inside the command, before the first Haiku call.
  expect(order.indexOf('open') >= 0).toBe(true)
  expect(order.indexOf('open') < order.indexOf('haiku')).toBe(true)

  const { error } = await consult($)
  expect(error).toBe('')
  expect(opens.length).toBe(2)
  expect(opens[1].id).toBe('memory-run')
  expect(opens[1].title).toBe(PANE_TITLE)
})

test('with no run yet, the memory pane says that no run has started', async ($, on) => {
  stubStore(on)
  const ui = await mountPane($)
  expect(await hasText(ui, EMPTY)).toBe(true)
})

test('while a run works, the pane shows the Need line and a running step row', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  const order: string[] = []
  stubOpen(on, order, [])
  stubModel(on, order, [STEP1, PLAN])
  const hold = holdReflect()
  stubHindsight(on, defaults({ reflect: hold.reply }))

  const pending = consult($)
  try {
    await waitOr(hold.startedP, 5000)
    const ui = await mountPane($)
    expect(await hasText(ui, NEED)).toBe(true)
    expect(await hasText(ui, '◐')).toBe(true)
  } finally {
    hold.release()
    await pending
  }
})

test('while a run is held, the elapsed time changes when the clock advances', async ($, on) => {
  const clock = mock.clock(on)
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  const order: string[] = []
  stubOpen(on, order, [])
  stubModel(on, order, [STEP1, PLAN])
  const hold = holdReflect()
  stubHindsight(on, defaults({ reflect: hold.reply }))

  const pending = consult($)
  try {
    await waitOr(hold.startedP, 5000)
    const ui = await mountPane($)
    expect(await hasText(ui, '1:05')).toBe(false)
    await clock.advance(65000)
    expect(await hasText(ui, '1:05')).toBe(true)
  } finally {
    hold.release()
    await pending
  }
})

test('after a full run, the pane shows the query, the page, the one reflect row, and the last line', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  const order: string[] = []
  stubOpen(on, order, [])
  stubModel(on, order, [STEP1, PLAN])
  stubHindsight(on, defaults())

  const { error } = await consult($)
  expect(error).toBe('')
  const ui = await mountPane($)
  expect(await hasText(ui, 'recall-query-xyz')).toBe(true)
  expect(await hasText(ui, KEPT)).toBe(true)
  expect(await hasText(ui, 'ADR index')).toBe(true)
  expect(await hasText(ui, '2026-09-20')).toBe(true)

  // The one question shows, and no cross marks an answered reflect
  const all = leaves(await ui.drawn()).join('\n')
  expect(all.includes(Q_OK)).toBe(true)
  expect(all.includes('✗')).toBe(false)

  expect(await hasText(ui, LAST_LINE)).toBe(true)
})

test('after a run whose reflect fails, the pane shows the cross and the reason', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  const order: string[] = []
  stubOpen(on, order, [])
  stubModel(on, order, [STEP1, 'Page: page-1\nContext: c\nReflect: ' + Q_FAIL])
  stubHindsight(on, defaults({ reflect: () => ({ deny: REASON }) }))

  const { error } = await consult($)
  expect(error).toBe('')
  const ui = await mountPane($)
  const all = leaves(await ui.drawn()).join('\n')
  expect(all.includes(Q_FAIL)).toBe(true)
  expect(all.includes('✗')).toBe(true)
  expect(all.includes(REASON)).toBe(true)
})

test('a run outside a git repo leaves the pane in the failed state, with the reason', async ($, on) => {
  stubRepo(on, { exitCode: 128 })
  stubStore(on)
  stubSession(on)
  const order: string[] = []
  stubOpen(on, order, [])
  stubModel(on, order, [STEP1, PLAN])
  stubHindsight(on, defaults())

  const { error } = await consult($)
  expect(error).toBe('')
  const ui = await mountPane($)
  expect(await hasText(ui, NO_BANK)).toBe(true)
  expect(await hasText(ui, EMPTY)).toBe(false)
})

test('the tool result is unchanged by the pane: it starts with the judging rules and the pane title is absent', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  const order: string[] = []
  const opens: any[] = []
  stubOpen(on, order, opens)
  stubModel(on, order, [STEP1, PLAN])
  stubHindsight(on, defaults())

  const { value, error } = await settle(async () => $.tool.call({ tool: 'mcp__cobuilder-memory__consult' } as any))
  expect(error).toBe('')
  expect(opens.length).toBe(1)
  const text = String(value?.result ?? '')
  expect(text.startsWith(HOW_TO_JUDGE)).toBe(true)
  expect(text).toContain('Hindsight memory on coding-agent-think-with-ai: 1 recall, 1 reflect. Haiku read 0 stored prompts.')
  expect(text).toContain('Need: ' + NEED)
  expect(text).toContain(KEPT)
  expect(text.includes(LAST_LINE)).toBe(false)
  expect(text.includes(PANE_TITLE)).toBe(false)
})

test('a refused pane open does not stop the run, and the tool result still reaches the agent', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  const order: string[] = []
  const opens: any[] = []
  stubOpen(on, order, opens, () => ({ deny: 'refused by the test' }))
  stubModel(on, order, [STEP1, PLAN])
  stubHindsight(on, defaults())

  const { text, error } = await consult($)
  expect(opens.length).toBe(1)
  expect(error).toBe('')
  expect(text.startsWith(HOW_TO_JUDGE)).toBe(true)
  expect(text).toContain(KEPT)
  expect(text).toContain('ANSWER-OK-MARK')
})

test('while the query step runs, the pane shows the query row with the running mark', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  const order: string[] = []
  stubOpen(on, order, [])
  const g = gate()
  stubModel(on, order, [STEP1, PLAN], { at: 0, wait: g.wait })
  stubHindsight(on, defaults())

  const pending = consult($)
  try {
    await waitOr(g.startedP, 5000)
    const ui = await mountPane($)
    expect((await stepRow(ui, 'query', ['search', 'questions', 'reflect'])).includes('◐')).toBe(true)
  } finally {
    g.release()
    await pending
  }
})

test('while the search step runs, the query row shows done and the search row shows the running mark', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  const order: string[] = []
  stubOpen(on, order, [])
  stubModel(on, order, [STEP1, PLAN])
  const g = gate()
  stubHindsight(
    on,
    defaults({
      recall: async () => {
        await g.wait()
        return mcpBody({ results: [rawHit(KEPT, 'gitlog:repo')] })
      },
    }),
  )

  const pending = consult($)
  try {
    await waitOr(g.startedP, 5000)
    const ui = await mountPane($)
    expect((await stepRow(ui, 'query', ['search', 'questions', 'reflect'])).includes('✓')).toBe(true)
    expect((await stepRow(ui, 'search', ['questions', 'reflect'])).includes('◐')).toBe(true)
  } finally {
    g.release()
    await pending
  }
})

test('while the questions step runs, the query and search rows show done and the questions row shows the running mark', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  const order: string[] = []
  stubOpen(on, order, [])
  const g = gate()
  // Call index 1 is Haiku's second call, the one that picks the page and writes the questions
  stubModel(on, order, [STEP1, PLAN], { at: 1, wait: g.wait })
  stubHindsight(on, defaults())

  const pending = consult($)
  try {
    await waitOr(g.startedP, 5000)
    const ui = await mountPane($)
    expect((await stepRow(ui, 'query', ['search', 'questions', 'reflect'])).includes('✓')).toBe(true)
    expect((await stepRow(ui, 'search', ['questions', 'reflect'])).includes('✓')).toBe(true)
    expect((await stepRow(ui, 'questions', ['reflect'])).includes('◐')).toBe(true)
  } finally {
    g.release()
    await pending
  }
})

test('after a run ends, the elapsed time stops: advancing the clock leaves the pane unchanged', async ($, on) => {
  const clock = mock.clock(on)
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  const order: string[] = []
  stubOpen(on, order, [])
  stubModel(on, order, [STEP1, PLAN])
  const hold = holdReflect()
  stubHindsight(on, defaults({ reflect: hold.reply }))

  const pending = consult($)
  await waitOr(hold.startedP, 5000)
  await clock.advance(65000)
  hold.release()
  await pending

  const ui = await mountPane($)
  // The run ended at 1:05, and the pane shows that run time
  expect(await hasText(ui, '1:05')).toBe(true)
  const before = JSON.stringify(await ui.drawn())
  await clock.advance(5000)
  expect(JSON.stringify(await ui.drawn())).toBe(before)
  expect(await hasText(ui, '1:10')).toBe(false)
})

// The title row is drawn in every state, so each state mounts the pane and looks for the title
test('the memory pane draws its title row when no run has started', async ($, on) => {
  stubStore(on)
  const ui = await mountPane($)
  expect(await hasText(ui, PANE_TITLE)).toBe(true)
})

test('the memory pane draws its title row while a run works', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  const order: string[] = []
  stubOpen(on, order, [])
  stubModel(on, order, [STEP1, PLAN])
  const hold = holdReflect()
  stubHindsight(on, defaults({ reflect: hold.reply }))

  const pending = consult($)
  try {
    await waitOr(hold.startedP, 5000)
    const ui = await mountPane($)
    expect(await hasText(ui, PANE_TITLE)).toBe(true)
  } finally {
    hold.release()
    await pending
  }
})

test('the memory pane draws its title row after a run is done', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on)
  const order: string[] = []
  stubOpen(on, order, [])
  stubModel(on, order, [STEP1, PLAN])
  stubHindsight(on, defaults())

  const { error } = await consult($)
  expect(error).toBe('')
  const ui = await mountPane($)
  expect(await hasText(ui, PANE_TITLE)).toBe(true)
})

test('the memory pane draws its title row when the run has failed', async ($, on) => {
  stubRepo(on, { exitCode: 128 })
  stubStore(on)
  stubSession(on)
  const order: string[] = []
  stubOpen(on, order, [])
  stubModel(on, order, [STEP1, PLAN])
  stubHindsight(on, defaults())

  const { error } = await consult($)
  expect(error).toBe('')
  const ui = await mountPane($)
  expect(await hasText(ui, PANE_TITLE)).toBe(true)
})
