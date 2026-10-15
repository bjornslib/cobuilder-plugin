import type { EngineInterface } from 'claude-code'
import { resolveBank } from './bank'
import { writeRecallQuery, writeReflectPlan } from './haiku'
import { dropEmptyPages, dropOwnSession, getPage, type Outcome, recall, reflect, searchPages, setUpMessage } from './hindsight'
import { newRun, openPane, setRun, startTick } from './pane'
import { promptBlock, readPrompts, sessionTail } from './prompts'
import { buildResult, type RunReport } from './result'
import type { CallState, RunRecall, RunState } from '../types'

export type RunOrigin = 'tool' | 'command'

// Recall records shown to the main agent
const MAX_RECORDS = 8
// The fixed inputs of /memory-check
const CHECK_QUERY = 'memory check'
const CHECK_QUESTION = 'What does this project remember most often?'

// The memory run: the pane opens first, the run goes on without it, and the tick runs until the run ends
export async function runMemory($: EngineInterface, _origin: RunOrigin): Promise<string> {
  await setRun($, () => newRun(clockTime()))
  void openPane($)
  const stop = startTick($)
  try {
    return await memoryRun($)
  } catch (err) {
    await fail($, String((err as Error)?.message ?? err))
    throw err
  } finally {
    stop()
  }
}

// The memory run, slices 1 to 3: Haiku writes the recall query, recall and the page search
// run side by side, Haiku picks a page and the reflect questions, then the page read and the reflect calls run side by side
async function memoryRun($: EngineInterface): Promise<string> {
  const target = await resolveBank($)
  if ('error' in target) return fail($, target.error)
  await setRun($, s => ({ ...s, bank: target.bank }))

  const sessionId = await $.session.id()
  const prompts = await readPrompts($)
  const plan = await writeRecallQuery($, promptBlock(prompts), sessionTail(await $.session.messages()))
  if ('error' in plan) return fail($, plan.error)
  await setRun($, s => ({ ...s, step: 'search', need: plan.need }))

  const [found, searched] = await Promise.all([
    trackCall($, 'recall', () => recall($, target.bank, plan.recall), hits => hits.length + ' results'),
    trackCall($, 'search_knowledge_base', () => searchPages($, target.bank, plan.recall), pages => pages.length + ' pages'),
  ])
  for (const o of [found, searched]) {
    const setUp = o.ok ? null : setUpMessage(o.reason)
    if (setUp !== null) return fail($, setUp)
  }
  const recalled: RunReport['recall'] = found.ok
    ? recallFound(plan.recall, found.value, sessionId)
    : { query: plan.recall, reason: found.reason }
  const kept = 'kept' in recalled ? recalled.kept : []
  const pages = searched.ok ? dropEmptyPages(searched.value) : []
  await setRun($, s => ({ ...s, recall: toRunRecall(recalled) }))

  await setRun($, s => ({ ...s, step: 'questions' }))
  const picked = await writeReflectPlan($, plan.need, plan.recall, kept, pages)
  const questions = 'error' in picked ? [] : picked.questions
  const context = 'error' in picked ? '' : picked.context
  const pageId = searched.ok && !('error' in picked) ? picked.pageId : null
  await setRun($, s => ({
    ...s,
    step: 'reflect',
    reflects: questions.map(question => ({ question, state: 'running' as const, note: '' })),
  }))

  // The page read and every reflect call start together, so none waits for another
  const [read, answers] = await Promise.all([
    pageId === null ? null : trackCall($, 'get_knowledge_page', () => getPage($, target.bank, pageId), p => p.name),
    Promise.all(questions.map((q, i) => answerReflect($, i, () => reflect($, target.bank, q, context)))),
  ])
  for (const o of [read, ...answers]) {
    const setUp = o && !o.ok ? setUpMessage(o.reason) : null
    if (setUp !== null) return fail($, setUp)
  }

  let page: RunReport['page'] = null
  if (!searched.ok) {
    page = { reason: searched.reason }
  } else if ('error' in picked) {
    page = { reason: picked.error }
  } else if (read) {
    page = read.ok ? read.value : { reason: read.reason }
  }
  await setRun($, s => ({
    ...s,
    step: 'done',
    page: read?.ok ? { name: read.value.name, updated: read.value.updated } : null,
  }))

  const reflects = toReflects(questions, answers)

  return buildResult({
    bank: target.bank,
    promptsRead: promptBlock(prompts).split('\n').filter((l) => l.startsWith('- [')).length,
    need: plan.need,
    recall: recalled,
    page,
    context,
    reflects,
  })
}

// Marks the run failed with its reason, and returns the reason as the tool result
async function fail($: EngineInterface, reason: string): Promise<string> {
  await setRun($, s => ({ ...s, step: 'failed', error: reason }))
  return reason
}

// Adds one Hindsight call to the pane: running when it starts, then its count or its reason
async function trackCall<T>(
  $: EngineInterface,
  name: string,
  ask: () => Promise<Outcome<T>>,
  count: (value: T) => string,
): Promise<Outcome<T>> {
  let index = 0
  await setRun($, s => {
    index = s.calls.length
    return { ...s, calls: [...s.calls, { name, state: 'running', note: '' }] }
  })
  const out = await ask()
  await setRun($, s => ({ ...s, calls: s.calls.map((c, i) => (i === index ? endCall(c, out, count) : c)) }))
  return out
}

function endCall<T>(c: CallState, out: Outcome<T>, count: (value: T) => string): CallState {
  return out.ok
    ? { ...c, state: 'done', note: count(out.value) }
    : { ...c, state: 'failed', note: out.reason }
}

// One reflect call, shown as its own question row and as a call
async function answerReflect($: EngineInterface, index: number, ask: () => Promise<Outcome<string>>): Promise<Outcome<string>> {
  const out = await trackCall($, 'reflect', ask, () => 'answered')
  await setRun($, s => ({ ...s, reflects: s.reflects.map((r, i) => (i === index ? endReflect(r, out) : r)) }))
  return out
}

function endReflect(r: RunState['reflects'][number], out: Outcome<string>): RunState['reflects'][number] {
  return out.ok ? { ...r, state: 'done', note: '' } : { ...r, state: 'failed', note: out.reason }
}

function toRunRecall(recalled: RunReport['recall']): RunRecall {
  return 'kept' in recalled ? { query: recalled.query, total: recalled.total, own: recalled.own, kept: recalled.kept } : recalled
}

// The start time as HH:MM, in local time
function clockTime(): string {
  const d = new Date()
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

// Each question with its answer, or with the reason its reflect call failed
function toReflects(questions: string[], answers: Outcome<string>[]): RunReport['reflects'] {
  return answers.map((a, i) =>
    a.ok
      ? { question: questions[i] ?? '', answer: a.value, reason: null }
      : { question: questions[i] ?? '', answer: null, reason: a.reason },
  )
}

function recallFound(query: string, hits: Parameters<typeof dropOwnSession>[0], sessionId: string): RunReport['recall'] {
  const outside = dropOwnSession(hits, sessionId)
  return { query, total: hits.length, own: hits.length - outside.length, kept: outside.slice(0, MAX_RECORDS) }
}

// /memory-check: each Hindsight tool once, with fixed inputs and no model call
export async function runCheck($: EngineInterface): Promise<string> {
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
