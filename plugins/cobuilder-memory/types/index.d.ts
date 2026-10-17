// The memory run state that the memory pane draws. One atom holds the newest run.
export type RunStep = 'query' | 'search' | 'questions' | 'reflect' | 'done' | 'failed'

export type CallState = { name: string; state: 'running' | 'done' | 'failed'; note: string }

export type RunRecord = { text: string; date: string; doc: string }

export type RunRecall =
  | { query: string; total: number; own: number; kept: RunRecord[] }
  | { query: string; reason: string }

export type RunState = {
  startedAt: string
  elapsedSec: number
  bank: string
  step: RunStep
  focus: string | null
  need: string
  calls: CallState[]
  recall: RunRecall | null
  page: { name: string; updated: string } | null
  reflects: { question: string; state: 'running' | 'done' | 'failed'; note: string }[]
  error: string | null
}

declare module 'claude-code' {
  interface PluginState {
    'cobuilder-memory': { run: RunState | null }
  }
}
