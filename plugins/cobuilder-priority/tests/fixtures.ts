// Readings for the E3.12 live-run tests. The runner reads *.test.ts only,
// so this file holds no test cases.
import { ACTIONABLE, WAITING } from './fakes'

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

// E3.12: a card of twelve reply steps, taller than the pane body.
export const TALL_CARD = { ...ACTIONABLE, steps: Array.from({ length: 12 }, (_, k) => ({ kind: 'reply', text: `Reply ${k + 1}.` })) }

// A decide step with two questions, each with two options.
const question = (ask: string) => ({
  ask,
  options: [{ label: 'Yes', detail: '' }, { label: 'No', detail: '' }],
  multi_select: false,
  free_text: false,
  helps: [],
})

export const TWO_QUESTIONS = {
  ...WAITING,
  steps: [{ kind: 'ask_human', detail: { role: 'decide', questions: [question('Keep the marks?'), question('Ship it now?')] } }],
}

// A digest with both lists: two open items and one decision.
export const DIGEST_LISTS = {
  ran: 'The agent ran the tests.',
  result: 'Two items wait.',
  open_items: ['Ship the fix', 'Ask the owner'],
  decisions: ['Keep $.store'],
}
