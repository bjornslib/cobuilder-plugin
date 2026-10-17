# Rubric: Slice 8 — The agent's focus steers the recall query

Feature: cobuilder-memory
Epic: E1
Slice goal: see `docs/plans/cobuilder-memory/04-slices.md`, slice 8, and the
"Amendment: slice 8" section of `epic-E1-design.md`.
Test command: `claude plugin test plugins/cobuilder-memory && npx tsc -p plugins/cobuilder-memory --noEmit && uv run pytest tests -q`

## Criteria

### C1 — A live run follows the focus, not the last prompt (CRITICAL, weight 0.40)
**Must be true:** In a live session that loads the plugin from the working
tree, the last message of the person names one topic, and the agent calls
`consult` with a `focus` on a different topic. The Recall line of the result
searches for the focus topic. The result shows the focus above the Need line.
**Evidence to check:**
- The evidence file `slice-8-live-run.md` holds the prompt, the focus, and
  the full consult result.
- The Recall line names terms of the focus topic, and no term that only the
  last prompt names.
**Scoring:**
- 1.0 — the Recall line is on the focus topic, and the focus line shows.
- 0.5 — the Recall line mixes both topics.
- 0.0 — the Recall line follows the last prompt, or no live run is recorded.

### C2 — The Haiku prompt puts the three inputs in the order of authority (weight 0.25)
**Must be true:** The first Haiku call gets the focus first, then the
session end, then the stored prompts. Its system text states that the focus
sets the topic, the session end gives names, and the prompts add context
only. With no focus, the prompt states that none was given. A plugin test
drives a consult call and checks the order in the recorded prompt.
**Evidence to check:**
- A test in `plugins/cobuilder-memory/tests/` that calls the consult tool
  with a `focus` and reads the prompt that `model.complete` received.
- A test for a consult call with no `focus`.
**Scoring:**
- 1.0 — both tests exist, drive the hook, and pass.
- 0.5 — the order is tested, but the no-focus case is not.
- 0.0 — no test reads the prompt that Haiku receives.

### C3 — The session end is the last six messages, at most 12,000 characters (weight 0.20)
**Must be true:** `sessionTail` keeps the last six messages that have text
after injected hook blocks are removed, such as `<system-reminder>`. It cuts
the result to the newest 12,000 characters. A message that holds only an
injected block does not count toward the six.
**Evidence to check:**
- Tests for: more than six messages, six long messages over 12,000
  characters, and a message that holds only an injected block.
**Scoring:**
- 1.0 — all three cases are tested and pass.
- 0.5 — two of the three.
- 0.0 — one or none.

### C4 — The tool, the pane, and the procedures carry the focus (weight 0.15)
**Must be true:** The `consult` input schema has an optional string
`focus`. The pane shows the focus of a run. Design stage 1 and implement
Gate 1 tell the agent to pass a focus: the decision at hand. The plugin
version is bumped in `plugin.json` and `marketplace.json`, and so are the
versions of `architect` and `implement` if their procedures changed.
**Evidence to check:**
- `register.ts`, a pane test, `design-mode.md`, the build `SKILL.md`.
- A pytest that checks that the input name in `register.ts` appears in both
  procedure files.
**Scoring:**
- 1.0 — all present, and the version test passes.
- 0.5 — one part is missing.
- 0.0 — two or more parts are missing.

## Regression check
- `claude plugin test plugins/cobuilder-memory`: 65 tests passed before the
  slice. All of them still pass, or a change to one is explained.
- `uv run pytest tests -q`: 793 passed, 1 skipped before the slice.
- A consult call with no `focus` still completes a run.

## Out of scope — do not penalise
- Reflect answers. OpenRouter is out of credits, so reflect may fail with a
  402. Recall and the page search carry the run.
- Near-repeat recall records.
- `/memory-recall` arguments.
