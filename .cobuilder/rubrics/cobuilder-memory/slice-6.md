# Rubric: Slice 6 — One install command sets up the family, with the Hindsight allow rules

Feature: cobuilder-memory
Epic: E1
Slice goal: `/cobuilder-full-lifecycle:install` runs the habit-hooks setup that `/implement:install` ran, the glossary check, and a new Hindsight step. `/implement:install` hands over to it. The coach check stays in `implement` as its own mode. The Hindsight step finds the allow rules that the session needs and `~/.claude/settings.json` lacks, asks once, and adds them only after a yes.
Test command: `uv run pytest tests -q`

## Criteria

### C1 — A blind agent adds only the missing rules, and only after a yes [CRITICAL]
**Must be true:** given only the Hindsight step of the setup skill, a session that lists `mcp__cobuilder-memory__consult` and `mcp__hindsight__retain`, and a scratch settings file that holds two of the five Hindsight rules and other keys, a fresh agent asks once before it writes. After a yes, the file holds all five rules once each, every other key and rule is unchanged, and the file parses as JSON. After a no, the file is byte-for-byte unchanged, and the agent lists the missing rules as a manual step.
**Evidence to check:**
- The blind-pass record in the slice evidence: the question, the file before and after for the yes run, and the file hash before and after for the no run.
**Scoring:**
- 1.0 — both runs behave as stated.
- 0.5 — the yes run is right, but the no run writes, or the agent asks more than once.
- 0.0 — the agent writes before it asks, adds a rule that was there, or breaks the JSON.

### C2 — The rule list stays in step with the tools the plugins call
**Must be true:** a test reads each tool name that `plugins/cobuilder-memory/hooks/hindsight.ts` passes to its MCP call, and the `mcp__hindsight__retain` name in `implement`'s `slice-loop.md`. Each one appears as `mcp__hindsight__<tool>` in the setup skill. The setup skill names no `plugins/<other plugin>/` path.
**Evidence to check:**
- The test source and its pass. A tool name added to `hindsight.ts` and missing from the skill must fail the test.
**Scoring:**
- 1.0 — the test reads the names from the code and passes.
- 0.5 — the test holds a fixed copy of the names instead of reading the code.
- 0.0 — no such test, or the skill names another plugin's path.

### C3 — The install steps moved, and the old command hands over
**Must be true:** the umbrella plugin has `commands/install.md`, which calls the setup skill. The setup skill holds the habit-hooks steps that the build skill's Install mode held, and the glossary check. It calls `implement`'s coach-check mode by skill name, not by path. The build skill no longer holds the habit-hooks install steps, and its coach-check mode names the `habit_coach.py" --check` call and both output prefixes. `implement`'s `commands/install.md` hands over to the setup skill, and it tells the user to install `cobuilder-full-lifecycle` when that skill is unknown. The tests that read the old Install mode now read the new locations and pass.
**Evidence to check:**
- `uv run pytest tests/test_habit_coach.py tests/test_install_command.py -q`, and a read of the four files.
**Scoring:**
- 1.0 — all of it holds and the tests pass.
- 0.5 — the move is complete, but the hand-over has no fallback for a missing umbrella plugin.
- 0.0 — the steps exist in two places, or a moved test was deleted instead of repointed.

### C4 — The changed plugins are released, and the documents name the new command
**Must be true:** `implement` and `cobuilder-full-lifecycle` carry a new version in both `plugin.json` and `marketplace.json`. `README.md`, `CLAUDE.md`, `plugins/implement/commands/start.md`, and the build skill's habit-hooks prerequisite name `/cobuilder-full-lifecycle:install`.
**Evidence to check:**
- `uv run pytest tests/test_plugin_manifests.py -q`, and a grep for the command name.
**Scoring:**
- 1.0 — both bumped and matched, and every listed document names the command.
- 0.5 — the versions are right, but a listed document still sends the user only to `/implement:install`.
- 0.0 — a bump is missing or the versions differ.

## Regression check
- All tests that passed before this slice must still pass, apart from tests that were repointed to the moved text.

## Out of scope — do not penalise
- The plugin count in top-level documents (slice 7).
- `habit_coach.py` messages that still name `/implement:install`, because that command hands over.
