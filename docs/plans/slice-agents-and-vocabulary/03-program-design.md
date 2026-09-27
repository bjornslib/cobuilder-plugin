# Program Design: Slice agents, coding habits, and a DDD vocabulary

## Files

| File | Epic | Why |
|---|---|---|
| `docs/architecture/adr/ADR-0025-implement-ships-slice-agents-and-a-coaching-hook.md` | E1 | Records the narrowed install-surface rule. |
| `tests/test_plugin_manifests.py` | E1 | Allows `agents/` and `hooks/` in `implement` only. |
| `CLAUDE.md` | E1, E4 | Install-surface rule (E1). Vocabulary pointer (E4 final slice). |
| `plugins/implement/agents/{red,green,validate}.md` | E2 | The three roles as named agents. |
| `plugins/implement/skills/build/references/slice-loop.md` | E2, E4 | Spawns agents by name. Adds the vocabulary step. |
| `plugins/implement/skills/build/workflows/slice-loop.js` | E2, E4 | Same change for the scripted path. |
| `plugins/implement/hooks/hooks.json` | E3 | The PostToolUse registration. |
| `plugins/implement/scripts/habit_coach.py` | E3 | The hook command. |
| `plugins/implement/NOTICE.md` | E3 | Credit and licence of habit-hooks. |
| `plugins/implement/skills/build/SKILL.md` | E3 | Prerequisite check for `habit-hooks`. |
| `plugins/implement/.claude-plugin/plugin.json` | E3 | Version 0.3.0. |
| `DDD-VOCABULARY.md` | E4 | The one glossary. |
| `plugins/implement/agents/vocabulary.md` | E4 | The vocabulary reviewer. |
| `plugins/architect/skills/architecture/references/design-mode.md` | E4 | Stage 1 reads, stage 5 writes. |
| `plugins/architect/skills/architecture/references/templates/canvas-template.md`, `docs/architecture/contexts/cobuilder-packaging/canvas.md` | E4 | Link canvas terms to the glossary. |
| `tests/test_slice_agents.py`, `tests/test_habit_coach.py`, `tests/test_ddd_vocabulary.py` | E2 to E4 | Written by RED. |

## Types & signatures

```python
# plugins/implement/scripts/habit_coach.py  (PEP 723, stdlib only)
GREEN_AGENT_TYPES: frozenset[str]   # {"implement:green"}

def is_green(payload: dict) -> bool: ...
def target_path(payload: dict) -> str | None: ...        # tool_input.file_path
def run_habit_hooks(path: str) -> tuple[int, str]: ...   # (exit code, stdout+stderr)
def render(code: int, text: str) -> dict | None: ...     # hook JSON or None
def main(stdin: TextIO, stdout: TextIO, runner=run_habit_hooks) -> int: ...  # always 0
```

Agent definition frontmatter (each of the four files):

```yaml
name: green            # red | green | validate | vocabulary
description: <one line: the role and when the build skill spawns it>
tools: <role-specific list; vocabulary and validate get no Write/Edit on source>
model: sonnet          # red and green only. validate and vocabulary inherit.
```

`DDD-VOCABULARY.md` entry shape:

```markdown
## <Bounded context or district name>

**<Term>** (`<context-id>`):
<One or two sentences: what it IS.>
_Avoid_: <synonym>, <synonym>
```

## Call stack

```
/implement:start → Skill("build")
  prerequisite check → habit-hooks --version        (E3)
  slice N:
    Agent(subagent_type="implement:red")             (E2)
    Agent(subagent_type="implement:green")           (E2)
      Write|Edit → hooks.json → habit_coach.py main()  (E3)
        is_green → target_path → run_habit_hooks → render
    parallel:
      Agent(subagent_type="implement:validate")      (E2)
      Agent(subagent_type="implement:vocabulary")    (E4)
/architect:design
  stage 1 → read DDD-VOCABULARY.md                   (E4)
  stage 5 → add or sharpen entries                   (E4)
```

## Test plan

- **Packaging:** `implement` may ship `agents/` and `hooks/`. The other four
  may not. No plugin ships an MCP server. Each agent file parses, carries
  `name` and `description`, and uses no ignored field (`hooks`,
  `mcpServers`, `permissionMode`).
- **Prompt parity:** each agent body holds the scope contract and the blind
  rule that `slice-loop.md` held. `slice-loop.md` and `slice-loop.js` name
  the agents and no longer paste the role prompts.
- **Hook, with a fake runner:** a non-GREEN payload gives no output. A GREEN
  payload with exit 0 gives no output. Exit 1 gives `additionalContext` with
  the coaching text. Exit 2 gives a tool-failure note. A missing binary gives
  a note and exit 0. A payload with no `file_path` gives no output.
  `hooks.json` registers `PostToolUse` with matcher `Write|Edit` and a
  command under `${CLAUDE_PLUGIN_ROOT}`.
- **Credit:** `NOTICE.md` names habit-hooks, its MIT licence, its URL, and
  its author.
- **Vocabulary:** every entry parses into the shape above. Every term from
  the old `CLAUDE.md` table exists. Every canvas term links to an entry.
  `design-mode.md` names the file in stage 1 and stage 5.
- **Behavioural (Gate 4c special case):** the agent prompts and
  `design-mode.md` govern agent behaviour, so their rubrics use one blind
  subagent pass.

## Least confident decisions

1. **The value of `agent_type` for a plugin agent.** The docs show
   `agent_type` in the hook input, but not the exact string for a
   namespaced plugin agent. The script accepts `implement:green` and
   `green`. Slice 5 confirms the real value in a live run.
2. **The Workflow tool path.** It is not known whether `agent()` in
   `slice-loop.js` can spawn a named plugin agent. If it cannot, the
   scripted path cannot receive coaching. Slice 3 checks this. The
   fallback is that the script tells the orchestrator to use Manual mode.
3. **A required tool in a plugin family with no other install step.**
   Making habit-hooks required means `/implement:start` stops on a machine
   without it. You asked for this. The stop message gives the one-line
   install.
4. **Vocabulary as a separate axis.** VALIDATE's score does not include the
   vocabulary verdict. A slice can pass at 0.95 with a vocabulary finding.
   The finding routes through the gap tree like any other gap.
