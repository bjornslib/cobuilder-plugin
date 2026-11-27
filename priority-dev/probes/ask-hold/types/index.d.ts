export type Question = {
  question: string
  header?: string
  multiSelect?: boolean
  options: { label: string; description?: string }[]
}

export type Picks = Record<number, string[]>

export type ShapeId = 'answers-by-question' | 'answers-list' | 'text'

export type Mode = 'hold' | 'hold-spawn' | 'pass' | 'off'

export type Held = { questions: Question[]; picks: Picks; other: Record<number, string>; shape: ShapeId; startedAt: number }

declare module 'claude-code' {
  interface PluginState {
    'ask-hold-probe': { mode: Mode; held: Held | null; tick: number }
  }
}
