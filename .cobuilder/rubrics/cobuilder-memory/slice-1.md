# Rubric: Slice 1 — Tracer bullet: the plugin loads, each Hindsight MCP tool answers, consult returns recall records

Feature: cobuilder-memory
Epic: E1
Slice goal: A session started with `--plugin-dir plugins/cobuilder-memory` lists `mcp__cobuilder-memory__consult`, each of the four Hindsight MCP tools returns data from the loaded plugin, and a consult call returns the judging rules first, then the header, the Need line, and the recall records.
Test command: `claude plugin validate plugins/cobuilder-memory && claude plugin test plugins/cobuilder-memory && uv run pytest tests -q`

## Criteria

### C1 — The plugin is a valid, installable mod in this marketplace [CRITICAL]
**Must be true:** `plugins/cobuilder-memory` is a plugin whose `hooks/hooks.json` names one hooks module, and `.claude-plugin/marketplace.json` lists it with source `./plugins/cobuilder-memory` and the same version as its `plugin.json`.
**Evidence to check:**
- `claude plugin validate plugins/cobuilder-memory` exits 0.
- `claude plugin validate .` exits 0 from the repo root.
- `uv run pytest tests/test_plugin_manifests.py -q` passes.
- Read `plugins/cobuilder-memory/.claude-plugin/plugin.json` and the marketplace entry: the versions are equal.
**Scoring:**
- 1.0 — all three commands pass and the versions match.
- 0.5 — the plugin validates, but the marketplace entry is missing or the versions differ.
- 0.0 — the plugin does not validate.

### C2 — The install-surface rule names the new plugin and nothing more
**Must be true:** the packaging test lets `cobuilder-memory` ship `hooks/`, still refuses `agents/` for it, and still refuses an MCP server for every plugin.
**Evidence to check:**
- Read `tests/test_plugin_manifests.py`: find the rule for `cobuilder-memory`.
- Make a temporary copy of the plugin with an `agents/` folder or a `.mcp.json`, and run the test function on it, or read a test that does this.
**Scoring:**
- 1.0 — `hooks/` allowed, `agents/` and MCP refused, and a test covers each.
- 0.5 — `hooks/` allowed, but one refusal is untested.
- 0.0 — the rule allows `agents/` or an MCP server, or the test fails.

### C3 — A loaded session lists the consult tool [CRITICAL]
**Must be true:** a session started with `--plugin-dir plugins/cobuilder-memory` lists the tool `mcp__cobuilder-memory__consult`, with no input.
**Evidence to check:**
- The slice evidence file holds the session output that lists the tool.
- A `claude plugin test` case calls `session.start` and finds a tool named `consult` with an empty input schema.
**Scoring:**
- 1.0 — the live listing and the test both show it.
- 0.5 — only one of the two shows it.
- 0.0 — neither shows it.

### C4 — Each Hindsight MCP tool answers from the loaded plugin [CRITICAL]
**Must be true:** from the plugin, `$.mcp.call("hindsight", …)` returns data from `recall`, `search_knowledge_base`, `get_knowledge_page`, and `reflect`, and the evidence records the time of one `reflect` and what the engine does when an MCP call passes its timeout.
**Evidence to check:**
- The slice evidence file: one line per tool with its result size or count and its time in ms.
- The evidence names the MCP timeout behaviour: the value or the observed stop, with how it was found.
**Scoring:**
- 1.0 — all four tools answered live, and the reflect time and the timeout behaviour are recorded.
- 0.5 — all four answered, but the timeout behaviour is missing.
- 0.0 — any tool was not called live from the plugin.

### C5 — Consult returns the result in the contract's order
**Must be true:** a consult call returns, in order, the judging rules, a header that names the bank and the count of stored prompts, the Need line, and the recall section. The recall section drops results whose document is the current session's transcript.
**Evidence to check:**
- `claude plugin test plugins/cobuilder-memory`: a run test with stubbed model and MCP answers.
- The slice evidence file holds one live consult result.
**Scoring:**
- 1.0 — the test asserts the order and the drop, and the live result shows the same order.
- 0.5 — the order holds, but the drop is untested.
- 0.0 — the judging rules do not come first, or the run fails.

### C6 — The bank and the prompt store follow the contract
**Must be true:** the bank comes from `bankIdTemplate` in `~/.hindsight/coding-agent.json` with `{gitProject}` set to the main worktree's base name. Outside a git repo, the run stops with `No bank: this folder is not in a git repository.` Only `composer` and `bridge` prompts are stored, never a command, a meta prompt, or an SDK prompt.
**Evidence to check:**
- `claude plugin test`: cases for each rule above.
**Scoring:**
- 1.0 — every rule has a passing case.
- 0.5 — the bank rule passes, but a prompt origin is untested.
- 0.0 — a rule fails.

### C7 — A missing Hindsight server gives a set-up message
**Must be true:** with no MCP server named `hindsight`, or with one that lacks a required tool, the run stops and its text names the server and the four tools to set up.
**Evidence to check:**
- `claude plugin test`: a case with the MCP call refused or the tool missing.
**Scoring:**
- 1.0 — both cases pass.
- 0.5 — one case passes.
- 0.0 — the run returns an empty result or throws.

## Regression check
- All tests that passed before this slice must still pass (`uv run pytest tests -q`, baseline 761 passed, 1 skipped).
- Files outside the slice scope stay unchanged: every plugin folder other than `plugins/cobuilder-memory`, `shared/`, and the bundle.

## Out of scope — do not penalise
- The knowledge-page search and read (slice 2).
- Reflect questions in the result, and the reflect failure path (slice 3). Slice 1 only calls `reflect` once in its live check.
- The memory pane (slice 4).
- The design and build skill changes (slice 5).
- The live value check and the plugin count in top-level documents (slice 6).
