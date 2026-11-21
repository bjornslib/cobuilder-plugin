// The pending record: a stop is pending from its enqueue until its reading is saved.
// The record sits in $.store, which a reload of the mod keeps. Module values do not survive a reload.

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
