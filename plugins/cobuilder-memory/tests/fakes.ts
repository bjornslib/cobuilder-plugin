// Shared stubs for the cobuilder-memory tests. The runner reads *.test.ts only,
// so this file holds no test cases.

export const USAGE = { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

export type RepoOptions = { template?: string; exitCode?: number; stdout?: string }

// The repo is /work/think-with-ai, and the Hindsight config holds the bank template
export function stubRepo(on: any, opts: RepoOptions = {}) {
  const template = opts.template ?? 'coding-agent-{gitProject}'
  const exitCode = opts.exitCode ?? 0
  const stdout = opts.stdout ?? '/work/think-with-ai/.git\n'
  on('env.get', () => ({ value: '/home/me' }))
  on('fs.read', () => ({ value: JSON.stringify({ bankIdTemplate: template }) }))
  on('process.run', () => ({
    value: {
      exitCode,
      stdout,
      stderr: exitCode === 0 ? '' : 'fatal: not a git repository',
      isStdoutTruncated: false,
      isStderrTruncated: false,
    },
  }))
}

export function stubStore(on: any) {
  const data = new Map<string, unknown>()
  on('store.get', (_$: any, e: any) => ({ value: data.get(e.key) }))
  on('store.set', (_$: any, e: any) => { data.set(e.key, e.value); return { value: undefined } })
  return data
}

export function stubSession(on: any, messages: unknown[] = []) {
  on('session.id', () => ({ value: 'S1' }))
  on('session.messages', () => ({ value: messages }))
}

// Haiku answers every call with the same text, and records each call's model and effort
export function stubHaiku(on: any, text: string, calls: { model: string; effort: string }[] = []) {
  on('model.complete', (_$: any, e: any) => {
    calls.push({ model: e.model, effort: e.effort })
    return { value: { isAnswered: true, text, usage: USAGE } }
  })
  return calls
}

// Runs a hook call and keeps its error as text, so a missing hook fails an assertion
export async function settle(call: () => Promise<any>): Promise<{ value: any; error: string }> {
  try {
    return { value: await call(), error: '' }
  } catch (e) {
    return { value: undefined, error: String((e as Error)?.message ?? e) }
  }
}

// A successful MCP tool result, as the engine returns it to a hook
export function mcpBody(body: unknown) {
  return { value: { content: [{ type: 'text', text: JSON.stringify(body) }], isError: false } }
}

// A raw Hindsight recall record, as the MCP server returns it
export function rawHit(text: string, doc: string) {
  return { text, mentioned_at: '2026-10-01T00:00:00Z', document_id: doc }
}
