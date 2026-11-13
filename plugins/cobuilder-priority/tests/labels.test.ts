import { expect, test } from 'claude-code/testing'
import { agentSummary, answerLabels } from '../hooks/labels'
import { LABELLED, LABELLED_SUMMARY, PLAIN } from './fakes'

// E3.11: the label words at the start of lines of the last agent message. No model call.

test('answerLabels finds the four labels of a labelled message, in the order they appear', () => {
  expect(answerLabels(LABELLED)).toEqual(['FYI', 'Summary', 'Next steps', 'Decisions and questions'])
})

test('answerLabels follows the order of appearance, not the order of the list', () => {
  expect(answerLabels('Summary:\nDone.\n\n**FYI**\nNothing new.')).toEqual(['Summary', 'FYI'])
})

test('answerLabels accepts the bold, heading, and plain forms of a label', () => {
  for (const form of ['**Summary**', '## Summary', 'Summary:', '**Summary:**', '- **Summary**', '**summary**']) {
    expect(answerLabels(`${form}\nThe reader keeps the labels.`), form).toEqual(['Summary'])
  }
})

test('answerLabels ignores a label word inside a line', () => {
  expect(answerLabels('See the Summary part below.')).toEqual([])
})

test('answerLabels gives an empty list for a plain message', () => {
  expect(answerLabels(PLAIN)).toEqual([])
})

test('agentSummary gives the Summary text up to the next label, trimmed', () => {
  const text = '**Summary**\n  The reader keeps the labels.\nIt keeps the digest too.\n\n**Next steps**\nRun the tests.'
  expect(agentSummary(text)).toBe('The reader keeps the labels.\nIt keeps the digest too.')
})

test('agentSummary gives the Summary text of a labelled message', () => {
  expect(agentSummary(LABELLED)).toBe(LABELLED_SUMMARY)
})

test('agentSummary runs to the end of the message when Summary is the last part', () => {
  expect(agentSummary('**FYI**\nAll good.\n\nSummary:\nThe end.')).toBe('The end.')
})

test('agentSummary is undefined without a Summary part, and for a plain message', () => {
  expect(agentSummary('**FYI**\nAll good.\n\n**Next steps**\nRun it.')).toBeUndefined()
  expect(agentSummary(PLAIN)).toBeUndefined()
})
