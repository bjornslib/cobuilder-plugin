import type { EngineInterface, PromptSubmitInput, SessionMessage } from 'claude-code'

export type StoredPrompt = { at: string; text: string }

// Prompts from these origins are typed by the person: in the terminal, or through Remote Control
export const PERSON_ORIGINS = ['composer', 'bridge'] as const

const KEEP_PROMPTS = 100
const PROMPT_CHARS = 2000
const BLOCK_CHARS = 8000
const TAIL_CHARS = 12000

export function shouldStore(e: PromptSubmitInput): boolean {
  const text = e.text.trim()
  return (
    !e.command &&
    !e.isMeta &&
    (PERSON_ORIGINS as readonly string[]).includes(e.origin.kind) &&
    text !== '' &&
    !text.startsWith('/')
  )
}

// Keeps the newest prompts of this session, each cut to PROMPT_CHARS
export async function storePrompt($: EngineInterface, text: string): Promise<void> {
  const key = 'prompts:' + (await $.session.id())
  const existing = ((await $.store.get(key)) as StoredPrompt[] | undefined) ?? []
  const entry = { at: new Date().toISOString().slice(0, 16), text: text.trim().slice(0, PROMPT_CHARS) }
  await $.store.set(key, [...existing, entry].slice(-KEEP_PROMPTS))
}

export async function readPrompts($: EngineInterface): Promise<StoredPrompt[]> {
  const key = 'prompts:' + (await $.session.id())
  return ((await $.store.get(key)) as StoredPrompt[] | undefined) ?? []
}

// The newest prompts that fit in maxChars, oldest first
export function promptBlock(prompts: readonly StoredPrompt[], maxChars = BLOCK_CHARS): string {
  let out = ''
  for (let i = prompts.length - 1; i >= 0; i--) {
    const p = prompts[i]
    if (!p) continue
    const line = '- [' + p.at + '] ' + p.text + '\n'
    if (out.length + line.length > maxChars) break
    out = line + out
  }
  return out || '(none stored yet)'
}

// Blocks the engine or a plugin injects into a message, which the tail leaves out
const INJECTED_TAGS = ['system-reminder', 'local-command-caveat', 'local-command-stdout', 'task-notification']
const INJECTED_BLOCK = new RegExp(`<((?:${INJECTED_TAGS.join('|')}|hindsight_[\\w-]+))\\b[^>]*>[\\s\\S]*?<\\/\\1>`, 'g')

// The end of the session as plain text, newest last. It keeps the last maxMessages messages that hold text after the blocks go.
export function sessionTail(messages: readonly SessionMessage[], maxMessages = 6, maxChars = TAIL_CHARS): string {
  let out = ''
  let kept = 0
  for (let i = messages.length - 1; i >= 0 && kept < maxMessages; i--) {
    const m = messages[i]
    const text = m ? m.text.replace(INJECTED_BLOCK, '').trim() : ''
    if (m && text) {
      out = m.role + ': ' + text + '\n\n' + out
      kept++
    }
  }
  return out.slice(-maxChars)
}
