// The reader pane, layout C: header, agent summary, one open card, and the history of this session.
import { atom, read } from 'claude-code'
import type { Act, Mark, Reading } from '../types'
import { EMPTY, actFor, marksKey, openCard, toggleSummary } from './act'
import { card, clock, keyed } from './card'
import { isBusy, readingsKey } from './reader'

const switchedOn = atom({ plugin: 'cobuilder-priority', key: 'on' } as const, false)
const tick = atom({ plugin: 'cobuilder-priority', key: 'tick' } as const, 0)
const act = atom({ plugin: 'cobuilder-priority', key: 'act' } as const, EMPTY)

export const PANE_ID = 'priority-reader'

export async function openPane($: any): Promise<void> {
  await $.ui.open({ id: PANE_ID, title: 'Priority reader', focus: true, columns: 60 })
}

function header(ui: any, on: boolean, count: number) {
  const { Box, Text } = ui
  return (
    <Box key="header" flexDirection="row" columnGap={2}>
      <Text bold>Priority reader</Text>
      {keyed(ui, 'state', on ? '● on' : '○ off', on ? { color: 'green' } : { dimColor: true })}
      {keyed(ui, 'count', `${count} readings`, { dimColor: true })}
      {isBusy() ? keyed(ui, 'running', 'running…', { color: 'yellow' }) : null}
    </Box>
  )
}

function summary($: any, ui: any, r: Reading, closed: boolean) {
  const { Box, Button } = ui
  const body = r.digest ? `${r.digest.ran} ${r.digest.result}` : 'No digest for this stop'
  return (
    <Box key="summary-box" flexDirection="column" borderStyle="single" paddingX={1}>
      <Button key="summary" plain hotkey="m" label={`${closed ? '▸' : '▾'} Agent completed`} onPress={() => void toggleSummary($)} />
      {closed ? null : keyed(ui, 'summary-body', body, { dimColor: !r.digest, wrap: 'wrap' })}
    </Box>
  )
}

// Pressing the newest row returns to the live card, so a later reading still opens on top.
function history($: any, ui: any, rows: Reading[], marks: Record<string, Mark>, newest: number) {
  const { Box, Text, Button } = ui
  if (!rows.length) return null
  const sign = (m?: Mark) => (m?.verdict === 'right' ? '✓' : m?.verdict === 'wrong' ? '✗' : '-')
  const line = (r: Reading) => {
    const res = r.result
    const what = r.state === 'failed' ? 'failed' : res?.abstain ? `abstain · ${res.abstain.reason}` : `${res?.status ?? '-'} ${res?.priority ?? ''}`
    return `#${r.n} ${clock(r.at)} ${what.trim()}  ${sign(marks[String(r.n)])}`
  }
  return (
    <Box key="history" flexDirection="column">
      <Text dimColor>History</Text>
      {rows.map((r) => <Button key={`history-${r.n}`} plain label={line(r)} onPress={() => void openCard($, r.n === newest ? null : r.n)} />)}
    </Box>
  )
}

export async function renderPane($: any, e: any) {
  const ui = $.ui.resolve(e)
  const { Box, Text } = ui
  await read($, tick)
  await read($, act)
  const sessionId = await $.session.id()
  const readings = ((await $.store.get(readingsKey(sessionId))) as Reading[] | undefined) ?? []
  const marks = ((await $.store.get(marksKey(sessionId))) as Record<string, Mark> | undefined) ?? {}
  const on = await read($, switchedOn)
  const newest = readings[readings.length - 1]
  if (!newest) {
    const hint = on ? 'No reading yet. The next stop starts one.' : 'The reader is off. Run /priority-on to read each stop.'
    return <Box flexDirection="column">{header(ui, on, 0)}<Text dimColor>{hint}</Text></Box>
  }
  const a: Act = await actFor($, newest.n)
  const shown = readings.find((r) => r.n === a.open) ?? newest
  const live = shown.n === newest.n
  const others = readings.filter((r) => r.n !== shown.n).reverse()
  return (
    <Box flexDirection="column" rowGap={1}>
      {header(ui, on, readings.length)}
      {summary($, ui, shown, a.summaryClosed)}
      {card($, ui, shown, marks[String(shown.n)], a, live)}
      {history($, ui, others, marks, newest.n)}
    </Box>
  )
}
