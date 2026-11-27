import type { EngineInterface } from 'claude-code'

const SCRIPT = 'until [ -e "$1" ]; do sleep 0.2; done; cat "$2"'

export type SpawnPaths = { answerPath: string; donePath: string; argv: string[] }

export type Outcome = { kind: 'answered'; result: unknown } | { kind: 'cut-off'; detail: string }

type Run = { stdout: string; end: { code: number | null; signal: string | null } }

export function spawnPaths(cwd: string, toolUseId: string): SpawnPaths {
  const dir = `${cwd}/.cobuilder/ask-hold`
  const answerPath = `${dir}/${toolUseId}.answer.json`
  const donePath = `${dir}/${toolUseId}.done`
  return { answerPath, donePath, argv: ['/bin/sh', '-c', SCRIPT, 'sh', donePath, answerPath] }
}

async function drain($: EngineInterface, argv: string[]): Promise<Run> {
  const stream = $.process.spawn({ argv })
  let stdout = ''
  for await (const piece of stream) {
    if (piece.stream === 'stdout') stdout += piece.text
  }
  return { stdout, end: await stream.result }
}

function outcomeOf({ stdout, end }: Run): Outcome {
  if (end.signal) return { kind: 'cut-off', detail: `child ended by signal ${end.signal}` }
  if (end.code !== 0) return { kind: 'cut-off', detail: `child ended with exit code ${end.code}` }
  return { kind: 'answered', result: JSON.parse(stdout) }
}

async function writeAnswer($: EngineInterface, paths: SpawnPaths, answer: unknown): Promise<void> {
  await $.fs.write(paths.answerPath, JSON.stringify(answer))
  await $.fs.write(paths.donePath, '')
}

export async function holdInChild($: EngineInterface, paths: SpawnPaths, answer: Promise<unknown>): Promise<Outcome> {
  const run = drain($, paths.argv)
  const sentFirst = await Promise.race([answer.then(() => true), run.then(() => false)])
  if (sentFirst) await writeAnswer($, paths, await answer)
  return outcomeOf(await run)
}
