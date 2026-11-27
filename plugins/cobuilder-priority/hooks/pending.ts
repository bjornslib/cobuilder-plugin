// The pending record: a stop is pending from its enqueue until its reading is saved.
// The record sits in $.store, which a reload of the mod keeps. Module values do not survive a reload.
import type { PluginOptions } from 'claude-code'
import type { Reading } from '../types'

const PREFIX = 'pending:'

// What a lost reading needs to name its stop.
export type PendingStop = { sessionId: string; at: string; repo: string }

const keyOf = (sessionId: string, at: string) => `${PREFIX}${sessionId}:${at}`

// A store that refuses the write leaves the reading as it is. Only the reload safety is lost.
export async function markPending($: any, stop: PendingStop): Promise<void> {
  await $.store.set(keyOf(stop.sessionId, stop.at), { sessionId: stop.sessionId, at: stop.at, repo: stop.repo }).catch(() => undefined)
}

export async function clearPending($: any, sessionId: string, at: string): Promise<void> {
  await $.store.delete(keyOf(sessionId, at)).catch(() => undefined)
}

// The pending stops in the store. A store with no key list gives none.
export async function listPending($: any): Promise<PendingStop[]> {
  const keys = ((await $.store.keys().catch(() => [])) as string[] | undefined) ?? []
  const stops = await Promise.all(keys.filter((key) => key.startsWith(PREFIX)).map((key) => $.store.get(key).catch(() => undefined)))
  return stops.filter((stop): stop is PendingStop => Boolean(stop))
}

// Called at a session.start, which runs again after a reload. A stop still pending lost its reading,
// because the module values of the old run are gone. Each such stop gets a failed reading.
// Only the stops of this session: the store is shared, and another live session may still read its own stop.
// `on` is the reader switch, read by the caller. The reader saves each failed reading it gets back.
export async function lostReadings($: any, options: PluginOptions, on: boolean): Promise<Omit<Reading, 'n'>[]> {
  const sessionId = await $.session.id()
  const readings: Omit<Reading, 'n'>[] = []
  for (const lost of (await listPending($)).filter((stop) => stop.sessionId === sessionId)) {
    // A reader switched off skips its stops on purpose. Such a stop gets no reading.
    if (!on) {
      await clearPending($, lost.sessionId, lost.at)
      continue
    }
    const error = 'Lost to a reload of the mod. The next stop reads again.'
    readings.push({ sessionId: lost.sessionId, at: lost.at, repo: lost.repo, program: String(options.program ?? ''), brief: 'no-digest', state: 'failed', error, ms: 0 })
  }
  return readings
}
