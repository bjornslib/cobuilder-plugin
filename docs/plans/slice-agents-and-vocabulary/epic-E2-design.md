# Epic Technical Solution Design: E2 — The three slice roles as agents

Feature: slice-agents-and-vocabulary
Epic ID: E2

## Scope and Intent

Move the RED, GREEN, and VALIDATE prompts out of `slice-loop.md` and
`slice-loop.js` into three plugin agent files. The loop then spawns each
role by name. This gives a role a stable identity, which E3's hook needs to
tell GREEN apart from every other agent. The prompt wording does not
change, except for the placeholders that the orchestrator now fills in its
spawn message.

## Files Touched

- `plugins/implement/agents/red.md`, `green.md`, `validate.md` (new)
- `plugins/implement/skills/build/references/slice-loop.md`
- `plugins/implement/skills/build/workflows/slice-loop.js`
- `tests/test_slice_agents.py` (new, written by RED)

## Types & Signatures

Frontmatter per agent:

| Agent | `name` | `tools` | `model` |
|---|---|---|---|
| RED | `red` | Read, Grep, Glob, Write, Edit, Bash | `sonnet` |
| GREEN | `green` | Read, Grep, Glob, Write, Edit, Bash | `sonnet` |
| VALIDATE | `validate` | Read, Grep, Glob, Bash, Write | inherit (no `model` key) |

VALIDATE needs `Write` for its evidence file only. Its body says so.
No agent file may carry `hooks`, `mcpServers`, `permissionMode`, or
`initialPrompt`, because Claude Code ignores them for plugin agents.

Each body holds: the role statement, the SCOPE CONTRACT, the blind rule
("Do not read anything under `.cobuilder/`", absent for VALIDATE), the
read-first list with `<slug>`, `<N>`, `<epic-id>`, and `<test_command>`
placeholders, the steps, and the report format. The spawn message supplies
the placeholder values.

`slice-loop.js`: each `agent()` call passes `agentType: 'implement:red'`
(and green, validate), and a short message with the placeholder values.

## Slice Decomposition

- Slice 2 (tracer bullet): the three files with valid frontmatter and a
  one-paragraph body each.
- Slice 3 (real content): full prompt bodies, and both loop paths spawn by
  name. Depends on slice 2.

## Test Plan

`tests/test_slice_agents.py`:

- Slice 2: the files exist, the frontmatter parses as YAML, `name` equals
  the file stem, `description` is not empty, no ignored key is present,
  and VALIDATE carries no `model` key.
- Slice 3: RED and GREEN bodies contain "Do not read anything under
  .cobuilder/". GREEN contains "Do NOT modify any test file". VALIDATE
  contains the three verdict names and the 0.90 threshold.
  `slice-loop.md` names all three `implement:` agents and no longer
  contains the "You are the RED role" prompt block. `slice-loop.js` names
  all three agents.
- Slice 3 also has behavioural criteria (Gate 4c special case), scored with
  one blind subagent pass.

## Risks & Open Questions

- `agentType` is documented by secondary sources, not by the official
  workflows page. The engineer confirmed that `agent()` accepts a named agent.
- Moving prompts risks losing a line. The test pins the lines that matter
  most, and the VALIDATE rubric compares old and new text.
