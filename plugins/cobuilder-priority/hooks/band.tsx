// The row above the prompt (contracts.md, E3.9): the notify messages of the newest reading,
// and one summary row while the pane is closed. The pane draws neither. No notify row draws
// between a prompt and the next reading.
import { atom, read } from 'claude-code'
import type { Reading } from '../types'
import { keyed } from './card'
import { abstainName, priorityName, statusName } from './names'
import { PANE_ID, isWaiting, readingsKey } from './reader'

// The redraw tick. A prompt or a saved reading writes it, so the band draws again.
const tick = atom({ plugin: 'cobuilder-priority', key: 'tick' } as const, 0)

// One line of a reading in plain words, for the closed pane.
function summaryLine(r: Reading): string {
  const res = r.result
  const state = r.state === 'failed' ? 'failed' : res?.abstain ? `abstain · ${abstainName(res.abstain.reason)}` : statusName(res?.status ?? '')
  const parts = [`Priority reader · #${r.n}`, res?.priority ? priorityName(res.priority) : '', state, res?.needs_human ? 'needs you' : '']
  return parts.filter(Boolean).join(' · ')
}

// The drawing of the band, or undefined when the band has nothing to draw.
export async function renderBand($: any, e: any) {
  await read($, tick)
  if (e.props.hasSurvey) return undefined
  const sessionId = await $.session.id()
  const readings = ((await $.store.get(readingsKey(sessionId))) as Reading[] | undefined) ?? []
  const newest = readings[readings.length - 1]
  if (!newest) return undefined
  const open = (await $.ui.panes()).some((pane: { id: string }) => pane.id === PANE_ID)
  const notes = isWaiting() ? [] : (newest.result?.steps ?? []).filter((step) => step.kind === 'notify')
  if (open && !notes.length) return undefined
  const ui = $.ui.resolve(e)
  const { Box } = ui
  return (
    <Box flexDirection="column">
      {notes.map((step, i) => keyed(ui, `notify-${i}`, `Notification: ${step.excerpt ?? ''}`, { color: 'warning' }))}
      {open ? null : keyed(ui, 'band-summary', summaryLine(newest))}
    </Box>
  )
}
