// The reader switch, the redraw tick, the pane's selection, and the body offset, kept in $.state.
// Readings and marks live in $.store, so they outlive the session.

export type Verdict = 'right' | 'wrong'

export type Sent = { how: 'submit' | 'fill'; steps: number[]; text: string; at: string }

export type Mark = { verdict: Verdict | null; note: string; at: string; sent?: Sent }

export type ReadingResult = {
  status: string | null
  needs_human: boolean | null
  priority: string | null
  steps: Record<string, unknown>[]
  abstain: { reason: string; detail?: string } | null
}

// The RunDigest that priority digest prints when it does not abstain.
export type Digest = { ran: string; result: string; open_items: string[]; decisions: string[] }

export type Reading = {
  n: number
  sessionId: string
  at: string
  repo: string
  program: string
  brief: 'digest-current' | 'digest-previous' | 'no-digest'
  state: 'done' | 'failed'
  result?: ReadingResult
  digest?: Digest
  error?: string
  ms: number
  // The answer labels of the last agent message, in order. Readings from before E3.11 have none.
  labels?: string[]
  // The text of the agent's own Summary part, when the message has one.
  agentSummary?: string
}

// What the pane holds between presses. `n` names the reading the selection belongs to.
// Picks and free text are keyed `<step>.<question>`.
export type Act = {
  n: number
  steps: number[]
  picks: Record<string, string[]>
  other: Record<string, string>
  summaryClosed: boolean
  open: number | null
  notice: string
}

declare module 'claude-code' {
  interface PluginState {
    'cobuilder-priority': { on: boolean; tick: number; act: Act; scroll: number }
  }
}
