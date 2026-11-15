// Slice 1, the answer shapes: each shape gives its documented value for one answer, a multi-select answer, and an Other text.
import { expect, test } from 'claude-code/testing'
import { answerOf } from '../hooks/shapes'
import { QUESTIONS, labelsOf } from './fakes'

const LINT = [QUESTIONS[0]!]
const CHECKS = [QUESTIONS[1]!]

test('answers-by-question gives the one label of a single answer, keyed by the question', async () => {
  expect(answerOf('answers-by-question', LINT, { 0: ['Format'] }), 'one label under its question').toEqual({ questions: LINT, answers: { 'Which lint?': 'Format' } })
})

test('answers-by-question joins a multi-select answer with commas', async () => {
  const answers = (answerOf('answers-by-question', CHECKS, { 0: ['Unit', 'E2E'] }) as any)?.answers
  expect(labelsOf(answers?.['Which checks?']), 'the two labels, comma-joined').toEqual(['Unit', 'E2E'])
})

test('answers-by-question gives the Other text as the answer', async () => {
  expect(answerOf('answers-by-question', LINT, { 0: ['my own answer'] }), 'the free text under its question').toEqual({ questions: LINT, answers: { 'Which lint?': 'my own answer' } })
})

test('answers-list gives one entry per question, with the single answer', async () => {
  expect(answerOf('answers-list', LINT, { 0: ['Format'] }), 'one entry with the question and the label').toEqual({ answers: [{ question: 'Which lint?', answer: 'Format' }] })
})

test('answers-list joins a multi-select answer with commas', async () => {
  const list = (answerOf('answers-list', CHECKS, { 0: ['Unit', 'E2E'] }) as any)?.answers
  expect(labelsOf(list?.[0]?.answer), 'the two labels, comma-joined').toEqual(['Unit', 'E2E'])
})

test('answers-list gives the Other text as the entry answer', async () => {
  expect(answerOf('answers-list', LINT, { 0: ['my own answer'] }), 'the free text in its entry').toEqual({ answers: [{ question: 'Which lint?', answer: 'my own answer' }] })
})

test('text gives one question: answer line for a single answer', async () => {
  expect(answerOf('text', LINT, { 0: ['Format'] }), 'one line, question colon answer').toBe('Which lint?: Format')
})

test('text gives the labels of a multi-select answer on one line', async () => {
  const line = String(answerOf('text', CHECKS, { 0: ['Unit', 'E2E'] }) ?? '')
  expect(labelsOf(line.replace(/^Which checks\?:\s*/, '')), 'the two labels after the colon').toEqual(['Unit', 'E2E'])
})

test('text gives the Other text on the question line', async () => {
  expect(answerOf('text', LINT, { 0: ['my own answer'] }), 'the free text after the colon').toBe('Which lint?: my own answer')
})

test('text puts each question on its own line', async () => {
  const lines = String(answerOf('text', QUESTIONS, { 0: ['Format'], 1: ['Unit'] }) ?? '').split('\n')
  expect(lines, 'two lines, one per question').toHaveLength(2)
})
