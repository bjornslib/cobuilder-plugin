# Architecture: Slice agents, coding habits, and a DDD vocabulary

## Fit

| Existing part | Role today | Change |
|---|---|---|
| `plugins/implement/skills/build/` | Runs the gates and the RED, GREEN, VALIDATE slice loop. The three roles are prompt text in `references/slice-loop.md` and `workflows/slice-loop.js`. | The prompts move into agent definitions. The loop spawns agents by name. The prerequisite check gains `habit-hooks`. |
| `plugins/implement/.claude-plugin/plugin.json` | Manifest, version 0.2.0. | Version 0.3.0. No new manifest key: Claude Code finds `agents/` and `hooks/hooks.json` by convention. |
| `tests/test_plugin_manifests.py` | Fails if any plugin ships `agents/`, `hooks/`, or an MCP server. | Allows `agents/` and `hooks/` for `implement` only. The MCP ban stays for all five plugins. |
| `CLAUDE.md` | States "no agents, no hooks, no MCP servers" for all five plugins, and holds the Vocabulary table. | Narrowed install-surface rule, citing the new ADR. The Vocabulary table becomes a pointer to `DDD-VOCABULARY.md`. |
| `plugins/architect/skills/architecture/references/design-mode.md` | Design mode stages 0 to 7. | Stage 1 reads the vocabulary. Stage 5 adds or sharpens terms. |
| `plugins/architect/skills/architecture/references/templates/canvas-template.md` and `docs/architecture/contexts/*/canvas.md` | Each canvas holds its own "Ubiquitous language" table. | Each term links to its entry in `DDD-VOCABULARY.md`. The canvas keeps the context-specific meaning. |

New parts:

- `plugins/implement/agents/red.md`, `green.md`, `validate.md`, `vocabulary.md`: four agent definitions.
- `plugins/implement/hooks/hooks.json`: one `PostToolUse` hook on `Write|Edit`.
- `plugins/implement/scripts/habit_coach.py`: the hook command.
- `plugins/implement/NOTICE.md`: credit for habit-hooks.
- `DDD-VOCABULARY.md` at the repository root.
- `docs/architecture/adr/ADR-0025-implement-ships-slice-agents-and-a-coaching-hook.md`.

## Endpoints

none

## Data

No database. Two file formats are new.

1. **`DDD-VOCABULARY.md`.** One entry per term: the term, a one- or
   two-sentence definition, the bounded context or district that owns it, and
   an `_Avoid_:` list of rejected synonyms. Terms group under one heading per
   bounded context. The format merges Matt Pocock's `CONTEXT.md` glossary
   format with the canvas "Ubiquitous language" table.
2. **Hook output.** `habit_coach.py` writes one JSON object to stdout:
   `{"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": "<coaching text>"}}`.

## Flow

**Coaching during GREEN:**

1. The orchestrator spawns `implement:green` for a slice.
2. GREEN writes or edits a file.
3. Claude Code fires `PostToolUse` for `Write|Edit` with the payload on stdin.
4. `habit_coach.py` reads `agent_type`. If the value does not name the
   GREEN agent, the script exits 0 with no output.
5. The script runs `habit-hooks --file <tool_input.file_path>`.
6. Exit 0: no output. Exit 1: the coaching text goes back as
   `additionalContext`. Exit 2: a one-line note that the tool failed goes
   back as `additionalContext`, with the reason.
7. GREEN reads the coaching and fixes the smell before its report.

**Vocabulary check during VALIDATE:**

1. After GREEN reports, the orchestrator spawns `implement:validate` and
   `implement:vocabulary` in parallel.
2. `implement:vocabulary` reads `DDD-VOCABULARY.md` and the slice diff. It
   checks district, directory, file, class, and method names, and prose
   terms. It reports each finding with the entry it breaks.
3. VALIDATE keeps its rubric score. The vocabulary verdict appears beside
   it in the evidence file. It is a separate axis, not merged into the score.

**Vocabulary during design:**

1. `/architect:design` stage 1 reads `DDD-VOCABULARY.md` with the districts.
2. Stage 5 writes each term that the interview resolved or sharpened, and
   flags a term that conflicts with an entry.

## External

- **habit-hooks** (MIT, https://github.com/habit-hooks/habit-hooks, by Ivett
  Ördög and contributors). A required command-line tool, version 1.5.0 or
  later. The build skill checks `habit-hooks --version` before the first
  slice and stops with install steps if it is missing.
- **Claude Code hook contract.** Plugin agents ignore a `hooks` frontmatter
  field, so the hook lives in the plugin's `hooks/hooks.json`. The hook input
  carries `agent_type` for a tool call made inside a subagent.
- No new environment variable.
