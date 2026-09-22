# Epic Technical Solution Design: E2 — The build pipeline

Feature: cobuilder-viewer
Epic ID: cobuilder-viewer/E2

## Scope and Intent

E2 makes `plugins/artifact/viewer/index.html` a build output. Today a hand-written file
sits there. `vite.config.ts` writes its build to `../dist` instead, because
ADR-0023's output rule was still under revision when that config landed. E2 settles it:
the build writes the committed file, and a test rebuilds it and fails on any difference.

This epic carries the program's riskiest unknown. A guarded artifact is only a guard if
two builds produce the same bytes, so the question comes first and the pipeline second.

The boundary. E2 changes how the build produces that file, and nothing about what the file contains.
It adds no panel, no route, and no record read. It does not touch the exporter beyond
the named markers E1 puts in the output. It does not change the bundle, the record
index, or any script outside `plugins/artifact/viewer/`.

## Files Touched

- `plugins/artifact/viewer/vite.config.ts` — modified. `build.outDir` moves from
  `../dist` to the plugin root, so the build writes `index.html` in place. The
  single-file plugin and the `@` alias stay as they are.
- `plugins/artifact/viewer/package.json` — modified. The build script gains the
  `tsc --noEmit` step it already carries, and a `build:check` script the test calls.
- `plugins/artifact/viewer/index.html` — modified by every build from here on. It
  becomes a build artifact, and no hand edit to it survives a rebuild.
- `plugins/artifact/viewer/src/main.tsx` — modified. It mounts the shell the build
  emits, and it is where the named markers reach the output.
- `plugins/artifact/viewer/src/index.html` — modified. The dev entry gains the same
  marker comments the build passes through, so dev and built output agree.
- `plugins/artifact/viewer/dist/` — deleted. The scratch output has no reader once the
  build writes the committed file.
- `tests/test_viewer_build.py` — new. The byte-equal guard.
- `plugins/artifact/viewer/package-lock.json` — unchanged, and load-bearing. The
  byte-equal test compares two builds from this one lockfile.
- `.nvmrc` or `package.json`'s `engines` field — modified. The Node major pins too, for
  the same reason the lockfile does.

## Types & Signatures

E2 carries no application type. Its contracts are the build's output path, the marker
names, and the Python helpers the guard calls.

```ts
/* vite.config.ts — the output contract. */
export default defineConfig({
  root: "src",
  build: {
    outDir: "..",          // the plugin root, so the build writes index.html in place
    emptyOutDir: false,    // never true here: the outDir holds package.json and src/
    target: "es2022",
  },
});
```

```python
# tests/test_viewer_build.py
VIEWER = REPO_ROOT / "plugins" / "artifact" / "viewer"
COMMITTED = VIEWER / "index.html"

def npm_available() -> bool: ...
def run_build() -> bytes:
    """Run the viewer's build and return the bytes it wrote to COMMITTED."""
def committed_bytes() -> bytes: ...
def marker_names() -> list[str]:
    """The names export_artifact.py matches, read from the exporter itself."""
```

**The marker contract.** E1 puts a small set of named markers in the built output:
one in the document head, one where the per-pull-request data block begins, and one
where it ends. The exporter matches those names and never a literal that sits between
them. E2 asserts the names survive a build, and it does not own their spelling.

**The determinism contract.** Two runs of `npm ci && npm run build`, on one machine,
from one lockfile, with one Node major, produce the same bytes. That is the property
slice 2 measures, and slice 3 is the guard that depends on it.

## Slice Decomposition

Per `docs/plans/cobuilder-viewer/04-slices.md`, in build order. E1's slice 1 runs
first, because the markers it adds are what the build carries through.

- **Slice 2 — Two builds produce the same bytes.** Depends on: nothing in this epic.
  Runs the build twice on the same input and compares. Its end is a measurement: either
  the bytes match, or the spike reports what varies.
- **Slice 3 — The build owns the committed file.** Depends on: slice 2, because the
  guard is meaningless while the output varies. Wires the output path, commits the
  built file, and adds the test that fails on any difference.

Slice 3 is not slice 2's edge cases. They are two states: a toolchain that can
reproduce itself, and a pipeline that holds the committed file to it.

## Test Plan

`tests/test_viewer_build.py`, run by `uv run --with pytest pytest tests/ -v`. Every
case skips with a clear reason when `npm` or `node_modules` is absent, so a checkout
with no Node still passes the suite.

- `test_two_builds_produce_the_same_bytes` — slice 2. Build twice, compare, and report
  the first differing byte offset when they differ.
- `test_build_reproduces_the_committed_viewer` — slice 3. Compare a fresh build against
  `index.html`.
- `test_editing_the_output_fails_the_test` — slice 3. Write one byte into a temporary
  copy of the committed file and assert the comparison fails. A guard that cannot fail
  proves nothing.
- `test_every_marker_name_survives_a_build` — slice 3. Read the names from
  `export_artifact.py` and assert each one appears in the built output.
- `test_out_dir_is_the_plugin_root` — slice 3. Read `vite.config.ts` and assert
  `build.outDir` resolves to the plugin root, so a later edit cannot quietly restore
  `../dist`.
- `test_the_build_does_not_empty_the_plugin_root` — slice 3. Assert `emptyOutDir` is
  false. A build that empties the plugin root deletes `package.json` and `src/`.

## Risks & Open Questions

- **The output path is the epic's open problem.** `vite.config.ts` writes to `../dist`
  today, with its own comment saying ADR-0023's output rule is under revision while the
  shipped file keeps working. E2 moves the output to the commit, and that is a real
  change to a shipped file: every publish after it rewrites a build artifact. The
  byte-equal guard is the only thing standing between that and a stale commit, so the
  guard is a precondition of the move rather than a companion to it.
- **`emptyOutDir` must be false.** The output directory becomes the plugin root, which
  holds `package.json`, `src/`, and `node_modules/`. A build that empties its own
  output directory deletes the project.
- **Byte-equality across two machines is unproven.** The lockfile pins dependencies and
  the engines field pins Node. Neither pins the operating system, the file ordering a
  filesystem reports, or a locale. Slice 2 answers this for one machine. The second
  machine is a real question and this design does not settle it.
- **A contributor now needs Node and npm to change the viewer.** The repository has
  never required either. It is a stated risk in `intent.json`, and no work in this
  program answers it.
- **The tests skip when Node is absent.** That keeps the suite runnable. It also
  means a CI runner without Node passes the guard's cases by not running them. Whoever
  wires CI must add Node, or the guard is nominal.
- **The build's dependency on the markers is one-way.** E1 asserts the names exist in
  the source. E2 asserts they survive the build. If the single-file plugin ever
  rewrites an HTML comment, both pass and publishing breaks. Slice 2's byte comparison
  is the only case that would notice.
