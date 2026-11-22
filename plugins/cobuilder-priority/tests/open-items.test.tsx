// The open items of the digest sit above the questions of a decide step, so a person reads them as context.
import { expect, test } from 'claude-code/testing'
import { ACTIONABLE, NOTIFYING, OPTIONS, PANE, keyOfNode, nodeByKey, readings, walk } from './fakes'
import type { Node } from './fakes'
import { DIGEST_LISTS } from './fixtures'

const order = (root: Node, key: string): number => walk(root).findIndex((n) => keyOfNode(n) === key)

test('with a decide step, the open items sit in the card above its questions, not in the summary', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGEST_LISTS, ACTIONABLE])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const root = (await ui.drawn()) as Node
  expect((await ui.find({ key: 'open-item-0' }))?.text).toBe('· Ship the fix')
  const summary = nodeByKey(root, 'summary-box')
  expect(summary && walk(summary).some((n) => keyOfNode(n) === 'open-items'), 'the summary holds no open items').toBe(false)
  expect(order(root, 'open-items'), 'the open items come after the title row').toBeGreaterThan(order(root, 'card-0'))
  expect(order(root, 'open-items'), 'the open items come before the first question').toBeLessThan(order(root, 'q-2-0'))
  expect((await ui.find({ key: 'decision-0' }))?.text, 'the decisions stay in the summary').toBe('· Keep $.store')
  await ui.press({ key: 'summary' })
  expect(await ui.find({ key: 'open-item-0' }), 'a closed summary keeps the open items of the card').toBeDefined()
  await ui.unmount()
})

test('with no decide step, the open items stay in the summary', { options: OPTIONS }, async ($, on) => {
  await readings($, on, [DIGEST_LISTS, NOTIFYING])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const root = (await ui.drawn()) as Node
  const summary = nodeByKey(root, 'summary-box')
  expect(summary && walk(summary).some((n) => keyOfNode(n) === 'open-items'), 'the summary holds the open items').toBe(true)
  await ui.unmount()
})
