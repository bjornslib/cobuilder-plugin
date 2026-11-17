// One card of layout C: the title row, the steps, and the draft block. The note input sits in the fixed top.
// The keys sit in keys.tsx. Only the newest card can select and send (contracts.md, "The chosen layout").
// A card is a list of blocks. The pane draws them under its fixed top (pane.tsx).
import type { Act, Mark, Reading } from '../types'
import { canSend, visibleNo } from './draft'
import { answer, draftFor, pick, saveMark, send, toggleStep } from './act'
import { isQuiet } from './reader'
import { abstainName, priorityName, statusName, stepName } from './names'

type Step = Record<string, any>

// A Text keeps no key, so a keyed text is a Text in a keyed Box. Tests find it by that key.
export function keyed(ui: any, key: string, text: string, style: Record<string, unknown> = {}, box: Record<string, unknown> = {}) {
  const { Box, Text } = ui
  return <Box key={key} {...box}><Text {...style}>{text}</Text></Box>
}

// While a reading runs or the reader waits for the next one, the previous turn draws dim. Each Text in it takes this style.
export const quiet = (style: Record<string, unknown> = {}) => (isQuiet() ? { ...style, dimColor: true } : style)

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
    <Box key={`q-${i}-${j}`} flexDirection="column" paddingLeft={4} marginTop={j > 0 ? 1 : 0}>
      <Text {...quiet({ color: 'yellow' })}>{`"${q.ask}"`}</Text>
      <Box flexDirection="row" columnGap={2} flexWrap="wrap">
        {(q.options as Step[]).map((o, k) => (
          <Button key={`opt-${i}-${j}-${k}`} plain dimColor={isQuiet()} label={`${(a.picks[`${i}.${j}`] ?? []).includes(o.label) ? '[•]' : '[ ]'} ${o.label}`}
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
        <Button key={`step-${i}`} plain dimColor={isQuiet()} hotkey={no < 10 ? String(no) : undefined} label={`${on ? '[x]' : '[ ]'} ${head}`}
          onPress={() => void toggleStep($, r.n, i)} />
      )}
      {body ? keyed(ui, `step-${i}-body`, body, quiet({ dimColor: !on })) : null}
      {s.kind === 'ask_human' ? questions($, ui, r, s, i, a) : null}
    </Box>
  )
}

const TITLE = '▸ WHAT WILL BE SENT'

// The "What will be sent" block of every draft (question-card.svg). It is lit when Send can act.
export function draftBox(ui: any, o: { text: string; footer?: string; lit: boolean; notice: string }) {
  const { Box } = ui
  return (
    <Box key="draft-block" flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} marginTop={1}>
      {keyed(ui, 'draft-title', TITLE, { dimColor: !o.lit })}
      {keyed(ui, 'draft', o.text || 'Provide your response', { dimColor: !o.lit })}
      {o.footer ? keyed(ui, 'draft-footer', o.footer, { dimColor: true }) : null}
      {o.notice ? keyed(ui, 'notice', o.notice, { color: 'red' }) : null}
    </Box>
  )
}

// The Send link, a cyan Button with no hotkey. The s key of the key row stays the only hotkey.
export function sendLink(ui: any, dim: boolean, onPress: () => void) {
  const { Button, Text } = ui
  return (
    <Button key="send-link" plain label="Send" dimColor={dim} onPress={onPress}>
      <Text color="cyan">Send</Text>
    </Button>
  )
}

// The Send link under a turn-end card. It sends like the s key on this card, and it is dim when the card is not live.
function turnEndSend($: any, ui: any, r: Reading, a: Act, live: boolean) {
  const dim = !live || a.steps.length === 0 || isQuiet()
  return sendLink(ui, dim, () => { if (live && !isQuiet()) void send($, r, 'submit') })
}

// The footer names the picked steps: one step with its name, or the numbers of several.
function sourceOf(r: Reading, picked: number[]): string | undefined {
  if (!picked.length) return undefined
  const steps = r.result?.steps ?? []
  const numbers = picked.map((i) => visibleNo(steps, i))
  if (picked.length > 1) return `Source: steps ${numbers.join(', ')}`
  return `Source: step ${numbers[0]} ${stepName(steps[picked[0] as number] as Step)}`
}

function draftBlock(ui: any, r: Reading, a: Act) {
  const draft = draftFor(r, a)
  return draftBox(ui, { text: draft.text, footer: sourceOf(r, draft.steps), lit: Boolean(draft.text) && !isQuiet(), notice: a.notice })
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

// The blocks of one card, in draw order: the title row, each step row, and the draft block.
// A notify step draws no row, so it adds no block.
export function card($: any, ui: any, r: Reading, a: Act, live: boolean): any[] {
  const steps = r.result?.steps ?? []
  const rows = steps.map((s, i) => (s.kind === 'notify' ? null : stepRow($, ui, r, s, i, a, live)))
  return [
    titleBlock(ui, r, live, steps.some((s) => s.kind !== 'notify')),
    ...rows,
    sendableNow(r, live) ? draftBlock(ui, r, a) : null,
    r.stop_kind === 'question' ? null : turnEndSend($, ui, r, a, live),
  ].filter((b) => b !== null)
}

// The note input of one reading. The pane draws it in the fixed top, under the key row.
export function noteInput($: any, ui: any, r: Reading, mark: Mark | undefined) {
  const { Input } = ui
  return <Input key={`note-${r.n}`} label="Note" value={mark?.note ?? ''} placeholder="Type an observation" submitLabel="save"
    onSubmit={(t: string) => void saveMark($, r.sessionId, r.n, { note: t })} />
}
