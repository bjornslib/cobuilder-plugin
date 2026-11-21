// The reader: one live reading at a time, from a main-loop Stop to a stored reading.
// It starts the priority-dev CLI as a process and never imports priority-dev (ADR-0045, ADR-0049).
import { atom, read as readAtom, update } from 'claude-code'
import type { PluginOptions } from 'claude-code'
import type { Digest, DigestAbstain, Question, Reading, ReadingResult } from '../types'
import { takeAnswers } from './answers'
import { cli } from './cli'
import { answersOf } from './labels'
import { clearPending, lostReadings, markPending } from './pending'

// The pane reads the same tick, so a write here redraws it.
const tick = atom({ plugin: 'cobuilder-priority', key: 'tick' } as const, 0)
// The reader switch. A stop that waits runs only while the switch is still on.
const switchedOn = atom({ plugin: 'cobuilder-priority', key: 'on' } as const, false)

export const PANE_ID = 'priority-reader'

// A held AskUserQuestion call: its questions file is the --open-question input of the reading.
export type QuestionJob = { toolUseId: string; questions: Question[]; file: string }

export type StopJob = { sessionId: string; transcript: string; repo: string; at: string; lastMessage: string; question?: QuestionJob }

const LOG_DIR = 'reports/logs/live'
// The running indicator moves once each 120 ms while a reading runs.
const FRAME_MS = 120

// Module values: a hot reload starts them over, and a reading in flight then ends on its own.
let busy = false
// True while the reading that runs is the one of a held question.
let onQuestion = false
let waiting: StopJob | null = null
// True from a prompt until the next reading is saved. The pane and the band wait for that reading.
let awaiting = false

export const readingsKey = (sessionId: string) => `readings:${sessionId}`

// True while a reading runs. The pane shows it as running….
export const isBusy = () => busy

// True while the running reading is the one of a held question. The pane header shows ready then.
export const isQuestionBusy = () => busy && onQuestion

// True while a reading runs or the reader waits for the next one. The previous turn dims then.
export const isQuiet = () => busy || awaiting

export const isWaiting = () => awaiting

// Called at a prompt.submit. The pane redraws, so the previous turn dims until the next reading.
export async function startWaiting($: any): Promise<void> {
  awaiting = true
  await update($, tick, (n) => n + 1)
}

// Ends the wait with no reading: a switch off, a stop the switch skips, or a turn that aborts.
export async function stopWaiting($: any): Promise<void> {
  awaiting = false
  await update($, tick, (n) => n + 1)
}

// Puts the stop in the queue and starts a reading when none runs. Only the newest waiting stop is kept.
export async function enqueue($: any, job: StopJob, options: PluginOptions): Promise<void> {
  // The record must exist before the job can run or wait, so a reload cannot lose the job in silence.
  await markPending($, job)
  // A newer stop replaces a waiting one. The replaced stop gets no reading, so it is no longer pending.
  // The swap comes before the await, so a drain in that await takes the new job, not the replaced one.
  const replaced = waiting
  waiting = job
  if (replaced) await clearPending($, replaced.sessionId, replaced.at)
  // A reading may outlive its session or a module reload. Its $ calls then reject, and the reading is lost.
  if (!busy) drain($, options).catch(() => {})
}

async function drain($: any, options: PluginOptions): Promise<void> {
  busy = true
  try {
    while (waiting) {
      const job = waiting
      waiting = null
      onQuestion = Boolean(job.question)
      if (!(await readAtom($, switchedOn))) {
        // The person switched the reader off, so the skipped stop is not lost.
        await clearPending($, job.sessionId, job.at)
        await stopWaiting($)
        continue
      }
      await update($, tick, (n) => n + 1)
      await save($, await withSpinner($, job, options))
    }
  } finally {
    busy = false
    onQuestion = false
    // busy is not an atom, so this write redraws the pane without the indicator.
    await update($, tick, (n) => n + 1)
  }
}

// Runs one reading while the timer moves the running indicator. The timer stops on every path.
async function withSpinner($: any, job: StopJob, options: PluginOptions): Promise<Omit<Reading, 'n'>> {
  const timer = frameTimer($)
  try {
    return await read($, job, options)
  } finally {
    timer.cancel()
  }
}

// The indicator is cosmetic. A clock the engine refuses leaves the reading as it is.
function frameTimer($: any): { cancel: () => void } {
  try {
    return $.clock.every(FRAME_MS, () => void update($, tick, (n) => n + 1))
  } catch {
    return { cancel: () => undefined }
  }
}

function missingSettings(options: PluginOptions): string[] {
  return ['priority_dev_dir', 'program'].filter((name) => !String(options[name] ?? '').trim())
}

async function read($: any, job: StopJob, options: PluginOptions): Promise<Omit<Reading, 'n'>> {
  const started = Date.now()
  const base = { sessionId: job.sessionId, at: job.at, repo: job.repo, program: String(options.program ?? ''), ...answersOf(job.lastMessage), ...questionFields(job) }
  const failed = (error: string) => ({ ...base, brief: 'digest-current' as const, state: 'failed' as const, error, ms: Date.now() - started })
  const missing = missingSettings(options)
  if (missing.length) return failed(`Set ${missing.join(' and ')} in /config for cobuilder-priority.`)
  try {
    const digest = await cli($, ['digest', job.transcript, '--log-dir', LOG_DIR], options)
    const brief = await briefShape($, job.sessionId, isAbstain(digest))
    const label = brief === 'digest-current' ? 'current' : 'previous'
    const args = ['interpret', job.transcript, '--log-dir', LOG_DIR, '--program', base.program, '--digest', label, ...openQuestionArgs(job)]
    const result = (await cli($, args, options)) as ReadingResult
    const kept = isAbstain(digest) ? { digestAbstain: abstainOf(digest as DigestAbstain) } : { digest: digest as Digest }
    return { ...base, brief, state: 'done', result, ...kept, ms: Date.now() - started }
  } catch (err) {
    return failed(String((err as Error)?.message ?? err))
  }
}

// The fields of a reading of a held question. A turn-end reading has none.
function questionFields(job: StopJob): Partial<Pick<Reading, 'stop_kind' | 'questions' | 'toolUseId'>> {
  return job.question ? { stop_kind: 'question', questions: job.question.questions, toolUseId: job.question.toolUseId } : {}
}

function openQuestionArgs(job: StopJob): string[] {
  return job.question ? ['--open-question', job.question.file] : []
}

// A digest abstain stores nothing: the brief then holds the digest of an earlier stop, or none.
async function briefShape($: any, sessionId: string, abstained: boolean): Promise<Reading['brief']> {
  const key = `digested:${sessionId}`
  if (!abstained) {
    await $.store.set(key, true)
    return 'digest-current'
  }
  return (await $.store.get(key)) ? 'digest-previous' : 'no-digest'
}

// The reason always, and the detail when the CLI gave one.
function abstainOf({ reason, detail }: DigestAbstain): DigestAbstain {
  return detail === undefined ? { reason } : { reason, detail }
}

function isAbstain(digest: unknown): boolean {
  return typeof digest === 'object' && digest !== null && 'reason' in digest
}

// Called at a session.start. Each lost stop gets a failed reading, found in pending.ts.
export async function failLostStops($: any, options: PluginOptions): Promise<void> {
  const on = await readAtom($, switchedOn)
  for (const reading of await lostReadings($, options, on)) await save($, reading)
}

async function save($: any, reading: Omit<Reading, 'n'>): Promise<void> {
  const key = readingsKey(reading.sessionId)
  const list = ((await $.store.get(key)) as Reading[] | undefined) ?? []
  const n = list.length + 1
  await $.store.set(key, [...list, { ...reading, n }])
  // Cleared only once the reading is stored: a failed write leaves the stop pending for the next start.
  await clearPending($, reading.sessionId, reading.at)
  if (reading.stop_kind === 'question') await takeAnswers($, { ...reading, n })
  // At a stop the session waits for the next prompt. The status line says a reading is ready.
  const what = reading.state === 'failed' ? 'failed' : `ready${reading.result?.needs_human ? ' · needs you' : ''}`
  $.ui.status(`Priority reader · #${n} ${what}`)
  if (asksPerson(reading)) $.ui.toast(`Priority reader · #${n} needs you`)
  awaiting = false
  await scrollPaneToTop($)
  await update($, tick, (t) => t + 1)
}

// Moves the pane body to its first row, so a new card opens at the top. The move is cosmetic:
// a move the engine refuses, or cannot answer, leaves the saved reading as it is.
export async function scrollPaneToTop($: any): Promise<void> {
  await $.ui.scroll({ to: 'start', in: PANE_ID }).catch(() => undefined)
}

// Only a done reading that needs the person raises the toast. A failed or abstained one does not.
function asksPerson(reading: Omit<Reading, 'n'>): boolean {
  return reading.state === 'done' && !reading.result?.abstain && reading.result?.needs_human === true
}
