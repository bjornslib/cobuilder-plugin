// The draft: the text that the selected steps of one reading send to the session.
// Pure functions. contracts.md, section "What each step kind gives", is the table.

type Step = Record<string, any>
type Picks = Record<string, string[]>
type Others = Record<string, string>

const SILENT = new Set(['interrupt', 'notify', 'snooze', 'dismiss'])

export function canSend(step: Step): boolean {
  return !SILENT.has(String(step.kind))
}

// The number a step shows. A notify step takes no number, so the visible steps read 1 to n.
export function visibleNo(steps: Step[], i: number): number {
  return steps.slice(0, i + 1).filter((s) => s.kind !== 'notify').length
}

const plus = (head: string, tail?: string) => (tail ? `${head} ${tail}` : head)

function decideLine(step: Step, i: number, picks: Picks, other: Others): string | null {
  const lines = (step.detail.questions as Step[]).flatMap((q, j) => {
    const chosen = picks[`${i}.${j}`] ?? []
    const free = other[`${i}.${j}`]?.trim()
    if (!chosen.length && !free) return []
    const answer = [chosen.join(', '), free].filter(Boolean).join('; ')
    return [`${q.ask} → ${answer}`]
  })
  return lines.length ? lines.join('\n') : null
}

function humanLine(step: Step, i: number, picks: Picks, other: Others): string | null {
  const free = other[`${i}.0`]?.trim()
  if (step.detail.role === 'decide') return decideLine(step, i, picks, other)
  if (step.detail.role === 'do') return plus(`Done: ${(step.detail.steps as string[]).join('; ')}.`, free)
  return plus(`Done: reviewed ${step.detail.artifact}.`, free)
}

function line(step: Step, i: number, picks: Picks, other: Others): string | null {
  switch (step.kind) {
    case 'reply': return step.text
    case 'continue': return 'Continue.'
    case 'continue_until': {
      const proof = step.proof?.show || step.proof?.command || step.proof?.kind
      return `Continue until: ${step.goal}. Proof: ${proof}. Stop after ${step.max_turns} turns or ${step.max_minutes} minutes.`
    }
    case 'send_feedback': return step.gate ? `Feedback on ${step.gate}: ${step.notes}` : step.notes
    case 'approve_gate': return plus(`Approved: ${step.gate}.`, step.notes)
    case 'approve_permission':
      return plus('Yes, go ahead.', step.scope === 'session' ? 'You may do the same for the rest of this session.' : '')
    case 'deny_permission': return plus('No, do not do that.', step.reason)
    case 'pick_option': return `Option ${Number(step.index) + 1}.`
    case 'ask_human': return humanLine(step, i, picks, other)
    default: return null
  }
}

// Joins the lines of the selected steps in step order. A step with no line is left out.
export function draftOf(steps: Step[], selected: number[], picks: Picks, other: Others): { text: string; steps: number[] } {
  const used: number[] = []
  const lines: string[] = []
  for (const i of [...new Set(selected)].sort((a, b) => a - b)) {
    const step = steps[i]
    if (!step || !canSend(step)) continue
    const text = line(step, i, picks, other)
    if (text) { used.push(i); lines.push(text) }
  }
  return { text: lines.join('\n\n'), steps: used }
}
