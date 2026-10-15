import { atom, read, update, type EngineInterface } from 'claude-code'
import type { CallState, RunState, RunStep } from '../types'

export const PANE_ID = 'memory-run'
export const PANE_TITLE = '🧠 Hindsight: CoBuilder Memory Run'

// The newest run, shared by the run, its tick, and the render hook
const RUN = atom({ plugin: 'cobuilder-memory', key: 'run' } as const, null)

const EMPTY_TEXT = 'No memory run yet. The agent or /memory-recall starts one.'
const LAST_LINE = 'The full result went to the agent.'
const NO_PAGE = 'none picked'
const NEED_INDENT = 6
const STEP_NAME_WIDTH = 10
const RECORDS_WHEN_DONE = 2
const STEPS: RunStep[] = ['query', 'search', 'questions', 'reflect']
const MARK = { running: '◐', done: '✓', failed: '✗' } as const
const COLOUR = { running: 'yellow', done: 'green', failed: 'red' } as const

type PaneInput = Parameters<EngineInterface['ui']['resolve']>[0] & { viewport?: { columns: number; rows: number } }
type Row = { state?: keyof typeof MARK; text: string; colour?: string }

export function newRun(startedAt: string): RunState {
  return {
    startedAt,
    elapsedSec: 0,
    bank: '',
    step: 'query',
    need: '',
    calls: [],
    recall: null,
    page: null,
    reflects: [],
    error: null,
  }
}

// Changes the newest run. Before the first run, the change starts from an empty run.
export async function setRun($: EngineInterface, change: (s: RunState) => RunState): Promise<void> {
  await update($, RUN, s => change(s ?? newRun('')))
}

// Opens the pane without waiting for its placement. A refused open never stops the run.
export async function openPane($: EngineInterface): Promise<void> {
  try {
    await $.ui.open({ id: PANE_ID, title: PANE_TITLE })
  } catch {
    // The run goes on without the pane.
  }
}

let live: (() => void) | null = null

// Adds one second to the elapsed time each second. A new run stops the tick of an earlier run.
export function startTick($: EngineInterface): () => void {
  live?.()
  const timer = $.clock.every(1000, () => {
    void setRun($, s => ({ ...s, elapsedSec: s.elapsedSec + 1 }))
  })
  const stop = () => {
    timer.cancel()
    if (live === stop) live = null
  }
  live = stop
  return stop
}

function clock(sec: number): string {
  return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0')
}

// Cuts text at the room, with an ellipsis at the edge
function cut(text: string, room: number): string {
  return text.length <= room ? text : text.slice(0, Math.max(0, room - 1)) + '…'
}

// Splits text into lines of at most width characters, at word breaks
function wrap(text: string, width: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line !== '' && line.length + 1 + word.length > width) {
      lines.push(line)
      line = word
    } else {
      line = line === '' ? word : line + ' ' + word
    }
  }
  if (line !== '') lines.push(line)
  return lines
}

// The state of a step row, or null when the row stays hidden
function stepState(s: RunState, name: RunStep, index: number): 'running' | 'done' | null {
  if (s.step === 'failed') {
    const has =
      name === 'query' ? s.need !== '' :
      name === 'search' ? s.recall !== null :
      s.reflects.length > 0
    return has ? 'done' : null
  }
  const at = STEPS.indexOf(s.step)
  if (index < at) return 'done'
  if (index === at) return 'running'
  return null
}

function stepCount(s: RunState, name: RunStep): string {
  if (name === 'search' && s.recall !== null && !('reason' in s.recall)) {
    return s.recall.total + ' results, ' + s.recall.kept.length + ' kept'
  }
  if (name === 'questions' && s.reflects.length > 0) return s.reflects.length + ' questions'
  if (name === 'reflect' && s.reflects.length > 0) {
    const answered = s.reflects.filter(r => r.state === 'done').length
    return answered + ' of ' + s.reflects.length + ' answered'
  }
  return ''
}

function stepRows(s: RunState, width: number): Row[] {
  return STEPS.flatMap((name, index) => {
    const state = stepState(s, name, index)
    if (state === null) return []
    const count = stepCount(s, name)
    const text = name.padEnd(STEP_NAME_WIDTH) + state + (count ? ' ' + count : '')
    return [{ state, text: cut(text, width - 2) }]
  })
}

function callRows(calls: CallState[], width: number): Row[] {
  return calls.map(c => ({
    state: c.state,
    text: cut('  ' + c.name + (c.note ? ' ' + c.note : ''), width - 2),
  }))
}

// The Need line, wrapped with an indent on later rows
function needRows(need: string, width: number): Row[] {
  return wrap(need, width - NEED_INDENT).map((line, i) => ({
    text: cut((i === 0 ? 'Need: ' : ' '.repeat(NEED_INDENT)) + line, width),
  }))
}

// The rows of a run that works or failed: the Need line, the steps, and the calls
function workingRows(s: RunState, width: number): Row[] {
  const need = s.step === 'done' ? [] : needRows(s.need, width)
  return [...need, ...stepRows(s, width), ...callRows(s.calls, width)]
}

// The rows of a done run: the recall, the page, and each reflect answer
function doneRows(s: RunState, width: number): Row[] {
  const rows: Row[] = []
  if (s.recall !== null) {
    rows.push({ text: cut('Recall "' + s.recall.query + '"', width) })
    if ('reason' in s.recall) {
      rows.push({ colour: 'red', text: cut(s.recall.reason, width) })
    } else {
      const shown = s.recall.kept.slice(0, RECORDS_WHEN_DONE)
      shown.forEach((h, i) => {
        const text = h.text.replace(/\s+/g, ' ')
        rows.push({ text: cut((i + 1) + ' [' + h.date + '] ' + text, width) })
      })
      const more = s.recall.kept.length - shown.length
      if (more > 0) rows.push({ text: '… ' + more + ' more' })
    }
  }
  rows.push({ text: s.page ? cut('Page ' + s.page.name + ' ' + s.page.updated, width) : 'Page ' + NO_PAGE })
  if (s.reflects.length > 0) rows.push({ text: 'Reflect' })
  for (const r of s.reflects) {
    const note = r.note ? ' ' + r.note : ''
    rows.push({ state: r.state, text: cut(r.question + note, width - 2) })
  }
  rows.push({ text: LAST_LINE })
  return rows
}

function rowsOf(s: RunState, width: number): Row[] {
  if (s.step === 'done') return doneRows(s, width)
  if (s.step === 'failed') return [...workingRows(s, width), { colour: 'red', text: cut(s.error ?? '', width) }]
  return workingRows(s, width)
}

// Draws the newest run: the empty line before any run, else the header and the state rows
export async function renderPane($: EngineInterface, e: PaneInput) {
  const { Box, Text } = $.ui.resolve(e)
  const s = await read($, RUN)
  // The engine draws a pane title only as a tab, so the pane draws its own title row first
  const title = <Text weight="semibold">{PANE_TITLE}</Text>
  if (s === null) {
    return (
      <Box flexDirection="column">
        {title}
        <Text dimColor>{EMPTY_TEXT}</Text>
      </Box>
    )
  }
  const width = e.viewport?.columns ?? 80
  const header = [s.bank, s.startedAt, clock(s.elapsedSec)].filter(Boolean).join(' · ')
  return (
    <Box flexDirection="column">
      {title}
      <Text dimColor>{cut(header, width)}</Text>
      {rowsOf(s, width).map(row =>
        row.state ? (
          <Box>
            <Text color={COLOUR[row.state]}>{MARK[row.state] + ' '}</Text>
            <Text>{row.text}</Text>
          </Box>
        ) : (
          <Text color={row.colour}>{row.text}</Text>
        ),
      )}
    </Box>
  )
}
