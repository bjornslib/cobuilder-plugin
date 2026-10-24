# Findings Catalog: the habit-hooks mechanical smells

This catalog is the record the program `mechanical-smells` and its follow-up
programs read. It holds one scan, the smells it found, the clustering of those
smells, and the verdict for each cluster. A future design that resolves another
cluster opens this file, not a fresh scan.

## 1. The scan

- **Tool:** `habit-sensors` (habit-hooks v1.5.0), the sensor behind
  `shared/habit_smells.py`.
- **Command:** `habit-sensors --all`, run on `feature/beads-mapping` at
  `317e047` on 2026-10-24.
- **State:** run complete. No `incomplete-run` sentinel.
- **Result:** 2,456 findings across 14 smell types and 124 groups.
- **Incremental run:** the canonical wrapper
  `uv run shared/habit_smells.py --repo . --branch master` covers only the 28
  commits ahead of `master` and reports 275 findings. This catalog uses the
  full-tree `--all` run, because the program resolves the standing debt, not the
  recent diff.

The sensor reports two limits per language. The limits the viewer program
adopts:

| Limit | Value | Sensor source |
|---|---|---|
| File lines | 200 | `line-count`, `eslint:max-lines` |
| Function complexity | 10 | `eslint:complexity`, `ruff:C901` |
| Function lines | 12 | `eslint:max-lines-per-function` |
| Function parameters | 3 (TS), 5 (Python) | `eslint:max-params`, `ruff:PLR0913` |

## 2. The smells, with counts

| Smell | Findings | Files | Where it lives |
|---|---|---|---|
| non-essential-comment | 1,283 | 85 | the viewer, 57 non-test, 28 test |
| oversized-function | 518 | 84 | the viewer and cobuilder-memory tests, 56 non-test |
| explicit-any | 159 | 11 | 9 test files in cobuilder-memory |
| oversized-file | 128 | 87 | the viewer shell, 73 non-test |
| duplicated-code | 214 | 60 | jscpd clusters, mostly tests and prose |
| duplicate-import | 45 | 25 | the viewer shell |
| high-complexity | 53 | 39 | the viewer shell and Python scripts |
| too-many-parameters | 15 | 10 | cobuilder-memory hooks and the viewer shell |
| swallowed-exception | 12 | 8 | Python scripts, all `except Exception` |
| non-null-assertion | 12 | 4 | the viewer shell and its tests |
| unused-variable | 8 | 4 | Python tests and scripts |
| unused-import | 7 | 4 | Python tests and scripts |
| jsx-a11y/media-has-caption | 1 | 1 | `shell/InShort.tsx` |
| react-hooks/exhaustive-deps | 1 | 1 | `shell/DiagramTiles.tsx` |

## 3. The clustering

The 14 smells fall into six clusters. Each cluster gets one verdict and one
owner: a program that resolves it, a decision that tunes it, or a deferral.

### Cluster S — Structural (in scope for this program)

`oversized-function` (518), `oversized-file` (128), `high-complexity` (53),
`too-many-parameters` (15). The viewer shell is the focus. Its non-test subset
is 346 findings in about 40 files under `plugins/artifact/viewer/src/shell/`
and `.../data/`. The Python and cobuilder-memory structural findings stay
deferred to a later program.

**Verdict:** resolve. Program `mechanical-smells`, epics E2 to E5.

**The function-line tension.** The 12-line function limit is aggressive for
React. A component of 13 lines is often one atomic render unit, and splitting
it harms readability without lowering its complexity. This program treats the
file limit (200) and the complexity limit (10) as hard, and it treats the
function-line limit as a recorded exception: a residual 13-to-30-line function
stays when it is one unit, and the sensor card tunes to that when the program
closes. This is a decision, recorded here, not a per-file guess.

### Cluster T — Type surface (commissioned next)

`explicit-any` (159), `non-null-assertion` (12). Ninety-eight percent of the
`any` findings sit in the nine cobuilder-memory test files, where `any` is often
a deliberate stub or mock. Two `any` and all 12 non-null assertions sit in the
viewer shell.

**Verdict:** commission. Epic E6 of this program decides the cluster and
authors the program `type-surface-sweep` for it.

### Cluster H — Hygiene (part of this program and next)

`duplicate-import` (45), `unused-import` (7), `unused-variable` (8). The 37
viewer-shell duplicate-imports fall in epic E5. The 8 remaining duplicate-imports
and all 15 unused findings are Python, and they fall in the next program.

**Verdict:** resolve the shell part now; defer the Python part to
`type-surface-sweep` or a later hygiene program.

### Cluster D — Duplicates (deferred)

`duplicated-code` (214). The jscpd clusters are small, two files each. Most sit
in test support (`_beads_*_support.py`, the cobuilder-memory tests) and in the
stack reference prose (`references/stacks/*.md`), which two plugin families
vendor the same text by design (ADR-0017).

**Verdict:** defer. A real de-duplication program must separate the
vendored-prose duplicates, which are intended, from the genuine code
duplicates. That judgment is its own design.

### Cluster P — Python exceptions (decision, deferred)

`swallowed-exception` (12), all `except Exception` (ruff BLE001). A site review
shows most are graceful degradation: `shared/_manifest.py` warns and falls back
to an empty list; `shared/validate_decision_state.py` returns an empty list when
the optional STE linter is absent; `.claude/hooks/deny-git-stash.py` exits 0 on
unparseable stdin. These are not bugs.

**Verdict:** defer as a decision. A later program narrows each catch to the
exception it means, or records a `noqa` with a reason where the broad catch is
right. This is a per-site judgment, not a mechanical pass.

### Cluster R — React lint (folded into this program)

`jsx-a11y/media-has-caption` (1, `shell/InShort.tsx`) and
`react-hooks/exhaustive-deps` (1, `shell/DiagramTiles.tsx`). Two single-site
findings in files this program already touches.

**Verdict:** resolve in epic E5, alongside the shell splits.

### Cluster C — Comment habit (decision, deferred)

`non-essential-comment` (1,283). The sensor flags a large share of the
viewer's `//` comments as non-essential. This is a habit about comment density,
not a defect in the code it comments.

**Verdict:** defer as a decision. The repo's writing culture (ste-writing,
`CLAUDE.md`) values explanation. A later decision answers whether the sensor
card for the viewer should tune the check, snooze it, or the comments should
shrink. No program deletes 1,283 comments on the strength of this scan.

## 4. The viewer-shell subset (this program's scope)

The 346 findings the program resolves, by file, top 12:

| Findings | File | Smells |
|---|---|---|
| 29 | `shell/sections.tsx` | 20 oversized-fn, 3 complex, 4 dup-import |
| 24 | `shell/App.tsx` | 11 oversized-fn, 7 dup-import, 2 non-null |
| 22 | `shell/Sheet.tsx` | 16 oversized-fn, 2 complex, 2 dup-import |
| 22 | `components/ui/sidebar.tsx` | 19 oversized-fn, 1 complex |
| 21 | `shell/atoms.tsx` | 16 oversized-fn, 2 dup-import |
| 18 | `shell/WorkDrawer.tsx` | 12 oversized-fn, 2 complex |
| 16 | `shell/model.ts` | 8 oversized-fn, 3 complex, 2 params |
| 14 | `shell/hooks.ts` | 8 oversized-fn, 4 dup-import |
| 14 | `shell/change/levels.ts` | 8 oversized-fn, 2 complex, 1 param |
| 14 | `data/bundle.ts` | 11 oversized-fn, 1 param |
| 13 | `shell/DiagramTiles.tsx` | 10 oversized-fn, 1 react-hooks |
| 12 | `shell/change/sections.tsx` | 6 oversized-fn, 3 dup-import |

The export surfaces that stay stable across the splits are the public
contracts of this program. `model.ts` exports 30+ names (the `SECTION_KEYS`,
`LEVEL_KEYS`, `Route`, `readRoute`, `routeHref`, and the `*Href` helpers).
`atoms.tsx` exports the shared UI vocabulary (`Chip`, `Panel`, `Box`, `Tile`,
`SectionHeading`, the `toneFor*` helpers). `sections.tsx` exports the seven
section renderers. `App.tsx` exports `ShellApp` and the `Theme` type. Each
split keeps these names and re-exports the moved units.

## 5. Verdicts, at a glance

| Cluster | Smells | Findings | Verdict | Owner |
|---|---|---|---|---|
| S Structural | oversized-fn, oversized-file, high-complexity, too-many-params | 708 | resolve now | `mechanical-smells` E2-E5 |
| T Type surface | explicit-any, non-null-assertion | 171 | commission | `mechanical-smells` E6 |
| H Hygiene | duplicate-import, unused-import, unused-variable | 60 | split | E5 shell / next Python |
| D Duplicates | duplicated-code | 214 | defer | a later program |
| P Python exceptions | swallowed-exception | 12 | defer, decide | a later program |
| C Comment habit | non-essential-comment | 1,283 | defer, decide | a later decision |
| R React lint | jsx-a11y, react-hooks | 2 | resolve | E5 |
