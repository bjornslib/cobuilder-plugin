# Architecture: The priority reader answers an AskUserQuestion call

Grounded in `docs/architecture/designs/priority-ask-question/contracts.md`
and ADR-0050.

## Fit

- `priority-dev/probes/ask-hold/`, new: a probe mod that a person loads
  with `--plugin-dir`. It is test equipment and ships in no marketplace
  entry (E1).
- `priority-dev/src/priority/cli.py` and `priority-dev/src/priority/brief/`:
  the `--open-question` input and `stop_kind` (E2).
- `plugins/cobuilder-priority/hooks/`: the `tool.call` hook, the question
  card, and the answer (E3, planned after the probe).

## Endpoints

None. The mod hooks the engine event `tool.call` for `AskUserQuestion`.

## Data

- The probe writes one JSON line for each event to
  `priority-dev/reports/logs/ask-hold/probe.jsonl`, which Git ignores.
- E2 reads a questions file: a JSON list in the AskUserQuestion input
  shape.
- E3 adds `stop_kind` and `answers` to a stored reading and its mark.

## Flow

1. The agent calls AskUserQuestion. The engine raises `tool.call`.
2. The probe hook checks the main loop and its mode. In hold mode, it
   opens the probe pane, logs the time and whether the transcript holds
   the `tool_use`, and waits for a press.
3. The person picks options and presses Send with one candidate answer
   shape. The hook returns `{ result }`. The probe logs the elapsed time,
   the shape, and the result or the engine error.
4. In pass mode, the hook calls `next`, so the dialog opens. The probe
   logs that it passed.

## External

- No new service. E2 and E3 use the same Mercury calls as ADR-0049.
- No new environment variable.
