# Rubric: Slice 2 — E2 tracer bullet: three agent files that parse

Feature: slice-agents-and-vocabulary
Epic: E2
Slice goal: `plugins/implement/agents/{red,green,validate}.md` exist with valid frontmatter.
Test command: uv run --with pytest --with requests --with pyyaml --with pillow pytest tests/ -q

## Criteria

### C1 — three files with parseable frontmatter [CRITICAL]
**Must be true:** Each file starts with YAML frontmatter that parses. `name` equals the file stem (`red`, `green`, `validate`). `description` is a non-empty line that says when the build skill spawns the agent.
**Evidence to check:** run the suite and read `tests/test_slice_agents.py`. Parse each file yourself with PyYAML.
**Scoring:** 1.0 all three. 0.5 one defect. 0.0 a file is missing or fails to parse.

### C2 — no field that plugin agents ignore [CRITICAL]
**Must be true:** No file carries `hooks`, `mcpServers`, `permissionMode`, or `initialPrompt`. A test asserts this for every file in `plugins/implement/agents/`, so a later file is also covered.
**Evidence to check:** read the frontmatter and the test.
**Scoring:** 1.0 absent and tested for the whole directory. 0.5 absent but tested only for named files. 0.0 present.

### C3 — tools and model match the epic design
**Must be true:** RED and GREEN carry `model: sonnet` and tools Read, Grep, Glob, Write, Edit, Bash. VALIDATE has no `model` key and its tools exclude Edit.
**Evidence to check:** read the frontmatter. Compare with the table in `docs/plans/slice-agents-and-vocabulary/epic-E2-design.md`.
**Scoring:** 1.0 exact match. 0.5 one mismatch. 0.0 VALIDATE carries `model: sonnet` or Edit.

## Regression check
- `uv run --with pytest --with requests --with pyyaml --with pillow pytest tests/ -q` shows no new failure. Baseline: 365 passed, 1 pre-existing failure in `test_generate_prompts_webp.py`.
- `uv run plugins/implement/scripts/verify_gate.py --plan docs/plans/interaction-design-gate` still reports `Overall: OK`.

## Out of scope — do not penalise
- Full prompt bodies and the loop changes (slice 3). A one-paragraph body is enough here.
