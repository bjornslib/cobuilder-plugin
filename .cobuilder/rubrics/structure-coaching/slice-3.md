# Rubric: Slice 3 — The coaching language

Feature: structure-coaching
Epic: E2
Slice goal: see row 3 of docs/plans/structure-coaching/04-slices.md
Test command: uv run pytest tests -q

## Criteria

### C1 — The engineer approved the wording [CRITICAL]
**Must be true:** 00-status.md or the slice evidence records the engineer approval of shared/structure-messages.json and the Structure block format, with a date.
**Evidence to check:**
- Read the slice evidence and 00-status.md notes for the approval.
**Scoring:**
- 1.0 — approval with a date
- 0.5 — approval without the files named
- 0.0 — no approval

### C2 — Each signal has a message that names a decision [CRITICAL]
**Must be true:** shared/structure-messages.json has one template per signal of the script, and each template names the decision for GREEN: move the files now, or keep the layout and give a reason.
**Evidence to check:**
- Run the structure test that matches the JSON keys to the signal names, and each template placeholder to a fact of its signal.
- Read each template.
**Scoring:**
- 1.0 — every signal, every template names both choices
- 0.5 — a template lacks a choice
- 0.0 — a signal has no template

### C3 — A blind GREEN acts on a message
**Must be true:** A fresh GREEN agent that got one rendered message, and not the rubric, either moved the files or gave a one-line reason. The transcript is kept.
**Evidence to check:**
- Read the blind-pass transcript in the slice evidence.
**Scoring:**
- 1.0 — the agent acted on the decision
- 0.5 — the agent saw it but did not act
- 0.0 — no transcript

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope in the epic design must remain unchanged.

## Out of scope — do not penalise
- The coach code that applies the wording (slice 4)
- The VALIDATE step that writes the block (slice 8)
