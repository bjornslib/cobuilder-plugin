// The held call: its answer, its hand-off paths, and the wait in a child process.
// The wait runs inside $.process.spawn, which the engine's 10 s hook budget does not cut.
import type { EngineInterface, ProcessSpawnChunk, ProcessSpawnResult } from 'claude-code'
import type { HeldQuestion, Question } from '../types'

export type AskResult = { questions: Question[]; answers: Record<string, string>; response?: string }

export type HoldPaths = { answer: string; done: string }

export type Outcome = { kind: 'answered'; result: AskResult } | { kind: 'cut-off' }

const SCRIPT = 'until [ -e "$1" ]; do sleep 0.2; done; cat "$2"'

export function holdPaths(dir: string, toolUseId: string): HoldPaths {
  return { answer: `${dir}/${toolUseId}.answer.json`, done: `${dir}/${toolUseId}.done` }
}

export function waitArgv(paths: HoldPaths): string[] {
  return ['/bin/sh', '-c', SCRIPT, 'sh', paths.done, paths.answer]
}

export function typedOr(held: HeldQuestion, i: number): string[] {
  const text = (held.other[i] ?? '').trim()
  return text ? [text] : (held.picks[i] ?? [])
}

export const answeredCount = (held: HeldQuestion): number =>
  held.questions.filter((_, i) => typedOr(held, i).length > 0).length

export const allAnswered = (held: HeldQuestion): boolean =>
  held.questions.length > 0 && answeredCount(held) === held.questions.length

export function answerOf(held: HeldQuestion): AskResult {
  const answers = held.questions.map((q, i) => [q.question, typedOr(held, i).join(', ')])
  return { questions: held.questions, answers: Object.fromEntries(answers) }
}

// Reads the child for the whole hold. The time in that read is a $ call, so the 10 s hook budget
// does not count it. This is the read that the live probe proved.
async function drain($: EngineInterface, paths: HoldPaths): Promise<{ stdout: string; end: ProcessSpawnResult }> {
  const stream = $.process.spawn({ argv: waitArgv(paths) })
  let stdout = ''
  for await (const piece of stream as AsyncIterable<ProcessSpawnChunk>) {
    if (piece.stream === 'stdout') stdout += piece.text
  }
  return { stdout, end: await stream.result }
}

export async function holdInChild($: EngineInterface, paths: HoldPaths, sent: Promise<AskResult>): Promise<Outcome> {
  const run = drain($, paths)
  const sentFirst = await Promise.race([sent.then(() => true), run.then(() => false)])
  if (sentFirst) {
    const answer = await sent
    await $.fs.write(paths.answer, JSON.stringify(answer))
    await $.fs.write(paths.done, '')
  }
  return outcomeOf(await run)
}

function outcomeOf({ stdout, end }: { stdout: string; end: ProcessSpawnResult }): Outcome {
  if (end.signal || end.code !== 0) return { kind: 'cut-off' }
  return { kind: 'answered', result: JSON.parse(stdout) as AskResult }
}
