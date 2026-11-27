# Architecture: The priority reader runs in Pi and OMP, and a coding agent can read a session

Grounded in `docs/architecture/designs/priority-dev-pi-extension/contracts.md`,
`intent.json`, and ADR-0053. The planned orchestrator adds detail to
`priority-dev/docs/design/components.md` sections 2 and 3.2 and to
`schemas.md` sections 4 to 8, and does not replace them.

## Fit

| Module | Status | Role | Epic |
|---|---|---|---|
| `priority-dev/src/priority/brief/transcript.py` | changed | Becomes the `claude-code` transcript adapter. It must give byte-identical briefs on the 56 scored stops | E2 |
| `priority-dev/src/priority/brief/` (new `pi` adapter module) | new | The `pi` transcript adapter. It reads Pi and OMP session trees and walks the active branch | E2 |
| `priority-dev/src/priority/brief/builder.py` | changed | Reads only the priority transcript. Drops earlier `priority read` output from the next brief | E2 |
| `priority-dev/src/priority/digest_store.py` | changed | Keys digests on the session id, not the file stem | E2 |
| `priority-dev/src/priority/cli.py` | changed | Adds `priority read`, which prints one Reading as JSON. `digest` and `interpret` keep their flags | E3 |
| `priority-dev/calibration.json` | new | D1 score per program and dialect. `priority read` copies it into `calibrated` | E4 |
| `shared/priority-core/` | new | TypeScript: Reading types, plain names, answer labels, card view model, draft, reader queue, pending record, ports, golden readings, later `evaluate` | E5, E9 |
| `plugins/cobuilder-priority/hooks/` | changed | Moves onto the core. Keeps every behaviour of ADR-0051 and ADR-0052. Its 25 test files stay unchanged | E5 |
| `pi/cobuilder-priority/` | new | The Pi package for Pi and OMP: stop hook, pane component, commands, `priority_read` tool, question hook, settings, install manifest | E6, E7 |
| `docs/architecture/contexts/{cobuilder-priority,shared}/boundary.yaml` | changed | Allow the host adapters to import the core. Add `pi/cobuilder-priority` | E5, E6 |
| `tests/test_plugin_manifests.py` | unchanged | Keeps `plugins/` for Claude Code plugins only. `pi/` sits outside it | E6 |
| `CLAUDE.md`, `README.md` | changed | Name the `pi/` layout and the second install surface | E6 |
| Pi Durable orchestrator | planned | Child hook, advisor, `evaluate`, actuator, notifiers. Probe E8 picks its route | E8–E10 |

Boundaries that hold: nothing imports priority-dev, and each host calls it as a
process (ADR-0045). The core imports no host engine (stack card `generic`,
rule 1). Only `evaluate` may allow an answer that no person pressed (ADR-0053).

## Endpoints

No network endpoint. The interfaces are a command, a tool, and host events.

| Interface | Form | Purpose |
|---|---|---|
| `uv run priority read <session-file> [--program] [--log-dir] [--open-question] [--stop]` | CLI, JSON on stdout | Agent mode. One Reading for a Claude Code or Pi/OMP session |
| `priority_read` tool | Pi and OMP tool, `{ session_file?, open_question? }` → `details: Reading` | Agent mode inside a Pi or OMP session |
| `/priority-on`, `/priority-off`, `/priority-pane` | Pi and OMP commands | The switch and the pane |
| `alt+p` | Pi shortcut (probe E1 checks OMP) | Focus the pane |
| Stop events | Pi `agent_settled`, OMP `session_stop` (main session) | Start a reading. Dedupe by session id plus leaf id |
| Question hook | Pi: the package's `AskUserQuestion` tool. OMP: the built-in `ask` tool, only if probe E1 shows it can be held | Hold a main-loop question in the pane |
| Orchestrator messages (planned) | `child.reading`, `child.question`, `orchestrator.answer` | contracts.md, "Orchestrator messages" |

## Data

No database table. Three stores, all local:

- **Session entries (Pi and OMP).** The core's store port writes
  `priority.reading` and `priority.mark` entries with `pi.appendEntry`. They
  follow the branch, and the adapter rebuilds them at `session_start`.
- **The Claude Code store.** `$.store` as today, keys `readings:<session>`,
  `marks:<session>`, `pending:…`, `asked:…`. The move onto the core keeps the
  keys.
- **priority-dev files.** The digest store under `--log-dir`, keyed by
  session id. `calibration.json` with the D1 score per program and dialect.
  `reports/logs/live/` for call records and question files, which Git
  ignores.

New data shapes (contracts.md, "Data models"): the priority transcript, the
three new Reading fields (`host`, `dialect`, `calibrated`), and the golden
readings. Planned: the policy file `priority-policy.json` and the
authorization record.

## Flow

The primary path, one turn end in Pi or OMP with the reader on:

1. The agent ends a turn. Pi fires `agent_settled`, or OMP fires
   `session_stop`. The Pi package checks the switch and the dedupe key, and
   returns at once. It never blocks the stop.
2. The package hands the stop to the core's reader queue. The queue keeps
   one reading at a time and only the newest waiting stop. It writes a
   pending record first.
3. The queue calls `uv run priority read <session-file>` through the
   process port, in the `priority_dev_dir` checkout.
4. In priority-dev, the `pi` transcript adapter reads the session tree and
   writes the priority transcript. The brief builder builds the brief, and
   it redacts secrets. The digest runs, then the interpretation with D1.
   `priority read` adds `calibrated` and prints one Reading.
5. The queue saves the Reading through the store port and clears the
   pending record.
6. The package sets the status line, shows notify steps above the editor,
   raises a toast when the reading needs the engineer, and redraws the pane.
7. The engineer presses `alt+p`, selects steps, and presses `s`. The core
   builds the draft. The package calls `pi.sendUserMessage(draft)` and
   records `sent` on the mark.

Agent mode: a coding agent runs `priority read <session-file>`, or calls
the `priority_read` tool, and gets the same Reading as JSON. No pane draws.

Planned orchestrator path (E8–E10): a child's stop hook produces a Reading
and sends `child.reading`. The advisor proposes an action. `evaluate`
decides. The actuator writes an authorization record, checks again, and
sends with `submit`, `steer`, or `signal`. ASK and DENY open an attention
item that a notifier sends.

## External

| External | Use | Configuration |
|---|---|---|
| priority-dev checkout and `uv` | The reader runs `priority read` there | settings file `~/.config/cobuilder-priority/settings.json`: `priority_dev_dir`, `program`, `timeout_seconds`, optional `llm_api_key` |
| The model service of priority-dev (OpenRouter) | Two model calls per reading, as today | `LLM_API_KEY` from the settings key, else `priority-dev/.env` |
| Pi (`@earendil-works/pi-coding-agent` 1.6) | Host. Peer dependency of the Pi package | `pi install ./pi/cobuilder-priority` |
| OMP (`omp` 19.1) | Host. Loads the Pi package unchanged | `omp plugin link ./pi/cobuilder-priority`, or `extensions:` in `~/.omp/agent/config.yml` |
| Pi Durable 1.6 and Cloudflare `agents` 0.34 `PiHarness` (planned) | Orchestrator runtime | pinned minor version; route chosen by probe E8 |
| Notifier channels (planned) | Web Push, Slack, or email from the orchestrator | chosen in E10 |

No new webhook. The new environment variable is only `LLM_API_KEY`, which
the reader already passes today.
