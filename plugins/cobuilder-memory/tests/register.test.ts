import { expect, test } from 'claude-code/testing'
import { settle } from './fakes'

// Session start registers the consult tool and the two commands with the engine
test('session start registers the consult tool with no input and both commands', async ($, on) => {
  const tools: any[] = []
  const commands: any[] = []
  // Bottom handlers stand in for the engine and answer each registration
  on('tool.register', (_$: any, e: any) => {
    tools.push(e)
    return { value: { tool: e.name } }
  })
  on('command.register', (_$: any, e: any) => {
    commands.push(e)
    return { value: { command: e.name } }
  })
  // The bottom handler answers session.start with the echoed cwd, as the engine does
  on('session.start', (_$: any, e: any) => ({ cwd: e.cwd }))
  const { error } = await settle(async () =>
    $.session.start({ cwd: '/work/think-with-ai', surface: null, isInteractive: false } as any),
  )
  expect(error).toBe('')

  const consult = tools.filter((t) => t.name === 'consult')
  expect(consult.length).toBe(1)
  const schema = consult[0]?.inputSchema
  expect(schema?.type).toBe('object')
  expect(Object.keys(schema?.properties ?? {}).length).toBe(0)
  expect(schema?.required ?? []).toEqual([])

  const names = commands.map((c) => c.name)
  expect(names.includes('memory-recall')).toBe(true)
  expect(names.includes('memory-check')).toBe(true)
})
