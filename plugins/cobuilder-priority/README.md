# cobuilder-priority

An opt-in mod. It reads each stop of a live Claude Code session with the
priority-dev interpreter, and shows each reading in a side pane. You mark
each reading right or wrong, with a note. The marks stay on this machine.
The mod carries out no step of a reading. ADR-0049 holds the decision.

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
   `priority interpret --digest current`. The session does not wait.
3. Mark each card `right` or `wrong`, and type a note.
4. Run `/priority-off` to stop. Run `/priority-pane` to open the pane again.

Each stop with the reader on sends the transcript to the model service of
the priority-dev CLI, and costs two model calls.

## Test

```
claude plugin test plugins/cobuilder-priority
```
