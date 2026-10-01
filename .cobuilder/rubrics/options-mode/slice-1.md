# Rubric: Slice 1 — Tracer bullet: the command and the skill declare a seventh mode

Feature: options-mode
Epic: options-mode/E1
Slice goal: `plugins/architect/commands/options.md` dispatches `Skill("architecture", args="options $ARGUMENTS")`. `SKILL.md` carries `### Options Mode` and `references/options-mode.md` holds the seven-stage procedure. `tests/test_commands.py` asserts seven modes and that the architect command files equal them, and it passes.
Test command: `uv run --with pytest pytest tests/test_commands.py -q`

Sources: `04-slices.md` row 1, `epic-E1-design.md`, `03-program-design.md`.

## Criteria

### C1 — The command file dispatches the options mode [CRITICAL]
**Must be true:** `plugins/architect/commands/options.md` exists, has the same front matter shape as `design.md`, states that the mode is self-only, lists what it writes (`docs/architecture/options/<name>/` and nothing else), and carries the dispatch line `Skill("architecture", args="options $ARGUMENTS")`.
**Evidence to check:**
- `cat plugins/architect/commands/options.md`. Compare its layout with `plugins/architect/commands/design.md`.
- `uv run --with pytest pytest tests/test_commands.py -q` passes, and the test file calls `extract_dispatch` on `options.md` and asserts `("architecture", "options")`.
**Scoring:**
- 1.0 — the file has all four parts and a test asserts the dispatch.
- 0.5 — the file is right but no test asserts the dispatch.
- 0.0 — the file is missing, or the dispatch names another mode.

### C2 — Seven modes are declared and pinned [CRITICAL]
**Must be true:** The test that pinned six modes now pins seven and is renamed. A second test asserts that the set of `plugins/architect/commands/*.md` mode names equals the declared modes.
**Evidence to check:**
- `grep -n "exactly_six\|exactly_seven" tests/test_commands.py`. Expect only `exactly_seven`.
- Read the set in that test. It holds `design`, `review`, `maintenance`, `decisions`, `describe`, `debug`, and `options`.
- Read the new set-equality test. It lists the files with a glob, not a hand-typed list.
**Scoring:**
- 1.0 — renamed, seven names, and a glob-based equality test.
- 0.5 — seven names but no equality test, or the equality list is hand-typed.
- 0.0 — still six, or a test fails.

### C3 — SKILL.md carries the mode in every place a mode list lives [CRITICAL]
**Must be true:** `SKILL.md` has exactly one `### Options Mode` heading. Its front matter description says seven modes and names `options`. The intro, the argument list, the interactive prompt, the content-inferred fallback, the documentation root layout (`options/`), and the Quick Reference each mention the mode.
**Evidence to check:**
- `grep -c "^### Options Mode" plugins/architect/skills/architecture/SKILL.md` prints `1`.
- `grep -n "six" plugins/architect/skills/architecture/SKILL.md`. No remaining hit may count modes.
- `grep -n "options" plugins/architect/skills/architecture/SKILL.md` shows hits in the front matter, the invocation list, the interactive prompt, the layout block, and the Quick Reference table.
**Scoring:**
- 1.0 — all six places carry the mode and no "six" counts modes.
- 0.5 — one or two places are missing.
- 0.0 — the heading is missing or the front matter still says six.

### C4 — A blind agent follows the procedure in order [CRITICAL] (behavioral)
**Must be true:** A fresh agent that has only `SKILL.md`, `references/options-mode.md`, and the task "Run the options mode on this repository, `--non-interactive`, scope: the whole repo. Stop after stage 1 and list what you read" shows this in its tool calls. It reads `references/options-mode.md` before any repo file. It reads `corpus-index.md` Section 1 and `stacks/README.md` before it reads any ADR. It spawns no isolated frame agent for divergent exploration. It names the pre-flight gate result in one line.
**Evidence to check:** The orchestrator spawns one fresh Sonnet subagent with no memory of this session, hands it the task above and the three paths, and captures its tool calls. Do not name the rubric or the word "test". Score the transcript against the four behaviors.
**Scoring:**
- 1.0 — all four behaviors are in the transcript.
- 0.5 — three of four.
- 0.0 — two or fewer, or the agent ran divergent exploration.

### C5 — The reference holds seven stages with the agreed names [CRITICAL]
**Must be true:** `references/options-mode.md` lists stages 0 to 6 named Frame, Ground, Inquire, Options, Draw and write, Verify, and Hand off. It names the item an "inquiry". It says the mode proposes and never decides, and that design stage 4 alone fills `intent.alternatives`. It names no `options.json`, no Lavish call, and no `.mmd` copy as a step.
**Evidence to check:**
- `grep -n "^### \|^## " plugins/architect/skills/architecture/references/options-mode.md`.
- `grep -n -i "options.json\|window.lavish" plugins/architect/skills/architecture/references/options-mode.md`. A hit is allowed only in a sentence that says the file is not used.
- `grep -n -i "finding\|question" plugins/architect/skills/architecture/references/options-mode.md`. Each hit must refer to an earlier review's finding IDs, to the interactive scope question, or to a header such as "questions for the engineer". None may name the report item.
**Scoring:**
- 1.0 — all four statements hold.
- 0.5 — one statement fails.
- 0.0 — two or more fail.

### C6 — The install surface stays closed
**Must be true:** The architect plugin ships no agent, hook, or MCP server.
**Evidence to check:**
- `find plugins/architect \( -name agents -o -name hooks -o -name ".mcp.json" \) -not -path "*/node_modules/*"` prints nothing.
- `uv run --with pytest pytest tests/test_plugin_manifests.py -q` passes.
**Scoring:**
- 1.0 — nothing found and the test passes.
- 0.0 — anything found or the test fails.

## Weights

C1 15%, C2 20%, C3 20%, C4 20%, C5 20%, C6 5%.
