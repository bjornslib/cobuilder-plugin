// Shared stubs for the cobuilder-priority tests. The runner reads *.test.ts only,
// so this file holds no test cases.

export const OPTIONS = { priority_dev_dir: '/work/priority-dev', program: 'probes/programs/d1.json', timeout_seconds: 120 }

export const DONE = {
  status: 'waiting_answer',
  needs_human: true,
  priority: 'can_wait',
  steps: [{ kind: 'ask_human', questions: ['Ship it now?'] }, { kind: 'notify', message: 'Tests pass.' }],
  abstain: null,
}

export const DIGESTED = { ran: 'The agent ran the tests.', result: 'All pass.', open_items: [], decisions: [] }

export type Call = { argv: string[]; cwd?: string; env?: Record<string, string>; timeoutMs?: number }

// Each process.run answers from `answers` in order. The last answer repeats.
// An answer that is an Error rejects the call. `gate` holds every call until it resolves.
export function stubProcess(on: any, answers: (object | Error)[], gate?: Promise<void>) {
  const calls: Call[] = []
  on('process.run', async (_$: any, e: any) => {
    calls.push({ argv: [...e.argv], cwd: e.init?.cwd, env: e.init?.env, timeoutMs: e.init?.timeoutMs })
    if (gate) await gate
    const answer = answers[Math.min(calls.length - 1, answers.length - 1)]
    if (answer instanceof Error) return { deny: answer.message }
    return { value: { exitCode: 0, stdout: JSON.stringify(answer), stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  return calls
}

export function stubStore(on: any) {
  const data = new Map<string, unknown>()
  on('store.get', (_$: any, e: any) => ({ value: data.get(e.key) }))
  on('store.set', (_$: any, e: any) => { data.set(e.key, e.value); return { value: undefined } })
  on('store.delete', (_$: any, e: any) => { data.delete(e.key); return { value: undefined } })
  return data
}

export function stubEngine(on: any, opts: { commands?: boolean } = {}) {
  if (opts.commands !== false) on('command.register', (_$: any, e: any) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.toast', () => ({ value: undefined }))
  on('session.start', (_$: any, e: any) => ({ cwd: e.cwd }))
  on('command.run', () => ({ text: '' }))
  on('classic.Stop', () => ({}))
}

// Lets unawaited work finish: the reader runs after the Stop hook returns.
export async function drain(rounds = 200) {
  for (let i = 0; i < rounds; i++) await Promise.resolve()
}

export async function waitFor(check: () => boolean, rounds = 50) {
  for (let i = 0; i < rounds && !check(); i++) await drain()
  await drain() // the reader writes the redraw tick after the store
}

export function stop($: any, session = 'S1') {
  return $.classic.Stop({ session_id: session, transcript_path: `/home/me/.claude/projects/x/${session}.jsonl`, cwd: '/work/app', stop_hook_active: false })
}
