# Rubric: Slice 2 — E1 real content and edge cases: the four concepts reach the spec

Feature: interaction-design-gate
Epic: E1
Slice goal: The four interaction concepts reach `templates/interaction-design.md`, the matching JSONC keys reach `references/jsonc-schema.md`, and a feature with no front end costs one line.
Test command: uv run --with pytest pytest tests/test_design_to_code_skill.py -v

## Criteria

### C1 — the template carries the eight required headings [CRITICAL]
**Must be true:** `templates/interaction-design.md` carries all eight headings
that `verify_gate.py` looks for, as literal strings. The template and the gate
check agree, so an author who follows the template passes the gate.
**Evidence to check:**
- Run the test suite and find the required-headings check named in
  `docs/plans/interaction-design-gate/epic-E1-design.md`.
- Or run
  `grep -cE '^###? (2\.3 Declared Defaults|3\.2 Component States|3\.3 Visibility Gating|4\.1 Transition Table|4\.2 Timing Tokens|11\.2 Hit Targets|11\.3 Scroll Ownership|2\. Information Architecture)$' plugins/implement/skills/design-to-code/templates/interaction-design.md`
  and expect 8.
- Read `STATUS`-adjacent constant `REQUIRED_INTERACTION_SECTIONS` in
  `plugins/implement/scripts/verify_gate.py` and diff the two lists.
**Scoring:**
- 1.0 — eight headings present, spelled identically to the gate constant.
- 0.5 — the headings exist but one or two differ in case, punctuation, or level, so the gate would reject a conforming document.
- 0.0 — fewer than eight present.

### C2 — the template states the four concepts [CRITICAL]
**Must be true:** A reader of the template alone learns all four facts that the
transcript showed were missing:
1. Which state a component starts in, and which event arms its timer. These sit
   as two columns on the component state table under `### 3.2 Component States`.
2. What changes on a state change, and how long it takes. The transition table
   under `### 4.1 Transition Table` names a trigger, a source state, a target
   state, a duration token, a guard, and a reset rule.
3. When an element is shown at all. `### 3.3 Visibility Gating` names the
   element and the condition that reveals it.
4. Which value a setting takes on a fresh profile. `### 2.3 Declared Defaults`
   names the setting and the value.
**Evidence to check:**
- Read `plugins/implement/skills/design-to-code/templates/interaction-design.md`.
- For each of the four, quote the line that states it. A heading with no
  guidance under it does not count.
- Run `grep -n 'timerArming\|Timer arming\|initial' plugins/implement/skills/design-to-code/templates/interaction-design.md`.
**Scoring:**
- 1.0 — all four stated with guidance a filler can follow.
- 0.5 — two or three of the four stated.
- 0.0 — one or none stated, or the four collapse into a single vague section.

### C3 — the JSONC schema carries a key for each of the four concepts
**Must be true:** `references/jsonc-schema.md` shows a machine-readable place
for each concept, so a build can carry the answer past the document. The
per-component `interaction` block carries `states`, `initial`, and
`timerArming`. The root `interactions` block carries `transitions`,
`visibility`, `defaults`, `timingTokens`, `stateClasses`, `layering`,
`hitTargets`, and `scrollOwnership`.
**Evidence to check:**
- Read `plugins/implement/skills/design-to-code/references/jsonc-schema.md`.
- Compare each key against the JSONC block in
  `docs/plans/interaction-design-gate/epic-E1-design.md`, section Types & Signatures.
**Scoring:**
- 1.0 — every key present, with a worked example.
- 0.5 — the four concepts are present but a key is renamed or a block is missing.
- 0.0 — the schema still describes only Tailwind classes and no state.

### C4 — no file cites a deleted template
**Must be true:** Nothing in the vendored tree names `brief-template`,
`templates/prd.md`, or `workflow-matrix-prd`. A citation would send a session
to a file that does not exist.
**Evidence to check:**
- Run the test suite and find `test_removed_brief_files_are_not_cited`.
- Or run
  `grep -rn 'brief-template\|templates/prd\.md\|workflow-matrix-prd' plugins/implement/skills/design-to-code/`
  and expect no output.
**Scoring:**
- 1.0 — no citation anywhere in the tree.
- 0.0 — one or more citations survive.

### C5 — the prose is epic-based, not product-brief-based
**Must be true:** No file calls a product brief a PRD, and no file uses `brief`
as the name of a document. The approved vocabulary is `01-product.md`,
`epic-<epic-id>-design.md`, and a gate recorded in `00-status.md`.
**Evidence to check:**
- Run the test suite and find `test_no_product_brief_terminology`.
- Or run `grep -rniE '\bPRD\b' plugins/implement/skills/design-to-code/` and expect no output.
- Read `SKILL.md`'s terminology section and confirm the map from the approved
  design is present.
**Scoring:**
- 1.0 — no `PRD`, and no document called a brief.
- 0.5 — one stray word survives in an example, with the map otherwise correct.
- 0.0 — the fork still speaks in product-brief terms.

### C6 — a feature with no front end costs one line
**Must be true:** The skill states the path for a feature with no interface,
and the form is `n/a (no UI)`. The `n/a` answer must quote the `## Screens`
entry it relied on, because that quote is the only audit on a self-reported
answer.
**Evidence to check:**
- Read `plugins/implement/skills/design-to-code/SKILL.md` and quote the no-front-end path.
- Compare the wording against the `n/a` form in
  `docs/plans/interaction-design-gate/epic-E2-design.md`.
**Scoring:**
- 1.0 — the path is stated in one line and requires the quote.
- 0.5 — the path is stated but the quote requirement is absent.
- 0.0 — the skill offers no cheap path, so every feature pays for the full document.

## Regression check
- All tests that passed before this slice must still pass:
  `uv run --with pytest pytest tests/ -q`.
- `tests/test_pillar_boundaries.py` must still pass.
- Files outside `plugins/implement/skills/design-to-code/` and
  `tests/test_design_to_code_skill.py` must be unchanged.

## Out of scope — do not penalise
- Placing the gate in `plugins/implement/skills/build/SKILL.md` (slices 3 and 4).
- The `2b` group in `verify_gate.py` (slice 5).
- The index, the Builds view, and the three integer-only call sites (epic E3).
- The `plugin.json` version bump (slice 4).
- The length of the template. The eight required headings are the floor, and a
  longer document is not a defect.

## Note to the validator on this slice
This slice holds both the content and the negative paths. One score covers both
halves, so read the two halves separately and say which half failed. A
half-finished slice scores low without naming the cause, which wastes a retry.
