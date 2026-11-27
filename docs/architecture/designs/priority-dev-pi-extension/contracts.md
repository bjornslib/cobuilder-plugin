# Contracts: priority-dev-pi-extension

These contracts add to the contracts of `priority-dev-cc-plugin` (ADR-0051)
and `priority-ask-question` (ADR-0052). ADR-0053 holds the decision. The
orchestrator contracts add detail to `priority-dev/docs/design/components.md`
sections 2 and 3.2, and to `schemas.md` sections 5 to 8. They do not replace
them. Every entry is a prediction, not a check.

## Endpoints

### `priority read` (priority-dev, epic E3)

```
uv run priority read <session-file> [--program FILE] [--log-dir DIR]
                     [--open-question FILE] [--stop N]
```

- It detects the dialect of `<session-file>`. A first line with
  `type: "session"` is `pi` (Pi and OMP; probe E1 confirms the OMP header).
  Any other file is `claude-code`.
- It runs the digest, then the interpretation with `--digest current`, the
  same two model calls as the plugin makes today.
- It prints one Reading as JSON on stdout, and exits 0, also on an abstain.
  A bad input file exits 1 with one line on stderr, before any model call.
- Redaction runs inside `build_brief` (`brief/redact.py`), as today. The call
  itself is the opt-in. The reader switch gates only the host hooks.
- It sets `calibrated` from `priority-dev/calibration.json`, keyed by the
  program hash and the dialect. E4 writes that file. A missing key gives
  `false`.
- `priority digest` and `priority interpret` keep their flags and output.
  Both read the session file through the same transcript adapters.

### The `priority_read` tool (Pi package, epic E6)

- Parameters: `{ session_file?: string, open_question?: Question[] }`. With
  no `session_file`, it reads the current session.
- `execute()` runs `priority read` as a process and returns
  `{ content: [one-line summary], details: Reading }`.
- No reading feeds the next brief. The `pi` adapter drops each tool call and
  tool result with `toolName == "priority_read"`. The `claude-code` adapter
  drops each Bash `tool_use` whose command starts with `priority read` or
  `uv run priority read`, with its result. None of the 56 scored stops holds
  such a call, so the byte check of E2 still holds.

### Install contract (Pi package, epic E6)

- `pi/cobuilder-priority/package.json` holds `"pi": { "extensions": ["./index.ts"] }`
  and lists the host packages as `peerDependencies: "*"`.
- Install from the repo: `pi install ./pi/cobuilder-priority` in Pi, and
  `omp plugin link ./pi/cobuilder-priority` or `extensions:` in
  `~/.omp/agent/config.yml` in OMP. Probe E1 confirms both.
- In the repo, `pi/cobuilder-priority/shared` is a symlink to `../../shared`,
  as in ADR-0017. A published package carries a vendored copy of
  `shared/priority-core`, because npm does not pack a symlink.
- Settings: `~/.config/cobuilder-priority/settings.json` with
  `priority_dev_dir`, `program`, `timeout_seconds`, and an optional
  `llm_api_key`, the same names as the `userConfig` of the Claude Code plugin.

### Host events (Pi package, epic E6, confirmed by probe E1)

| Need | Pi | OMP |
|---|---|---|
| Stop | `agent_settled` | `session_stop`, main session only |
| Transcript path | `ctx.sessionManager.getSessionFile()` | same |
| Dedupe key | session id plus leaf entry id | same |
| Send | `pi.sendUserMessage(text)` | same, awaited |
| Edit | `ctx.ui.setEditorText(text)` | same |
| Pane | `ctx.ui.custom(component, { overlay: true, overlayOptions: { anchor: "right-center", nonCapturing: true } })` | same |
| Fallback pane | `ctx.ui.setWidget(key, lines)` plus `ctx.ui.select` | same |
| Notify and toast | `ctx.ui.setStatus`, `ctx.ui.notify` | same |
| Question tool | the package's `AskUserQuestion` tool | the built-in `ask` tool, only when probe E1 shows the call can be held. `questions[]` maps to the question file, and an HTML-only call gets no question reading. Without the hold, OMP question stops are not supported |

The `session_stop` handler returns nothing, so the reader never blocks a stop.

### Commands

`/priority-on`, `/priority-off`, and `/priority-pane`, the same names as the
Claude Code plugin. The switch is off in each new session.

### Orchestrator messages (planned, epics E8 to E10)

| Message | From → to | Payload |
|---|---|---|
| `child.reading` | child → orchestrator | `{ childId, sessionId, leafId, reading, readingHash }` |
| `child.question` | child → orchestrator | `{ childId, taskId, signalKey, questions, readingHash }` |
| `orchestrator.answer` | orchestrator actuator → child | `submit(text, { whenBusy: "steer", operationId: actionHash })` or `harness.signal(taskId, Answer, signalKey, value)` |

Probe E8 picks the route, and this design does not. The first candidate is a
container child that runs the real Pi agent with this Pi package: the
package's own stop hook runs `priority read` as a local process and sends
`child.reading` over Durable Object RPC. The second candidate is a native Pi
Durable extension with an `afterRun` hook. Its `api.entries` transcript
would need a third transcript adapter, and it would need a reader that a
Worker can reach.

## Data models

### Priority transcript (priority-dev, epic E2)

```
PriorityTranscript = {
  dialect: "claude-code" | "pi",
  session_id: str,           # Claude Code: file stem. Pi: header id
  leaf_id: str | None,       # Pi: the leaf of the active branch
  records: [TranscriptRecord]  # the active branch, in order
}
TranscriptRecord =
    { kind: "human",  text: str }
  | { kind: "client", text: str }
  | { kind: "agent",  mid: str, blocks: [TextBlock | ToolUseBlock] }
  | { kind: "tool_results", results: { tool_use_id: (content: str, is_error: bool) } }
```

- The kinds match the classified list that `brief/transcript.py` builds today,
  so the brief keeps its shape.
- The `pi` adapter walks the active branch from the leaf to the root. It maps
  `user` to human, `assistant` to agent, and `toolResult` to tool results. It
  maps a `compaction` or `branch_summary` entry to a client record with its
  summary text. It drops `custom` entries and `priority.*` entries.
- Digests key on `session_id`, not on the file stem.

### Reading (shared core, epic E5)

The Reading of `plugins/cobuilder-priority/types/index.d.ts`, plus three
fields:

```
host: "claude-code" | "pi" | "omp"
dialect: "claude-code" | "pi"
calibrated: boolean     # from priority-dev/calibration.json, which E4 writes
```

### Shared core ports (epic E5)

```
ProcessPort  run(argv, { cwd, env, timeoutMs }) -> { exitCode, stdout, stderr }
StorePort    get(key), set(key, value), delete(key), keys()
ClockPort    now(), every(ms, fn) -> { cancel }
```

The core exports pure functions and the reader queue. It never renders. Each
host adapter turns the card view model into its own UI.

### Golden readings (epic E5)

`shared/priority-core/fixtures/golden/*.json`. Each file holds one Reading, a
selection of steps and answers, the expected card view, and the expected
draft text. The test suite of each host adapter reads every file.

### Policy (planned, epic E9)

```
evaluate(action: Action, state: State) -> Decision
Decision = { verdict: "ALLOW" | "DENY" | "ASK", rule_id, policy_hash,
             action_hash, state_digest }
```

- The rules are data in one file, `priority-policy.json`. Its starting
  verdicts are the ones in `priority-dev/docs/design/schemas.md` section 4,
  for example: `continue` ALLOW, `reply` ASK unless it states a fact already
  in the transcript, `approve_permission` ALLOW for a read-only tool and DENY
  on the shell deny list, `approve_gate` ASK, `interrupt` ASK, and `ask_human`
  ALLOW (it only queues an item for the person). The policy hash covers the
  file and the rule code.
- The first DENY wins, then ASK, then ALLOW. No match gives ASK. A rule that
  throws gives DENY with its rule id (components.md section 3.2).
- ADR-0053 adds two guards. An answer to a question stop
  (`stop_kind: question`) gives ASK. Any ALLOW needs a calibrated Reading,
  the newest Reading of the child, no `needs_human`, and no abstain.
- An action has `author: "orchestrator"` or `author: "human"`, as in
  `schemas.md` section 5. The action hash covers the kind and the payload,
  as in `schemas.md` section 4.

### Authorization record (planned, epic E10)

Written before each send that no person pressed:
`{ readingHash, stepIds, draftHash, action_hash, state_digest, actor, rule_id, policy_hash, at }`.
The actuator hashes the draft again and refuses a send on a mismatch.
