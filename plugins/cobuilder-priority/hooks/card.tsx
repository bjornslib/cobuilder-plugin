// One card of layout C: the title row, the steps, the draft block, and the note.
// The keys sit in keys.tsx. Only the newest card can select and send (contracts.md, "The chosen layout").
// A card is a list of blocks, so the pane scrolls each block on its own (E3.12).
import type { Act, Mark, Reading } from '../types'
import { canSend, visibleNo } from './draft'
import { answer, draftFor, pick, saveMark, toggleStep } from './act'
import { isBusy } from './reader'
import { abstainName, priorityName, statusName, stepName } from './names'

type Step = Record<string, any>

// A Text keeps no key, so a keyed text is a Text in a keyed Box. Tests find it by that key.
export function keyed(ui: any, key: string, text: string, style: Record<string, unknown> = {}, box: Record<string, unknown> = {}) {
  const { Box, Text } = ui
  return <Box key={key} {...box}><Text {...style}>{text}</Text></Box>
}

// While a reading runs, the previous turn draws dim. Each Text in it takes this style.
export const quiet = (style: Record<string, unknown> = {}) => (isBusy() ? { ...style, dimColor: true } : style)

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
      <Text {...quiet({ color: 'yellow' })}>{`"${q.ask}"`}</Text>
      <Box flexDirection="row" columnGap={2} flexWrap="wrap">
        {(q.options as Step[]).map((o, k) => (
          <Button key={`opt-${i}-${j}-${k}`} plain dimColor={isBusy()} label={`${(a.picks[`${i}.${j}`] ?? []).includes(o.label) ? '[•]' : '[ ]'} ${o.label}`}
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
  const no = visibleNo(r.result?.steps ?? [], i)
  const head = `${no}. ${stepName(s)}`
  const body = stepBody(s)
  if (!live || !canSend(s)) {
    const tail = live && s.kind === 'interrupt' ? ' (no target at a stop)' : body ? ` · ${body}` : ''
    return keyed(ui, live ? `step-${i}` : `old-step-${i}`, `[-] ${head}${tail}`, { dimColor: true })
  }
  const on = a.steps.includes(i)
  const decide = s.kind === 'ask_human' && s.detail?.role === 'decide'
  return (
    <Box key={`row-${i}`} flexDirection="column" borderStyle={on ? 'round' : undefined} borderColor="cyan" paddingX={on ? 1 : 0}>
      {decide ? keyed(ui, `step-${i}`, head, quiet({ bold: true })) : (
        <Button key={`step-${i}`} plain dimColor={isBusy()} hotkey={no < 10 ? String(no) : undefined} label={`${on ? '[x]' : '[ ]'} ${head}`}
          onPress={() => void toggleStep($, r.n, i)} />
      )}
      {body ? keyed(ui, `step-${i}-body`, body, quiet({ dimColor: !on })) : null}
      {s.kind === 'ask_human' ? questions($, ui, r, s, i, a) : null}
    </Box>
  )
}

function draftBlock(ui: any, r: Reading, a: Act) {
  const { Box, Text } = ui
  const draft = draftFor(r, a)
  const names = draft.steps.map((s) => visibleNo(r.result?.steps ?? [], s)).join(', ')
  return (
    <Box key="draft-block" flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} marginTop={1}>
      <Text {...quiet({ color: 'cyan', bold: true })}>What will be sent</Text>
      {keyed(ui, 'draft', draft.text || 'Select a step', quiet({ dimColor: !draft.text }))}
      {draft.text ? keyed(ui, 'draft-footer',
        `${draft.steps.length > 1 ? 'steps' : 'step'} ${names} · ${draft.text.length} chars · session prompt`, { dimColor: true }) : null}
      {a.notice ? keyed(ui, 'notice', a.notice, quiet({ color: 'red' })) : null}
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

// The title row of the card, with the hint above its steps. The key card-<n> wraps the row.
function titleBlock(ui: any, r: Reading, live: boolean, hasSteps: boolean) {
  const { Box, Text } = ui
  const res = r.result
  return (
    <Box key={`card-${r.n}`} flexDirection="column" rowGap={0}>
      <Box flexDirection="row" columnGap={1}>
        {keyed(ui, 'title', `#${r.n} ${clock(r.at)}`, quiet({ bold: true }), { flexShrink: 0 })}
        {res?.priority ? keyed(ui, 'priority', priorityName(res.priority), quiet({ backgroundColor: 'red', color: 'white' })) : null}
        {keyed(ui, 'status', statusText(r), quiet(r.state === 'failed' || res?.needs_human ? { color: 'red' } : {}))}
        {res?.needs_human ? keyed(ui, 'needs', 'needs you', quiet({ color: 'yellow' })) : null}
      </Box>
      {live && hasSteps ? <Text dimColor>Proposed steps (1–9 to select)</Text> : null}
    </Box>
  )
}

// The blocks of one card, in draw order: the title row, each step row, the draft block, and the note.
// A notify step draws no row, so it adds no block.
export function card($: any, ui: any, r: Reading, mark: Mark | undefined, a: Act, live: boolean): any[] {
  const { Input } = ui
  const steps = r.result?.steps ?? []
  const rows = steps.map((s, i) => (s.kind === 'notify' ? null : stepRow($, ui, r, s, i, a, live)))
  return [
    titleBlock(ui, r, live, steps.some((s) => s.kind !== 'notify')),
    ...rows,
    sendableNow(r, live) ? draftBlock(ui, r, a) : null,
    <Input key={`note-${r.n}`} label="Note" value={mark?.note ?? ''} placeholder="Type an observation" submitLabel="save"
      onSubmit={(t: string) => void saveMark($, r.sessionId, r.n, { note: t })} />,
  ].filter((b) => b !== null)
}
