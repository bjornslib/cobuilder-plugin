# Rubric: Slice 3 — the build owns the committed file

Feature: cobuilder-viewer
Epic: cobuilder-viewer/E2
Slice goal: The build reproduces `plugins/artifact/viewer/index.html` byte for byte, and one edited byte makes the rebuild test fail
Test command: `uv run --with pytest pytest tests/ -v`

The evidence is the build's output path, the guard test's own failure, and the page the file renders.

## Criteria

### C1 — The build writes the committed file [CRITICAL]
**Must be true:** The viewer's build writes `plugins/artifact/viewer/index.html` itself. A reader who runs the build finds that file changed to whatever the build produced.
**Evidence to check:**
- Run the viewer build. Read `vite.config.ts`'s `build.outDir` and confirm it resolves to the plugin root rather than `../dist`.
- Change one visible string in `src/`, build, and confirm the committed file carries the change.
- Confirm `plugins/artifact/viewer/dist/` no longer exists, or is no longer the build's output.
**Scoring:**
- 1.0 — the build writes the committed file, and a source change reaches it.
- 0.5 — the build writes the file and also leaves a second copy under `dist/`.
- 0.0 — the build still writes only `dist/`.

### C2 — One edited byte fails the rebuild test [CRITICAL]
**Must be true:** The guard can fail. A hand edit to the committed file makes the test fail, and the failure says which byte differs.
**Evidence to check:**
- Run `uv run --with pytest pytest tests/test_viewer_build.py -v`. It passes.
- Change one byte in the committed file and run the same command. It fails, and the failure names the first differing offset.
- Restore the byte. The test passes again.
**Scoring:**
- 1.0 — the test passes on a clean tree, fails on an edited byte, and names the offset.
- 0.5 — it fails on an edited byte with no offset named.
- 0.0 — it passes on an edited file, so the guard is nominal.

### C3 — The build does not empty the plugin root
**Must be true:** The output directory is the plugin root, so a build must not clear it. `package.json` and `src/` survive a build.
**Evidence to check:**
- Read `vite.config.ts` and confirm `emptyOutDir` is false.
- Run the build, then list the plugin root. `package.json`, `src/`, and `node_modules/` are present.
**Scoring:**
- 1.0 — `emptyOutDir` is false, and the plugin root survives the build.
- 0.5 — `emptyOutDir` is unset and the build happens to leave the root alone.
- 0.0 — a build deletes a file the project needs.

### C4 — The committed file still boots and renders
**Must be true:** The committed file is the shipped viewer. A reader opens it and the shell renders.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open the committed file over the local server. The shell renders, with its rail and its top bar.
- Read the console messages. None reports an error.
**Scoring:**
- 1.0 — the file renders the shell, and the console is clean.
- 0.5 — it renders and one console error appears.
- 0.0 — it renders a blank page.

### C5 — Every named marker survives a build
**Must be true:** The markers E1 depends on pass through the build. A marker the build rewrites away breaks publishing without breaking the guard.
**Evidence to check:**
- Read the marker names from `plugins/artifact/scripts/export_artifact.py`.
- Assert each name appears in the built, committed file.
**Scoring:**
- 1.0 — every name survives the build.
- 0.5 — one name is absent, and the exporter reports it at publish time.
- 0.0 — the build strips or rewrites the markers.

## Regression check
- All tests that passed before this slice must still pass, including `tests/test_export_artifact_webp.py` and `tests/test_plugin_manifests.py`.
- Files outside the slice scope must remain unchanged: the viewer's rendering behaviour, `shared/`, and `plugins/pr/`.
- A publish of the newly built file still succeeds, which is slice 1's own claim.

## Out of scope — do not penalise
- The app's content. The build moves how the file is produced and changes nothing it renders.
- Byte-equality across a second machine.
- CI. Nothing here wires a runner, and the guard's cases skip when Node is absent.
