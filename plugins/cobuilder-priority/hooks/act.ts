// What each press on the pane does: select steps, answer questions, mark, and send.
// Nothing reaches the session without a press of Send or Edit (ADR-0049).
import { atom, read, update } from 'claude-code'
import type { Act, Mark, Reading } from '../types'
import { draftOf } from './draft'

export const EMPTY: Act = { n: 0, steps: [], picks: {}, other: {}, summaryClosed: false, open: null, notice: '' }
const act = atom({ plugin: 'cobuilder-priority', key: 'act' } as const, EMPTY)
const tick = atom({ plugin: 'cobuilder-priority', key: 'tick' } as const, 0)

export const marksKey = (sessionId: string) => `marks:${sessionId}`

// The selection belongs to one reading. A newer reading starts with an empty one.
export async function actFor($: any, newest: number): Promise<Act> {
  const state = await read($, act)
  return state.n === newest ? state : { ...EMPTY, summaryClosed: state.summaryClosed, open: state.open }
}

async function change($: any, newest: number, fn: (a: Act) => Act): Promise<void> {
  const current = await actFor($, newest)
  await update($, act, () => ({ ...fn(current), n: newest }))
}

export async function toggleStep($: any, n: number, i: number): Promise<void> {
  await change($, n, (a) => ({ ...a, notice: '', steps: a.steps.includes(i) ? a.steps.filter((s) => s !== i) : [...a.steps, i] }))
}

const withStep = (a: Act, key: string) => {
  const step = Number(key.split('.')[0])
  return a.steps.includes(step) ? a.steps : [...a.steps, step]
}

// A pick selects its step. A single-choice question keeps one pick.
export async function pick($: any, n: number, key: string, label: string, multi: boolean): Promise<void> {
  await change($, n, (a) => {
    const old = a.picks[key] ?? []
    const next = old.includes(label) ? old.filter((l) => l !== label) : multi ? [...old, label] : [label]
    return { ...a, notice: '', picks: { ...a.picks, [key]: next }, steps: withStep(a, key) }
  })
}

export async function answer($: any, n: number, key: string, text: string): Promise<void> {
  await change($, n, (a) => ({ ...a, other: { ...a.other, [key]: text }, steps: withStep(a, key) }))
}

export async function toggleSummary($: any): Promise<void> {
  await update($, act, (a) => ({ ...a, summaryClosed: !a.summaryClosed }))
}

export async function openCard($: any, n: number | null): Promise<void> {
  await update($, act, (a) => ({ ...a, open: n }))
}

export function draftFor(r: Reading, a: Act) {
  return draftOf(r.result?.steps ?? [], a.steps, a.picks, a.other)
}

export async function saveMark($: any, sessionId: string, n: number, change: Partial<Mark>): Promise<void> {
  const key = marksKey(sessionId)
  const marks = ((await $.store.get(key)) as Record<string, Mark> | undefined) ?? {}
  const old = marks[String(n)] ?? { verdict: null, note: '' }
  await $.store.set(key, { ...marks, [String(n)]: { ...old, ...change, at: new Date().toISOString() } })
  await update($, tick, (t) => t + 1)
}

// Send submits the draft as the person. Edit puts it in the prompt box. Both record it on the mark.
export async function send($: any, r: Reading, how: 'submit' | 'fill'): Promise<void> {
  const draft = draftFor(r, await actFor($, r.n))
  if (!draft.steps.length) return
  if (how === 'submit') {
    await $.prompt.submit({ text: draft.text, asUser: true })
  } else if (!(await $.prompt.fill({ text: draft.text, mode: 'replace' })).isFilled) {
    await change($, r.n, (a) => ({ ...a, notice: 'The prompt box is not available' }))
    return
  }
  $.ui.status(undefined)
  await saveMark($, r.sessionId, r.n, { sent: { how, steps: draft.steps, text: draft.text, at: new Date().toISOString() } })
  await change($, r.n, (a) => ({ ...a, steps: [], picks: {}, other: {}, notice: '' }))
}
