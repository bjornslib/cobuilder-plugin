# Rubric: Slice 3 — Present for review procedure and the link check

Feature: review-link
Epic: review-link/E1
Slice goal: Every presentation point names Present for review before its question. `verify_gate.py` fails an APPROVED line dated on or after 2026-09-28 with no link. This plan's own gate lines carry links.
Test command: `uv run --with pytest pytest tests/ -v`

Sources: `04-slices.md` (row 3, Route for each gate, Rubric note for slice 3), `epic-E1-design.md`, `02-architecture.md` (Fit, Flow), `03-program-design.md`, ADR-0032.

This slice edits files that govern agent procedure. Per the Gate 4c special case in `plugins/implement/skills/build/SKILL.md`, C1 to C3 are behavioral. Score them against the transcript of one blind pass: a fresh subagent with no memory of this session gets only the changed skill files and a realistic task (for example, "you have written 01-product.md for feature X; present it for Gate 1"). It does not get this rubric, the word "test", or the behavior under check. The orchestrator captures its tool calls and messages in order.

## Presentation points (from `04-slices.md`, Route for each gate)

| Point | Expected route |
|---|---|
| Gate 1 | `#/<work>/build/plan/product` |
| Gate 2 | `#/<work>/build/plan/architecture` |
| Gate 2b | none — gives the file path |
| Gate 3 | `#/<work>/build/plan/program` |
| Gate 4a and 4b | `#/<work>/build/epics` |
| Gate 4c | none — the set is approved by count |
| After a slice, and ESCALATE | `#/<work>/build/epics` |
| Design mode stage 5 and stage 6 | `#/<work>/intent` |
| Decisions mode and describe mode | the record's own page, or `#/<work>/intent` |

## Criteria

### C1 — The link comes before the question at every point [CRITICAL] (behavioral)
**Must be true:** At each point in the table that has a route, the agent runs View mode with that route and shows the printed link before it asks the approval question. At Gate 2b and Gate 4c it gives the file path or the count, and it does not invent a route.
**Evidence to check:**
- Transcript order in the blind pass for Gate 1: the call `Skill("cobuilder-artifacts", args="view --route #/<work>/build/plan/product")` (or its View mode run of `review_link.py`) comes before the message that asks "Approve Gate 1, or what should change?". The link text appears in that message or an earlier one.
- Repeat the blind pass for at least three more points: one build gate (Gate 3 or 4a), one after-slice or ESCALATE point, and one architect point (design stage 5 or 6). Record the order each time.
- A static cross-check: for each file in slice scope, `grep -n "Present for review" <file>` hits at each named point, and at each hit the link step appears on a line before the question text.
**Scoring:**
- 1.0 — every blind pass shows the link before the question with the correct route, and every named point has the reference in the text.
- 0.5 — the blind passes are correct, but one named point lacks the reference in the text, or one pass uses a wrong route.
- 0.0 — any blind pass asks the question before it shows the link, or shows no link.

### C2 — A failed link check stops the presentation (behavioral)
**Must be true:** When `review_link.py` exits 1, the agent does not paste a guessed or unchecked link. It reports the failure reason and gives the file path instead, or starts the server and retries.
**Evidence to check:**
- One blind pass with the View server stopped and no way to start it (or with an unknown work id). The transcript shows no `http://127.0.0.1` link in the question message. It shows the stderr reason or the file path.
**Scoring:**
- 1.0 — no unchecked link, and the reason or path is shown.
- 0.5 — no unchecked link, but no reason or path is given.
- 0.0 — an unchecked link reaches the user.

### C3 — The approved gate line records the link (behavioral)
**Must be true:** After the user approves, the agent writes the gate line as `- Gate N — <name>: APPROVED <date> — view: <url>`, with the link it showed.
**Evidence to check:**
- In the Gate 1 blind pass, answer "approved". The next write to `00-status.md` in the transcript holds the line in that form, with the same URL the agent showed.
**Scoring:**
- 1.0 — the line has the form and the same URL.
- 0.5 — the line has a link in another form.
- 0.0 — no link on the line.

### C4 — `verify_gate.py` enforces the link from 2026-09-28 [CRITICAL]
**Must be true:** An APPROVED gate line dated 2026-09-28 or later with no ` — view: <url>` part fails the gate check (`links.gate.<n>` reads `missing`, exit non-zero). A line dated 2026-09-27 with no link passes (`n/a` or `ok`). A dated line with a link passes (`ok`).
**Evidence to check:**
- `uv run --with pytest pytest tests/test_verify_gate_links.py -v` passes, with cases on both sides of the date boundary and a case with a link.
- Manual check: copy `docs/plans/review-link/` to a temporary directory, remove the ` — view:` part from one 2026-09-28 line, run `uv run plugins/implement/scripts/verify_gate.py --plan <tmp>`. Expect a non-zero exit and `missing` for that gate. Change the date on that line to 2026-09-27 and run again. That gate no longer reads `missing`.
**Scoring:**
- 1.0 — the test passes and both manual runs give the expected result.
- 0.5 — the test passes, but the boundary date is off by one day in the manual runs.
- 0.0 — a dated line with no link passes, or an older line fails.

### C5 — No plugin names another plugin's file path (ADR-0016) [CRITICAL]
**Must be true:** The build skill and the architecture skill reach the link only through `Skill("cobuilder-artifacts", args="view --route <route>")`. No file under `plugins/implement/` or `plugins/architect/` names `review_link.py` or a `plugins/artifact/` path.
**Evidence to check:**
- `grep -rn "review_link\|plugins/artifact/" plugins/implement plugins/architect` returns no line (exit status 1).
- `grep -rn 'view --route' plugins/implement plugins/architect` returns at least one hit per changed skill file.
- `uv run --with pytest pytest tests/ -v` passes, including the packaging invariant tests.
**Scoring:**
- 1.0 — the first grep is empty, the second hits in each changed file, and the tests pass.
- 0.0 — any cross-plugin path appears.

### C6 — This plan's own gate lines carry links
**Must be true:** Each APPROVED gate line in `docs/plans/review-link/00-status.md` dated 2026-09-28 carries a ` — view: <url>` part, except where the route table gives none (Gate 2b and Gate 4c are then not `missing` in the check). `verify_gate.py` passes this plan.
**Evidence to check:**
- `grep -n 'APPROVED 2026-09-28' docs/plans/review-link/00-status.md` and read each line for ` — view: `.
- `uv run plugins/implement/scripts/verify_gate.py --plan docs/plans/review-link` exits 0, and no `links.gate.*` key reads `missing`.
**Scoring:**
- 1.0 — every required line has a link, and the command exits 0.
- 0.5 — the lines have links, but the command fails on another key the slice owns.
- 0.0 — the command reports a `missing` link for this plan.

## Regression check
- All tests that passed before this slice still pass: `uv run --with pytest pytest tests/ -v`.
- `uv run plugins/implement/scripts/verify_gate.py --plan docs/plans/cobuilder-viewer` gives the same exit status as before this slice, or fails only on `links.gate.*` for lines dated 2026-09-28 or later.
- Files outside the slice scope remain unchanged. Scope: `plugins/artifact/skills/cobuilder-artifacts/SKILL.md` (Present for review), `plugins/implement/skills/build/SKILL.md`, `plugins/implement/skills/build/references/validation-scoring.md`, `plugins/architect/skills/architecture/SKILL.md`, `plugins/architect/skills/architecture/references/design-mode.md`, `plugins/implement/scripts/verify_gate.py`, `tests/test_verify_gate_links.py`, `docs/plans/review-link/00-status.md`.

## Out of scope — do not penalise
- `review_link.py` internals and View mode `--route` (slice 1).
- The plan page and the index entities (slice 2).
- A viewer page for the interaction design, or a route for Gate 2b (ADR-0032, decision 6).
- A stale port in a committed link. The check tests presence only (`epic-E1-design.md`, Risks).
