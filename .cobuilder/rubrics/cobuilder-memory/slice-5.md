# Rubric: Slice 5 — Design and build call the consult tool at fixed steps

Feature: cobuilder-memory
Epic: E1
Slice goal: Design stage 1 and implement Gate 1 call the consult tool when the session lists it, and otherwise state that it is absent. The implement skill holds no H1 to H5 checkpoint. A blind agent given design stage 1 calls the consult tool before it drafts the hypothesis.
Test command: `uv run pytest tests -q`

## Criteria

### C1 — A blind agent calls the tool at design stage 1 [CRITICAL]
**Must be true:** given only the changed design-mode procedure and a realistic design request in a session that lists `mcp__cobuilder-memory__consult`, a fresh agent calls the tool before it writes its stage 1 hypothesis.
**Evidence to check:**
- The blind-pass transcript in the slice evidence: the order of its tool calls.
**Scoring:**
- 1.0 — the call comes before the hypothesis.
- 0.0 — no call, or the call comes after.

### C2 — The skills name the tool and handle its absence
**Must be true:** the design-mode Stage 1 and the build skill's Gate 1 name `mcp__cobuilder-memory__consult` by name, never a plugin path, and each says what to do when the session does not list it.
**Evidence to check:**
- A test that checks the tool name appears in both procedure files and that no `plugins/cobuilder-memory` path appears in them.
**Scoring:**
- 1.0 — the test passes.
- 0.0 — a path is named, or the name is missing.

### C3 — H1 to H5 are gone
**Must be true:** the build skill holds no H1 to H5 checkpoint and no link to `hindsight-routine.md`, and that file is removed.
**Evidence to check:**
- A test that checks the file is absent and that the skill names no `hindsight-routine.md`.
**Scoring:**
- 1.0 — the test passes.
- 0.0 — a checkpoint or the link remains.

### C4 — The changed plugins are released
**Must be true:** `architect` and `implement` carry a new version in both `plugin.json` and `marketplace.json`.
**Evidence to check:**
- `uv run pytest tests/test_plugin_manifests.py -q` and a read of both files.
**Scoring:**
- 1.0 — both bumped and matched.
- 0.0 — a bump is missing or the versions differ.

## Regression check
- All tests that passed before this slice must still pass.

## Out of scope — do not penalise
- The plugin count in top-level documents (slice 7).
