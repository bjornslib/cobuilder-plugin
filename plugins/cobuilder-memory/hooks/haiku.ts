import type { EngineInterface } from 'claude-code'
import type { Hit, PageHit } from './hindsight'

export type RecallPlan = { need: string; recall: string }
export type ReflectPlan = { pageId: string | null; context: string; questions: string[] }

// Why memory is consulted. Both Haiku steps read it.
const WHY =
  'A coding agent consults the project memory to get insight for one of two kinds of work: ' +
  'the architecture and design, or the build and implementation, of a new or revised capability of the application. ' +
  'Earlier decisions, rejected options, constraints, failed attempts, and conventions change what the agent should do next.'

const RECALL_SYSTEM = [
  'You write a search query for a project memory bank (Hindsight).',
  WHY,
  'The bank holds facts from earlier sessions and the git log, with their reasons.',
  'You get three inputs, in order of authority.',
  '(1) The agent focus. It sets the topic. When a focus is given, the Recall line must search for it.',
  '(2) The session end. It gives context. Take the concrete names from it, such as files, commands, ADR ids, plugin names, and terms, to make the focus precise. It does not change the topic.',
  '(3) The prompts of the person. They add context and may add terms. They never replace the focus.',
  'When no focus is given, work out the decision from the session end first, then use the prompts.',
  'Work in three steps:',
  '1. Name the capability in progress, whether the work is design or build, and the next decision the agent faces. When a focus is given, start from the focus.',
  '2. Name what the project may have settled or learned before that would change that decision.',
  '3. Write one search query for those facts, on one topic. Use the concrete names the session uses: files, commands, ADR ids, plugin names, terms.',
  'Do not ask what this session already decided. Do not restate the prompt.',
  'Reply in this format, with no other text:',
  'Need: <the decision, and the prior knowledge that would change it, in 30 words or fewer>',
  'Recall: <the search query, in 20 words or fewer>',
].join('\n')

const REFLECT_SYSTEM = [
  'You write questions for the reflect step of a project memory bank (Hindsight).',
  WHY,
  'Reflect reasons over the stored memory with a small model. It answers best when the question names what to look for.',
  'You get the decision the agent faces, the search query, the records the search found, and the knowledge pages it found.',
  'Pick at most one page, by its id, when a page answers the decision. Pick none when no page fits.',
  'Write questions that go past the records: the reasons behind them, conflicts between them, what changed later, and what they mean for the decision.',
  'Each question asks about one topic only. Name the ADR ids, files, and terms that the records use.',
  'When the search found nothing useful, ask broader questions about the same decision.',
  'Also write one context for the reflect step: the decision, and what the records already show, in 60 words or fewer.',
  'Reply in this format, with no other text:',
  'Page: <one page id from the pages, or none>',
  'Context: <the context>',
  'Reflect: <one question, in 30 words or fewer>',
  'Write one Reflect line, on one topic.',
].join('\n')

// Every line that starts with the label, with the label removed
export function parseLines(text: string, label: string): string[] {
  const prefix = label.toLowerCase() + ':'
  return text
    .split('\n')
    .filter((line) => line.trim().toLowerCase().startsWith(prefix))
    .map((line) => line.slice(line.indexOf(':') + 1).trim())
    .filter((line) => line)
}

// One Haiku call. A refusal, a timeout, or a thrown error comes back as the reason, never as a throw.
async function complete(
  $: EngineInterface,
  system: string,
  prompt: string,
  maxTokens: number,
): Promise<{ text: string } | { error: string }> {
  try {
    const ask = await $.model.complete({ model: 'haiku', effort: 'medium', system, prompt, maxTokens, timeoutMs: 60000 })
    return ask.isAnswered ? { text: ask.text } : { error: ask.reason }
  } catch (err) {
    return { error: String((err as Error)?.message ?? err) }
  }
}

export async function writeRecallQuery(
  $: EngineInterface,
  focus: string | null,
  tail: string,
  prompts: string,
): Promise<RecallPlan | { error: string }> {
  const user = [
    "The agent's focus: " + (focus ?? 'none given'),
    '',
    'Session end:\n' + tail,
    '',
    "The person's prompts, oldest first:\n" + prompts,
  ].join('\n')
  const ask = await complete($, RECALL_SYSTEM, user, 400)
  if ('error' in ask) return { error: 'No query written: ' + ask.error }
  const recall = parseLines(ask.text, 'Recall')[0]
  if (!recall) return { error: 'Haiku wrote no recall query. Its reply: ' + ask.text.slice(0, 300) }
  return { need: parseLines(ask.text, 'Need')[0] ?? '(not stated)', recall }
}

export async function writeReflectPlan(
  $: EngineInterface,
  need: string,
  query: string,
  hits: Hit[],
  pages: PageHit[],
): Promise<ReflectPlan | { error: string }> {
  const records = hits.map((h, i) => (i + 1) + '. [' + h.date + '] ' + h.text).join('\n') || '(the search found nothing outside this session)'
  const pageList = pages.map((p) => '- id ' + p.id + ' [' + p.updated + '] ' + p.name + ': ' + p.snippet).join('\n') || '(the search found no page)'
  const plan = await complete(
    $,
    REFLECT_SYSTEM,
    'The decision: ' + need + '\n\nThe search: ' + query + '\n\nThe records it found:\n' + records + '\n\nThe pages it found:\n' + pageList,
    600,
  )
  if ('error' in plan) return { error: 'No reflect questions written: ' + plan.error }
  const pageId = parseLines(plan.text, 'Page')[0] ?? ''
  return {
    pageId: pages.some((p) => p.id === pageId) ? pageId : null,
    context: parseLines(plan.text, 'Context')[0] ?? '',
    questions: parseLines(plan.text, 'Reflect').slice(0, 1),
  }
}
