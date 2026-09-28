# Rubric: Slice 2 — Plan documents in the index and a plan page in the viewer

Feature: review-link
Epic: review-link/E1
Slice goal: `data/index.json` carries `product_doc` and `architecture_doc` entities. `#/<work>/build/plan` renders the three plan documents with gate names, and an empty state for an absent one. The committed viewer is rebuilt. Pytest and vitest pass.
Test command: `uv run --with pytest pytest tests/ -v` and, in `plugins/artifact/viewer/`, `npx vitest run`

Sources: `04-slices.md` row 2, `epic-E1-design.md`, `02-architecture.md` (Data), `03-program-design.md` (Types & signatures, Test plan), `interaction-design.md` (§2, §3, §4, §11), `ui-spec.jsonc`.

## Criteria

### C1 — The index projects the two plan documents [CRITICAL]
**Must be true:** For a plan directory with `01-product.md` and `02-architecture.md`, `data/index.json` holds `product_doc` and `architecture_doc` entities with the same fields as a `program_design` entity (id, feature slug, title, source path, `body_md`). `joins.feature_gates[slug]` points gates 1 and 2 at the new ids. A repo with no plan files gives empty lists.
**Evidence to check:**
- `uv run --with pytest pytest tests/test_build_index_plan_docs.py -v` passes, with a present case and an empty case.
- Run `uv run shared/build_index.py` for this repo, then `jq '.product_doc[] | select(.feature_slug=="review-link") | keys' .cobuilder-architect/self/data/index.json` (or the equivalent field name). The keys match those of a `program_design` entity.
- `jq '.joins.feature_gates["review-link"]' .cobuilder-architect/self/data/index.json` names gate 1 and gate 2 ids.
**Scoring:**
- 1.0 — the test passes, the real index holds both kinds with matching fields, and both joins resolve.
- 0.5 — the entities exist, but a join or a field is missing.
- 0.0 — no entities, or the test fails.

### C2 — The plan page renders three blocks in gate order, with an empty state [CRITICAL]
**Must be true:** `#/<work>/build/plan` renders three blocks in the order Product, Architecture, Program design. Each carries its heading band ("Gate 1 — Product", "Gate 2 — Architecture", "Gate 3 — Program design"), the source path, and the body. An absent document keeps its block and shows the line "No <document> for this work yet." in `--text-3`, with no control.
**Evidence to check:**
- `npx vitest run src/shell/panels/Plan.test.tsx` in `plugins/artifact/viewer/` passes. It asserts the three labels in order, and asserts the empty line for an absent document while the block stays.
- Cite `interaction-design.md` §3.2 and §3.3, and `ui-spec.jsonc` `components.planBlock`.
**Scoring:**
- 1.0 — the test covers order, labels, source path, and the absent state, and passes.
- 0.5 — the test passes, but the absent state hides its block or no test covers it.
- 0.0 — no page, or the test fails.

### C3 — The committed viewer is rebuilt, and the bundle mirror matches [CRITICAL]
**Must be true:** `plugins/artifact/viewer/index.html` is the output of the build from the current `src/`, and `.cobuilder-architect/self/viewer/index.html` is byte-identical to it.
**Evidence to check:**
- In `plugins/artifact/viewer/`, run the build, then `git diff --stat -- index.html`. The build adds no further change to the committed file.
- `uv run --with pytest pytest tests/test_viewer_build.py -v` passes.
- `shasum -a 256 plugins/artifact/viewer/index.html .cobuilder-architect/self/viewer/index.html` prints two identical hashes.
- `grep -c 'No .* for this work yet' plugins/artifact/viewer/index.html` is at least 1, so the new page is in the committed file.
**Scoring:**
- 1.0 — the rebuild changes nothing, the build test passes, and the two hashes match.
- 0.5 — the committed file is rebuilt, but the bundle mirror hash differs.
- 0.0 — the committed file does not hold the plan page, or the rebuild changes it.

### C4 — The plan page opens in a real browser (not satisfiable by contract alone)
**Must be true:** Through the running View server, the plan page of this repo's own `review-link` work shows the three real documents, and a gate tail scrolls to its block.
**Evidence to check:**
- Start View mode. Open `http://127.0.0.1:<port>/active/viewer/index.html#/review-link/build/plan` with the ChromeDevTools MCP tools.
- The snapshot shows the three heading bands in gate order, with text from `docs/plans/review-link/01-product.md` in the first block.
- Open `#/review-link/build/plan/architecture`. The Architecture block is at the top of the view with no animation.
- `list_console_messages` shows no error.
- Open the plan page for a work item with no product document. Its Product block shows the empty line.
- Take a screenshot at 375 px width. The page does not scroll sideways (a wide table scrolls inside its own box).
**Scoring:**
- 1.0 — all checks pass, with screenshots recorded as evidence.
- 0.5 — the page renders, but the tail scroll, the empty state, or the narrow width check fails or is not recorded.
- 0.0 — no browser run recorded, or the page does not render.

### C5 — The Plan rail row
**Must be true:** The Build group of the rail shows a Plan row after Epics and Rubrics. It uses the nav item's 44 px minimum height. A work item with no plan slug shows the row disabled, with the reason "no plan".
**Evidence to check:**
- A vitest case asserts the row position and the disabled state with its reason.
- In the browser run from C4, the snapshot shows the Plan row after Rubrics. `get_css_styles` on the row reports a height of at least 44 px.
- Cite `interaction-design.md` §2, §3.3, §11.2, and `ui-spec.jsonc` `page.railOrder` and `components.planRailRow`.
**Scoring:**
- 1.0 — position, height, and the disabled state all hold.
- 0.5 — the row exists, but the disabled state or the height is wrong.
- 0.0 — no Plan row.

### C6 — `plan` is a Build key, and the page adds no token
**Must be true:** The shell model routes `build/plan` as a program key, and the page adds no new CSS token or timing token.
**Evidence to check:**
- `grep -n "plan" plugins/artifact/viewer/src/shell/model.ts` shows `plan` among the program keys.
- `git diff -- plugins/artifact/viewer/src` adds no new `--` custom property definition.
**Scoring:**
- 1.0 — both hold.
- 0.5 — the route works, but a new token appears.
- 0.0 — the route does not resolve.

## Regression check
- All tests that passed before this slice still pass: `uv run --with pytest pytest tests/ -v`, and `npx vitest run` in `plugins/artifact/viewer/`.
- Files outside the slice scope remain unchanged. Scope: `shared/build_index.py`, `plugins/artifact/viewer/src/shell/model.ts`, `plugins/artifact/viewer/src/data/types.ts`, `plugins/artifact/viewer/src/data/works.ts`, `plugins/artifact/viewer/src/shell/panels/Plan.tsx`, its test, the rail and section wiring, `plugins/artifact/viewer/index.html`, `tests/test_build_index_plan_docs.py`, and the regenerated bundle files.

## Out of scope — do not penalise
- The Present for review section and the link text at each presentation point (slice 3).
- The link check in `verify_gate.py`, and links on gate lines in `00-status.md` (slice 3).
- A viewer page for the interaction design document (out of the epic).
- `review_link.py` behavior, already scored in slice 1.
