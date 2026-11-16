// Shared stubs and drivers for the E3 question tests (ask, ask-reading, question, frame).
// The runner reads *.test.ts(x) only, so this file holds no test cases.
import { expect } from 'claude-code/testing'
import { DIGESTED, OPTIONS, PANE, stubEngine, stubProcess, stubStore } from './fakes'

// The options of a test that holds a call. The kit cuts a held hook at 10000 ms.
export const HOLD = { options: OPTIONS, timeoutMs: 30000 }

// What the dialog beneath the reader answers when the reader passes a call on.
export const STUB = { result: 'stub answer' }

// The dialog beneath the reader: each call that reaches it is recorded, and it answers STUB.
export function stubTool(on: any) {
  const calls: any[] = []
  on('tool.call', { tool: 'AskUserQuestion' }, (_$: any, e: any) => {
    calls.push(e)
    return STUB
  })
  return calls
}

// The two questions of the card, in the AskUserQuestion input shape. Question 2 is multi-select.
export const ASKED = [
  {
    question: 'Which store keeps the marks?',
    header: 'Store',
    multiSelect: false,
    options: [
      { label: '$.store', description: 'Keeps marks per plugin' },
      { label: 'JSONL file', description: 'One file per session' },
    ],
  },
  {
    question: 'Which checks run on save?',
    header: 'Checks',
    multiSelect: true,
    options: [
      { label: 'Unit', description: 'Fast tests' },
      { label: 'E2E', description: 'Browser tests' },
      { label: 'Lint', description: 'Style checks' },
    ],
  },
]

// The answers of JSONL file, and Unit with E2E pressed in that order.
export const ANSWERS = { 'Which store keeps the marks?': 'JSONL file', 'Which checks run on save?': 'Unit, E2E' }

// The interpret reading of a question stop, in the shape the CLI prints (stop_kind is the CLI's field).
export const QUESTION_READING = { status: 'waiting_answer', needs_human: true, priority: 'P2', steps: [], abstain: null, stop_kind: 'question' }

// The hand-off folder under priority_dev_dir (OPTIONS), as the epic design names it.
export const ASK_DIR = '/work/priority-dev/reports/logs/live/ask/'

// The wait script the child runs. The argv is the one the probe proved live.
export const ASK_SCRIPT = 'until [ -e "$1" ]; do sleep 0.2; done; cat "$2"'

// Waits `ms` of real time. The kit's types leave out the timer; the runtime has it.
declare function setTimeout(callback: () => void, ms: number): unknown
export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

// Polls `check` in real time until it holds or `ms` pass. The check may be async.
export async function settle(check: () => boolean | Promise<boolean>, ms = 4000): Promise<void> {
  const end = Date.now() + ms
  while (!(await check()) && Date.now() < end) await sleep(10)
}

// An in-memory disk under the question tests. Each written path is kept, in the order of the writes.
export function stubWrites(on: any) {
  const files = new Map<string, string>()
  const writes: string[] = []
  on('fs.read', (_$: any, e: any) => (files.has(e.path) ? { value: files.get(e.path) } : { deny: `ENOENT ${e.path}` }))
  on('fs.write', (_$: any, e: any) => {
    files.set(e.path, e.text)
    writes.push(e.path)
    return { value: undefined }
  })
  return { files, writes }
}

// The child that the hold starts. It waits for the done file, then prints the answer file.
// With `exit`, it ends at once with that status, as a failed child does.
export function stubChild(on: any, files: Map<string, string>, exit?: { code: number | null; signal: string | null; stdout?: string }) {
  const calls: any[] = []
  on('process.spawn', async function* (_$: any, e: any) {
    calls.push(e)
    if (exit) {
      if (exit.stdout) yield { stream: 'stdout', text: exit.stdout }
      return { value: { code: exit.code, signal: exit.signal } }
    }
    const [donePath, answerPath] = e.argv.slice(4)
    // The real child prints nothing while it waits. A dot every 4 s keeps this stub's own
    // pull under the 10 s hook budget without flooding the kit's render loop.
    let quiet = 0
    while (!files.has(donePath)) {
      await sleep(20)
      quiet += 20
      if (quiet >= 4000) {
        quiet = 0
        yield { stream: 'stderr', text: '.' }
      }
    }
    yield { stream: 'stdout', text: files.get(answerPath) ?? '' }
    return { value: { code: 0, signal: null } }
  })
  return calls
}

// Starts a session. The reader is on unless `reader` is false. Every stub the question path uses is set here.
// `gate` holds each process.run call from number `from` until it resolves. `exit` ends the child at once.
export async function startAsk(
  $: any,
  on: any,
  opts: { reader?: boolean; exit?: { code: number | null; signal: string | null; stdout?: string }; gate?: Promise<void>; from?: number } = {},
) {
  const opened: { id: string; focus?: boolean }[] = []
  stubEngine(on, { opened })
  on('session.id', () => ({ value: 'S1' }))
  const store = stubStore(on)
  const disk = stubWrites(on)
  const calls = stubProcess(on, [DIGESTED, QUESTION_READING], opts.gate, opts.from ?? 1)
  const spawns = stubChild(on, disk.files, opts.exit)
  const dialog = stubTool(on)
  await $.session.start({ cwd: '/work/app', surface: 'terminal', isInteractive: true })
  if (opts.reader !== false) await $.command.run({ command: 'priority-on' })
  return { opened, store, disk, calls, spawns, dialog }
}

export type Ctx = Awaited<ReturnType<typeof startAsk>>

// Holds one AskUserQuestion call in the main loop, or in a subagent when `agentId` is given.
export function askCall($: any, agentId?: string) {
  return $.tool.call({ tool: 'AskUserQuestion', questions: ASKED, ...(agentId ? { agentId } : {}) })
}

// The done and answer paths of the held call, from its process.spawn argv.
export function pathsOf(ctx: Ctx): { donePath: string; answerPath: string } {
  const argv: string[] = ctx.spawns[0]?.argv ?? []
  return { donePath: argv[4] ?? '', answerPath: argv[5] ?? '' }
}

// Mounts the reader pane, which the question card draws in.
export async function mountPane($: any) {
  return $.ui.mount({ ...PANE, surface: 'terminal' })
}

// Presses the Button whose label holds `text`. The test fails when no such Button is drawn.
export async function pressText(ui: any, text: string) {
  const found = await ui.find({ type: 'Button', text })
  expect(found, `a Button reads ${text}`).toBeDefined()
  await ui.press({ key: found?.key ?? '' })
}

// Presses the Send key of the question card. The test fails when the key is not drawn.
export async function pressSend(ui: any) {
  const found = await ui.find({ key: 'send' })
  expect(found, 'the Send key is drawn').toBeDefined()
  await ui.press({ key: 'send' })
}

// Types `text` into the Other input of question `index`, and submits it.
export async function typeOther(ui: any, index: number, text: string) {
  const inputs = (await ui.findAll({ type: 'Input' })).filter((n: any) => n.props?.label === 'Other')
  const key = inputs[index]?.key
  expect(key, `the Other input of question ${index} is drawn and keyed`).toBeDefined()
  await ui.input({ key, text })
}

// The readings of the session, as the store holds them.
export const readingsOf = (store: Map<string, unknown>): any[] => (store.get('readings:S1') as any[] | undefined) ?? []

// The mark of reading 1, as the store holds it.
export const markOf = (store: Map<string, unknown>): any => (store.get('marks:S1') as any)?.['1']
