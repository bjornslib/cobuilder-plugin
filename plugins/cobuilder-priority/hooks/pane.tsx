// The reader pane, layout C: header, agent summary, one open card, and the history of this session.
// The header and the key row stay drawn. The blocks under them scroll (E3.12).
import { atom, read, update } from 'claude-code'
import type { Act, Mark, Reading } from '../types'
import { EMPTY, actFor, marksKey, openCard } from './act'
import { card, clock, keyed, quiet } from './card'
import { keyRow } from './keys'
import { isBusy, readingsKey } from './reader'
import { abstainName, briefName, priorityName, statusName } from './names'

const switchedOn = atom({ plugin: 'cobuilder-priority', key: 'on' } as const, false)
const tick = atom({ plugin: 'cobuilder-priority', key: 'tick' } as const, 0)
const act = atom({ plugin: 'cobuilder-priority', key: 'act' } as const, EMPTY)
const scroll = atom({ plugin: 'cobuilder-priority', key: 'scroll' } as const, 0)

export const PANE_ID = 'priority-reader'

// The braille frames of the running indicator (contracts.md, E3.6).
const FRAMES = [...'⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏']

export async function openPane($: any): Promise<void> {
  await $.ui.open({ id: PANE_ID, title: 'Priority reader', focus: true, columns: 60 })
}

function header(ui: any, on: boolean, count: number, frame: number) {
  const { Box, Text } = ui
  return (
    <Box key="header" flexDirection="row" columnGap={2}>
      <Text bold>Priority reader</Text>
      {keyed(ui, 'state', on ? '● on' : '○ off', on ? { color: 'green' } : { dimColor: true })}
      {keyed(ui, 'count', `${count} readings`, { dimColor: true })}
      {isBusy() ? keyed(ui, 'spinner', FRAMES[frame % FRAMES.length] ?? '', { color: 'yellow' }) : null}
      {isBusy() ? keyed(ui, 'running', 'running…', { color: 'yellow' }) : null}
    </Box>
  )
}

function summary(ui: any, r: Reading, closed: boolean) {
  const { Box, Text } = ui
  const body = r.digest ? `${r.digest.ran} ${r.digest.result}` : 'No digest for this stop'
  const source = briefName(r.brief)
  return (
    <Box key="summary-box" flexDirection="column" borderStyle="single" paddingX={1} marginTop={1}>
      <Text {...quiet()}>{`${closed ? '▸' : '▾'} Agent completed`}</Text>
      {closed || !source ? null : keyed(ui, 'brief', source, { dimColor: true })}
      {closed ? null : keyed(ui, 'summary-body', body, quiet({ dimColor: !r.digest, wrap: 'wrap' }))}
      {closed || !r.agentSummary ? null : ownSummary(ui, r.agentSummary)}
    </Box>
  )
}

// The agent's own Summary part, under the digest summary, so the person can compare the two.
function ownSummary(ui: any, text: string) {
  const { Box, Text } = ui
  return (
    <Box key="agent-summary" flexDirection="column">
      <Text {...quiet({ dimColor: true })}>{"Agent's own summary"}</Text>
      <Text {...quiet({ wrap: 'wrap' })}>{text}</Text>
    </Box>
  )
}

// The status and priority of a reading in plain words. A failure or an abstain takes its place.
function resultWords(r: Reading): string {
  const res = r.result
  if (r.state === 'failed') return 'failed'
  if (res?.abstain) return `abstain · ${abstainName(res.abstain.reason)}`
  const status = res?.status ? statusName(res.status) : '-'
  const priority = res?.priority ? priorityName(res.priority) : ''
  return `${status} ${priority}`
}

// Pressing the newest row returns to the live card, so a later reading still opens on top.
// Each row is its own block, under one History label.
function history($: any, ui: any, rows: Reading[], marks: Record<string, Mark>, newest: number): any[] {
  const { Box, Text, Button } = ui
  if (!rows.length) return []
  const sign = (m?: Mark) => (m?.verdict === 'right' ? '✓' : m?.verdict === 'wrong' ? '✗' : '-')
  const line = (r: Reading) => `#${r.n} ${clock(r.at)} ${resultWords(r).trim()}  ${sign(marks[String(r.n)])}`
  return [
    <Box key="history-label" marginTop={1}><Text dimColor>History</Text></Box>,
    ...rows.map((r) => <Button key={`history-${r.n}`} plain label={line(r)} onPress={() => void openCard($, r.n === newest ? null : r.n)} />),
  ]
}

// The scroll offset in blocks, kept between 0 and the last block.
export function clampScroll(offset: number, count: number): number {
  return Math.min(Math.max(offset, 0), Math.max(count - 1, 0))
}

// The reading shown, its marks and selection, and the blocks under the keys, in draw order.
// renderPane draws this view, and the ui.scroll hook counts its blocks. Null with no reading.
export async function paneView($: any, ui: any) {
  const sessionId = await $.session.id()
  const readings = ((await $.store.get(readingsKey(sessionId))) as Reading[] | undefined) ?? []
  const newest = readings[readings.length - 1]
  if (!newest) return null
  const marks = ((await $.store.get(marksKey(sessionId))) as Record<string, Mark> | undefined) ?? {}
  const a: Act = await actFor($, newest.n)
  const shown = readings.find((r) => r.n === a.open) ?? newest
  const live = shown.n === newest.n
  const others = readings.filter((r) => r.n !== shown.n).reverse()
  const blocks = [
    isBusy() ? keyed(ui, 'stale', `Reading stop #${newest.n + 1}…`, { dimColor: true }) : null,
    summary(ui, shown, a.summaryClosed),
    ...card($, ui, shown, marks[String(shown.n)], a, live),
    ...history($, ui, others, marks, newest.n),
  ].filter((b) => b !== null)
  return { readings, marks, a, shown, live, blocks }
}

// Clamps the stored offset to the blocks, and writes a clamped value back, so no tick is dead.
async function keepOffset($: any, count: number): Promise<number> {
  const offset = await read($, scroll)
  const from = clampScroll(offset, count)
  if (from !== offset) await update($, scroll, () => from)
  return from
}

export async function renderPane($: any, e: any) {
  const ui = $.ui.resolve(e)
  const { Box, Text } = ui
  const frame = await read($, tick)
  await read($, act)
  const on = await read($, switchedOn)
  const view = await paneView($, ui)
  if (!view) {
    const hint = on ? 'No reading yet. The next stop starts one.' : 'The reader is off. Run /priority-on to read each stop.'
    return <Box flexDirection="column">{header(ui, on, 0, frame)}<Text dimColor>{hint}</Text></Box>
  }
  const { readings, marks, a, shown, live, blocks } = view
  const from = await keepOffset($, blocks.length)
  return (
    <Box flexDirection="column" rowGap={0}>
      {header(ui, on, readings.length, frame)}
      {keyRow($, ui, shown, marks[String(shown.n)], a, live)}
      {blocks.slice(from)}
    </Box>
  )
}
