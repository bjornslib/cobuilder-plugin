// The question card of a held AskUserQuestion call (question-card.svg, frame A).
import type { HeldQuestion, Question } from '../types'
import { pickOption, setOther } from './ask'
import { draftBox, keyed } from './card'
import { allAnswered, answeredCount, typedOr } from './hold'

const option = (multi: boolean, on: boolean) => (on ? (multi ? '[x]' : '[•]') : '[ ]')

function optionRows($: any, ui: any, held: HeldQuestion, q: Question, i: number) {
  const { Box, Button } = ui
  const chosen = held.picks[i] ?? []
  const multi = q.multiSelect === true
  return q.options.map((o, k) => (
    <Box key={`opt-row-${i}-${k}`} flexDirection="row" columnGap={1}>
      <Button key={`opt-${i}-${k}`} plain label={`${option(multi, chosen.includes(o.label))} ${o.label}`}
        onPress={() => void pickOption($, i, o.label)} />
      {o.description ? keyed(ui, `desc-${i}-${k}`, o.description, { dimColor: true }) : null}
    </Box>
  ))
}

function questionRow($: any, ui: any, held: HeldQuestion, q: Question, i: number) {
  const { Box, Input } = ui
  return (
    <Box key={`q-${i}`} flexDirection="column" marginTop={i > 0 ? 1 : 0}>
      <Box key={`qhead-${i}`} flexDirection="row" columnGap={2}>
        {keyed(ui, `qtext-${i}`, `${i + 1}. ${q.question}`, { bold: true })}
        {q.header ? keyed(ui, `chip-${i}`, q.header, { color: 'yellow' }) : null}
        {q.multiSelect ? keyed(ui, `several-${i}`, '(several)', { dimColor: true }) : null}
      </Box>
      {optionRows($, ui, held, q, i)}
      <Input key={`other-${i}`} label="Other" value={held.other[i] ?? ''} submitLabel="add"
        onSubmit={(t: string) => void setOther($, i, t)} />
    </Box>
  )
}

function answerLines(held: HeldQuestion): string {
  return held.questions
    .map((q, i) => ({ q, typed: typedOr(held, i) }))
    .filter(({ typed }) => typed.length > 0)
    .map(({ q, typed }) => `${q.question} → ${typed.join(', ')}`)
    .join('\n')
}

function sourceOf(held: HeldQuestion): string | undefined {
  const n = answeredCount(held)
  if (!n) return undefined
  return `Source: ${n} ${n === 1 ? 'answer' : 'answers'}`
}

// The card's blocks in draw order: each question, then the draft block that holds the answers.
export function questionBlocks($: any, ui: any, held: HeldQuestion): any[] {
  return [
    ...held.questions.map((q, i) => questionRow($, ui, held, q, i)),
    draftBox(ui, { text: answerLines(held), footer: sourceOf(held), lit: allAnswered(held), notice: held.notice }),
  ]
}
