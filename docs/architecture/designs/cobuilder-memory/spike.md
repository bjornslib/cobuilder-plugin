# Spike: the open facts before the build

> **Revision of 2026-10-15.** This plan tested the 2026-10-13 design. The design now rests on a second spike, the working tool in `~/mods/cobuilder-memory`, which ran on 2026-10-14 in this repo and in think-with-ai. Its results are in ADR-0039 Context and in `contracts.md`. The checks below stay as the record of the first spike.

The spike comes before any epic. It is a throwaway mod in a session's mods
folder, not code in this repo. Check S11 also loads it with the plugin layout
that ships. It runs on Claude Code 2.1.296.

Each check records pass or fail, with its evidence. A check passes only when
its pass branch holds. A fallback never counts as a pass. A failed check
returns the design to stage 3 before any epic starts, and stage 3 weighs the
fallback. A failed check that maps to a `goal.abort_if` item stops the design.

S3 is the one exception. The engineer chose its fallback in advance (R2-2 a).
If S3 fails, the deep run holds no tools, and the design does not return to
stage 3.

## Checks

### S1. Does `command.run` fire for the built-in `/memory`?

- Pass: A hook on `{ command: "memory" }` logs the run. Its `next(e)` resolves after the person closes the editor.
- Fallback for stage 3: run the `/memory` step at the next stop instead.

### S2. Does `classic.Stop` fire at every stop, a `/goal` iteration included?

- Pass: With a goal set, the hook logs one call per iteration. The `turn.complete` hook logs once per turn.
- On fail: Stop, and return the design to stage 3. `done_when` needs the router at each `/goal` iteration.

### S3. Does a fork from `$.agent.spawn` report each tool call to the module?

- Pass: The fork calls `mcp__hindsight__recall` and `Read`. The `tool.call` hook sees each call with the fork's agent id, and the check prints each tool name it sees. Its guard denies an `Edit`.
- On fail: The deep run holds no tools. The module recalls, reads each cited file line, and one `$.model.complete` call judges each claim (R2-2 a).

### S4. Where does a plugin-spawned fork's answer arrive?

- Pass: The answer reaches the main conversation. Or `turn.complete` carries it with the fork's agent id.
- Fallback for stage 3: append the answer with `$.session.append`.

### S5. Do `$.model.fork` and `$.mcp.call` run from a timer that `session.start` started?

- Pass: Both answer. The fork's `usage.cache_read_input_tokens` comes near the transcript size.
- On fail: Stop. This is `goal.abort_if` item 1.

### S6. Does a retain with the same `document_id` replace the earlier document?

- Pass: A second retain of a changed file leaves one document with the new text.
- Fallback for stage 3: delete the document, then retain it again.

### S7. Do a memory note and a deep-run result stay out of the bank?

- Pass: A recall for a unique marker in a note finds nothing after the next stop. The same holds for a marker in a deep-run result.
- On fail: Stop. This is `goal.abort_if` item 3.

### S8. Can the module find the automatic memory folder?

- Pass: The context's `AutoMem` entry names a path. The module lists the folder.
- Fallback for stage 3: add a `memoryFolder` option to the plugin options.

### S9. Can the module tell the person's prompt and the main loop's stop from other events?

- Pass: The person's prompt carries `origin.kind` `composer`. A plugin prompt and a task notification carry another kind. A subagent's stop carries a field that names the agent, and the main loop's stop does not. The check prints that field.
- On fail: Return the design to stage 3. The router must not run on a prompt that the person did not type, or on a subagent's stop.

### S10. Which build ran the spike, and do the named calls exist?

- Pass: The check records `claude --version`. Each `$` call and event that ADR-0039 names appears in that build's type file. Each build epic runs the check again.
- On fail: Stop. This is `goal.abort_if` item 2.

### S11. Does the shipped plugin layout load?

- Pass: The spike module sits in a folder with `.claude-plugin/plugin.json` and `hooks/hooks.json`. `claude plugin validate` accepts the folder. A session started with `--plugin-dir` runs its prompt hook.
- On fail: Return the design to stage 3. The plugin cannot ship its hook the way ADR-0039 states.

## Settled before the spike

- Reflect returns each source with its `document_id` and `session_id` when `include_based_on` is true. A live call checked it on 2026-10-13.
- `/goal` runs as a Stop hook. The 2.1.296 binary says that "after each turn a separate check decides whether the condition is met".
- A hook's budget is 10 seconds of its own time. A `$` call does not count against it.
- The Hindsight Stop hook skips each row with `isMeta` set, and it strips the `hindsight_memories` tag. Its runtime source shows both.
- The engineer confirmed that a fork from `$.agent.spawn` keeps its tools. S3 still tests the guard.
- The Hindsight Stop hook strips `task-notification` blocks, which carry a deep run's result. Its runtime source shows it.
- Hindsight names this session's transcript `conversation:<session id>`. Run 1 showed it on 2026-10-12.

## Results

| Check | Build | Result | Evidence | Date |
|---|---|---|---|---|
| S1 | 2.1.296 | Not run | `/memory` opens an editor, so a headless session cannot run it. It needs an interactive check. | 2026-10-14 |
| S2 | 2.1.296 | Pass in part | `classic.Stop` fired once at each main-loop stop in runs 1 to 6. A `/goal` iteration was not run headless. | 2026-10-14 |
| S3 | 2.1.296 | Fail | Auto mode refused each `$.agent.spawn` the module made: "the request that produced this action did not ask for one" (runs 1 to 3). In default mode the headless session had no `fork` type (run 4). The model did not start a subagent on the moment tool's request (runs 5 and 6). R2-2 a applies: the deep run holds no tools. | 2026-10-14 |
| S4 | 2.1.296 | Not applicable | No plugin-spawned agent ran (S3). The deep run's answer arrives as a memory note through `$.session.append`. | 2026-10-14 |
| S5 | 2.1.296 | Pass | From a `session.start` timer, `$.model.fork` answered with 52,322 cache-read tokens, and `$.mcp.call` returned the bank stats (run 2). Auto mode needs an allow rule for each Hindsight tool. | 2026-10-14 |
| S6 | Hindsight server | Pass | Two retains with `document_id` `memory-file:spike.md` left one document with the second text (throwaway bank). | 2026-10-14 |
| S7 | 2.1.296 | Pass for the note | The bank's `conversation:d512329c-…` document holds no text of the appended note. The deep-run case now uses the same note path. | 2026-10-14 |
| S8 | 2.1.296 | Fail | `session.start` `context.memoryFiles` was empty in each headless run. Fallback: the module derives the folder from the repo root, `~/.claude/projects/<root with each / as ->/memory`. | 2026-10-14 |
| S9 | 2.1.296 | Pass | A headless prompt carries origin `sdk`, and a task notification carries `task-notification`. A subagent's end fires `classic.SubagentStop`, never `classic.Stop`. | 2026-10-14 |
| S10 | 2.1.296 | Pass | `claude --version` 2.1.296, built 2026-10-09. Each `$` call and event the design names is in that build's type file. | 2026-10-14 |
| S11 | 2.1.296 | Pass | `claude plugin validate` accepted the spike folder, and `--plugin-dir` ran its prompt hook (run 1). | 2026-10-14 |

The spike mod and its logs are in the session scratch folder, not in this repo.
S1 and the `/goal` half of S2 still need an interactive session. The engineer's
goal of 2026-10-14 asked for the build without stops, so the build goes on and
the final report names both checks as open.
