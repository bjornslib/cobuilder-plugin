# Rubric: Slice 4 — E2 real content and edge cases: the three paths, the two consumers, and the returned session

Feature: interaction-design-gate
Epic: E2
Slice goal: All three paths are stated, both consumption rules are written into the files that consume them, the resume rule names Gate 2b, `commands/start.md` lists both artifacts, and `plugin.json` reads 0.2.0.
Test command: uv run --with pytest pytest tests/ -v

## Criteria

### C1 — all three paths are stated [CRITICAL]
**Must be true:** `build/SKILL.md` states three paths and no more.
- **Path 1, no front end.** Write `Gate 2b — Interaction design: n/a (no UI) — Screens: "<the entry>"`, then continue to Gate 3.
- **Path 2, a front end.** Ask the person to supply the design and do not invent one. Then run the three steps of `implement:design-to-code`, request approval, and record `APPROVED <date>`. If the person declines, write `n/a (declined)` with the reason.
- **Path 3, an earlier approval.** Read `00-status.md`. When the line already reads `APPROVED` or `n/a`, do not repeat the gate unless the requirements changed.
**Evidence to check:**
- Read the `## Gate 2b` section in `plugins/implement/skills/build/SKILL.md`.
- Compare each path against `docs/plans/interaction-design-gate/epic-E2-design.md`,
  section Types & Signatures.
- Confirm the skill forbids inventing a design. A session that invents a design
  produces a specification for a screen nobody asked for.
**Scoring:**
- 1.0 — all three paths stated, and the "do not invent" rule is explicit.
- 0.5 — two paths stated, or all three stated with the "do not invent" rule absent.
- 0.0 — one path stated, so a session with a front end has no instruction.

### C2 — the rubric author is told which document to cite [CRITICAL]
**Must be true:** `references/rubric-authoring.md` §4 names
`docs/plans/<slug>/interaction-design.md` as the source for a criterion about a
state, a transition, a visibility rule, or a default. It names
`docs/plans/<slug>/ui-spec.jsonc` as the source for a criterion about a class
name or a token.
**Evidence to check:**
- Run `grep -n 'interaction-design.md\|ui-spec.jsonc' plugins/implement/skills/build/references/rubric-authoring.md`.
- Read §4 and confirm both documents appear as derivation sources beside
  `01-product.md`, `03-program-design.md`, and the epic design.
**Scoring:**
- 1.0 — both documents named, each against the right class of criterion.
- 0.5 — both named, but the split between behaviour and tokens is absent.
- 0.0 — neither named, so Gate 4c copies the rubric-authoring defect this change exists to fix.

### C3 — the slice loop reads both documents and checks behaviour in a browser [CRITICAL]
**Must be true:** `references/slice-loop.md` states that RED reads
`03-program-design.md`, the epic design, `docs/plans/<slug>/interaction-design.md`,
and `docs/plans/<slug>/ui-spec.jsonc`. It states that a front-end criterion in
VALIDATE names a check a browser can make with real pointer input, and that a
component test calling `.click()` is not that check.
**Evidence to check:**
- Run `grep -n 'interaction-design.md\|ui-spec.jsonc\|\.click()\|pointer' plugins/implement/skills/build/references/slice-loop.md`.
- Read the RED and VALIDATE instructions and confirm both changes landed.
- Cross-check against `docs/plans/interaction-design-gate/01-product.md`. It
  records that a synthetic `.click()` passed while a real click failed, three
  separate times. The clause exists to end that class of defect.
**Scoring:**
- 1.0 — RED reads both documents, and the browser clause names real pointer input.
- 0.5 — RED reads both, but the browser clause is missing, or the reverse.
- 0.0 — neither change landed, so a passing component test still accepts an unreachable control.

### C4 — the returned session resumes at the right gate
**Must be true:** The resume rule in `build/SKILL.md` names Gate 2b. A session
that returns after an approval reads `00-status.md` and continues from the first
unfinished line, so 2b must be named there.
**Evidence to check:**
- Run `grep -n 'resume\|2b' plugins/implement/skills/build/SKILL.md` and read the resume rule.
- Confirm the rule names every gate line, or names 2b explicitly.
**Scoring:**
- 1.0 — the resume rule accounts for 2b.
- 0.5 — the rule is generic and 2b is implied but not named.
- 0.0 — the rule enumerates the gates and stops at Gate 1, 2, 3, and 4.

### C5 — `commands/start.md` lists both artifacts
**Must be true:** The "What this writes" list in
`plugins/implement/commands/start.md` names
`docs/plans/<feature-slug>/interaction-design.md` and
`docs/plans/<feature-slug>/ui-spec.jsonc`. A person reading the command knows
what files a run produces.
**Evidence to check:**
- Run `grep -n 'interaction-design.md\|ui-spec.jsonc' plugins/implement/commands/start.md`.
- Read the list and confirm both names sit inside it.
**Scoring:**
- 1.0 — both named in the list.
- 0.5 — one named.
- 0.0 — neither named.

### C6 — the plugin manifest reads the new version
**Must be true:** `plugins/implement/.claude-plugin/plugin.json` reads
`"version": "0.2.0"`. The plugin gains a skill, so the version must move.
**Evidence to check:**
- Read `plugins/implement/.claude-plugin/plugin.json`.
- Run `uv run --with pytest pytest tests/test_plugin_manifests.py -v`.
**Scoring:**
- 1.0 — `0.2.0`, and the manifest test passes.
- 0.0 — still `0.1.0`, or the manifest test fails.

## Regression check
- All tests that passed before this slice must still pass:
  `uv run --with pytest pytest tests/ -q`.
- `tests/test_commands.py` must keep passing.
- Files outside `plugins/implement/skills/build/SKILL.md`,
  `plugins/implement/skills/build/references/rubric-authoring.md`,
  `plugins/implement/skills/build/references/slice-loop.md`,
  `plugins/implement/commands/start.md`, and
  `plugins/implement/.claude-plugin/plugin.json` must be unchanged.

## Out of scope — do not penalise
- Any change to `verify_gate.py` (slice 5).
- Any change to the index, the Builds view, or the three integer-only call
  sites (slices 6 and 7).
- The vendored skill itself, beyond the paths this slice cites (epic E1).
- The `n/a` risk. A session can still answer `n/a` without cause, and the quote
  requirement only makes that auditable. The approved design accepts this.

## Note to the validator on this slice
This slice holds both the content and the negative paths. One score covers both
halves, so read the two halves separately and say which half failed.
