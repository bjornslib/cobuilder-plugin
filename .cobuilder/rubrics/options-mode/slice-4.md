# Rubric: Slice 4 — One real run of the mode

Feature: options-mode
Epic: options-mode/E1
Slice goal: A fresh agent follows `SKILL.md` and `options-mode.md` with `--non-interactive` on this repo. It writes one report under `docs/architecture/options/<name>/`. The validator exits 0 on it. The run edits nothing outside that folder.
Test command: `uv run --with pytest pytest tests/ -q`

Sources: `04-slices.md` row 4, `epic-E1-design.md`.

## Criteria

### C1 — The report exists and passes the validator [CRITICAL]
**Must be true:** Exactly one file `docs/architecture/options/<name>/options-report-YYYY-MM-DD.html` exists and the validator exits 0 on it. No other file exists in that folder.
**Evidence to check:**
- `ls docs/architecture/options/*/`.
- `uv run plugins/architect/scripts/check_options_report.py <report>; echo $?` prints `0`.
**Scoring:**
- 1.0 — one file, exit 0.
- 0.5 — exit 0 but an extra file exists (for example a JSON file).
- 0.0 — no report or a non-zero exit.

### C2 — The run touched nothing outside its folder [CRITICAL]
**Must be true:** `git status --short` shows only `docs/architecture/options/` as new or changed from this slice, apart from the changes that earlier slices and the plan files already hold.
**Evidence to check:** `git status --short` before the run (the orchestrator records it) and after. Compare the two.
**Scoring:**
- 1.0 — the only difference is the new folder.
- 0.0 — any other file differs.

### C3 — A blind agent ran the stages in order [CRITICAL] (behavioral)
**Must be true:** The fresh agent's tool calls show: it created the output folder before it wrote the report. It read the corpus index and the stack card before it read the ADRs. It spawned no divergent-exploration agent. It ran the validator on its own report before it ended. Its last message prints the report path, the inquiry IDs, and `/architect:design` as the next command, and it did not start that command.
**Evidence to check:** The orchestrator spawns one fresh Sonnet subagent with no memory of this session. It gets only the task "Run the options mode on this repository with --non-interactive. Scope: the install surface of the architect plugin." and the repo path. It captures the tool calls.
**Scoring:**
- 1.0 — all five behaviors are in the transcript.
- 0.5 — four of five.
- 0.0 — three or fewer.

### C4 — The confidence tags are honest [CRITICAL]
**Must be true:** Each inquiry row carries one confidence tag. Pick three claims that carry `Verified`. Each one cites a `path:line` or a command. The file exists and the line is inside the file. The evidence section lists what the agent did not read.
**Evidence to check:** Open the report. For three `Verified` claims, run `test -f <path>` and `wc -l <path>`, and read the cited line.
**Scoring:**
- 1.0 — all three cites resolve and the evidence section lists the limits.
- 0.5 — two of three resolve, or the limits are missing.
- 0.0 — fewer than two resolve.

### C5 — The report is self-contained and uses the agreed names
**Must be true:** The report has `#inquiries`, no `#findings`, no `window.lavish`, and no external resource. It calls the item an inquiry.
**Evidence to check:** `grep -c 'id="inquiries"' <report>` prints `1`. `grep -n "lavish\|id=\"findings\"" <report>` prints nothing. If a browser tool exists, open the report from `file://` and read the console messages. Otherwise the report's evidence section says so.
**Scoring:**
- 1.0 — all hold.
- 0.5 — one issue.
- 0.0 — two or more.

## Weights

C1 25%, C2 20%, C3 25%, C4 20%, C5 10%.
