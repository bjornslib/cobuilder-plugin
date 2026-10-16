import type { Hit, Page } from './hindsight'

// Fixed rules for the main agent, placed first in every result
export const HOW_TO_JUDGE = [
  'How to judge this result:',
  '- Recall lines are stored records, each with a date and a source. Treat them as the stronger evidence.',
  '- A knowledge page is a summary that the server built from many records. It is weaker than a recall record and stronger than a reflect answer. Check its update date.',
  '- Reflect answers come from a small model that reasons over part of the memory. Treat them as leads.',
  '- When reflect says the memory holds nothing and recall shows records, trust recall.',
  '- When two records disagree, prefer the newer source. A later chat that restates a record is not a newer source.',
  '- Check each claim against the code or the ADR file before you rely on it.',
  '- Tell the person what you used, what you left out, and why.',
].join('\n')

export type RunReport = {
  bank: string; promptsRead: number; need: string
  recall: { query: string; total: number; own: number; repeats: number; kept: Hit[] } | { query: string; reason: string }
  page: Page | null | { reason: string }
  context: string
  reflects: { question: string; answer: string | null; reason: string | null }[]
}

function recallLines(recall: RunReport['recall']): string[] {
  if ('reason' in recall) return ['Recall: ' + recall.query, recall.reason]
  const head = [
    'Recall: ' + recall.query,
    'Results: ' + recall.total + ', dropped from this session: ' + recall.own + ', repeats dropped: ' + recall.repeats + ', shown: ' + recall.kept.length + '.',
  ]
  if (recall.kept.length === 0) return [...head, 'Prior art: none found outside this session.']
  return [...head, ...recall.kept.map((h, i) => (i + 1) + '. [' + h.date + '] ' + h.text + ' (' + h.doc + ')')]
}

function pageLines(page: RunReport['page']): string[] {
  if (page === null) return ['Knowledge page: none picked.']
  if ('reason' in page) return ['Knowledge page: ' + page.reason]
  if (page.body === '') return ['Knowledge page: ' + page.name + ' is empty.']
  return ['Knowledge page: ' + page.name + ' (updated ' + page.updated + ')', page.body]
}

export function buildResult(r: RunReport): string {
  const reflects = r.reflects.length === 1 ? '1 reflect' : r.reflects.length + ' reflects'
  const header = 'Hindsight memory on ' + r.bank + ': 1 recall, ' + reflects + '. Haiku read ' + r.promptsRead + ' stored prompts.'
  const out = [HOW_TO_JUDGE, '', header, 'Need: ' + r.need, '', ...recallLines(r.recall), '', ...pageLines(r.page)]
  if (r.context) out.push('', 'Reflect context: ' + r.context)
  for (const f of r.reflects) out.push('', 'Reflect: ' + f.question, f.answer ?? f.reason ?? '')
  return out.join('\n')
}
