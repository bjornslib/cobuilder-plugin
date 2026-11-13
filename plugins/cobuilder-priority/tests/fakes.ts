// Shared stubs for the cobuilder-priority tests. The runner reads *.test.ts only,
// so this file holds no test cases.

export const OPTIONS = { priority_dev_dir: '/work/priority-dev', program: 'probes/programs/d1.json', timeout_seconds: 120 }

export const DONE = {
  status: 'waiting_answer',
  needs_human: true,
  priority: 'can_wait',
  steps: [{ kind: 'ask_human', questions: ['Ship it now?'] }, { kind: 'notify', message: 'Tests pass.' }],
  abstain: null,
}

export const DIGESTED = { ran: 'The agent ran the tests.', result: 'All pass.', open_items: [], decisions: [] }

// A reading in the real step shapes of priority-dev/src/priority/interpreter/models.py.
export const ACTIONABLE = {
  status: 'blocked',
  needs_human: true,
  priority: 'P1',
  steps: [
    { kind: 'reply', text: 'Run the migration before the tests.' },
    { kind: 'continue_until', goal: 'tests pass', proof: { kind: 'agent_shows', command: 'npm test', show: '' }, max_turns: 5, max_minutes: 20 },
    {
      kind: 'ask_human',
      why_escalated: '',
      detail: { role: 'decide', questions: [{ ask: 'Which store keeps the marks?', options: [{ label: '$.store', detail: '' }, { label: 'a JSONL file', detail: '' }], multi_select: false, free_text: true, helps: [] }] },
    },
    { kind: 'approve_permission', scope: 'session' },
    { kind: 'interrupt' },
  ],
  abstain: null,
}

// The ACTIONABLE steps, with a waiting status. The pane must name the status and the priority.
export const WAITING = { ...ACTIONABLE, status: 'waiting_answer' }

// An interpret result that abstains because the agent gave no reply.
export const NO_REPLY = { status: null, needs_human: null, priority: null, steps: [], abstain: { reason: 'no_agent_reply' } }

// The drawn tree as plain data. A node keeps its key in `key` or in `props.key`.
export type Node = { type?: string; key?: string; props?: Record<string, any>; children?: unknown[] }

const isNode = (x: unknown): x is Node => typeof x === 'object' && x !== null

export const keyOfNode = (n: Node): string | undefined => n.key ?? n.props?.key

export const childNodes = (n: Node): Node[] => (Array.isArray(n.children) ? n.children.filter(isNode) : [])

// Every node under `n`, `n` first, in document order.
export const walk = (n: Node): Node[] => [n, ...childNodes(n).flatMap(walk)]

export const nodeByKey = (root: Node, key: string): Node | undefined => walk(root).find((n) => keyOfNode(n) === key)

export const parentOfKey = (root: Node, key: string): Node | undefined =>
  walk(root).find((n) => childNodes(n).some((c) => keyOfNode(c) === key))

// Records each prompt.submit and prompt.fill. `filled` false makes the box refuse the text.
export function stubPrompt(on: any, filled = true) {
  const sent: { how: 'submit' | 'fill'; text: string; asUser?: boolean; mode?: string }[] = []
  on('prompt.submit', (_$: any, e: any) => { sent.push({ how: 'submit', text: e.text, asUser: e.origin?.asUser ?? e.asUser }); return { text: e.text } })
  on('prompt.fill', (_$: any, e: any) => { sent.push({ how: 'fill', text: e.text, mode: e.mode }); return { isFilled: filled } })
  return sent
}

export type Call = { argv: string[]; cwd?: string; env?: Record<string, string>; timeoutMs?: number }

// Each process.run answers from `answers` in order. The last answer repeats.
// An answer that is an Error rejects the call. `gate` holds every call until it resolves.
export function stubProcess(on: any, answers: (object | Error)[], gate?: Promise<void>) {
  const calls: Call[] = []
  on('process.run', async (_$: any, e: any) => {
    calls.push({ argv: [...e.argv], cwd: e.init?.cwd, env: e.init?.env, timeoutMs: e.init?.timeoutMs })
    if (gate) await gate
    const answer = answers[Math.min(calls.length - 1, answers.length - 1)]
    if (answer instanceof Error) return { deny: answer.message }
    return { value: { exitCode: 0, stdout: JSON.stringify(answer), stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  return calls
}

export function stubStore(on: any) {
  const data = new Map<string, unknown>()
  on('store.get', (_$: any, e: any) => ({ value: data.get(e.key) }))
  on('store.set', (_$: any, e: any) => { data.set(e.key, e.value); return { value: undefined } })
  on('store.delete', (_$: any, e: any) => { data.delete(e.key); return { value: undefined } })
  return data
}

// Returns the status lines that the module set, in order.
export function stubEngine(on: any, opts: { commands?: boolean } = {}) {
  const statuses: (string | undefined)[] = []
  if (opts.commands !== false) on('command.register', (_$: any, e: any) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.toast', () => ({ value: undefined }))
  on('ui.status', (_$: any, e: any) => { statuses.push(e.text); return { value: undefined } })
  on('session.start', (_$: any, e: any) => ({ cwd: e.cwd }))
  on('command.run', () => ({ text: '' }))
  on('classic.Stop', () => ({}))
  return statuses
}

// Lets unawaited work finish: the reader runs after the Stop hook returns.
export async function drain(rounds = 200) {
  for (let i = 0; i < rounds; i++) await Promise.resolve()
}

export async function waitFor(check: () => boolean, rounds = 50) {
  for (let i = 0; i < rounds && !check(); i++) await drain()
  await drain() // the reader writes the redraw tick after the store
}

export const PANE = {
  plugin: 'cobuilder-priority',
  component: 'Pane',
  requestId: 'priority-reader',
  props: { title: 'Priority reader', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
} as const

// Starts a session, turns the reader on, and runs `count` stops to stored readings.
// The store carries `sent`, the prompts that the module submitted or filled.
export async function readings($: any, on: any, answers: object[] = [DIGESTED, DONE], count = 1, filled = true) {
  stubEngine(on)
  on('session.id', () => ({ value: 'S1' }))
  const store = Object.assign(stubStore(on), { sent: stubPrompt(on, filled) })
  stubProcess(on, answers)
  await $.session.start({ cwd: '/work/app', surface: 'terminal', isInteractive: true })
  await $.command.run({ command: 'priority-on' })
  for (let i = 1; i <= count; i++) {
    await stop($)
    await waitFor(() => ((store.get('readings:S1') as unknown[]) ?? []).length >= i)
  }
  return store
}

export function stop($: any, session = 'S1') {
  return $.classic.Stop({ session_id: session, transcript_path: `/home/me/.claude/projects/x/${session}.jsonl`, cwd: '/work/app', stop_hook_active: false })
}
