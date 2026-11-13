# cobuilder-priority

An opt-in mod. It reads each stop of a live Claude Code session with the
priority-dev interpreter, and shows each reading in a side pane. You mark
each reading right or wrong, with a note, and you can send the steps you
choose to the session. The marks stay on this machine. Nothing reaches the
session without your press. ADR-0049 holds the decision.

## Install

```
claude plugin install cobuilder-priority@cobuilder-plugin
```

Claude Code then asks for the settings. You can change them later in
`/config`.

| Setting | Use |
|---|---|
| `priority_dev_dir` | The priority-dev checkout. The priority-dev CLI (`priority`) runs here through `uv run`. |
| `program` | The saved program, such as D1. A relative path starts at `priority_dev_dir`. |
| `timeout_seconds` | The limit for each CLI command. The default is 180, and the limit is 600. |
| `llm_api_key` | Optional and secret. Without it, the CLI reads `priority-dev/.env`. |

## Use

1. Run `/priority-on`. The reader is on for this session only, and the pane opens.
2. Work as usual. At each stop, the mod runs `priority digest`, then
   `priority interpret --digest current`. The Stop hook returns at once, and
   the status line says when a reading is ready.
3. On the newest card, press `1`–`9` to select steps, and answer any
   question. The draft block shows the exact text.
4. Press `s` to send the draft as your prompt, or `e` to put it in the
   prompt box and edit it first.
5. Press `r` or `w` to mark the card, and type a note. Press `m` to close
   or open the agent summary.
6. Run `/priority-off` to stop. Run `/priority-pane` to open the pane again.

The keys work while the pane has the focus. Press ctrl+x tab to move the
focus to the pane.

## Signals

- The row above the prompt shows each `notify` message of the newest
  reading. With the pane closed, it also shows one line for that reading.
- A reading that needs you raises one toast: `Priority reader · #<n> needs you`.
- The key row under the header shows `s`, `e`, `r`, `w`, and `m`. A key that
  cannot act now is dim.
- When the agent's last message has a `Summary` part, the summary block shows
  it under the digest, as `Agent's own summary`.

Each stop with the reader on sends the transcript to the model service of
the priority-dev CLI, and costs two model calls.

## Test

```
claude plugin test plugins/cobuilder-priority
```
