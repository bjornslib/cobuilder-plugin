# Epic Technical Solution Design: E1 — The memory plugin ships for CoBuilder

Feature: cobuilder-memory
Epic ID: E1

## Scope and Intent

E1 ships `plugins/cobuilder-memory`, an opt-in plugin in this marketplace.
It gives the main agent the consult tool, shows each memory run in the
memory pane, and joins design stage 1 and implement Gate 1. Every Hindsight
call goes through the `hindsight` MCP server. E1 ends when two live runs in
two repos return dated records that the main agent uses or rejects with a
reason.

E1 does not build the Jev gate (E2) or the list of every Hindsight call
(E3). It changes no Hindsight server, runtime, bundle, or viewer.

## Files Touched

`03-program-design.md` lists every file with the slice that adds or
changes it. In short:

- New: `plugins/cobuilder-memory/` with the manifest, `hooks/hooks.json`,
  seven hooks files (`register.ts`, `bank.ts`, `prompts.ts`,
  `hindsight.ts`, `haiku.ts`, `result.ts`, `run.ts`) and `pane.tsx`,
  `types/index.d.ts`, `tests/`, `tsconfig.json`, `README.md`, and the
  `shared` symlink.
- Changed: `.claude-plugin/marketplace.json`,
  `tests/test_plugin_manifests.py`, `.gitignore`, the design-mode and build
  skill procedures, `hindsight-routine.md` (removed), the architect and
  implement manifests, `CLAUDE.md`, `README.md`, `DDD-VOCABULARY.md`, and
  ADR-0025.

## Types & Signatures

`03-program-design.md` § Types & signatures is the contract for this epic.
The interfaces that join the slices:

- `runMemory($, origin)` in `run.ts` is the only entry point. The tool and
  the command both call it, and every later slice extends it.
- `hindsight.ts` is the only file that calls `$.mcp.call`. Each call
  returns `Outcome<T>` with its time in ms, so a failed call never throws
  into the run.
- `haiku.ts` is the only file that calls `$.model.complete`.
- `RunReport` is built by `run.ts` and read by `result.ts`. Slice 4 reads
  the same facts through `RunState`, so the pane adds no fact.

## Slice Decomposition

| Slice | Ends with | Depends on |
|---|---|---|
| 1 | The plugin loads through `--plugin-dir`, each MCP tool answers, and consult returns recall records | none |
| 2 | A knowledge page joins the run | 1 |
| 3 | Reflect questions come from the records, and a failed reflect leaves the rest | 2, because the questions read the page snippets |
| 4 | The memory pane shows each run as it works | 3, because it shows every step |
| 5 | Design stage 1 and Gate 1 call the consult tool, and H1 to H5 retire | 3 |
| 6 | One install command sets up the family, with the Hindsight allow rules | 5 |
| 7 | The value check in two repos, and the six-plugin count | 1 to 6 |
| 8 | The agent's focus steers the recall query | 7, which found that the agent could not steer it |

The engineer stops the build after slice 4 to test the plugin in
think-with-ai (2026-10-15).

## Amendment: slice 8 (engineer, 2026-10-17)

Slice 7's first run showed that the agent cannot steer the recall query.
The consult tool took no input, and Haiku chose the person's last prompt
over the question that the agent stated. Slice 8 adds one input and a
fixed order of authority:

1. **The agent's focus**, an optional `focus` argument of `consult`. It
   sets the topic, and the Recall line must search for it.
2. **The session end**, the last six messages with text, at most 12,000
   characters, with injected hook blocks removed. It gives the concrete
   names that make the focus precise. It does not change the topic.
3. **The person's stored prompts.** They add terms. They do not replace
   the focus.

With no focus, the session end leads and the prompts add context. The
result and the pane show the focus, or state that none was given.
Signatures change in `register.ts` (the input schema), `run.ts`
(`runMemory($, origin, focus)`), `haiku.ts` (`writeRecallQuery` takes the
focus first), `prompts.ts` (`sessionTail` takes a message cap), and
`result.ts`, `types/index.d.ts`, and `pane.tsx` (the focus line).

## Test Plan

`03-program-design.md` § Test plan names each test file and its asserts.
Each slice runs:

1. `claude plugin validate plugins/cobuilder-memory`
2. `claude plugin test plugins/cobuilder-memory`
3. `uv run pytest tests -q`

Slice 1 adds a live check in a session started with
`--plugin-dir plugins/cobuilder-memory`, and its evidence file records the
result of each MCP tool and the time of one reflect. Slice 4 tests the pane
on the terminal surface with the kit's `mount`. Slice 5 adds one blind
agent pass, because it changes prose that steers an agent.

## Risks & Open Questions

- **The MCP timeout** is unknown. Slice 1 measures it. A short timeout
  moves more runs onto the failure path in slice 3.
- **A long `tool.call` hook** may be stopped by the engine. Slice 1 runs one
  full run before any other slice. A stop is an `abort_if` and returns the
  design to stage 3.
- **The result shape** of the `hindsight` server's tools comes from the
  spike's HTTP calls. Slice 1 confirms it through MCP.
- **Reflect timeouts** happened in four of six H checkpoint reflects this
  week, while consolidation caught up. Slice 3 must show the run survives
  them.
- **The pane placement** depends on the terminal width. Slice 4 tests the
  open and the drawing, and the engineer checks the placement by eye.
