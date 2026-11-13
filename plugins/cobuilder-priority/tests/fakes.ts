// Shared stubs for the cobuilder-priority tests. The runner reads *.test.ts only,
// so this file holds no test cases.
import { mock } from 'claude-code/testing'

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

// The WAITING steps with a notify step, in the shape of the interpreter's Notify: `excerpt` (E3.9).
export const NOTIFYING = {
  ...WAITING,
  steps: [{ kind: 'reply', text: 'Run the migration before the tests.' }, { kind: 'notify', excerpt: 'Tests pass.' }],
}

// A waiting reading that the person does not need to answer.
export const NO_HUMAN = { ...WAITING, needs_human: false }

// A last agent message in the four labelled parts of this repo's CLAUDE.md (E3.11).
export const LABELLED = [
  '**FYI**',
  'The reader stores each reading.',
  '',
  '**Summary**',
  'The labels now reach the store.',
  '',
  '## Next steps',
  'Run the tests.',
  '',
  'Decisions and questions:',
  'None.',
].join('\n')

// The text of the Summary part of LABELLED.
export const LABELLED_SUMMARY = 'The labels now reach the store.'

// A last agent message with no labelled part.
export const PLAIN = 'The tests pass, so the change can ship.'

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
// An answer that is an Error rejects the call. `gate` holds each call from number `from` (1 by default) until it resolves.
export function stubProcess(on: any, answers: (object | Error)[], gate?: Promise<void>, from = 1) {
  const calls: Call[] = []
  on('process.run', async (_$: any, e: any) => {
    calls.push({ argv: [...e.argv], cwd: e.init?.cwd, env: e.init?.env, timeoutMs: e.init?.timeoutMs })
    if (gate && calls.length >= from) await gate
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

// Returns the status lines that the module set, in order. `opts.toasts` collects the text of each toast.
export function stubEngine(on: any, opts: { commands?: boolean; toasts?: string[] } = {}) {
  const statuses: (string | undefined)[] = []
  if (opts.commands !== false) on('command.register', (_$: any, e: any) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.toast', (_$: any, e: any) => { opts.toasts?.push(e.text); return { value: undefined } })
  on('ui.status', (_$: any, e: any) => { statuses.push(e.text); return { value: undefined } })
  on('session.start', (_$: any, e: any) => ({ cwd: e.cwd }))
  on('command.run', () => ({ text: '' }))
  on('classic.Stop', () => ({}))
  return statuses
}

// The engine's record of this plugin's open panes, which `$.ui.panes()` reads (E3.9).
// `open` says whether the reader pane is up.
export function stubPanes(on: any, open: boolean) {
  const pane = { id: 'priority-reader', title: 'Priority reader', isShown: true, isFocused: false, isPlaced: true }
  on('ui.panes', () => ({ value: open ? [pane] : [] }))
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
// The store carries `sent`, the prompts that the module submitted or filled. `last` is the last agent message of each stop.
export async function readings($: any, on: any, answers: object[] = [DIGESTED, DONE], count = 1, filled = true, last?: string) {
  stubEngine(on)
  on('session.id', () => ({ value: 'S1' }))
  const store = Object.assign(stubStore(on), { sent: stubPrompt(on, filled) })
  stubProcess(on, answers)
  await $.session.start({ cwd: '/work/app', surface: 'terminal', isInteractive: true })
  await $.command.run({ command: 'priority-on' })
  for (let i = 1; i <= count; i++) {
    await stop($, 'S1', last)
    await waitFor(() => ((store.get('readings:S1') as unknown[]) ?? []).length >= i)
  }
  return store
}

// `last` is the last agent message of the stop. Without it the stop carries none.
export function stop($: any, session = 'S1', last?: string) {
  const message = last === undefined ? {} : { last_assistant_message: last }
  return $.classic.Stop({ session_id: session, transcript_path: `/home/me/.claude/projects/x/${session}.jsonl`, cwd: '/work/app', stop_hook_active: false, ...message })
}

// The frames of the running indicator, in order (contracts.md, E3.6).
export const FRAMES = [...'⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏']

// Starts a session with the reader on and a mocked clock. Each process.run call from number `from` on waits for `gate`.
// Returns the store, the prompts sent or filled, the process calls, and the clock that moves the mocked time.
export async function startReader($: any, on: any, answers: (object | Error)[] = [DIGESTED, ACTIONABLE], gate?: Promise<void>, from = 1) {
  stubEngine(on)
  on('session.id', () => ({ value: 'S1' }))
  const store = stubStore(on)
  const sent = stubPrompt(on)
  const clock = mock.clock(on)
  const calls = stubProcess(on, answers, gate, from)
  await $.session.start({ cwd: '/work/app', surface: 'terminal', isInteractive: true })
  await $.command.run({ command: 'priority-on' })
  return { store, sent, calls, clock }
}

// The Text and Button nodes under the node with `key`, in document order. A Box takes no dimColor, so dim is read here.
export const rowsUnder = (root: Node, key: string): Node[] =>
  walk(nodeByKey(root, key) ?? {}).filter((n) => n.type === 'Text' || n.type === 'Button')
