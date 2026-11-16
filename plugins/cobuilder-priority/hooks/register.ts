import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'
import { renderBand } from './band'
import { dropHeld, holdAsk, isHolding, notePrompt } from './ask'
import type { AskEvent, Next } from './ask'
import { openPane, renderPane } from './pane'
import { PANE_ID, enqueue, startWaiting, stopWaiting } from './reader'

// The reader switch: off in each new session, kept through a hot reload.
const switchedOn = atom({ plugin: 'cobuilder-priority', key: 'on' } as const, false)

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
    await stopWaiting($)
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

  // The next prompt ends the wait at the stop, so the ready line goes. The reader then waits for the next reading.
  on('prompt.submit', async ($, e, next) => {
    $.ui.status(undefined)
    // A card left by an Esc during a hold has no call behind it any more.
    if (!isHolding()) await dropHeld($)
    if (await read($, switchedOn)) await startWaiting($)
    return next(e)
  })

  // A main-loop turn that ends without an answer (an interrupt, a refusal, an error) brings no
  // reading, so it ends the wait. A turn that answers ends the wait when its reading is saved.
  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined && e.reason !== 'answer') await stopWaiting($)
    return next(e)
  })

  // The prompt event knows the transcript path. A question job reads it when its own event lacks one.
  on('classic.UserPromptSubmit', async ($, e, next) => {
    notePrompt(e)
    return next(e)
  })

  // A main-loop AskUserQuestion call is held in the pane. A throw passes the call to the dialog.
  on('tool.call', { tool: 'AskUserQuestion' }, ($, e, next) => holdAsk($, options, e as unknown as AskEvent, next as unknown as Next))
    .catch(async ($, e, next) => {
      // After Esc the engine has moved on: touch nothing. The next prompt clears the card.
      if (next.signal.aborted) return { deny: 'The person interrupted the question.' }
      await dropHeld($)
      return next(e)
    })

  on('ui.render', { component: 'Pane', requestId: PANE_ID }, ($, e) => renderPane($, e))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => (await renderBand($, e)) ?? next(e))
}
