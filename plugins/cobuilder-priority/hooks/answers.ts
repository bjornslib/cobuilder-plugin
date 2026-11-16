// The answers of a held question, stored on the mark of its reading. A reading that lands after Send takes them.
import type { EngineInterface } from 'claude-code'
import type { Mark, Reading } from '../types'

export type Answer = { sessionId: string; toolUseId: string; answers: Record<string, string> }

const marksKey = (sessionId: string) => `marks:${sessionId}`
const readingsKey = (sessionId: string) => `readings:${sessionId}`
const pendingKey = (sessionId: string) => `asked:${sessionId}`

async function writeMark($: EngineInterface, answer: Answer, n: number): Promise<void> {
  const key = marksKey(answer.sessionId)
  const marks = ((await $.store.get(key)) as Record<string, Mark> | undefined) ?? {}
  const old = marks[String(n)] ?? { verdict: null, note: '', at: '' }
  await $.store.set(key, { ...marks, [String(n)]: { ...old, answers: answer.answers, at: new Date().toISOString() } })
}

export async function recordAnswers($: EngineInterface, answer: Answer): Promise<void> {
  const list = ((await $.store.get(readingsKey(answer.sessionId))) as Reading[] | undefined) ?? []
  const reading = list.find((r) => r.toolUseId === answer.toolUseId)
  if (reading) return writeMark($, answer, reading.n)
  await $.store.set(pendingKey(answer.sessionId), answer)
}

export async function takeAnswers($: EngineInterface, reading: Reading): Promise<void> {
  const pending = (await $.store.get(pendingKey(reading.sessionId))) as Answer | null | undefined
  if (!pending || pending.toolUseId !== reading.toolUseId) return
  await $.store.set(pendingKey(reading.sessionId), null)
  await writeMark($, pending, reading.n)
}
