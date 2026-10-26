# Program Design: Clear the viewer's habit-hooks findings (mechanical-smells)

## Files

All paths sit under `plugins/artifact/viewer/src/` unless noted. Each file sits in
exactly one slice.

| Slice | Files | Work |
|---|---|---|
| 1 | `data/bundle.ts`, `data/joins.ts`, `data/types.ts`, `data/works.ts`, `shell/model.ts` | Split by concern into new files next to each original. Re-export every moved name from the original. |
| 2 | `shell/atoms.tsx`, `shell/sections.tsx`, `shell/panels/*` (3 files) | Split by render unit. Keep the atom vocabulary and the seven section renderers importable from the old files. |
| 3 | `shell/change/*` (5 files), `shell/DiagramTiles.tsx`, `shell/Pager.tsx` | Split by render unit. Fix the `react-hooks/exhaustive-deps` finding in `DiagramTiles.tsx`. |
| 4 | `App.tsx`, `shell/App.tsx`, `shell/Sheet.tsx`, `shell/WorkDrawer.tsx`, `shell/Rail.tsx`, `shell/TopBar.tsx`, `shell/hooks.ts`, `shell/InShort.tsx`, `shell/jump.tsx`, `shell/markdown.tsx`, `shell/readiness.ts`, `shell/workDeck.ts`, `components/work/*` (3 files), `hooks/use-mobile.ts`, `vite.config.ts` | Split `ShellApp` and its hooks. Fix the `jsx-a11y/media-has-caption` finding in `InShort.tsx`. Remove the 2 non-null assertions in `shell/App.tsx`. |
| 5 | The 20 viewer `*.test.*` files | Split large `describe` blocks into files by concern. Remove the 2 `any`, the 10 non-null assertions, and the 8 duplicate imports. |
| 6 | The 42 viewer source files with comment findings | Review each flagged comment. |
| 7 | The 20 viewer test files with comment findings | Review each flagged comment. |

New: `tests/test_viewer_habit_clean.py`. It holds one entry per slice, listing the
slice's files.

## Types & signatures

The contract is the export surface, not a new type. A split follows one rule: a
moved unit keeps its name, and the original file re-exports it.

```ts
// shell/model.ts, after slice 1 (shape, not final names)
export { readRoute, routeHref, boardHref } from "./model/routes";
export { SECTION_KEYS, LEVEL_KEYS } from "./model/keys";
```

The surfaces that must not change:

- `shell/model.ts`: more than 40 exported names, among them `SECTION_KEYS`,
  `LEVEL_KEYS`, `Route`, `readRoute`, `routeHref`, and the `*Href` helpers.
- `shell/atoms.tsx`: 38 exports, among them `Chip`, `Panel`, `Box`, `Tile`,
  `SectionHeading`, and the `toneFor*` helpers.
- `shell/sections.tsx`: `EpicGroupSection`, `UnresolvedSlicesSection`,
  `RubricsSection`, `PlanSection`, `PullRequestsSection`, `FlightDeckPanel`,
  `ShippedSection`.
- `shell/App.tsx`: the default export `ShellApp` and the type `Theme`.

The check, in Python:

```python
def slice_findings(files: list[str]) -> list[dict]:
    """Run habit-sensors --file for each file. Keep only issues whose details.file is that file."""
```

## Call stack

Dependency order, top imports below: `App` imports `sections` and `atoms`;
`sections` imports `atoms` and `model`; `model` imports `data/*`. A split keeps
this order, so slice 1 changes nothing above it, and each later slice depends
only on a surface that an earlier slice left stable.

## Test plan

- **Sensor check.** `tests/test_viewer_habit_clean.py` runs `habit-sensors --file`
  for each file of a slice. It keeps the issues whose `details.file` is that
  file, because jscpd reports repo-wide clusters in `--file` mode. It fails on
  any finding. The test skips when `habit-sensors` or `node_modules` is absent.
  RED writes the entry for its slice, so the test fails before GREEN starts.
- **Behavior.** The existing vitest suite stays green. No test changes except in
  slice 5, where the tests themselves split. Slice 5 keeps every assertion.
- **Build.** The test that rebuilds `index.html` from source stays green. After
  slice 1 the rebuild is byte-identical.
- **Exports.** Before slice 1, the engineer lists the exported names of the four
  surfaces. The list stays in the slice evidence. After each slice the same list
  matches.
- **Comments.** After slices 6 and 7, a reviewer samples 5% of the deleted
  comments, at least 20 per slice. The reviewer counts those that explained why.
  More than one in twenty fires the abort condition.
- **Prior art.** The `consult` tool is absent in this session. No prior-art
  record exists for either call.

## Least confident decisions

- Whether the 12-line function limit holds for React components and test
  callbacks. The plan records a 13-to-30-line residual when it is one unit.
- Whether a byte-identical `index.html` rebuild holds across the pinned Node and
  Vite versions after slice 1.
- Whether `tests/test_viewer_habit_clean.py` stays after the epic as a standing
  guard, or the `habit.smells` gate replaces it.
- Slice 4 is large: 17 files, 141 findings. A third slice-cut may be needed.
- Whether `habit-sensors --file` behaves the same on CI, where `node_modules`
  may be absent. The skip covers it.
