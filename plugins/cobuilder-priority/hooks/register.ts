import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'
import { renderBand } from './band'
import { PANE_ID, clampScroll, openPane, paneView, renderPane } from './pane'
import { enqueue } from './reader'

// The reader switch: off in each new session, kept through a hot reload.
const switchedOn = atom({ plugin: 'cobuilder-priority', key: 'on' } as const, false)
// The pane body's offset in blocks. The pane reads it too.
const scroll = atom({ plugin: 'cobuilder-priority', key: 'scroll' } as const, 0)

const COMMANDS = [
  { name: 'priority-on', description: 'Read each stop of this session with the priority-dev interpreter' },
  { name: 'priority-off', description: 'Stop reading the stops of this session' },
  { name: 'priority-pane', description: 'Show the readings of this session' },
]

export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    for (const command of COMMANDS) await $.command.register(command)
    return next(e)
  })

  on('command.run', { command: 'priority-on' }, async ($) => {
    await update($, switchedOn, () => true)
    await openPane($)
    return { text: 'The priority reader is on for this session. Each stop sends the transcript to the model service.' }
  })

  on('command.run', { command: 'priority-off' }, async ($) => {
    await update($, switchedOn, () => false)
    return { text: 'The priority reader is off for this session.' }
  })

  on('command.run', { command: 'priority-pane' }, async ($) => {
    await openPane($)
    return { text: 'Priority reader pane opened.' }
  })

  // Stop fires for the main loop only. The hook queues the stop and returns at once.
  on('classic.Stop', async ($, e, next) => {
    if (await read($, switchedOn)) {
      const job = { sessionId: e.session_id, transcript: e.transcript_path, repo: e.cwd, at: new Date().toISOString(), lastMessage: e.last_assistant_message ?? '' }
      enqueue($, job, options)
    }
    return next(e)
  })

  // The next prompt ends the wait at the stop, so the ready line goes.
  on('prompt.submit', async ($, e, next) => {
    $.ui.status(undefined)
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE_ID }, ($, e) => renderPane($, e))

  // The header and the key row stay first. This hook moves the blocks under them, within the
  // count that renderPane draws, and answers {} so the engine does not move its window.
  on('ui.scroll', { requestId: PANE_ID }, async ($, e) => {
    const view = await paneView($, $.ui.resolve({ surface: 'terminal', component: 'Pane' }))
    const count = view?.blocks.length ?? 0
    await update($, scroll, (o) => clampScroll(o + e.by, count))
    return {}
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => (await renderBand($, e)) ?? next(e))
}
