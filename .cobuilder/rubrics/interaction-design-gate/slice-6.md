# Rubric: Slice 6 — E3 real content: the index and the Builds view rail

Feature: interaction-design-gate
Epic: E3
Slice goal: `data/index.json` carries an `interaction_design` entity array, the 2b gate joins the feature, and the Builds view rail shows a 2b card whose document opens in the existing gate-doc sheet.
Test command: uv run --with pytest pytest tests/ -v

## Criteria

### C1 — the index carries an `interaction_design` array [CRITICAL]
**Must be true:** Running `shared/build_index.py` produces `data/index.json`
with a top-level `entities.interaction_design` key present as a list. It is an
empty list when no plan carries the file, and never missing and never `null`.
**Evidence to check:**
- Run `uv run shared/build_index.py` from the repository root.
- Run
  `python3 -c "import json; d=json.load(open('.cobuilder-architect/self/data/index.json')); print('interaction_design' in d['entities'], len(d['entities']['interaction_design']))"`.
- Run the test suite and find a test asserting the empty case.
**Scoring:**
- 1.0 — the key is present as a list in every case, with a passing test for the empty case.
- 0.5 — the key appears only when a plan carries the file.
- 0.0 — the key is absent, or the index build fails.

### C2 — the 2b gate joins its feature [CRITICAL]
**Must be true:** `joins.feature_gates` carries a `2b` entry for
`interaction-design-gate`, and the gate entry carries the same shape as its
neighbours: the gate number, its label, and its state text.
**Evidence to check:**
- Run
  `python3 -c "import json; d=json.load(open('.cobuilder-architect/self/data/index.json')); print([g for g in d['joins']['feature_gates']['interaction-design-gate'] if str(g.get('n'))=='2b'])"`.
- Read `resolve_feature_gates()` in `shared/build_index.py` and confirm the
  widened `STATUS_GATE_RE` accepts a label with a letter suffix.
**Scoring:**
- 1.0 — the 2b entry is present with the same shape as its neighbours.
- 0.5 — the entry is present but a field its neighbours carry is missing.
- 0.0 — the 2b line parses as nothing, so the gate never reaches the viewer.

### C3 — a plan that carries an interaction design opens it from the rail [CRITICAL]
**Must be true:** A plan whose 2b line reads `APPROVED` and which carries
`docs/plans/<slug>/interaction-design.md` shows a Gate 2b card on the Builds
view rail. A real pointer click on that card opens the gate-doc sheet, and the
sheet shows that plan's own words. No plan in the repository carries the file
today, so the validator seeds a throwaway plan.
**Evidence to check:**
- Check the port is free before serving. Run
  `lsof -nP -iTCP:<port> -sTCP:LISTEN`. A leftover server serves a stale bundle
  and reads as a failure.
- Seed a temporary plan outside the tracked tree. Give its `00-status.md` gates
  1, 2, and 2b as `APPROVED`. Give its `interaction-design.md` the eight
  headings `REQUIRED_INTERACTION_SECTIONS` names, plus a marker line such as
  `MARKER-2b-BODY`.
- Build against that repository: `uv run shared/build_index.py --repo <temp>`.
- Browser check with the ChromeDevTools MCP tools. Open the viewer, navigate to
  Builds, and click the 2b card with a real pointer click. Confirm the sheet
  title, its `Gate 2b` meta line, and the marker text.
- Read the console messages and confirm no error appears.
- Do not accept a synthetic `.click()` from a test as evidence. `01-product.md`
  records three defects where a synthetic click passed and a real click failed.
**Scoring:**
- 1.0 — the card renders, a real click opens the sheet, and the plan's body text shows.
- 0.5 — the card renders, but the sheet opens empty or the click needs a synthetic event.
- 0.0 — no 2b card on the rail.

**Amended 2026-09-14, after implementation.** This criterion named the plan
`interaction-design-gate`. That plan's 2b line is an approved `n/a (no UI)`, so
it carries no `interaction-design.md`, and its card correctly holds no
document. The criterion was unsatisfiable as written. It also asked for a
document the approved designs do not contain, which section 4 of
`rubric-authoring.md` forbids. It now names the seeding step instead.

### C4 — an `n/a` gate shows a card that holds no document
**Must be true:** A plan whose 2b line reads `n/a` still shows a Gate 2b card
on the rail. That card holds no document, and the page does not offer it as
clickable.
**Evidence to check:**
- Browser check with the ChromeDevTools MCP tools. Open the Builds view and
  read the 2b card attributes on the rail for `interaction-design-gate`.
- Confirm the card carries no `data-gate-doc-id`, so no click handler attaches.
- Confirm the status pill still shows the recorded `n/a` answer.
**Scoring:**
- 1.0 — the card renders with no document, it is not clickable, and the pill shows the `n/a` answer.
- 0.5 — the card renders and offers a click that opens nothing.
- 0.0 — no 2b card appears for an `n/a` gate.

### C5 — the rail knows which document belongs to the gate
**Must be true:** `GATE_DOCS` in
`plugins/artifact/scripts/build_builds_view.py` maps the key `"2b"` to
`["interaction-design.md"]`, and `GATE_LINE` accepts a label with a letter
suffix, so `- Gate 2b — Interaction design: ...` parses.
**Evidence to check:**
- Read `GATE_DOCS` and `GATE_LINE` in
  `plugins/artifact/scripts/build_builds_view.py`.
- Read the browser check in C3 and confirm the sheet resolved a document rather
  than showing a card with no body.
**Scoring:**
- 1.0 — the key is present and the pattern accepts the suffix.
- 0.5 — the pattern accepts the suffix but the document key is absent, so the card opens empty.
- 0.0 — the pattern rejects `2b` and the card does not render.

### C6 — the projection mirrors the existing gate-doc projection
**Must be true:** `discover_interaction_design_docs()` returns one entity per
plan that carries `docs/plans/<slug>/interaction-design.md`. Each entity
carries `feature_slug`, `gate`, `title`, `state`, `source_path`, and `body_md`.
That matches the shape `project_program_design()` already produces, with two
deliberate differences. `state` is the extra field. The entity carries no `id`,
because the viewer finds a record by `r.id === id || r.feature_slug === id`. The
`gate` field is the string `"2b"` for this entity, where the program entity
carries an integer.
**Evidence to check:**
- Read `discover_interaction_design_docs()` in `shared/build_index.py` and
  compare it against `project_program_design()`.
- Run `uv run shared/build_index.py` and read the resulting
  `entities.interaction_design` entries.
**Scoring:**
- 1.0 — the shape matches, and one entity exists per plan that carries the file.
- 0.5 — the shape matches but a plan carrying the file is skipped.
- 0.0 — the function invents a different shape, so the viewer cannot read it.

## Regression check
- All tests that passed before this slice must still pass:
  `uv run --with pytest pytest tests/ -q`.
- The existing entity types keep their counts, apart from the new
  `interaction_design` array.
- The existing ADR sheet, assessment sheet, and comments drawer still open and
  close.
- `python3 plugins/implement/scripts/verify_gate.py --plan docs/plans/cobuilder-family`
  still reports `Overall: OK`.
- Files outside `shared/build_index.py` and
  `plugins/artifact/scripts/build_builds_view.py` must be unchanged.

## Out of scope — do not penalise
- The three integer-only call sites, and the `n` type change (slice 7).
- `current_doc()` accepting `n/a` (slice 7).
- Any change to `verify_gate.py` (slice 5).
- The vendored skill (epic E1) and the build skill (epic E2).
- The committed copy of `.cobuilder-architect/self/data/index.json`. Whether it
  is regenerated in the same change is a separate decision, and a stale copy is
  not this slice's defect.
