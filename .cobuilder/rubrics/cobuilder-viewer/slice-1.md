# Rubric: Slice 1 — tracer bullet: a publish survives a marker rename

Feature: cobuilder-viewer
Epic: cobuilder-viewer/E1
Slice goal: The exporter matches the built file's named markers, and a real publish of the current viewer still succeeds after the marker names move
Test command: `uv run --with pytest pytest tests/ -v`

This slice has no new surface. Its evidence is a real publish, the published page, and the exporter's own source.

## Criteria

### C1 — A publish still succeeds after a marker name moves [CRITICAL]
**Must be true:** A reader renames one marker in the viewer source, runs a publish, and the publish finishes. No publish breaks because a marker moved.
**Evidence to check:**
- Rename one marker name in `plugins/artifact/viewer/index.html`, then run the publish path.
- With the ChromeDevTools MCP tools, open the published page. The viewer renders, and its four levels are reachable.
- Restore the marker name and publish again. The same page renders.
**Scoring:**
- 1.0 — both publishes finish, and the published page renders before and after the rename.
- 0.5 — the publish finishes and one of the two published pages renders a blank viewer.
- 0.0 — a publish fails, or the published page renders nothing.

### C2 — The exporter matches a name, not a literal [CRITICAL]
**Must be true:** The exporter holds the marker names it matches. It never matches a literal that happens to sit between two markers, so a change inside a data block cannot break it.
**Evidence to check:**
- Read `plugins/artifact/scripts/export_artifact.py`. It holds a named list of markers, one entry per marker it rewrites.
- Change one marker's name in the source and run the exporter alone. It stops with a message naming the missing marker, and it does not publish a half-rewritten file.
**Scoring:**
- 1.0 — the exporter names its markers, and a missing marker stops it with a message that names it.
- 0.5 — the exporter names its markers and publishes anyway when one is absent.
- 0.0 — the exporter matches a surrounding literal, so a data change breaks a later publish.

### C3 — Every marker the exporter matches exists in the built viewer
**Must be true:** Each name in the exporter's list appears in `plugins/artifact/viewer/index.html`. A name the file lacks is a publish that cannot run.
**Evidence to check:**
- Read the marker names from the exporter.
- Assert each one appears in the committed viewer file.
**Scoring:**
- 1.0 — every name appears.
- 0.5 — one name is absent and the exporter reports it at publish time.
- 0.0 — two or more names are absent, or the file carries no marker at all.

### C4 — The published page carries its own pull-request data
**Must be true:** Two published pages carry their own data. One pull request's page never shows another pull request's narration.
**Evidence to check:**
- Publish two different pull requests.
- With the ChromeDevTools MCP tools, open each published page and read the narration it shows. Each names its own pull request.
**Scoring:**
- 1.0 — each page shows its own pull request, and neither shows the other's.
- 0.5 — each page renders and one shows the wrong pull request.
- 0.0 — both pages show the same pull request, so the rewrite wrote into one page twice.

## Regression check
- All tests that passed before this slice must still pass, including `tests/test_export_artifact_webp.py`.
- Files outside the slice scope must remain unchanged: `plugins/artifact/viewer/src/`, `shared/`, and `plugins/pr/`.
- Publishing a pull request that worked before this slice still works: the exporter's own test suite passes unchanged.

## Out of scope — do not penalise
- The build's output path. E2 owns it, and this slice publishes whatever file the build produces today.
- The viewer's React source and any surface change.
- The 16 MiB budget and the audio degradation order. Both defer with E16.
