// The fixed key row under the header (contracts.md, E3.7).
import type { Act, Mark, Reading } from '../types'
import { saveMark, send, toggleSummary } from './act'
import { sendableNow } from './card'
import { isQuiet } from './reader'

// The widest key row with its word labels. A narrower pane shows one glyph for each key.
const KEY_LABEL_COLUMNS = 56

function verdict(mark: Mark | undefined, v: 'right' | 'wrong', label: string, wide: boolean) {
  const marked = mark?.verdict === v
  // Right and Wrong keep their own glyph in a narrow pane. Brackets show the mark.
  // Right and Wrong keep their own glyph in a narrow pane. Brackets show the mark.
  if (!wide) return marked ? `[${v === 'right' ? '✓' : '✗'}]` : (v === 'right' ? '✓' : '✗')
  return marked ? `${label} ✓` : label
}

// Send and Edit do nothing while a reading runs or the reader waits. The check runs at each press.
const whenIdle = (submit: () => Promise<void>) => () => { if (!isQuiet()) void submit() }

export function keyRow($: any, ui: any, r: Reading, mark: Mark | undefined, a: Act, live: boolean, columns: number) {
  const { Box, Button } = ui
  const sendable = sendableNow(r, live)
  const none = a.steps.length === 0
  const dim = isQuiet()
  const wide = columns >= KEY_LABEL_COLUMNS
  const summary = wide ? (a.summaryClosed ? 'Show summary' : 'Hide summary') : (a.summaryClosed ? '▸' : '▾')
  return (
    <Box key="keys" flexDirection="row" columnGap={2} height={1} overflow="hidden">
      {sendable ? <Button key="send" plain hotkey="s" label={wide ? 'Send' : '▶'} dimColor={none || dim} onPress={whenIdle(() => send($, r, 'submit'))} /> : null}
      {sendable ? <Button key="edit" plain hotkey="e" label={wide ? 'Edit' : '✎'} dimColor={none || dim} onPress={whenIdle(() => send($, r, 'fill'))} /> : null}
      <Button key={`right-${r.n}`} plain hotkey="r" label={verdict(mark, 'right', 'Right', wide)} onPress={() => void saveMark($, r.sessionId, r.n, { verdict: 'right' })} />
      <Button key={`wrong-${r.n}`} plain hotkey="w" label={verdict(mark, 'wrong', 'Wrong', wide)} onPress={() => void saveMark($, r.sessionId, r.n, { verdict: 'wrong' })} />
      <Button key="summary" plain hotkey="m" label={summary} onPress={() => void toggleSummary($)} />
    </Box>
  )
}
