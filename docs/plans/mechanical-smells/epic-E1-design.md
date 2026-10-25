# Epic Technical Solution Design: E1 — viewer-findings

Feature: mechanical-smells
Epic ID: E1

## Scope and Intent

This epic clears every habit-hooks finding in the viewer, `plugins/artifact/viewer/`.
The viewer holds 1,637 findings in 70 files. The seven slices cut them by area, logic
first, and the two comment slices come last. The generated folders `components/ui` and
`components/smoothui` are out of scope, because the sensor config excludes them.

The epic ends when `habit-sensors` reports no finding for the viewer, apart from a
recorded oversized-function residual. The vitest suite and the build pass, and the
committed `index.html` rebuilds byte-identically after slice 1.

The epic does not change behavior. No page, route, or rendered output changes. The
epic does not touch the 703 findings outside the viewer, which epic E2 holds.

## Files Touched

All paths sit under `plugins/artifact/viewer/src/`, except the two test files.

| Slice | Files |
|---|---|
| 1 | `data/bundle.ts`, `data/joins.ts`, `data/types.ts`, `data/works.ts`, `shell/model.ts`, and new files next to each |
| 2 | `shell/atoms.tsx`, `shell/sections.tsx`, `shell/panels/Architecture.tsx`, `shell/panels/Intent.tsx`, `shell/panels/ProblemSolution.tsx`, and new files |
| 3 | `shell/change/Diff.tsx`, `Frame.tsx`, `Sheets.tsx`, `levels.ts`, `sections.tsx`, `shell/DiagramTiles.tsx`, `shell/Pager.tsx`, and new files |
| 4 | `App.tsx`, `shell/App.tsx`, `Sheet.tsx`, `WorkDrawer.tsx`, `Rail.tsx`, `TopBar.tsx`, `hooks.ts`, `InShort.tsx`, `jump.tsx`, `markdown.tsx`, `readiness.ts`, `workDeck.ts`, `components/work/DesignCard.tsx`, `StageBadge.tsx`, `WorkBoard.tsx`, `hooks/use-mobile.ts`, `vite.config.ts` (under `viewer/`), and new files |
| 5 | The 20 viewer `*.test.*` files, and new test files that split them |
| 6 | The 42 viewer source files with comment findings |
| 7 | The 20 viewer test files with comment findings |

New files outside the viewer:

- `tests/test_viewer_habit_clean.py`: the sensor check. It holds one entry per slice.
- `plugins/artifact/viewer/src/shell/exports.test.ts`: the export pin, written in slice 1.

## Types & Signatures

The contract is the export surface. A split follows one rule: a moved unit keeps its
name, and the original file re-exports it. The surfaces below must not change. A count
is the number of `export` statements at the start of the epic.

| File | Exports | Examples |
|---|---|---|
| `shell/model.ts` | 44 | `SECTION_KEYS`, `LEVEL_KEYS`, `Route`, `readRoute`, `routeHref`, `boardHref`, `levelsOf`, `railGroups` |
| `shell/atoms.tsx` | 38 | `Chip`, `Panel`, `Box`, `Tile`, `SectionHeading`, `toneFor*` |
| `shell/sections.tsx` | 7 | `EpicGroupSection`, `UnresolvedSlicesSection`, `RubricsSection`, `PlanSection`, `PullRequestsSection`, `FlightDeckPanel`, `ShippedSection` |
| `shell/App.tsx` | 2 | default `ShellApp`, type `Theme` |
| `data/bundle.ts` | 45 | the bundle loaders and the entity readers |
| `data/types.ts` | 22 | the entity types |
| `data/works.ts` | 5 | `buildWorkItems`, `WorkItem` |
| `data/joins.ts` | 2 | the join helpers |

```ts
// shell/model.ts after slice 1: the shape, not the final file names
export { readRoute, routeHref, boardHref } from "./model/routes";
export { SECTION_KEYS, LEVEL_KEYS } from "./model/keys";
```

```python
# tests/test_viewer_habit_clean.py
def slice_findings(files: list[str]) -> list[dict]:
    """Run habit-sensors --file for each file. Keep the issues whose details.file is that file."""
```

```ts
// shell/exports.test.ts: one expectation per surface
expect(Object.keys(await import("./model")).sort()).toEqual(MODEL_EXPORTS);
```

The export lists in `exports.test.ts` come from the code at the start of slice 1. They
are a snapshot of names, not of behavior.

## Slice Decomposition

| Slice | Ends with | Depends on |
|---|---|---|
| 1 | The five logic files report no finding. The export pin exists and passes. The rebuild is byte-identical. | none |
| 2 | The five atom and section files report no finding. The section tests pass. | 1 |
| 3 | The seven change-surface files report no finding. The hooks finding is gone. | 2 |
| 4 | The 17 shell and chrome files report no finding. `ShellApp` and `Theme` still export. | 3 |
| 5 | The 20 test files report no finding, apart from recorded callbacks. Every assertion stays. | 4 |
| 6 | The 42 source files report no comment finding. The sample review passes. | 5 |
| 7 | The 20 test files report no comment finding. The sample review passes. | 6 |

The order is a chain, because each slice leaves stable exports for the next. Slice 1 is
the tracer bullet. It proves the split pattern, the export pin, the sensor check, and the
byte-identical rebuild on pure logic, where the unit tests alone prove behavior.

## Test Plan

- **Sensor check, RED for every slice.** `tests/test_viewer_habit_clean.py` runs
  `habit-sensors --file <path>` for each file of a slice. It keeps the issues whose
  `details.file` is that file, because jscpd reports repo-wide clusters in `--file`
  mode. It fails while any finding remains. It skips when `habit-sensors` or
  `node_modules` is absent. RED adds the entry for its slice, so the check fails before
  GREEN starts.
- **Export pin, a guard, not a RED test.** `shell/exports.test.ts` passes before GREEN,
  by design. It fails when a split drops a name.
- **Behavior.** The existing vitest suite stays green after each slice. Slice 5 splits the
  tests, and it keeps the test count and every assertion.
- **Build.** `tests/test_viewer_build.py` rebuilds `index.html` and compares bytes. It
  stays green. After slice 1 the rebuild is byte-identical.
- **Comment sample.** After slice 6 and slice 7, a reviewer takes at least 20 deleted
  comments, chosen by a fixed seed. The reviewer counts those that explained why. More
  than one in twenty fires the abort condition. The sample list goes into the slice
  evidence.
- **Residuals.** A 13-to-30-line unit that stays is listed in the catalog with its file
  and line. The sensor check allows only the listed units.

## Risks & Open Questions

- **Another session edits the same files.** The branch `feature/work-board-alignment`
  changes `data/bundle.ts`, `data/joins.ts`, `data/types.ts`, `shell/WorkDrawer.tsx`,
  `shell/workDeck.ts`, and `components/work/*` right now. Those files sit in slices 1 and
  4. A split that lands on a different base conflicts with that work. The engineer must
  choose the merge order before slice 1 starts, or accept the conflicts.
- **Export lists drift.** The counts above come from this commit. The other session may
  add exports. Slice 1 takes the lists again at its start.
- **The 12-line function limit.** A React component or a test callback of 13 lines is
  often one unit. The catalog records each residual. If the sensor card must change, the
  abort condition fires.
- **Slice 4 is large.** It holds 141 findings in 17 files. The engineer chose to keep it
  whole. If RED finds two end states, the slice splits at gate 4b of a later pass.
- **Byte-identical rebuild.** It depends on a pinned toolchain. A version drift fails it
  for the wrong reason. The test reports the Node version in its warning, so a drift is
  visible.
- **Sensor check on CI.** `node_modules` may be absent there. The skip covers it, and the
  local run is the proof.
- **Comment review is a judgment.** The reviewer sample is the only check on it. The
  seed and the list make the sample repeatable.
