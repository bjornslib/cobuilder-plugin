import type { Picks, Question, ShapeId } from '../types'

const joined = (picks: Picks, i: number): string => (picks[i] ?? []).join(', ')

const pairsOf = (questions: Question[], picks: Picks) =>
  questions.map((q, i) => ({ question: q.question, answer: joined(picks, i) }))

export function answerOf(shape: ShapeId, questions: Question[], picks: Picks): unknown {
  switch (shape) {
    case 'answers-by-question':
      // The engine checks this against the tool's output schema: the asked questions, then answers by question text.
      return { questions, answers: Object.fromEntries(pairsOf(questions, picks).map((p) => [p.question, p.answer])) }
    case 'answers-list':
      return { answers: pairsOf(questions, picks) }
    case 'text':
      return pairsOf(questions, picks).map((p) => `${p.question}: ${p.answer}`).join('\n')
  }
}
