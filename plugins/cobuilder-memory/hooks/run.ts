import type { Engine } from 'claude-code'
import { resolveBank } from './bank'
import { writeRecallQuery } from './haiku'
import { dropOwnSession, getPage, recall, reflect, searchPages, setUpMessage } from './hindsight'
import { promptBlock, readPrompts, sessionTail } from './prompts'
import { buildResult, type RunReport } from './result'

export type RunOrigin = 'tool' | 'command'

// Recall records shown to the main agent
const MAX_RECORDS = 8
// The fixed inputs of /memory-check
const CHECK_QUERY = 'memory check'
const CHECK_QUESTION = 'What does this project remember most often?'

// The memory run, slice 1 part: Haiku writes the recall query, recall runs, and the
// result is built. The page and reflect steps join in slices 2 and 3
export async function runMemory($: Engine, _origin: RunOrigin): Promise<string> {
  const target = await resolveBank($)
  if ('error' in target) return target.error

  const sessionId = await $.session.id()
  const prompts = await readPrompts($)
  const plan = await writeRecallQuery($, promptBlock(prompts), sessionTail(await $.session.messages()))
  if ('error' in plan) return plan.error

  const found = await recall($, target.bank, plan.recall)
  if (!found.ok) {
    const setUp = setUpMessage(found.reason)
    if (setUp !== null) return setUp
  }
  const recalled: RunReport['recall'] = found.ok
    ? recallFound(plan.recall, found.value, sessionId)
    : { query: plan.recall, reason: found.reason }

  return buildResult({
    bank: target.bank,
    promptsRead: promptBlock(prompts).split('\n').filter((l) => l.startsWith('- [')).length,
    need: plan.need,
    recall: recalled,
    page: null,
    context: '',
    reflects: [],
  })
}

function recallFound(query: string, hits: Parameters<typeof dropOwnSession>[0], sessionId: string): RunReport['recall'] {
  const outside = dropOwnSession(hits, sessionId)
  return { query, total: hits.length, own: hits.length - outside.length, kept: outside.slice(0, MAX_RECORDS) }
}

// /memory-check: each Hindsight tool once, with fixed inputs and no model call
export async function runCheck($: Engine): Promise<string> {
  const target = await resolveBank($)
  if ('error' in target) return target.error

  const [rec, search, refl] = await Promise.all([
    recall($, target.bank, CHECK_QUERY),
    searchPages($, target.bank, CHECK_QUERY),
    reflect($, target.bank, CHECK_QUESTION, CHECK_QUERY),
  ])
  const first = search.ok ? search.value[0] : undefined
  const page = first ? await getPage($, target.bank, first.id) : null

  const lines = [
    'Memory check on bank ' + target.bank + '.',
    rec.ok ? 'recall: ok, ' + rec.ms + ' ms, ' + rec.value.length + ' results' : 'recall: failed, ' + rec.ms + ' ms, ' + rec.reason,
    search.ok
      ? 'search_knowledge_base: ok, ' + search.ms + ' ms, ' + search.value.length + ' pages'
      : 'search_knowledge_base: failed, ' + search.ms + ' ms, ' + search.reason,
    page === null
      ? 'get_knowledge_page: skipped, the search found no page'
      : page.ok
        ? 'get_knowledge_page: ok, ' + page.ms + ' ms, read ' + page.value.name
        : 'get_knowledge_page: failed, ' + page.ms + ' ms, ' + page.reason,
    refl.ok ? 'reflect: ok, ' + refl.ms + ' ms, answered' : 'reflect: failed, ' + refl.ms + ' ms, ' + refl.reason,
  ]
  const setUp = [rec, search, page, refl]
    .map((o) => (o && !o.ok ? setUpMessage(o.reason) : null))
    .find((m) => m !== null)
  if (setUp) lines.push(setUp)
  return lines.join('\n')
}
