# Rubric: Slice 1 — E1 tracer bullet: the skill skeleton and its file set

Feature: interaction-design-gate
Epic: E1
Slice goal: `plugins/implement/skills/design-to-code/SKILL.md` exists, its frontmatter parses, its overview names three steps, and every relative path it cites resolves inside the directory. The three product-brief files are absent.
Test command: uv run --with pytest pytest tests/test_design_to_code_skill.py tests/test_pillar_boundaries.py -v

## Criteria

### C1 — the skill lives at the approved path and its frontmatter parses [CRITICAL]
**Must be true:** The directory `plugins/implement/skills/design-to-code/`
exists and `SKILL.md` sits at its root. Its frontmatter parses with
`yaml.safe_load` and carries `title`, `description`, `status`, `type`, and
`last_verified`. The `description` names a supplied design and a front end, so a
session can tell this skill apart from `architect:design`.
**Evidence to check:**
- Run `ls -R plugins/implement/skills/design-to-code/`.
- Run `uv run --with pytest pytest tests/test_design_to_code_skill.py -v` and
  find `test_skill_frontmatter_parses`.
- Or read the frontmatter block and parse it directly:
  `python3 -c "import yaml; t=open('plugins/implement/skills/design-to-code/SKILL.md').read().split('---')[1]; print(yaml.safe_load(t))"`.
**Scoring:**
- 1.0 — the path matches the approved design, the block parses, all five fields
  are present, and the description names a front end.
- 0.5 — the path is right and the block parses, but a field is missing or the
  description would also fit `architect:design`.
- 0.0 — the skill sits in `shared/skills/`, in another plugin, or nowhere, or
  the block fails to parse.

### C2 — the overview names three steps and no fourth
**Must be true:** The skill describes three steps. The upstream five-step
overview does not survive into the fork.
**Evidence to check:**
- Run the test suite and find `test_overview_names_three_steps`.
- Or run `grep -nE '^## Step' plugins/implement/skills/design-to-code/SKILL.md`.
  Expect three headings for Step 1, Step 2, and Step 3, and none for Step 4.
**Scoring:**
- 1.0 — three step headings, and the prose overview names the same three.
- 0.5 — three step headings, but the overview still counts five.
- 0.0 — four or five steps survive.

### C3 — every relative path the skill cites resolves [CRITICAL]
**Must be true:** Every relative path named anywhere in the skill tree
resolves to a file that exists in the directory. A dead pointer means Step 1
reads a template that is not there.
**Evidence to check:**
- Run the test suite and find `test_every_relative_path_cited_resolves`.
- Or read each file in the tree, extract the relative paths, and check each one
  with `test -e`.
**Scoring:**
- 1.0 — every cited path resolves.
- 0.0 — one or more cited paths are dangling.

### C4 — the three product-brief files are absent
**Must be true:** `templates/brief-template.md`, `templates/prd.md`, and
`examples/workflow-matrix-prd.md` do not exist in the vendored directory. Gate
1 `01-product.md` replaces all three.
**Evidence to check:**
- Run `ls plugins/implement/skills/design-to-code/templates/ plugins/implement/skills/design-to-code/examples/`.
- Run `test -e` against each of the three paths and confirm it fails.
**Scoring:**
- 1.0 — all three absent.
- 0.0 — any one of the three was copied across.

### C5 — the boundary test still passes with the new skill registered [CRITICAL]
**Must be true:** `tests/test_pillar_boundaries.py` passes.
`assert_no_unscanned_pillar()` fails loudly on any `SKILL.md` that no constant
names, so the directory cannot exist unregistered.
**Evidence to check:**
- Run `uv run --with pytest pytest tests/test_pillar_boundaries.py -v`.
- Read `KNOWN_OTHER_SKILLS` in `tests/test_pillar_boundaries.py` and confirm it
  contains `design-to-code`.
**Scoring:**
- 1.0 — the test passes and the constant carries the name.
- 0.5 — the constant carries the name, but a broader boundary rule now fails.
- 0.0 — the boundary test fails with an unscanned-skill error.

## Regression check
- All tests that passed before this slice must still pass:
  `uv run --with pytest pytest tests/ -q`. The four pre-existing `PIL` WebP
  failures are the baseline and are not this slice's fault.
- Files outside `plugins/implement/skills/design-to-code/`,
  `tests/test_design_to_code_skill.py`, and `tests/test_pillar_boundaries.py`
  must be unchanged.

## Out of scope — do not penalise
- The four concepts in the template, the JSONC keys, the no-front-end path, and
  the terminology sweep (slice 2).
- Any change to `plugins/implement/skills/build/SKILL.md` (slices 3 and 4).
- Any change to `verify_gate.py` or the index (epic E3).
- The `plugin.json` version bump (slice 4).
