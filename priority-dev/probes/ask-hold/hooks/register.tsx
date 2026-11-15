import { atom, read, update, type EngineInterface, type PluginOptions, type Register } from 'claude-code'
import { answerOf } from './shapes'
import type { Held, Mode, Picks, Question, ShapeId } from '../types'

type Ui = ReturnType<EngineInterface['ui']['resolve']>
type RenderEvent = Parameters<EngineInterface['ui']['resolve']>[0]

export type ProbeEvent = {
  at: string
  kind: 'caught' | 'passed' | 'answered' | 'refused' | 'cut-off'
  elapsedMs?: number
  shape?: ShapeId
  inTranscript?: boolean
  detail?: string
}

const modeAtom = atom({ plugin: 'ask-hold-probe', key: 'mode' } as const, 'off' as Mode)
const heldAtom = atom({ plugin: 'ask-hold-probe', key: 'held' } as const, null as Held | null)
const tickAtom = atom({ plugin: 'ask-hold-probe', key: 'tick' } as const, 0)

const PANE_ID = 'ask-hold'
const SHAPES: ShapeId[] = ['answers-by-question', 'answers-list', 'text']
const MODES: Mode[] = ['hold', 'pass', 'off']
const COMMANDS = [{ name: 'ask-probe', description: 'Hold each AskUserQuestion call of the main loop in the probe pane', argumentHint: 'hold|pass|off' }]

let release: ((st: Held) => void) | null = null
let ticker: { cancel: () => void } | null = null

const isMode = (text: string): text is Mode => (MODES as string[]).includes(text)

const reason = (err: unknown) => String((err as Error)?.message ?? err)

const missingAsEmpty = (err: unknown) => {
  if (/ENOENT/.test(reason(err))) return ''
  throw err
}

function logPathOf(options: PluginOptions): string | null {
  const dir = String(options.priority_dev_dir ?? '').trim().replace(/\/+$/, '')
  return dir ? `${dir}/reports/logs/ask-hold/probe.jsonl` : null
}

async function log($: EngineInterface, options: PluginOptions, event: Omit<ProbeEvent, 'at'>): Promise<void> {
  const path = logPathOf(options)
  if (!path) return
  const line = `${JSON.stringify({ at: new Date().toISOString(), ...event })}\n`
  try {
    const text = await $.fs.read(path).catch(missingAsEmpty)
    await $.fs.write(path, text + line)
  } catch {
    return
  }
}

async function inTranscript($: EngineInterface, toolUseId: string): Promise<{ inTranscript: boolean; detail?: string }> {
  try {
    const messages = (await $.session.messages()) as { toolUses?: { tool_use_id: string }[] }[]
    return { inTranscript: messages.some((m) => (m.toolUses ?? []).some((t) => t.tool_use_id === toolUseId)) }
  } catch (err) {
    return { inTranscript: false, detail: `transcript unreadable: ${reason(err)}` }
  }
}

async function noteCaught($: EngineInterface, options: PluginOptions, toolUseId: string): Promise<void> {
  await log($, options, { kind: 'caught', ...(await inTranscript($, toolUseId)) })
}

const typedOr = (st: Held, i: number): string[] => {
  const text = (st.other[i] ?? '').trim()
  return text ? [text] : (st.picks[i] ?? [])
}

function picksOf(st: Held): Picks {
  return Object.fromEntries(st.questions.map((_, i) => [i, typedOr(st, i)]))
}

function togglePick(st: Held, i: number, label: string): Held {
  const current = st.picks[i] ?? []
  const multi = st.questions[i]?.multiSelect === true
  const next = !multi ? [label] : current.includes(label) ? current.filter((l) => l !== label) : [...current, label]
  return { ...st, picks: { ...st.picks, [i]: next } }
}

const pickOption = ($: EngineInterface, i: number, label: string) =>
  update($, heldAtom, (st) => (st ? togglePick(st, i, label) : st))

const typeOther = ($: EngineInterface, i: number, text: string) =>
  update($, heldAtom, (st) => (st ? { ...st, other: { ...st.other, [i]: text } } : st))

const setShape = ($: EngineInterface, shape: ShapeId) => update($, heldAtom, (st) => (st ? { ...st, shape } : st))

async function sendHeld($: EngineInterface): Promise<void> {
  const st = await read($, heldAtom)
  if (st) release?.(st)
}

function stopTicker(): void {
  ticker?.cancel()
  ticker = null
}

async function cutOff($: EngineInterface, options: PluginOptions, failure?: { kind: string; message?: string; budget: number }): Promise<void> {
  stopTicker()
  release = null
  await update($, heldAtom, () => null)
  const detail = `${failure?.kind ?? 'unknown'}${failure?.message ? `: ${failure.message}` : ''} (budget ${failure?.budget ?? 0} ms)`
  await log($, options, { kind: 'cut-off', detail })
}

async function holdCall($: EngineInterface, options: PluginOptions, e: { tool_use_id: string; questions?: Question[] }) {
  const startedAt = Date.now()
  const caught = noteCaught($, options, e.tool_use_id)
  const sent = new Promise<Held>((resolve) => {
    release = resolve
  })
  await update($, heldAtom, () => ({ questions: e.questions ?? [], picks: {}, other: {}, shape: 'answers-by-question', startedAt }))
  await $.ui.open({ id: PANE_ID, title: 'Ask hold', focus: true })
  ticker = $.clock.every(1000, () => void update($, tickAtom, (n: number) => n + 1))
  await caught
  const st = await sent
  stopTicker()
  release = null
  await update($, heldAtom, () => null)
  const result = answerOf(st.shape, st.questions, picksOf(st))
  await log($, options, { kind: 'answered', elapsedMs: Date.now() - startedAt, shape: st.shape })
  return { result }
}

function optionRow($: EngineInterface, ui: Ui, st: Held, q: Question, i: number) {
  const { Box, Button } = ui
  const picked = st.picks[i] ?? []
  return (
    <Box key={`row-${i}`} flexDirection="row" columnGap={2} flexWrap="wrap">
      {q.options.map((o) => (
        <Button key={`opt-${i}-${o.label}`} label={o.label} dimColor={!picked.includes(o.label)} onPress={() => void pickOption($, i, o.label)} />
      ))}
    </Box>
  )
}

function questionBlock($: EngineInterface, ui: Ui, st: Held, q: Question, i: number) {
  const { Box, Text, Input } = ui
  const picked = st.picks[i] ?? []
  return (
    <Box key={`q-${i}`} flexDirection="column" marginTop={1}>
      <Text>{q.question}</Text>
      {optionRow($, ui, st, q, i)}
      <Text dimColor>{`picked: ${picked.join(', ') || 'none'}`}</Text>
      <Input key={`other-${i}`} label="Other" value={st.other[i] ?? ''} onInput={(t: string) => void typeOther($, i, t)} onSubmit={(t: string) => void typeOther($, i, t)} />
    </Box>
  )
}

async function renderPane($: EngineInterface, e: RenderEvent) {
  const ui = $.ui.resolve(e)
  const { Box, Text, Button } = ui
  await read($, tickAtom)
  const st = await read($, heldAtom)
  if (!st) return <Box flexDirection="column"><Text dimColor>No call is held. Ask the agent to call AskUserQuestion.</Text></Box>
  return (
    <Box flexDirection="column">
      <Text bold>{`Held for ${Math.floor((Date.now() - st.startedAt) / 1000)} s. Press Send to answer.`}</Text>
      {st.questions.map((q, i) => questionBlock($, ui, st, q, i))}
      <Box flexDirection="row" columnGap={2} marginTop={1}>
        {SHAPES.map((shape) => (
          <Button key={`shape-${shape}`} label={shape} dimColor={st.shape !== shape} onPress={() => void setShape($, shape)} />
        ))}
      </Box>
      <Button key="send" label="Send" onPress={() => void sendHeld($)} />
    </Box>
  )
}

export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    for (const command of COMMANDS) await $.command.register(command)
    return next(e)
  })

  on('command.run', { command: 'ask-probe' }, async ($, e) => {
    const mode = e.args.trim()
    if (!isMode(mode)) return { text: 'Use /ask-probe hold, pass, or off.' }
    await update($, modeAtom, () => mode)
    return { text: `The ask probe is ${mode}.` }
  })

  on('tool.call', { tool: 'AskUserQuestion' }, async ($, e, next) => {
    const mode = await read($, modeAtom)
    if (e.agentId === undefined && mode === 'pass') await log($, options, { kind: 'passed' })
    if (e.agentId !== undefined || mode !== 'hold') return next(e)
    return holdCall($, options, e as { tool_use_id: string; questions?: Question[] })
  }).catch(async ($, _e, next) => {
    await cutOff($, options, next.error)
  })

  on('ui.render', { component: 'Pane', requestId: PANE_ID }, ($, e) => renderPane($, e))
}
