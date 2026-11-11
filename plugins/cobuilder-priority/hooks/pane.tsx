// The reader pane: one card per live reading of this session, newest first, with its marks.
import { atom, read, update } from 'claude-code'
import type { Mark, Reading, Verdict } from '../types'
import { readingsKey } from './reader'

const switchedOn = atom({ plugin: 'cobuilder-priority', key: 'on' } as const, false)
const tick = atom({ plugin: 'cobuilder-priority', key: 'tick' } as const, 0)

export const PANE_ID = 'priority-reader'

const marksKey = (sessionId: string) => `marks:${sessionId}`

export async function openPane($: any): Promise<void> {
  await $.ui.open({ id: PANE_ID, title: 'Priority reader' })
}

async function saveMark($: any, sessionId: string, n: number, change: Partial<Mark>): Promise<void> {
  const key = marksKey(sessionId)
  const marks = ((await $.store.get(key)) as Record<string, Mark> | undefined) ?? {}
  const old = marks[String(n)] ?? { verdict: null, note: '' }
  await $.store.set(key, { ...marks, [String(n)]: { ...old, ...change, at: new Date().toISOString() } })
  await update($, tick, (t) => t + 1)
}

function stepLine(step: Record<string, unknown>): string {
  const { kind, ...rest } = step
  const body = Object.values(rest).map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join(' · ')
  return `${String(kind)}: ${body}`
}

function headline(r: Reading): string {
  if (r.state === 'failed') return `failed: ${r.error ?? ''}`
  const res = r.result
  if (!res) return 'no result'
  if (res.abstain) return `abstain: ${res.abstain.reason}${res.abstain.detail ? ` (${res.abstain.detail})` : ''}`
  const human = res.needs_human ? 'needs human' : 'no human needed'
  return `${res.status ?? '-'} · ${res.priority ?? '-'} · ${human}`
}

function card($: any, ui: any, r: Reading, mark: Mark | undefined) {
  const { Box, Text, Button, Input } = ui
  const time = r.at.slice(11, 16)
  const mark$ = (change: Partial<Mark>) => () => void saveMark($, r.sessionId, r.n, change)
  const verdict = (v: Verdict) => (mark?.verdict === v ? `${v} ✓` : v)
  return (
    <Box key={`stop-${r.n}`} flexDirection="column" marginBottom={1}>
      <Text bold>{`Reading ${r.n} · ${time} · ${(r.ms / 1000).toFixed(0)} s · ${r.brief}`}</Text>
      <Text>{headline(r)}</Text>
      {(r.result?.steps ?? []).map((s) => <Text dimColor>{`  ${stepLine(s)}`}</Text>)}
      <Box flexDirection="row">
        <Button key={`right-${r.n}`} label={verdict('right')} onPress={mark$({ verdict: 'right' })} />
        <Button key={`wrong-${r.n}`} label={verdict('wrong')} onPress={mark$({ verdict: 'wrong' })} />
      </Box>
      <Input key={`note-${r.n}`} label="note" value={mark?.note ?? ''} placeholder="why" submitLabel="save"
        onSubmit={(text: string) => void saveMark($, r.sessionId, r.n, { note: text })} />
    </Box>
  )
}

export async function renderPane($: any, e: any) {
  const ui = $.ui.resolve(e)
  const { Box, Text } = ui
  await read($, tick)
  const sessionId = await $.session.id()
  const readings = ((await $.store.get(readingsKey(sessionId))) as Reading[] | undefined) ?? []
  const marks = ((await $.store.get(marksKey(sessionId))) as Record<string, Mark> | undefined) ?? {}
  const on = await read($, switchedOn)
  if (readings.length === 0) {
    const hint = on ? 'No reading yet. The next stop starts one.' : 'The reader is off. Run /priority-on to read each stop.'
    return <Box flexDirection="column"><Text dimColor>{hint}</Text></Box>
  }
  return (
    <Box flexDirection="column">
      <Text dimColor>{`Reader: ${on ? 'on' : 'off'} · ${readings.length} readings`}</Text>
      {[...readings].reverse().map((r) => card($, ui, r, marks[String(r.n)]))}
    </Box>
  )
}
