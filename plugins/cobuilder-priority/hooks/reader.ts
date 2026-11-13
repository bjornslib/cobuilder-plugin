// The reader: one live reading at a time, from a main-loop Stop to a stored reading.
// It starts the priority-dev CLI as a process and never imports priority-dev (ADR-0045, ADR-0049).
import { atom, read as readAtom, update } from 'claude-code'
import type { PluginOptions } from 'claude-code'
import type { Digest, Reading, ReadingResult } from '../types'
import { agentSummary, answerLabels } from './labels'

// The pane reads the same tick, so a write here redraws it.
const tick = atom({ plugin: 'cobuilder-priority', key: 'tick' } as const, 0)
// The reader switch. A stop that waits runs only while the switch is still on.
const switchedOn = atom({ plugin: 'cobuilder-priority', key: 'on' } as const, false)

export type StopJob = { sessionId: string; transcript: string; repo: string; at: string; lastMessage: string }

const LOG_DIR = 'reports/logs/live'
const MAX_SECONDS = 600
// The running indicator moves once each 120 ms while a reading runs.
const FRAME_MS = 120

// Module values: a hot reload starts them over, and a reading in flight then ends on its own.
let busy = false
let waiting: StopJob | null = null

export const readingsKey = (sessionId: string) => `readings:${sessionId}`

// True while a reading runs. The pane shows it as running….
export const isBusy = () => busy

// Puts the stop in the queue and starts a reading when none runs. Only the newest waiting stop is kept.
export function enqueue($: any, job: StopJob, options: PluginOptions): void {
  waiting = job
  if (!busy) void drain($, options)
}

async function drain($: any, options: PluginOptions): Promise<void> {
  busy = true
  try {
    while (waiting) {
      const job = waiting
      waiting = null
      if (!(await readAtom($, switchedOn))) continue
      await update($, tick, (n) => n + 1)
      await save($, await withSpinner($, job, options))
    }
  } finally {
    busy = false
    // busy is not an atom, so this write redraws the pane without the indicator.
    await update($, tick, (n) => n + 1)
  }
}

// Runs one reading while the timer moves the running indicator. The timer stops on every path.
async function withSpinner($: any, job: StopJob, options: PluginOptions): Promise<Omit<Reading, 'n'>> {
  const timer = $.clock.every(FRAME_MS, () => void update($, tick, (n) => n + 1))
  try {
    return await read($, job, options)
  } finally {
    timer.cancel()
  }
}

function missingSettings(options: PluginOptions): string[] {
  return ['priority_dev_dir', 'program'].filter((name) => !String(options[name] ?? '').trim())
}

async function read($: any, job: StopJob, options: PluginOptions): Promise<Omit<Reading, 'n'>> {
  const started = Date.now()
  const base = { sessionId: job.sessionId, at: job.at, repo: job.repo, program: String(options.program ?? ''), ...answersOf(job.lastMessage) }
  const failed = (error: string) => ({ ...base, brief: 'digest-current' as const, state: 'failed' as const, error, ms: Date.now() - started })
  const missing = missingSettings(options)
  if (missing.length) return failed(`Set ${missing.join(' and ')} in /config for cobuilder-priority.`)
  try {
    const digest = await cli($, ['digest', job.transcript, '--log-dir', LOG_DIR], options)
    const brief = await briefShape($, job.sessionId, isAbstain(digest))
    const label = brief === 'digest-current' ? 'current' : 'previous'
    const args = ['interpret', job.transcript, '--log-dir', LOG_DIR, '--program', base.program, '--digest', label]
    const result = (await cli($, args, options)) as ReadingResult
    const kept = isAbstain(digest) ? {} : { digest: digest as Digest }
    return { ...base, brief, state: 'done', result, ...kept, ms: Date.now() - started }
  } catch (err) {
    return failed(String((err as Error)?.message ?? err))
  }
}

// The labels always; the Summary text only when the message has one.
function answersOf(text: string): { labels: string[]; agentSummary?: string } {
  const summary = agentSummary(text)
  return { labels: answerLabels(text), ...(summary ? { agentSummary: summary } : {}) }
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

function isAbstain(digest: unknown): boolean {
  return typeof digest === 'object' && digest !== null && 'reason' in digest
}

// Runs one priority command in the priority-dev folder and parses its JSON output.
async function cli($: any, args: string[], options: PluginOptions): Promise<unknown> {
  const seconds = Math.min(MAX_SECONDS, Number(options.timeout_seconds ?? 180) || 180)
  const key = String(options.llm_api_key ?? '').trim()
  const init = {
    cwd: String(options.priority_dev_dir),
    timeoutMs: seconds * 1000,
    ...(key ? { env: { LLM_API_KEY: key } } : {}),
  }
  const run = await $.process.run(['uv', 'run', 'priority', ...args], init)
  if (run.exitCode !== 0) {
    const last = String(run.stderr || run.stdout).trim().split('\n').pop() ?? ''
    throw new Error(`priority ${args[0]} exited with ${run.exitCode}: ${last}`)
  }
  try {
    return JSON.parse(run.stdout)
  } catch {
    throw new Error(`priority ${args[0]} printed no JSON: ${String(run.stdout).slice(0, 200)}`)
  }
}

async function save($: any, reading: Omit<Reading, 'n'>): Promise<void> {
  const key = readingsKey(reading.sessionId)
  const list = ((await $.store.get(key)) as Reading[] | undefined) ?? []
  const n = list.length + 1
  await $.store.set(key, [...list, { ...reading, n }])
  // At a stop the session waits for the next prompt. The status line says a reading is ready.
  const what = reading.state === 'failed' ? 'failed' : `ready${reading.result?.needs_human ? ' · needs you' : ''}`
  $.ui.status(`Priority reader · #${n} ${what}`)
  if (asksPerson(reading)) $.ui.toast(`Priority reader · #${n} needs you`)
  await update($, tick, (t) => t + 1)
}

// Only a done reading that needs the person raises the toast. A failed or abstained one does not.
function asksPerson(reading: Omit<Reading, 'n'>): boolean {
  return reading.state === 'done' && !reading.result?.abstain && reading.result?.needs_human === true
}
