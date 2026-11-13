// The plain names of the pane. The table is contracts.md, "Plain names".
// An unknown raw value passes through unchanged.

type Step = Record<string, unknown>
type Namer = (step: Step) => string

const STATUS = new Map([
  ['done', 'Done'],
  ['continuing', 'Still working'],
  ['waiting_answer', 'Waits for your answer'],
  ['waiting_permission', 'Waits for your permission'],
  ['blocked', 'Blocked'],
  ['failed', 'Failed'],
])

const PRIORITY = new Map([
  ['P0', 'P0 Urgent'],
  ['P1', 'P1 High'],
  ['P2', 'P2 Normal'],
  ['P3', 'P3 Low'],
  ['P4', 'P4 Can wait'],
])

const ABSTAIN = new Map([
  ['model_error', 'The model call failed'],
  ['invalid_output', "The model's answer could not be read"],
  ['no_agent_reply', 'No agent reply to read'],
  ['brief_too_large', 'The session is too long to read'],
])

const BRIEF = new Map([
  ['digest-current', ''],
  ['digest-previous', 'Summary of the previous stop'],
  ['no-digest', 'No summary'],
])

const STEP = new Map([
  ['reply', 'Reply'],
  ['continue', 'Continue'],
  ['deny_permission', 'Denied permission'],
  ['approve_gate', 'Approve the gate'],
  ['send_feedback', 'Send feedback'],
  ['interrupt', 'Stop the turn'],
  ['notify', 'Notification'],
  ['dismiss', 'Dismiss: done, out of date, duplicate, or read'],
])

const ROLE = new Map([
  ['decide', 'You decide'],
  ['do', 'You do this'],
  ['review', 'You review'],
])

const SNOOZE = new Map([
  ['session_idle', 'Wait until the session is idle'],
  ['turn_end', 'Wait until the turn ends'],
])

function askName(step: Step): string {
  const role = String((step.detail as Step | undefined)?.role ?? '')
  return ROLE.get(role) ?? `ask_human · ${role}`
}

const FIELD_NAMES = new Map<string, Namer>([
  ['continue_until', (s) => `Continue until: ${String(s.goal)} (${String(s.max_turns)} turns, ${String(s.max_minutes)} min)`],
  ['pick_option', (s) => `Pick option ${Number(s.index) + 1}`],
  ['approve_permission', (s) => (s.scope === 'session' ? 'Allow for this session' : 'Allow')],
  ['ask_human', askName],
  ['snooze', (s) => SNOOZE.get(String(s.until_event)) ?? 'snooze'],
])

export function statusName(raw: string): string {
  return STATUS.get(raw) ?? raw
}

export function priorityName(raw: string): string {
  return PRIORITY.get(raw) ?? raw
}

export function abstainName(raw: string): string {
  return ABSTAIN.get(raw) ?? raw
}

export function briefName(raw: string): string {
  return BRIEF.get(raw) ?? raw
}

export function stepName(step: Step): string {
  const kind = String(step.kind)
  const named = FIELD_NAMES.get(kind)
  return named ? named(step) : (STEP.get(kind) ?? kind)
}
