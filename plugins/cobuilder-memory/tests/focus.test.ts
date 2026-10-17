import { expect, test } from 'claude-code/testing'
import { mcpBody, rawHit, settle, stubHaikuSteps, stubRepo, stubSession, stubStore } from './fakes'

// Slice 8 cases: the consult tool takes an optional focus. The recall prompt puts the focus first,
// and the result shows the focus on a Focus line above the Need line.

const FOCUS = 'allow rules for the install command'
const STEP1 = 'Need: NEED-MARK\nRecall: recall-query-xyz'
const STEP2 = 'Page: none\nContext: c'
const SESSION = [{ role: 'user', text: 'please check the pane layout', toolUses: [] }]

// The Hindsight answers for the run: one kept record, and no search hits
function stubHindsight(on: any) {
  on('mcp.call', (_$: any, e: any) => {
    if (e.tool === 'recall') return mcpBody({ results: [rawHit('KEPT-RECORD-MARK', 'gitlog:repo')] })
    return mcpBody({ results: [] })
  })
}

// Runs the consult tool, with the focus argument when one is given. A missing tool hook fails on an assertion.
async function consult($: any, focus?: string): Promise<{ text: string; error: string }> {
  const args = focus === undefined ? { tool: 'mcp__cobuilder-memory__consult' } : { tool: 'mcp__cobuilder-memory__consult', focus }
  const { value, error } = await settle(async () => $.tool.call(args as any))
  return { text: String(value?.result ?? ''), error }
}

test('the first Haiku prompt names the focus, then the session end, then the prompts of the person', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on, SESSION)
  stubHindsight(on)
  const prompts = stubHaikuSteps(on, [STEP1, STEP2])

  const { error } = await consult($, FOCUS)
  expect(error).toBe('')
  expect(prompts.length).toBeGreaterThanOrEqual(1)
  const first = String(prompts[0] ?? '')
  const focusAt = first.indexOf("The agent's focus:")
  const endAt = first.indexOf('Session end:')
  const promptsAt = first.indexOf("The person's prompts, oldest first:")
  expect(focusAt > -1).toBe(true)
  expect(endAt > focusAt).toBe(true)
  expect(promptsAt > endAt).toBe(true)
  // The focus text follows its label and comes before the session end
  const focusTextAt = first.indexOf(FOCUS)
  expect(focusTextAt > focusAt && focusTextAt < endAt).toBe(true)
  // The last message of the session comes after the session end
  expect(first.indexOf('the pane layout') > endAt).toBe(true)
})

test('a consult call with no focus says none given in the first prompt, and the run still completes', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on, SESSION)
  stubHindsight(on)
  const prompts = stubHaikuSteps(on, [STEP1, STEP2])

  const { text, error } = await consult($)
  expect(error).toBe('')
  expect(String(prompts[0] ?? '').includes("The agent's focus: none given")).toBe(true)
  expect(text.includes('Need: NEED-MARK')).toBe(true)
})

test('a focus that is only spaces counts as no focus', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on, SESSION)
  stubHindsight(on)
  const prompts = stubHaikuSteps(on, [STEP1, STEP2])

  const { error } = await consult($, '   ')
  expect(error).toBe('')
  expect(String(prompts[0] ?? '').includes("The agent's focus: none given")).toBe(true)
})

test('the result shows the focus on the line directly above the Need line', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on, SESSION)
  stubHindsight(on)
  stubHaikuSteps(on, [STEP1, STEP2])

  const { text, error } = await consult($, FOCUS)
  expect(error).toBe('')
  expect(text.includes('Focus: ' + FOCUS + '\nNeed: NEED-MARK')).toBe(true)
})

test('the result shows Focus: none given directly above the Need line when no focus is passed', async ($, on) => {
  stubRepo(on)
  stubStore(on)
  stubSession(on, SESSION)
  stubHindsight(on)
  stubHaikuSteps(on, [STEP1, STEP2])

  const { text, error } = await consult($)
  expect(error).toBe('')
  expect(text.includes('Focus: none given\nNeed: NEED-MARK')).toBe(true)
})
