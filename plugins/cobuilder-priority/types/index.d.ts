// The reader switch and the redraw tick that the reader pane reads.
// Readings and marks live in $.store, so they outlive the session.

export type Verdict = 'right' | 'wrong'

export type Mark = { verdict: Verdict | null; note: string; at: string }

export type ReadingResult = {
  status: string | null
  needs_human: boolean | null
  priority: string | null
  steps: Record<string, unknown>[]
  abstain: { reason: string; detail?: string } | null
}

export type Reading = {
  n: number
  sessionId: string
  at: string
  repo: string
  program: string
  brief: 'digest-current' | 'digest-previous' | 'no-digest'
  state: 'done' | 'failed'
  result?: ReadingResult
  error?: string
  ms: number
}

declare module 'claude-code' {
  interface PluginState {
    'cobuilder-priority': { on: boolean; tick: number }
  }
}
