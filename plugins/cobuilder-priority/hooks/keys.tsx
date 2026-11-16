// The fixed key row under the header (contracts.md, E3.7). A held question has its own row (question-card.svg).
import type { Act, HeldQuestion, Mark, Reading } from '../types'
import { saveMark, send, toggleSummary } from './act'
import { sendAnswers } from './ask'
import { sendableNow } from './card'
import { allAnswered } from './hold'
import { isQuiet } from './reader'

// The widest key row with its word labels. A narrower pane shows one glyph for each key.
const KEY_LABEL_COLUMNS = 56

function verdict(mark: Mark | undefined, v: 'right' | 'wrong', label: string, wide: boolean) {
  const marked = mark?.verdict === v
  // Right and Wrong keep their own glyph in a narrow pane. Brackets show the mark.
  if (!wide) return marked ? `[${v === 'right' ? '✓' : '✗'}]` : (v === 'right' ? '✓' : '✗')
  return marked ? `${label} ✓` : label
}

// Send and Edit do nothing while a reading runs or the reader waits. The check runs at each press.
const whenIdle = (submit: () => Promise<void>) => () => { if (!isQuiet()) void submit() }

// A key whose colour sits on a Text child, since a Button takes no colour of its own.
function keyButton(ui: any, key: string, hotkey: string, label: string, dim: boolean, onPress: () => void, colour?: string) {
  const { Button, Text } = ui
  return (
    <Button key={key} plain hotkey={hotkey} label={label} dimColor={dim} onPress={onPress}>
      {colour ? <Text color={colour}>{label}</Text> : undefined}
    </Button>
  )
}

// Right or Wrong marks the reading. With no reading yet, the key is dim.
function verdictKey(ui: any, $: any, v: 'right' | 'wrong', mark: Mark | undefined, wide: boolean, r: Reading | undefined) {
  const label = verdict(mark, v, v === 'right' ? 'Right' : 'Wrong', wide)
  const press = () => { if (r) void saveMark($, r.sessionId, r.n, { verdict: v }) }
  return keyButton(ui, `${v}-${r?.n ?? 0}`, v === 'right' ? 'r' : 'w', label, !r, press, v === 'right' ? 'green' : 'red')
}

function summaryKey($: any, ui: any, closed: boolean, wide: boolean) {
  const { Button } = ui
  const label = wide ? (closed ? 'Show summary' : 'Hide summary') : (closed ? '▸' : '▾')
  return <Button key="summary" plain hotkey="m" label={label} onPress={() => void toggleSummary($)} />
}

export function keyRow($: any, ui: any, r: Reading, mark: Mark | undefined, a: Act, live: boolean, columns: number) {
  const { Box } = ui
  const sendable = sendableNow(r, live)
  const none = a.steps.length === 0
  const dim = isQuiet()
  const wide = columns >= KEY_LABEL_COLUMNS
  return (
    <Box key="keys" flexDirection="row" columnGap={2} height={1} overflow="hidden">
      {sendable ? keyButton(ui, 'send', 's', wide ? 'Send' : '▶', none || dim, whenIdle(() => send($, r, 'submit')), 'cyan') : null}
      {sendable ? keyButton(ui, 'edit', 'e', wide ? 'Edit' : '✎', none || dim, whenIdle(() => send($, r, 'fill'))) : null}
      {verdictKey(ui, $, 'right', mark, wide, r)}
      {verdictKey(ui, $, 'wrong', mark, wide, r)}
      {summaryKey($, ui, a.summaryClosed, wide)}
    </Box>
  )
}

// Send is dim until every question has an answer. Edit is dim: a held answer goes back as the tool result.
export function questionKeyRow($: any, ui: any, held: HeldQuestion, r: Reading | undefined, mark: Mark | undefined, closed: boolean, columns: number) {
  const { Box } = ui
  const wide = columns >= KEY_LABEL_COLUMNS
  return (
    <Box key="keys" flexDirection="row" columnGap={2} height={1} overflow="hidden">
      {keyButton(ui, 'send', 's', wide ? 'Send' : '▶', !allAnswered(held), () => void sendAnswers($), 'cyan')}
      {keyButton(ui, 'edit', 'e', wide ? 'Edit' : '✎', true, () => undefined)}
      {verdictKey(ui, $, 'right', mark, wide, r)}
      {verdictKey(ui, $, 'wrong', mark, wide, r)}
      {summaryKey($, ui, closed, wide)}
    </Box>
  )
}
