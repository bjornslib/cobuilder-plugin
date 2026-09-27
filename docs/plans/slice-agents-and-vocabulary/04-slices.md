# Slice plan: Slice agents, coding habits, and a DDD vocabulary

| # | Epic | Slice | Ends with | Score | State |
|---|---|---|---|---|---|
| | **`slice-agents-and-vocabulary/E1` — The narrowed install-surface rule.** An ADR lets `implement` ship agents and hooks. | | | | |
| 1 | `slice-agents-and-vocabulary/E1` | Tracer bullet and whole epic: ADR-0025, the packaging test, and the CLAUDE.md rule | ADR-0025 exists. `test_plugin_manifests.py` passes with an `agents/` and `hooks/` directory in `implement` and fails for any other plugin. `CLAUDE.md` states the narrowed rule and cites ADR-0025. | 1.00 | accepted |
| | **`slice-agents-and-vocabulary/E2` — The three slice roles as agents.** RED, GREEN, and VALIDATE become named plugin agents. | | | | |
| 2 | `slice-agents-and-vocabulary/E2` | Tracer bullet: three agent files that parse | `plugins/implement/agents/{red,green,validate}.md` exist, parse, carry `name` and `description`, and use no ignored field. | — | pending |
| 3 | `slice-agents-and-vocabulary/E2` | Real content: the prompts move and both loop paths spawn by name | Each agent body holds its role prompt, scope contract, and blind rule. `slice-loop.md` and `slice-loop.js` spawn `implement:red`, `implement:green`, and `implement:validate` and no longer paste the prompts. | — | pending |
| | **`slice-agents-and-vocabulary/E3` — habit-hooks coaches GREEN.** A required PostToolUse hook coaches GREEN on each file it writes. | | | | |
| 4 | `slice-agents-and-vocabulary/E3` | Tracer bullet: the hook fires for GREEN only | `hooks/hooks.json` registers `habit_coach.py` on `Write|Edit`. The script returns `additionalContext` for a GREEN payload with findings and nothing for any other agent. | — | pending |
| 5 | `slice-agents-and-vocabulary/E3` | Edge cases, requirement, and credit | Exit 2, a missing binary, and a missing `file_path` each behave as designed. The build skill stops before slice 1 when `habit-hooks --version` fails. `NOTICE.md` credits habit-hooks. `plugin.json` reads 0.3.0. | — | pending |
| | **`slice-agents-and-vocabulary/E4` — One DDD vocabulary.** A root glossary that design mode writes and a vocabulary agent enforces. | | | | |
| 6 | `slice-agents-and-vocabulary/E4` | Tracer bullet: the glossary file and its format | `DDD-VOCABULARY.md` exists with every canvas term, in the entry shape, and each canvas term links to its entry. | — | pending |
| 7 | `slice-agents-and-vocabulary/E4` | Real content: the vocabulary agent and design mode | `implement:vocabulary` exists and runs beside VALIDATE in both loop paths. `design-mode.md` reads the glossary in stage 1 and writes it in stage 5. | — | pending |
| 8 | `slice-agents-and-vocabulary/E4` | Move: the CLAUDE.md table goes to the glossary | Every term from the `CLAUDE.md` Vocabulary table is in `DDD-VOCABULARY.md`. `CLAUDE.md` holds a pointer, not the table. | — | pending |
