# Rubric: Slice 4 — The memory pane shows each run

Feature: cobuilder-memory
Epic: E1
Slice goal: The pane `memory-run`, titled `🧠 CoBuilder Memory: Hindsight Run`, matches the approved Gate 2b design. It opens before the first Haiku call, shows each step and each Hindsight call with its state and counts and the elapsed time while a run works, and shows the records, the page, and each reflect answer or its failure when the run ends.
Test command: `claude plugin test plugins/cobuilder-memory && uv run pytest tests -q`

## Criteria

### C1 — The pane opens first [CRITICAL]
**Must be true:** a run opens the pane before its first `$.model.complete` call. A tool run opens it unasked, and `/memory-recall` opens it asked.
**Evidence to check:**
- `claude plugin test`: a case that records the order of the `ui.open` and the model calls, for the tool and for the command.
- `docs/plans/cobuilder-memory/interaction-design.md` §1.1 and §5.
**Scoring:**
- 1.0 — the open comes first in both cases, with the right asked value.
- 0.5 — the open comes first, but the asked value is wrong for one case.
- 0.0 — the pane opens after a model call, or not at all.

### C2 — The pane shows activity while the run works [CRITICAL]
**Must be true:** each step and each Hindsight call updates the pane state when it starts and when it ends, and a one-second tick moves the elapsed time until the run ends.
**Evidence to check:**
- `claude plugin test`: a case with held stubs that reads the state at each step; a case that advances the mocked clock and reads the elapsed time.
- `interaction-design.md` §2.2, §3.2, and §4.2.
**Scoring:**
- 1.0 — the state changes at each step and call, and the tick moves and stops.
- 0.5 — steps update, but calls or the tick do not.
- 0.0 — the state changes only at the end.

### C3 — The drawing matches the Gate 2b design
**Must be true:** on the terminal surface, the Empty, Working, Done, and Failed states draw the content that `interaction-design.md` §3.1 lists, with the marks and texts from `ui-spec.jsonc`.
**Evidence to check:**
- `claude plugin test`: a `mount` of the pane for each state on the terminal surface, and a find of the texts.
- `ui-spec.jsonc` tokens and texts.
**Scoring:**
- 1.0 — all four states draw as specified.
- 0.5 — three states draw as specified.
- 0.0 — two or fewer.

### C4 — The pane adds no fact and keeps the run alive
**Must be true:** the pane shows only facts the result holds, and a pane that cannot open does not stop the run.
**Evidence to check:**
- `claude plugin test`: a case where `ui.open` resolves `isPlaced: false` and the tool still returns its result.
**Scoring:**
- 1.0 — the case passes and no pane text names a fact outside the result.
- 0.0 — the run fails when the pane cannot open.

## Regression check
- Slices 1 to 3 tests still pass.
- Files outside `plugins/cobuilder-memory` stay unchanged.

## Out of scope — do not penalise
- Whether the terminal places the pane at a given width. The engineer checks it by eye.
- The design and build skill changes (slice 5).
