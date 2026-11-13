// Readings for the E3.12 live-run tests. The runner reads *.test.ts only,
// so this file holds no test cases.
import { WAITING } from './fakes'

// The live run of 0.3.0 (E3.12): a notify step, then one decide step with two options.
export const LIVE_DECIDE = {
  status: 'waiting_answer',
  needs_human: true,
  priority: 'P2',
  steps: [
    { kind: 'notify', excerpt: 'Ran the STE linter.' },
    {
      kind: 'ask_human',
      detail: {
        role: 'decide',
        questions: [
          {
            ask: 'Fix the flagged lines?',
            options: [
              { label: 'Fix the flagged lines', detail: 'Split sentences.' },
              { label: 'Leave CLAUDE.md unchanged', detail: 'Make no edits.' },
            ],
            multi_select: false,
            free_text: false,
            agent_recommendation: 'Fix the flagged lines',
            helps: [],
          },
        ],
      },
    },
  ],
  abstain: null,
}

// E3.12: a notify step before, between, and after the selectable steps. The visible rows number 1 and 2.
export const NOTIFY_GAP = {
  ...WAITING,
  steps: [
    { kind: 'notify', excerpt: 'Ran the tests.' },
    { kind: 'reply', text: 'Run the tests.' },
    { kind: 'notify', excerpt: 'Lint passed.' },
    { kind: 'approve_permission', scope: 'once' },
  ],
}
