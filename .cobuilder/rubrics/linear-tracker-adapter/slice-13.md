# Rubric: Slice 13 — Setup offers linear and runs prepare after approval

Feature: `linear-tracker-adapter`
Epic: E7 — The install offer
Slice goal: `cobuilder-setup` offers `linear`, asks for the team and project, checks the key, and asks approval before `prepare`.
Test command: `uv run pytest tests -q`

## Criteria

### C1 — Setup offers linear as a third choice [CRITICAL]

**Must be true:** The setup skill lists `linear` beside `beads` and `files`. It asks for the team and project and checks the key before it runs `prepare`.

**Evidence to check:**
- Run `uv run pytest tests/test_install_tracker_config.py tests/test_install_command.py -q`.
- Read the setup skill text for the three choices.

**Scoring:**
- 1.0 — the three choices and the questions are present and tests pass
- 0.5 — the choice is present and the questions are missing
- 0.0 — `linear` is not offered

### C2 — Prepare runs only after approval [CRITICAL]

**Must be true:** The skill asks the engineer to approve `prepare` before it runs. It writes `.cobuilder/tracker.yaml` with the keys and no API key.

**Evidence to check:**
- Read the approval step in the skill.
- Grep the written config example for `LINEAR_API_KEY` values.

**Scoring:**
- 1.0 — approval comes first and no key is written
- 0.5 — approval is implied
- 0.0 — `prepare` runs without a question or a key is written

### C3 — The prose that steers an agent passes a blind pass

**Must be true:** One fresh agent that reads only the setup skill and a request to set up Linear follows the steps in order.

**Evidence to check:**
- Read the transcript in the slice evidence file.

**Scoring:**
- 1.0 — the order holds
- 0.5 — one step is out of order
- 0.0 — the agent skips the approval

## Regression check

- All tests that passed before this slice must still pass.
- Files outside the slice scope must remain unchanged. Protected scope: the beads and files choices in setup.

## Out of scope — do not penalise

- any adapter code.
