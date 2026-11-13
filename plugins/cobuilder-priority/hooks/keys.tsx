// The fixed key row under the header (contracts.md, E3.7).
import type { Act, Mark, Reading } from '../types'
import { saveMark, send, toggleSummary } from './act'
import { sendableNow } from './card'

function verdict(mark: Mark | undefined, v: 'right' | 'wrong', label: string) {
  return mark?.verdict === v ? `${label} ✓` : label
}

export function keyRow($: any, ui: any, r: Reading, mark: Mark | undefined, a: Act, live: boolean) {
  const { Box, Button } = ui
  const sendable = sendableNow(r, live)
  const none = a.steps.length === 0
  return (
    <Box key="keys" flexDirection="row" columnGap={2}>
      {sendable ? <Button key="send" plain hotkey="s" label="Send" dimColor={none} onPress={() => void send($, r, 'submit')} /> : null}
      {sendable ? <Button key="edit" plain hotkey="e" label="Edit" dimColor={none} onPress={() => void send($, r, 'fill')} /> : null}
      <Button key={`right-${r.n}`} plain hotkey="r" label={verdict(mark, 'right', 'Right')} onPress={() => void saveMark($, r.sessionId, r.n, { verdict: 'right' })} />
      <Button key={`wrong-${r.n}`} plain hotkey="w" label={verdict(mark, 'wrong', 'Wrong')} onPress={() => void saveMark($, r.sessionId, r.n, { verdict: 'wrong' })} />
      <Button key="summary" plain hotkey="m" label="Summary" onPress={() => void toggleSummary($)} />
    </Box>
  )
}
