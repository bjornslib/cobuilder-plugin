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
        'Takes no input: a small model reads the person\'s prompts and the recent session, works out the next decision, ' +
        'and writes one recall query. Slow: the Hindsight calls can take a minute. ' +
        'Call it before a design or build decision, or when the person asks what the project already knows. ' +
        'Judge what it returns: recall records are evidence, and the other sections are leads to check.',
      inputSchema: { type: 'object', properties: {} },
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

  on('tool.call', { tool: /cobuilder-memory__consult$/ }, async ($) => {
    return { result: await runMemory($, 'tool') }
  })

  on('command.run', { command: 'memory-recall' }, async ($) => {
    return { text: await runMemory($, 'command') }
  })

  on('command.run', { command: 'memory-check' }, async ($) => {
    return { text: await runCheck($) }
  })

  on('ui.render', { component: 'Pane', requestId: PANE_ID }, ($, e) => renderPane($, e))
}
