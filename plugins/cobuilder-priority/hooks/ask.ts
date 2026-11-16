// The AskUserQuestion hook. With the reader on, a main-loop call is held in the pane and Send answers it.
// A subagent call, or the reader off, passes to the dialog. A failed child passes to the dialog too.
import { atom, read, update, type EngineInterface, type PluginOptions, type ToolCallResult } from 'claude-code'
import type { HeldQuestion, Question } from '../types'
import { recordAnswers } from './answers'
import { allAnswered, answerOf, holdInChild, holdPaths, type AskResult } from './hold'
import { PANE_ID, enqueue, type StopJob } from './reader'

const heldAtom = atom({ plugin: 'cobuilder-priority', key: 'held' } as const, null as HeldQuestion | null)
const switchedOn = atom({ plugin: 'cobuilder-priority', key: 'on' } as const, false)

export type AskEvent = { tool_use_id: string; questions: Question[]; agentId?: string; transcript_path?: string; cwd?: string }

export type Next = { (e: unknown): Promise<ToolCallResult>; signal: AbortSignal }

let release: ((answer: AskResult) => void) | null = null
let holding = false

// True while a call waits in the child. A queued prompt must not clear a live card.
export const isHolding = () => holding

export async function holdAsk($: EngineInterface, options: PluginOptions, e: AskEvent, next: Next): Promise<ToolCallResult> {
  const dev = String(options.priority_dev_dir ?? '').trim()
  if (e.agentId !== undefined || !dev || !(await read($, switchedOn))) return next(e)
  holding = true
  let outcome: Awaited<ReturnType<typeof waitForAnswer>>
  try {
    outcome = await waitForAnswer($, options, e)
  } finally {
    holding = false
  }
  if (next.signal.aborted) return { deny: 'The person interrupted the question.' }
  await dropHeld($)
  return outcome.kind === 'answered' ? { result: outcome.result } : next(e)
}

// Shows the card, runs the question job, and waits in the child.
async function waitForAnswer($: EngineInterface, options: PluginOptions, e: AskEvent) {
  const dir = `${String(options.priority_dev_dir).trim().replace(/\/+$/, '')}/reports/logs/live/ask`
  const questionFile = `${dir}/${e.tool_use_id}.questions.json`
  await $.fs.write(questionFile, JSON.stringify(e.questions))
  enqueue($, questionJob(e, questionFile, await $.session.id()), options)
  await update($, heldAtom, () => ({ toolUseId: e.tool_use_id, questions: e.questions, picks: {}, other: {}, notice: '' }))
  await $.ui.open({ id: PANE_ID, title: 'Priority reader', focus: true, columns: 60 })
  const sent = new Promise<AskResult>((resolve) => { release = resolve })
  return holdInChild($, holdPaths(dir, e.tool_use_id), sent)
}

function questionJob(e: AskEvent, file: string, sessionId: string): StopJob {
  return {
    sessionId,
    transcript: e.transcript_path ?? '',
    repo: e.cwd ?? '',
    at: new Date().toISOString(),
    lastMessage: '',
    question: { toolUseId: e.tool_use_id, questions: e.questions, file },
  }
}

export async function sendAnswers($: EngineInterface): Promise<void> {
  const held = await read($, heldAtom)
  if (!held) return
  if (!allAnswered(held)) return noteHeld($, 'Answer each question first')
  const result = answerOf(held)
  await recordAnswers($, { sessionId: await $.session.id(), toolUseId: held.toolUseId, answers: result.answers })
  release?.(result)
}

async function noteHeld($: EngineInterface, notice: string): Promise<void> {
  await update($, heldAtom, (h) => (h ? { ...h, notice } : h))
}

function choose(h: HeldQuestion, i: number, label: string): HeldQuestion {
  const current = h.picks[i] ?? []
  const multi = h.questions[i]?.multiSelect === true
  const next = !multi ? [label] : current.includes(label) ? current.filter((l) => l !== label) : [...current, label]
  return { ...h, notice: '', picks: { ...h.picks, [i]: next } }
}

export async function pickOption($: EngineInterface, i: number, label: string): Promise<void> {
  await update($, heldAtom, (h) => (h ? choose(h, i, label) : h))
}

export async function setOther($: EngineInterface, i: number, text: string): Promise<void> {
  await update($, heldAtom, (h) => (h ? { ...h, notice: '', other: { ...h.other, [i]: text } } : h))
}

export async function dropHeld($: EngineInterface): Promise<void> {
  release = null
  await update($, heldAtom, () => null)
}
