// One card of layout C: the title row, the steps, the draft block, and the note.
// The keys sit in keys.tsx. Only the newest card can select and send (contracts.md, "The chosen layout").
import type { Act, Mark, Reading } from '../types'
import { canSend } from './draft'
import { answer, draftFor, pick, saveMark, toggleStep } from './act'
import { abstainName, priorityName, statusName, stepName } from './names'

type Step = Record<string, any>

// A Text keeps no key, so a keyed text is a Text in a keyed Box. Tests find it by that key.
export function keyed(ui: any, key: string, text: string, style: Record<string, unknown> = {}, box: Record<string, unknown> = {}) {
  const { Box, Text } = ui
  return <Box key={key} {...box}><Text {...style}>{text}</Text></Box>
}

// The local hour and minute of an ISO time.
export function clock(at: string): string {
  const d = new Date(at)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function stepBody(step: Step): string {
  switch (step.kind) {
    case 'reply': return `"${step.text}"`
    case 'send_feedback': return step.notes
    case 'approve_gate': return step.gate
    case 'deny_permission': return step.reason ?? ''
    case 'notify': return step.excerpt ?? ''
    case 'ask_human': return step.detail?.role === 'do' ? (step.detail.steps ?? []).join('; ') : step.detail?.artifact ?? ''
    default: return ''
  }
}

export function sendableNow(r: Reading, live: boolean): boolean {
  return live && (r.result?.steps ?? []).some(canSend)
}

function questions($: any, ui: any, r: Reading, s: Step, i: number, a: Act) {
  const { Box, Text, Button, Input } = ui
  if (s.detail?.role !== 'decide') {
    return <Input key={`other-${i}-0`} label="Note" value={a.other[`${i}.0`] ?? ''} submitLabel="add"
      onSubmit={(t: string) => void answer($, r.n, `${i}.0`, t)} />
  }
  return (s.detail.questions as Step[]).map((q, j) => (
    <Box key={`q-${i}-${j}`} flexDirection="column" paddingLeft={4}>
      <Text color="yellow">{`"${q.ask}"`}</Text>
      <Box flexDirection="row" columnGap={2} flexWrap="wrap">
        {(q.options as Step[]).map((o, k) => (
          <Button key={`opt-${i}-${j}-${k}`} plain label={`${(a.picks[`${i}.${j}`] ?? []).includes(o.label) ? '[•]' : '[ ]'} ${o.label}`}
            onPress={() => void pick($, r.n, `${i}.${j}`, o.label, Boolean(q.multi_select))} />
        ))}
      </Box>
      {q.free_text ? <Input key={`other-${i}-${j}`} label="Other" value={a.other[`${i}.${j}`] ?? ''} submitLabel="add"
        onSubmit={(t: string) => void answer($, r.n, `${i}.${j}`, t)} /> : null}
    </Box>
  ))
}

function stepRow($: any, ui: any, r: Reading, s: Step, i: number, a: Act, live: boolean) {
  const { Box, Button } = ui
  const head = `${i + 1}. ${stepName(s)}`
  const body = stepBody(s)
  if (!live || !canSend(s)) {
    const tail = live && s.kind === 'interrupt' ? ' (no target at a stop)' : body ? ` · ${body}` : ''
    return keyed(ui, live ? `step-${i}` : `old-step-${i}`, `[-] ${head}${tail}`, { dimColor: true })
  }
  const on = a.steps.includes(i)
  return (
    <Box key={`row-${i}`} flexDirection="column" borderStyle={on ? 'round' : undefined} borderColor="cyan" paddingX={on ? 1 : 0}>
      <Button key={`step-${i}`} plain hotkey={i < 9 ? String(i + 1) : undefined} label={`${on ? '[x]' : '[ ]'} ${head}`}
        onPress={() => void toggleStep($, r.n, i)} />
      {body ? keyed(ui, `step-${i}-body`, body, { dimColor: !on }) : null}
      {s.kind === 'ask_human' ? questions($, ui, r, s, i, a) : null}
    </Box>
  )
}

function draftBlock(ui: any, r: Reading, a: Act) {
  const { Box, Text } = ui
  const draft = draftFor(r, a)
  const names = draft.steps.map((s) => s + 1).join(', ')
  return (
    <Box key="draft-block" flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      <Text color="cyan" bold>What will be sent</Text>
      {keyed(ui, 'draft', draft.text || 'Select a step', { dimColor: !draft.text })}
      {draft.text ? keyed(ui, 'draft-footer',
        `${draft.steps.length > 1 ? 'steps' : 'step'} ${names} · ${draft.text.length} chars · session prompt`, { dimColor: true }) : null}
      {a.notice ? keyed(ui, 'notice', a.notice, { color: 'red' }) : null}
    </Box>
  )
}

function statusText(r: Reading): string {
  if (r.state === 'failed') return `failed: ${r.error ?? ''}`
  const ab = r.result?.abstain
  if (ab) return `abstain · ${abstainName(ab.reason)}${ab.detail ? ` (${ab.detail})` : ''}`
  const status = r.result?.status
  return status ? statusName(status) : '-'
}

export function card($: any, ui: any, r: Reading, mark: Mark | undefined, a: Act, live: boolean) {
  const { Box, Text, Input } = ui
  const res = r.result
  const sendable = sendableNow(r, live)
  return (
    <Box key={`card-${r.n}`} flexDirection="column" rowGap={0}>
      <Box flexDirection="row" columnGap={1}>
        {keyed(ui, 'title', `#${r.n} ${clock(r.at)}`, { bold: true }, { flexShrink: 0 })}
        {res?.priority ? keyed(ui, 'priority', priorityName(res.priority), { backgroundColor: 'red', color: 'white' }) : null}
        {keyed(ui, 'status', statusText(r), r.state === 'failed' || res?.needs_human ? { color: 'red' } : {})}
        {res?.needs_human ? keyed(ui, 'needs', 'needs you', { color: 'yellow' }) : null}
      </Box>
      {live && res?.steps.length ? <Text dimColor>Proposed steps (1–9 to select)</Text> : null}
      {(res?.steps ?? []).map((s, i) => stepRow($, ui, r, s, i, a, live))}
      {sendable ? draftBlock(ui, r, a) : null}
      <Input key={`note-${r.n}`} label="Note" value={mark?.note ?? ''} placeholder="Type an observation" submitLabel="save"
        onSubmit={(t: string) => void saveMark($, r.sessionId, r.n, { note: t })} />
    </Box>
  )
}
