// The answer labels of the last agent message, with no model call (contracts.md, E3.11).
const LABELS = ['FYI', 'Summary', 'Next steps', 'Decisions and questions']
// A label line may be a heading or a bullet, in bold, with a colon inside or after the bold.
const HEAD = /^\s*(?:#{1,6}\s+|[-*]\s+)?(?:\*\*)?(FYI|Summary|Next steps|Decisions and questions):?(?:\*\*)?:?\s*$/i

type Part = { label: string; body: string[] }

// Gives the label in the spelling of LABELS, whatever its case in the message.
function canonical(word: string): string {
  return LABELS.find((label) => label.toLowerCase() === word.toLowerCase()) ?? word
}

function partsOf(text: string): Part[] {
  const parts: Part[] = []
  for (const line of text.split('\n')) {
    const word = HEAD.exec(line)?.[1]
    const label = word && canonical(word)
    if (label) parts.push({ label, body: [] })
    else parts[parts.length - 1]?.body.push(line)
  }
  return parts
}

export function answerLabels(text: string): string[] {
  return partsOf(text).map((part) => part.label)
}

export function agentSummary(text: string): string | undefined {
  const body = partsOf(text).find((part) => part.label === 'Summary')?.body.join('\n').trim()
  return body || undefined
}
