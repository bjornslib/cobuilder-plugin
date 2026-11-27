# Rubric: Slice 15 — Review mode proposes a backlog design

Feature: structure-coaching
Epic: E9
Slice goal: see row 15 of docs/plans/structure-coaching/04-slices.md
Test command: uv run pytest tests -q

## Criteria

### C1 — The step and its keys [CRITICAL]
**Must be true:** Review Mode in the architect SKILL.md and `structure-review.md` tell the agent to group the confirmed `debt` findings and propose a backlog design. The reference names the `goal.json` keys `stage`, `epics`, and `findings`.
**Evidence to check:**
- Read both files.
- Run the reference tests for slice 15.
**Scoring:**
- 1.0 — the step and the keys are there, and the tests pass
- 0.5 — the step is there, but a key is missing
- 0.0 — no step

### C2 — A blind review agent writes the design [CRITICAL]
**Must be true:** A fresh agent with a fixture record and confirmed labels writes one backlog `goal.json`. It has one epic for each group, and each epic lists the keys of its findings.
**Evidence to check:**
- Read the blind-pass transcript and the written file in the slice evidence.
**Scoring:**
- 1.0 — one epic for each group, each with its finding keys
- 0.5 — the file exists, but an epic has no finding keys or a group is missing
- 0.0 — no file, or no blind pass

### C3 — The engineer decides [CRITICAL]
**Must be true:** The step writes the file only after the engineer confirms the labels and the groups, and it starts no build or slice.
**Evidence to check:**
- Read the step text and the transcript.
**Scoring:**
- 1.0 — a confirmation comes before the write, and no build starts
- 0.0 — the agent writes without a confirmation, or starts a build

### C4 — The index accepts the design
**Must be true:** `build_index.py` reads the written backlog design with no error, and the stage is `backlog`.
**Evidence to check:**
- Run build_index.py on a copy that holds the file.
**Scoring:**
- 1.0 — no error
- 0.0 — an error
