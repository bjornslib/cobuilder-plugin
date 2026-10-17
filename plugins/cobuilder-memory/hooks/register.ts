import type { Register } from 'claude-code'
import { PANE_ID, renderPane } from './pane'
import { shouldStore, storePrompt } from './prompts'
import { runCheck, runMemory } from './run'

const CONSULT = 'consult'

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
    await $.tool.register({
      name: CONSULT,
      description:
        'Ask the project memory (Hindsight) what was decided or learned before about the current work. ' +
        'Takes an optional focus. With a focus, the focus sets the topic, the session end gives the names, and the person\'s prompts add context. ' +
        'Without one, a small model works out the decision from the session end and the prompts, and writes one recall query. ' +
        'Slow: the Hindsight calls can take a minute. ' +
        'Call it before a design or build decision, or when the person asks what the project already knows. ' +
        'Judge what it returns: recall records are evidence, and the other sections are leads to check.',
      inputSchema: {
        type: 'object',
        properties: {
          focus: {
            type: 'string',
            description: 'The decision at hand and what to look for, in 40 words or fewer. It sets the topic of the recall query.',
          },
        },
      },
      isDeferred: false,
    })
    await $.command.register({
      name: 'memory-recall',
      description: 'Ask Hindsight what the project knows about the work in this session',
    })
    await $.command.register({
      name: 'memory-check',
      description: 'Check that each Hindsight tool answers for this project',
    })
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    if (shouldStore(e)) await storePrompt($, e.text)
    return next(e)
  })

  on('tool.call', { tool: /cobuilder-memory__consult$/ }, async ($, e) => {
    const focus = (e as { focus?: unknown }).focus
    const kept = typeof focus === 'string' && focus.trim() !== '' ? focus.trim() : undefined
    return { result: await runMemory($, 'tool', kept) }
  })

  on('command.run', { command: 'memory-recall' }, async ($) => {
    return { text: await runMemory($, 'command') }
  })

  on('command.run', { command: 'memory-check' }, async ($) => {
    return { text: await runCheck($) }
  })

  on('ui.render', { component: 'Pane', requestId: PANE_ID }, ($, e) => renderPane($, e))
}
