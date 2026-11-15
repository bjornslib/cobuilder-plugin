// Shared stubs for the ask-hold probe tests. The runner reads *.test.ts(x) only, so this file holds no test cases.
import { expect, mock } from 'claude-code/testing'

export const OPTIONS = { priority_dev_dir: '/work/priority-dev' }

// The options of a test that holds a call. The kit cuts a held hook at 10000 ms, and each find or press takes about 500 ms.
export const HOLD = { options: OPTIONS, timeoutMs: 30000 }

// The log path the epic design names: under the priority-dev folder.
export const LOG = '/work/priority-dev/reports/logs/ask-hold/probe.jsonl'

export const SHAPES = ['answers-by-question', 'answers-list', 'text']

// Two questions: one single-select, one multi-select.
export const QUESTIONS = [
  { question: 'Which lint?', header: 'Lint', multiSelect: false, options: [{ label: 'Lint' }, { label: 'Format' }] },
  { question: 'Which checks?', header: 'Checks', multiSelect: true, options: [{ label: 'Unit' }, { label: 'Types' }, { label: 'E2E' }] },
]

export const PICKS = { 0: ['Format'], 1: ['Unit', 'E2E'] }

// The Other text for question 0, and the labels for question 1.
export const PICKS_OTHER = { 0: ['my own answer'], 1: ['Unit', 'E2E'] }

// What the engine's tool.call beneath the probe answers, when the probe passes a call on.
export const STUB = { result: 'stub answer' }

// The props of the Pane component, as the engine raises them for a docked pane.
export const PANE = { title: 'Ask hold', isFocused: false, bodyColumns: 80, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} }

// The keys the probe pane gives its parts. Each option is keyed by its question index and its label.
export const optKey = (i: number, label: string) => `opt-${i}-${label}`
export const shapeKey = (shape: string) => `shape-${shape}`
export const otherKey = (i: number) => `other-${i}`
export const SEND_KEY = 'send'

// Waits until `check` holds, letting the event loop settle between checks. It gives up after `rounds`.
export async function until(check: () => boolean, rounds = 50) {
  for (let i = 0; i < rounds && !check(); i++) await Promise.resolve()
}

// The stub beneath the probe for AskUserQuestion. Each call that reaches it is recorded.
export function stubTool(on: any) {
  const calls: any[] = []
  on('tool.call', { tool: 'AskUserQuestion' }, (_$: any, e: any) => {
    calls.push(e)
    return STUB
  })
  return calls
}

// Answers $.clock from memory, so the probe's clock.every timer is accepted and held until the test ends.
export function stubClock(on: any) {
  mock.clock(on)
}

// Records each pane the probe opens. The probe awaits this answer, so it answers at once.
export function stubOpen(on: any) {
  const opened: { id: string }[] = []
  on('ui.open', (_$: any, e: any) => {
    opened.push({ id: e.id })
    return { value: { isPlaced: true } }
  })
  return opened
}

// An in-memory file system under the probe. A read of a missing file is refused.
export function stubFiles(on: any) {
  const files = new Map<string, string>()
  on('fs.read', (_$: any, e: any) => (files.has(e.path) ? { value: files.get(e.path) } : { deny: `ENOENT ${e.path}` }))
  on('fs.write', (_$: any, e: any) => {
    files.set(e.path, e.text)
    return { value: undefined }
  })
  return files
}

// The probe log lines, parsed, in the order written.
export function logLines(files: Map<string, string>): { at: string; kind: string; [key: string]: any }[] {
  return (files.get(LOG) ?? '')
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line))
}

// Runs one /ask-probe command. The test fails when the command does not run.
export async function setMode($: any, args: 'hold' | 'pass' | 'off') {
  let ran = true
  try {
    await $.command.run({ command: 'ask-probe', args })
  } catch {
    ran = false
  }
  expect(ran, `/ask-probe ${args} runs`).toBe(true)
}

// Holds one AskUserQuestion call in the main loop. The call settles when the pane's Send presses, or when it is cut off.
export function askCall($: any, agentId?: string) {
  return $.tool.call({ tool: 'AskUserQuestion', questions: QUESTIONS, ...(agentId ? { agentId } : {}) })
}

// Mounts the pane the probe opened under `ask-hold`. The test fails when no pane opens.
export async function openedPane($: any, opened: { id: string }[]) {
  await until(() => opened.length > 0)
  expect(
    opened.map((o) => o.id),
    'the probe opens the pane ask-hold',
  ).toContain('ask-hold')
  return $.ui.mount({ plugin: 'ask-hold-probe', surface: 'terminal', component: 'Pane', requestId: 'ask-hold', props: PANE })
}

// Presses each key in order. Each key is one Button of the pane, so no find runs first.
export async function pressKeys(ui: any, keys: string[]) {
  for (const key of keys) await ui.press({ key })
}

// Presses the picked options, then the shape choice, then Send. `picks` holds [question index, label] pairs.
export async function answerPane(ui: any, shape: string, picks: [number, string][]) {
  await pressKeys(ui, [...picks.map(([i, label]) => optKey(i, label)), shapeKey(shape), SEND_KEY])
}

// One drawn snapshot of the pane: the text it shows, the keys it draws, and how many Inputs it holds.
export async function snapshotOf(ui: any) {
  const nodes = nodesOf(await ui.drawn())
  const shown = nodes.flatMap((n) => [...(n.children ?? []).filter(isText), ...(isText(n.props?.label) ? [n.props.label] : [])])
  const keys = nodes.map((n) => n.key ?? n.props?.key).filter(isText)
  const inputs = nodes.filter((n) => n.type === 'Input').length
  return { shown, keys, inputs }
}

type Node = { type?: string; key?: string; props?: Record<string, any>; children?: unknown[] }

const isText = (x: unknown): x is string => typeof x === 'string'

// Every node under `node`, the node first, in document order.
function nodesOf(node: unknown): Node[] {
  if (typeof node !== 'object' || node === null) return []
  const n = node as Node
  return [n, ...(Array.isArray(n.children) ? n.children : []).flatMap(nodesOf)]
}

// The labels of a comma-joined answer, in order. Any other value comes back as it is.
export const labelsOf = (value: unknown) => (typeof value === 'string' ? value.split(',').map((s) => s.trim()) : value)
