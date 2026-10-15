import type { EngineInterface } from 'claude-code'

export type Hit = { text: string; date: string; doc: string }
export type PageHit = { id: string; name: string; snippet: string; updated: string }
export type Page = { id: string; name: string; body: string; updated: string }
export type Outcome<T> = { ok: true; value: T; ms: number } | { ok: false; reason: string; ms: number }

export const HINDSIGHT_SERVER = 'hindsight' as const

const SET_UP_MESSAGE =
  'Hindsight MCP server not found: add the server named "hindsight" with the recall, reflect, search_knowledge_base, and get_knowledge_page tools.'
// The engine's words for a server that is not connected, or a tool that the server lacks
const MISSING = /no connected MCP tool|no tool "/
// The permission check's words for a refused call
const REFUSED = /auto mode classifier|refused|permission/i
const PAGE_CHARS = 6000
const EMPTY_PAGE_SNIPPET = 'Generating content...'

// A refused call names the allow rule for its tool. A missing server or tool keeps its set-up message.
function withPermissionHint(tool: string, reason: string): string {
  if (MISSING.test(reason) || !REFUSED.test(reason)) return reason
  return reason + ' Add "mcp__hindsight__' + tool + '" to permissions.allow in your settings.'
}

// One MCP call to Hindsight. A thrown error, or isError, is a failed outcome with its reason.
async function call(
  $: EngineInterface,
  tool: string,
  args: Record<string, unknown>,
): Promise<Outcome<any>> {
  const start = Date.now()
  try {
    const r: any = await $.mcp.call(HINDSIGHT_SERVER, tool, args)
    const text = String(r?.content?.[0]?.text ?? '')
    if (r?.isError) {
      return { ok: false, reason: withPermissionHint(tool, text || 'Hindsight returned an error'), ms: Date.now() - start }
    }
    const value = unwrap(text)
    // A reply that is not JSON is the server's plain-text failure, and the text is its reason
    if (value === undefined) {
      return { ok: false, reason: withPermissionHint(tool, text || 'Hindsight returned an error'), ms: Date.now() - start }
    }
    // A successful reply can still carry the server's error in its body
    if (typeof value?.error === 'string' && value.error !== '') {
      return { ok: false, reason: withPermissionHint(tool, value.error), ms: Date.now() - start }
    }
    return { ok: true, value, ms: Date.now() - start }
  } catch (err) {
    const reason = String((err as Error)?.message ?? err)
    return { ok: false, reason: withPermissionHint(tool, reason), ms: Date.now() - start }
  }
}

// The reply is JSON. The server may wrap its answer once more as { result: "<json>" }. Undefined when the text is not JSON.
function unwrap(text: string): any {
  try {
    let data: any = JSON.parse(text)
    if (typeof data?.result === 'string') data = JSON.parse(data.result)
    return data
  } catch {
    return undefined
  }
}

function toHit(r: any): Hit {
  return {
    text: String(r.text ?? ''),
    date: String(r.occurred_start ?? r.mentioned_at ?? '').slice(0, 10),
    doc: String(r.document_id ?? ''),
  }
}

// The body is the markdown after its YAML frontmatter
function bodyAfterFrontmatter(markdown: string): string {
  const match = /^---\n[\s\S]*?\n---\n?/.exec(markdown)
  return (match ? markdown.slice(match[0].length) : markdown).trim()
}

// The set-up message when the engine reports a missing server or tool. Null for any other reason.
export function setUpMessage(reason: string): string | null {
  return MISSING.test(reason) ? SET_UP_MESSAGE : null
}

export async function recall($: EngineInterface, bank: string, query: string): Promise<Outcome<Hit[]>> {
  const r = await call($, 'recall', {
    query,
    bank_id: bank,
    types: ['world', 'experience'],
    budget: 'mid',
    max_tokens: 2500,
  })
  if (!r.ok) return r
  return { ok: true, value: (r.value?.results ?? []).map(toHit), ms: r.ms }
}

export async function searchPages($: EngineInterface, bank: string, query: string): Promise<Outcome<PageHit[]>> {
  const r = await call($, 'search_knowledge_base', { query, bank_id: bank, limit: 5 })
  if (!r.ok) return r
  const value = (r.value?.results ?? []).map((p: any) => ({
    id: String(p.id ?? ''),
    name: String(p.name ?? ''),
    snippet: String(p.snippet ?? ''),
    updated: String(p.updated_at ?? '').slice(0, 10),
  }))
  return { ok: true, value, ms: r.ms }
}

export async function getPage($: EngineInterface, bank: string, id: string): Promise<Outcome<Page>> {
  const r = await call($, 'get_knowledge_page', { page_id: id, bank_id: bank })
  if (!r.ok) return r
  const value: Page = {
    id: String(r.value?.id ?? id),
    name: String(r.value?.name ?? ''),
    body: bodyAfterFrontmatter(String(r.value?.markdown ?? '')).slice(0, PAGE_CHARS),
    updated: String(r.value?.timestamp ?? '').slice(0, 10),
  }
  return { ok: true, value, ms: r.ms }
}

export async function reflect($: EngineInterface, bank: string, query: string, context: string): Promise<Outcome<string>> {
  const r = await call($, 'reflect', { query, context, bank_id: bank, budget: 'low', max_tokens: 1500 })
  if (!r.ok) return r
  return { ok: true, value: String(r.value?.text ?? ''), ms: r.ms }
}

// Drops the records of the current session, which the person has just typed
export function dropOwnSession(hits: Hit[], sessionId: string): Hit[] {
  return hits.filter((h) => h.doc !== 'conversation:' + sessionId)
}

// Drops the pages with no snippet, or with a snippet that the server still writes
export function dropEmptyPages(pages: PageHit[]): PageHit[] {
  return pages.filter((p) => p.snippet.trim() !== '' && p.snippet !== EMPTY_PAGE_SNIPPET)
}
