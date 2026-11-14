// The reader pane, layout C: header, agent summary, one open card, and the history of this session.
// The header, the key row, and the note sit in a fixed top. The engine scrolls the body under it.
import { atom, read } from 'claude-code'
import type { Act, Mark, Reading } from '../types'
import { EMPTY, actFor, marksKey, openCard } from './act'
import { card, clock, keyed, noteInput, quiet } from './card'
import { keyRow } from './keys'
import { PANE_ID, isBusy, readingsKey } from './reader'
import { abstainName, briefName, priorityName, statusName } from './names'

const switchedOn = atom({ plugin: 'cobuilder-priority', key: 'on' } as const, false)
const tick = atom({ plugin: 'cobuilder-priority', key: 'tick' } as const, 0)
const act = atom({ plugin: 'cobuilder-priority', key: 'act' } as const, EMPTY)

// The rows of the fixed top: the header, the key row, one empty row, and the note. The body starts under them.
const FIXED_TOP_ROWS = 4

// The braille frames of the running indicator (contracts.md, E3.6).
const FRAMES = [...'⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏']

export async function openPane($: any): Promise<void> {
  await $.ui.open({ id: PANE_ID, title: 'Priority reader', focus: true, columns: 60 })
}

// The texts of a fixed row cut at its edge, so a narrow pane keeps each row one row high.
const CUT = { wrap: 'truncate-end' }

function header(ui: any, on: boolean, count: number, frame: number) {
  const { Box, Text } = ui
  return (
    <Box key="header" flexDirection="row" columnGap={2} height={1} overflow="hidden">
      <Text bold {...CUT}>Priority reader</Text>
      {keyed(ui, 'state', on ? '● on' : '○ off', on ? { color: 'green', ...CUT } : { dimColor: true, ...CUT })}
      {keyed(ui, 'count', `${count} readings`, { dimColor: true, ...CUT })}
      {isBusy() ? keyed(ui, 'spinner', FRAMES[frame % FRAMES.length] ?? '', { color: 'yellow', ...CUT }) : null}
      {isBusy() ? keyed(ui, 'running', 'running…', { color: 'yellow', ...CUT }) : null}
    </Box>
  )
}

// Four rows of spaces, as wide as the body, under the fixed top. They hide the body rows beneath it, in any theme.
function cover(ui: any, columns: number, top: number) {
  const { Box, Text } = ui
  return (
    <Box key="fixed-cover" position="absolute" top={top} left={0} width={columns} height={FIXED_TOP_ROWS} flexDirection="column">
      {Array.from({ length: FIXED_TOP_ROWS }, (_, i) => <Text key={`cover-${i}`} {...CUT}>{' '.repeat(columns)}</Text>)}
    </Box>
  )
}

type DigestList = { title: string; key: string; item: string; field: 'open_items' | 'decisions' }

const DIGEST_LISTS: DigestList[] = [
  { title: 'Open items', key: 'open-items', item: 'open-item', field: 'open_items' },
  { title: 'Decisions', key: 'decisions', item: 'decision', field: 'decisions' },
]

// A dim label, then one dim row per item. An empty or missing list draws nothing.
function digestRows(ui: any, list: DigestList, items: string[] | undefined): any[] {
  if (!Array.isArray(items) || !items.length) return []
  return [keyed(ui, list.key, list.title, { dimColor: true }), ...items.map((text, i) => keyed(ui, `${list.item}-${i}`, `· ${text}`, { dimColor: true }))]
}

function summary(ui: any, r: Reading, closed: boolean) {
  const { Box, Text } = ui
  const body = r.digest ? `${r.digest.ran} ${r.digest.result}` : 'No digest for this stop'
  const source = briefName(r.brief)
  const lists = closed ? [] : DIGEST_LISTS.flatMap((list) => digestRows(ui, list, r.digest?.[list.field]))
  return (
    <Box key="summary-box" flexDirection="column" borderStyle="single" paddingX={1} marginTop={1}>
      <Text {...quiet()}>{`${closed ? '▸' : '▾'} Agent completed`}</Text>
      {closed || !source ? null : keyed(ui, 'brief', source, { dimColor: true })}
      {closed ? null : keyed(ui, 'summary-body', body, quiet({ dimColor: !r.digest, wrap: 'wrap' }))}
      {lists}
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

// The reading shown, its marks and selection, and the blocks of the body, in draw order.
// renderPane draws this view. Null with no reading.
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
    ...card($, ui, shown, a, live),
    ...history($, ui, others, marks, newest.n),
  ].filter((b) => b !== null)
  return { readings, marks, a, shown, live, blocks }
}

// The engine gives the window's offset in e.props.scroll. The fixed top sits at that row.
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
  const mark = marks[String(shown.n)]
  return (
    <Box flexDirection="column" rowGap={0}>
      <Box key="fixed-spacer" height={FIXED_TOP_ROWS} />
      {blocks}
      {cover(ui, e.props.bodyColumns, e.props.scroll.offset)}
      <Box key="fixed-top" position="absolute" top={e.props.scroll.offset} left={0} right={0} height={FIXED_TOP_ROWS} overflow="hidden" flexDirection="column">
        {header(ui, on, readings.length, frame)}
        {keyRow($, ui, shown, mark, a, live, e.props.bodyColumns)}
        <Box key="fixed-gap" height={1} />
        {noteInput($, ui, shown, mark)}
      </Box>
    </Box>
  )
}
