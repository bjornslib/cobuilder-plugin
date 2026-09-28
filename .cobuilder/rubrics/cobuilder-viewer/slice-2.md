# Rubric: Slice 2 — two builds produce the same bytes

Feature: cobuilder-viewer
Epic: cobuilder-viewer/E2
Slice goal: Two builds from the same lockfile on the same machine produce the same bytes, so the byte-equal guard is possible at all
Test command: `uv run --with pytest pytest tests/ -v`

This slice is a measurement. Its evidence is two build runs, the bytes they write, and the page the built file renders.

## Criteria

### C1 — Two builds of one input produce identical bytes [CRITICAL]
**Must be true:** A reader builds the viewer twice from the same sources and the same lockfile, and the two outputs are byte-identical. A difference means the guard slice 3 adds can never hold.
**Evidence to check:**
- Run the viewer build twice into two separate files, or build, save a copy, and build again.
- Compare the two byte for byte, and report the first differing offset when they differ.
**Scoring:**
- 1.0 — the two outputs are identical, and the run reports the byte length and the hash of both.
- 0.5 — they are identical on one run and differ on a second run of the same command, which is a timing or ordering defect.
- 0.0 — they differ on every run.

### C2 — The toolchain pins enough to reproduce itself
**Must be true:** The build pins its inputs. One lockfile fixes the dependencies, and a declared Node major fixes the runtime.
**Evidence to check:**
- Read `plugins/artifact/viewer/package-lock.json`. It exists in the tree, and the repository tracks it.
- Read `plugins/artifact/viewer/package.json` or `.nvmrc`. It declares a Node major or a range.
- Build once with the declared Node major. It succeeds.
**Scoring:**
- 1.0 — the lockfile and the Node pin both exist, and the build succeeds on the declared major.
- 0.5 — the lockfile exists and the project states no Node major.
- 0.0 — no lockfile exists, or the build needs an undeclared install step.

### C3 — A differing byte is detectable, and the report names it
**Must be true:** The measurement can fail. A comparison that always reports equality is not a measurement.
**Evidence to check:**
- Change one byte in one of the two build outputs and compare again. The comparison reports a difference and names the first differing offset.
- Report the offset in the slice's record.
**Scoring:**
- 1.0 — the report names the changed byte and its offset.
- 0.5 — the report names a difference and no offset.
- 0.0 — the comparison reports equality for two files that differ.

### C4 — The built file still boots and renders
**Must be true:** Identical bytes are worth having only if the bytes work. The built file opens as the viewer, not as a blank page.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open the built file over the local server. The shell renders, with its rail and its top bar.
- Read the console messages. None reports an error.
**Scoring:**
- 1.0 — the built file renders the shell, and the console is clean.
- 0.5 — it renders and the console reports an error the reader can ignore.
- 0.0 — it renders a blank page, or the shell throws.

## Regression check
- All tests that passed before this slice must still pass, including `tests/test_plugin_manifests.py`.
- Files outside the slice scope must remain unchanged: `plugins/artifact/viewer/src/` behaviour, `shared/`, and `plugins/artifact/scripts/`.
- The dev server still renders the viewer: `npm run dev` serves a working page.

## Out of scope — do not penalise
- The output path. Slice 3 owns the move to the committed file.
- The byte-equal test itself. It arrives in slice 3.
- Byte-equality across a second machine or a second operating system.
- The bundle's data, the record index, and any surface change.
