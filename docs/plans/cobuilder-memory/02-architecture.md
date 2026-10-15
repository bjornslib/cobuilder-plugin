# Architecture: cobuilder-memory

Grounded in `docs/architecture/designs/cobuilder-memory/contracts.md` and
`intent.json` (ADR-0036), and in ADR-0039. Scope: epic E1.

## Fit

The plugin is new. It meets the rest of the family only through names: the
design and build skills name the consult tool, and no plugin names a path
in another plugin (ADR-0016).

| Module | Role in E1 | Change |
|---|---|---|
| `plugins/cobuilder-memory/` | The new plugin, a mod: `.claude-plugin/plugin.json`, `hooks/hooks.json` naming `hooks/register.ts`, the module's tests, `tsconfig.json`, a short `README.md`, and the `shared` symlink | New. It starts from the spike in `~/mods/cobuilder-memory` |
| `.claude-plugin/marketplace.json` | The one marketplace manifest | A sixth entry, `cobuilder-memory`, with source `./plugins/cobuilder-memory` and the same version as its `plugin.json` |
| `tests/test_plugin_manifests.py` | The install-surface test (ADR-0025) | `hooks/` is allowed for `implement` and `cobuilder-memory`, `agents/` for `implement` only, and an MCP server for none |
| `.gitignore` | Ignore rules | `plugins/cobuilder-memory/.claude-plugin/types/`, which the engine writes for the editor on each load |
| `plugins/architect/skills/architecture/references/design-mode.md` | Design mode procedure, §4 Stage 1 | Stage 1 calls the consult tool when the session lists it (slice 5) |
| `plugins/implement/skills/build/SKILL.md` and `references/hindsight-routine.md` | The build procedure and its H1 to H5 checkpoints | Gate 1 calls the consult tool, and H1 to H5 retire (slice 5) |
| `CLAUDE.md`, `README.md`, `DDD-VOCABULARY.md` | Top-level documents that count the plugins | Five becomes six, principle 5 names the amended rule (slice 6) |
| `docs/architecture/adr/ADR-0025-*.md` | The install-surface decision | A history entry that names ADR-0039 (slice 6) |

The plugin does not touch the bundle (`.cobuilder-architect/`), the viewer,
any script under `shared/`, or the Hindsight runtime.

## Endpoints

The plugin serves no HTTP route. It adds two entry points to the session:

| Entry point | Kind | Purpose |
|---|---|---|
| `consult`, listed as `mcp__cobuilder-memory__consult` | tool, `$.tool.register`, no input | The main agent starts one memory run |
| `/memory-recall` | command, `$.command.register` | The person starts one memory run, and the pane opens at any width |

It also listens to three events: `session.start` (registers both),
`prompt.submit` (stores the person's prompts), and `ui.render` for the pane
`memory-run`.

## Data

No table or file. Two values live in the engine:

- `$.store` key `prompts:<session id>`: the person's last 100 prompts from
  `composer` or `bridge`, each `{ at, text }`, text cut to 2,000 characters.
  It survives a plugin reload.
- The atom `{ plugin: "cobuilder-memory", key: "run" }`: the newest run's
  state for the pane. It lives for the session.

The plugin reads `bankIdTemplate` from `~/.hindsight/coding-agent.json` and
writes nothing there.

## Flow

The primary path: the main agent calls the consult tool.

1. The `tool.call` hook for `mcp__cobuilder-memory__consult` starts a run.
   Before any other work, it sets the atom to step `query`, opens the pane
   unasked, and starts a one-second clock tick for the elapsed time. Each
   Hindsight call updates the atom when it starts and when it ends, so the
   pane shows the activity while the queries run.
2. The module resolves the bank: `bankIdTemplate` with `{gitProject}`
   filled from `git rev-parse --git-common-dir`. Outside a git repo, the
   run stops with a reason.
3. Haiku (`$.model.complete`, effort medium) reads the stored prompts and
   the session end, and writes the Need line and the recall query.
4. Step `search`: `$.mcp.call("hindsight", "recall")` and
   `$.mcp.call("hindsight", "search_knowledge_base")` run side by side. The
   module drops this session's own transcript and the empty pages.
5. Step `questions`: Haiku reads the kept records and page snippets, picks
   at most one page, and writes the context and one to three reflect
   questions.
6. Step `reflect`: `get_knowledge_page` and each `reflect` run side by
   side. A failed call writes its reason, and the rest go on.
7. Step `done`: the module builds the result text, judging rules first,
   updates the atom, and returns the text as the tool result.

`/memory-recall` runs the same steps and opens the pane asked. Design stage
1 and implement Gate 1 reach step 1 by calling the tool.

## External

| Dependency | Use | When absent |
|---|---|---|
| MCP server `hindsight` (the full Hindsight API server; in this repo `.mcp.json` points it at `http://localhost:8888/mcp/`) | `recall`, `search_knowledge_base`, `get_knowledge_page`, `reflect` through `$.mcp.call` | The run stops and names the server and the four tools to set up |
| `~/.hindsight/coding-agent.json` | `bankIdTemplate` | The default `coding-agent::{gitProject}` applies |
| Haiku through `$.model.complete` | The two query-writing calls | The run stops with the reason the engine gives |
| `git` | The main worktree's base name | The run stops: no bank |

No environment variable and no webhook. Slice 1 measures how long the
engine lets one MCP call run.

## Notes from H2 (2026-10-15)

H2 ran through the spike's tool. Recall confirmed one rule that slice 1
must meet: each plugin's version in `plugin.json` matches its entry in
`marketplace.json`. Two of three reflects timed out at 170 s again.
