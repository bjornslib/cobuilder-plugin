# Findings Catalog: the habit-hooks mechanical smells

This catalog is the record the program `mechanical-smells` and later passes
read. It holds one scan, the smells it found, the clustering of those smells,
and the verdict for each cluster. A later pass that cuts the second epic opens
this file, not a fresh scan.

## 1. The scan

- **Tool:** `habit-sensors` (habit-hooks v1.5.0), the sensor behind
  `shared/habit_smells.py`.
- **Command:** `habit-sensors --all`, run on `feature/beads-mapping` at
  `317e047` on 2026-10-24. It reported 2,456 findings across 14 smell types and
  124 groups. The run was complete.
- **Rescan:** at `fdf453b`, after 7 more commits, the same command reports
  2,459 findings. Two new duplicate clusters came from
  `tests/test_tracker_migrate_mapping_cli.py`, and `shared/tracker_port/fake.py`
  dropped under 200 lines. The viewer source did not change.
- **Exclusion:** the engineer excluded `components/ui` (shadcn output) and
  `components/smoothui` (a registry copy) in `.habit-hooks/config.toml`. That
  removes 119 findings and leaves **2,340**. Every count below is after the
  exclusion, unless a column says it is the scan.
- **Incremental run:** the wrapper
  `uv run shared/habit_smells.py --repo . --branch master` covers only the
  commits ahead of `master`. This catalog uses the full-tree `--all` run,
  because the program resolves the standing debt, not the recent diff.

The sensor reports one limit per smell. The limits the viewer epic adopts:

| Limit | Value | Sensor source |
|---|---|---|
| File lines | 200 | `line-count`, `eslint:max-lines` |
| Function complexity | 10 | `eslint:complexity`, `ruff:C901` |
| Function lines | 12 (TS) | `eslint:max-lines-per-function` |
| Function statements | 50 (Python) | `ruff:PLR0915` |
| Function parameters | 3 (TS), 5 (Python) | `eslint:max-params`, `ruff:PLR0913` |

## 2. The smells, with counts

| Smell | Scan | After exclusion | Viewer | Rest |
|---|---|---|---|---|
| non-essential-comment | 1,283 | 1,226 | 1,080 | 146 |
| oversized-function | 518 | 471 | 387 | 84 |
| duplicated-code | 214 | 216 | 10 | 206 |
| explicit-any | 159 | 159 | 2 | 157 |
| oversized-file | 128 | 119 | 66 | 53 |
| high-complexity | 53 | 49 | 28 | 21 |
| duplicate-import | 45 | 44 | 44 | 0 |
| too-many-parameters | 15 | 15 | 6 | 9 |
| swallowed-exception | 12 | 12 | 0 | 12 |
| non-null-assertion | 12 | 12 | 12 | 0 |
| unused-variable | 8 | 8 | 0 | 8 |
| unused-import | 7 | 7 | 0 | 7 |
| jsx-a11y/media-has-caption | 1 | 1 | 1 | 0 |
| react-hooks/exhaustive-deps | 1 | 1 | 1 | 0 |
| **Total** | **2,456** | **2,340** | **1,637** | **703** |

The viewer is `plugins/artifact/viewer/`. It holds 70% of the findings, in 70
files. Without the comments, the viewer and the rest hold 557 each.

## 3. The clustering

The 14 smells fall into seven clusters. Each cluster has one verdict, and each
verdict names an epic of this program.

### Cluster S: Structural

`oversized-function`, `oversized-file`, `high-complexity`, `too-many-parameters`.
The viewer holds 487 of the 654. The rest holds 167: `cobuilder-memory` 96, and
the Python scripts and root tests 71.

**Verdict:** the viewer part goes to epic E1, slices 1 to 5. The rest goes to
epic E2.

**The function-line tension.** The 12-line function limit is aggressive for
React. A component of 13 lines is often one atomic render unit, and a test
callback is often one case. Splitting either harms readability without lowering
complexity. This program treats the file limit (200) and the complexity limit
(10) as hard. It treats the function-line limit as a recorded exception: a
residual 13-to-30-line unit stays when it is one unit. The catalog names each
residual when epic E1 closes.

### Cluster T: Type surface

`explicit-any` (159) and `non-null-assertion` (12). The 157 `any` findings in
`cobuilder-memory` sit in 10 test files, where `any` is often a deliberate stub
or mock. In the viewer, 2 `any` and 10 of the 12 assertions are in test files,
and 2 assertions are in `shell/App.tsx`.

**Verdict:** the viewer's 14 go to epic E1, slices 4 and 5. The 157 go to epic
E2, judged per file.

### Cluster H: Hygiene

`duplicate-import` (44), `unused-import` (7), `unused-variable` (8). All 44
duplicate-imports sit in the viewer. All 15 unused findings are Python, in
`tests/` and `plugins/*/scripts/`.

**Verdict:** the 44 go to epic E1, slices 1 to 5. The 15 go to epic E2.

### Cluster D: Duplicates

`duplicated-code` (216, up from 214 at the scan). The jscpd clusters are small,
two files each. The 216 split by kind: tests, Python scripts
(`export_artifact.py` against the `pr` scripts), the stack reference prose
(`references/stacks/*.md`, where the `architect` and `pr` plugins hold separate
copies), viewer TypeScript, and other prose. The viewer holds 10 findings, which
epic E1 clears in slices 1 and 4.

**Verdict:** the viewer's 10 go to epic E1. The other 206 go to epic E2. That
group must judge the stack prose copies before it fixes the code clusters.

### Cluster P: Python exceptions

`swallowed-exception` (12), all `except Exception` (ruff BLE001) in 8 files. A
site review of three cases shows graceful degradation: `shared/_manifest.py`
warns and falls back to an empty list, `shared/validate_decision_state.py`
returns an empty list when the optional STE linter is absent, and
`.claude/hooks/deny-git-stash.py` exits 0 on unparseable stdin. These are not
bugs.

**Verdict:** epic E2. A pass narrows each catch to the exception it means, or
records a `noqa` with a reason where the broad catch is right. It is a per-site
judgment, not a mechanical pass.

### Cluster R: React lint

`jsx-a11y/media-has-caption` (1, `shell/InShort.tsx`) and
`react-hooks/exhaustive-deps` (1, `shell/DiagramTiles.tsx`).

**Verdict:** epic E1. The hooks finding goes to slice 3, and the caption finding
goes to slice 4.

### Cluster C: Comment habit

`non-essential-comment` (1,226). The viewer holds 1,080: 658 in source files and
422 in test files. The rest holds 146.

**Verdict:** the viewer's 1,080 go to epic E1, slices 6 and 7, with a
per-comment review. A comment that explains why stays, reworded if needed. A
reviewer samples each slice. The 146 go to epic E2.

## 4. The viewer epic, E1

Each file sits in exactly one slice. The comment slices touch the same files
again, after the structural slices.

| Slice | Area | Files | Findings |
|---|---|---|---|
| 1 | Logic layer: `data/*` source and `shell/model.ts` | 5 | 41 |
| 2 | Atoms and sections: `atoms.tsx`, `sections.tsx`, `panels/*` | 5 | 76 |
| 3 | Change surface: `change/*`, `DiagramTiles.tsx`, `Pager.tsx` | 7 | 70 |
| 4 | Shell and chrome: `App.tsx`, `Sheet.tsx`, `WorkDrawer.tsx`, `Rail.tsx`, `TopBar.tsx`, `hooks.ts`, `components/work`, and the long tail | 17 | 141 |
| 5 | Test files: every viewer `*.test.*` file | 20 | 229 |
| 6 | Comments in viewer source | 42 | 658 |
| 7 | Comments in viewer tests | 20 | 422 |
| | **Total** | | **1,637** |

The export surfaces that stay stable across the splits are the public contracts
of this epic. `model.ts` exports more than 40 names (the `SECTION_KEYS`,
`LEVEL_KEYS`, `Route`, `readRoute`, `routeHref`, and the `*Href` helpers).
`atoms.tsx` exports the shared UI vocabulary (`Chip`, `Panel`, `Box`, `Tile`,
`SectionHeading`, the `toneFor*` helpers). `sections.tsx` exports the seven
section renderers. `App.tsx` exports `ShellApp` and the `Theme` type. Each
split keeps these names and re-exports the moved units.

## 5. The second epic, E2

Epic E2 holds 703 findings in 129 files, in named groups. It has no slices. A
later pass cuts them.

| Group | Findings | Approach |
|---|---|---|
| Duplicated code | 206 | Judge the stack prose copies, then fix the Python and test clusters |
| `cobuilder-memory` type surface | 157 | Type each `any`, or record a deliberate stub, per file |
| Comments outside the viewer | 146 | Apply the per-comment review from epic E1 |
| `cobuilder-memory` structure | 96 | Split by area, as in epic E1 |
| Python scripts and root tests, structure | 71 | Split by area, keeping each script's command line stable |
| Unused imports and variables | 15 | Delete, with the tests as proof |
| Swallowed exceptions | 12 | Narrow each catch, or record a `noqa` with a reason |
| **Total** | **703** | |

## 6. Verdicts, at a glance

| Cluster | Findings | Viewer | Rest | Verdict |
|---|---|---|---|---|
| S Structural | 654 | 487 | 167 | E1 slices 1 to 5, and E2 |
| T Type surface | 171 | 14 | 157 | E1 slices 4 and 5, and E2 |
| H Hygiene | 59 | 44 | 15 | E1 slices 1 to 5, and E2 |
| D Duplicates | 216 | 10 | 206 | E1 slices 1 and 4, and E2 |
| P Python exceptions | 12 | 0 | 12 | E2 |
| C Comment habit | 1,226 | 1,080 | 146 | E1 slices 6 and 7, and E2 |
| R React lint | 2 | 2 | 0 | E1 slices 3 and 4 |
| **Total** | **2,340** | **1,637** | **703** | |

## 7. Recorded residuals

Epic E1 allows one kind of residual finding: an `oversized-function` unit of 13 to 30
lines that is one render unit, or one test case or setup unit. A test reads this table.
It matches a row to a sensor finding by file and unit. The unit is the function name that
the sensor prints, or `@<line>` for an anonymous function. The test also checks that the
sensor reports at most 30 lines for the unit. A slice adds its rows in the same commit as
its code.

| File | Unit | Lines | Why it stays |
|---|---|---|---|
