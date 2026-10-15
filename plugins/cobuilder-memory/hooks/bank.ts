import type { Engine } from 'claude-code'

export type Bank = { bank: string }
export type NoBank = { error: string }

// The Hindsight config, and the bank template the runtime uses when the config has none
const HINDSIGHT_CONFIG = '/.hindsight/coding-agent.json'
const DEFAULT_TEMPLATE = 'coding-agent::{gitProject}'

// The bank for this repo. {gitProject} is the base name of the main worktree root.
export async function resolveBank($: Engine): Promise<Bank | NoBank> {
  let template = DEFAULT_TEMPLATE
  try {
    const cfg = JSON.parse(await $.fs.read((await $.env.get('HOME')) + HINDSIGHT_CONFIG))
    if (typeof cfg.bankIdTemplate === 'string') template = cfg.bankIdTemplate
  } catch {
    // No config, or an unreadable one: keep the default template
  }

  let project = ''
  try {
    const git = await $.process.run(['git', 'rev-parse', '--path-format=absolute', '--git-common-dir'])
    if (git.exitCode === 0) project = git.stdout.trim().replace(/\/\.git\/?$/, '').split('/').pop() ?? ''
  } catch {
    // Not a git repository: the project stays empty
  }

  if (template.includes('{gitProject}') && !project) {
    return { error: 'No bank: this folder is not in a git repository.' }
  }
  const bank = template.replace('{gitProject}', project)
  if (/\{\w+\}/.test(bank)) {
    return { error: 'No bank: the template ' + template + ' needs a value this plugin does not fill.' }
  }
  return { bank }
}
