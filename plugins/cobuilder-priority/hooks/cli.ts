// The CLI runner: it starts the priority-dev CLI as a process and parses its JSON output (ADR-0049).
import type { PluginOptions } from 'claude-code'

const MAX_SECONDS = 600
// The priority digest command tries the digest up to three times, so its limit is three timeouts.
const DIGEST_ATTEMPTS = 3

// Runs one priority command in the priority-dev folder and parses its JSON output.
export async function cli($: any, args: string[], options: PluginOptions): Promise<unknown> {
  const seconds = Math.min(MAX_SECONDS, Number(options.timeout_seconds ?? 180) || 180)
  const attempts = args[0] === 'digest' ? DIGEST_ATTEMPTS : 1
  const key = String(options.llm_api_key ?? '').trim()
  const init = {
    cwd: String(options.priority_dev_dir),
    timeoutMs: Math.min(MAX_SECONDS, seconds * attempts) * 1000,
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
