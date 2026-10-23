# The adapter host

Status: design, round 10. This text covers the first spikes only. I read the Claude Code hooks reference (`hooks.md`) and the `/goal` page (`goal.md`) on 24 October 2026. I label each claim as **read** (in the documentation), **inferred** (my reasoning), or **untested** (a spike must settle it). Nothing here has run.

## 1. Job

The adapter host runs on your Mac, next to the sessions. It does three things:

1. It watches each session and turns what it sees into events.
2. It sends the events to the event log.
3. It carries a signed command from the control process to one session.

It does not hold a model key. It does not decide. It holds only the key that verifies a command signature. A poisoned transcript therefore cannot make the host send anything.

## 2. What Claude Code gives us (read)

Earlier rounds guessed the stop from the transcript and read permission prompts from the pane. The hooks reference shows better inputs.

| Event | When it fires | Fields we use | What it replaces |
|---|---|---|---|
| `Stop` | The main agent finishes. It does not fire on a user interrupt | `session_id`, `transcript_path`, `cwd`, `last_assistant_message`, `stop_hook_active`, `background_tasks`, `session_crons` | The guess of the stop from the transcript. The final text arrives with the event |
| `StopFailure` | A turn ends on an API error | `error`, `last_assistant_message` | A model call to find `failed` |
| `PermissionRequest` | At once, when a permission dialog is about to show | `tool_name`, `tool_input`, `permission_suggestions` | The pane read. The `Notification` type `permission_prompt` fires only after about 6 seconds |
| `PreToolUse` with matcher `AskUserQuestion` | Before the question shows | `tool_input.questions` with every option | A transcript parse for `pending` |
| `Notification` | Idle after 60 seconds, a permission wait, and others | `message`, the type | Nothing needed in the spikes |
| `SessionStart`, `SessionEnd` | Start and end | `session_id`, `cwd`, `transcript_path` | Directory polling |

Two fields change the interpreter. The `Stop` field `background_tasks` lists tasks that still run, such as a sub-agent or a shell. A stop with a running task is "paused for background work", not "done". The goal run that I measured had 104 `end_turn` replies between two refused stops. The last one said "I am waiting for the foreign-run agent". I did not check whether `background_tasks` would have listed that agent. The field `last_assistant_message` gives the final text without the transcript lag. The documentation says the transcript may not hold the final message at `Stop` time.

The hook script should read `$TMUX_PANE` (inferred). The documentation says a hook inherits the environment of Claude Code, and tmux sets `TMUX_PANE` for each process in a pane. The pane link then needs no process-tree guess (untested).

## 3. Two ways to act on a session

A hook can answer, and tmux can type. Both exist, and they suit different cases.

| | H: the hook answers | T: tmux types |
|---|---|---|
| Permission | `PermissionRequest` returns `allow` or `deny` with a message (read) | Type the digit of the option into the dialog |
| Question | `PreToolUse` returns `allow` with `updatedInput.answers` (read) | Type the digit, then Enter |
| Continue after a stop | `Stop` returns `block` with a `reason`, or `additionalContext` (read). At most 8 in a row, and a tool call resets the count (read) | Paste a message at the prompt |
| Free-text reply | Not possible | Paste the text, then Enter |
| Needs tmux | No | Yes |
| Timing | Only while the hook waits. The default timeout is 600 seconds (read) | Any time the pane sits at the right prompt |
| Main risk | Unknown: does the dialog show while a hook waits? (untested) | Pane state, newlines, and a lost paste (components.md, section 3.2) |

Rule for the spikes: use H when the policy gives a verdict within the hold time. Use T for a free-text reply and for a human answer that arrives later. A hook that times out does not block the call (components.md, section 3.2), so the normal dialog then appears and the human can answer in the terminal.

The two channels share one path. The control process signs a command. The host verifies it and picks H or T. The host reports `command.sent` and then `command.confirmed` or `command.unknown`. The confirmation is a transcript user record that matches the text, or the next hook event.

## 4. Parts

| Part | Job | Notes |
|---|---|---|
| `priority-hook` | A short command hook. It reads the JSON on stdin, adds `$TMUX_PANE`, a UUID, and the time, and writes one line to the Unix socket `~/.priority/hook.sock` | Observation events fail open: exit 0 and no output. It waits for a reply only for `PermissionRequest`, `PreToolUse` on `AskUserQuestion`, and `Stop` when a verdict is due |
| `host` | The daemon, started by `launchd`. It owns the socket, the spool, the tailer, the command puller, and the sender | One process. It opens no inbound TCP port |
| `spool` | Append-only JSONL files in `~/.priority/spool/`. The host writes before it posts, and deletes a file after a 2xx reply | Delivery is at least once. The event log drops a repeat by its idempotency key |
| `tailer` | `watchfiles` over `~/.claude/projects/**/*.jsonl`, with a stored byte offset for each file. It reads complete lines only | The key is `file:offset`. It adds the raw records to the log in batches |
| `tmux` module | The only code that calls tmux. It lists panes and sends keys or a paste | A test searches the repository for other uses |
| `puller` | Long poll, `GET /commands?cursor=N&wait=25`. It verifies the HMAC, checks the preconditions, and hands the command to H or T | The host records the key before it sends |
| `installer` | Writes the hook entries into `~/.claude/settings.json` | Marked entries, a dry-run diff, a backup, an atomic write, and an uninstall that removes only marked entries |

## 5. The events the host adds to the log

| Kind | Source | Payload |
|---|---|---|
| `session.started`, `session.ended` | `SessionStart`, `SessionEnd` | session id, directory, transcript path, pane id |
| `run.stopped` | `Stop` | `last_assistant_message`, `stop_hook_active`, `background_tasks`, the transcript path |
| `run.failed` | `StopFailure` | `error`, the text |
| `prompt.permission` | `PermissionRequest` | tool name, input, suggestions |
| `prompt.question` | `PreToolUse` on `AskUserQuestion` | the questions with their options |
| `transcript.records` | the tailer | raw lines, with `file:offset` keys |
| `command.received`, `command.sent`, `command.confirmed`, `command.unknown` | the puller and the sender | the command hash, the channel (H or T), the result |

The slicer cuts a slice when it sees `run.stopped`. The transcript may lag, so the slicer waits until the transcript tail holds the first 200 characters of `last_assistant_message`, with a timeout of 5 seconds. After the timeout it cuts anyway and records `transcript_lag`. This wait is inferred, and a spike must measure the lag.

## 6. Failure rules

1. The host is down. Hooks exit 0 with no output, so Claude Code runs as if no hook existed. The deny-list hook is separate. It runs in-process and fails closed, so a host outage never opens the deny list.
2. The service is down. The host keeps writing the spool and posts again later.
3. A command arrives for a pane that has moved on. The precondition check (the pending prompt id still matches) fails. The host reports `command.unknown` and does not send.
4. The host dies between `command.sent` and `command.confirmed`. The next start reports `command.unknown`. The actuator never resends. A human decides.
5. A session has no tmux pane. The host marks it read-only for channel T. Channel H still works.

## 7. What the spikes must settle

| # | Question | Why it matters |
|---|---|---|
| 1 | Does `$TMUX_PANE` reach the hook? | The whole pane link rests on it |
| 2 | Does the permission dialog show while a `PermissionRequest` hook waits? | Decides the hold time for H |
| 3 | How long does the transcript lag behind `Stop`? | Decides the slicer wait |
| 4 | What does the transcript hold when a `/goal` clears? | Decides whether `continue_until` can use `/goal` (schemas.md, section 4.1) |
| 5 | Does `-p` mode or bypass mode skip the hooks? | The policy hook must run in every mode |
| 6 | Does a paste into a busy pane get lost? | Decides the precondition check for T |

## 8. Not in the spikes

Pi and other harnesses, a mobile client, the notifier, and any launch of a new session. The host design leaves a slot for them: a second `priority-hook` for another harness posts the same event kinds.
