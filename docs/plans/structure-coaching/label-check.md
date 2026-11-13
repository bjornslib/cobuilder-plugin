# Label check for the engineer

This checklist samples up to 10 agent labels for each structure signal from `evaluation-labels.md`, the labels of this repository at commit 115427d. The done list of `goal.json` asks the engineer to check 10 labels for each signal. The agencheck labels are in the section "For the engineer to check" of `spike-signals.md`.

Labels: `act` is a real cost to fix, `keep` is a real fact with a sound layout, and `false` is a fact that does not hold or is no cost here. Write your label in the last column only when you disagree.

## crowded-folder (6 of 6)

| Key | Agent label | Reason | Your label |
|---|---|---|---|
| shared/tracker_port | act | 40 files, 14 beads_* files; a beads/ subpackage fits |  |
| plugins/artifact/viewer/src/shell | act | 65 files; about 40 are flat App.*/Pager.*/LevelSections.* test files beside sources |  |
| shared | keep | 22 files, 2 over; tracker_port and structure already split out |  |
| tests | keep | 199 files in a flat pytest folder; flat is the pytest norm here, and prefixes keep order |  |
| plugins/artifact/viewer/src/shell/change | keep | 22 files, 2 over the limit; Diff and Assessment groups already read as units |  |
| shared/structure | keep | 27 files, but repo_* and slice_* prefixes keep the signal modules findable |  |

## name-stem-cluster (1 of 1)

| Key | Agent label | Reason | Your label |
|---|---|---|---|
| plugins/architect/skills/architecture/references/corpus/principles/design_patterns/refac... | false | a first word of a book or a corpus topic; the files are .mini/.nano variants or unrelated titles, not a name family |  |

## generic-name (3 of 3)

| Key | Agent label | Reason | Your label |
|---|---|---|---|
| plugins/artifact/viewer/src/shell/testSupport/IntentDrawing/helpers.ts | false | test helper in a one-feature testSupport folder; folder gives the context |  |
| plugins/artifact/viewer/src/lib/utils.ts | false | one-line cn helper; shadcn convention |  |
| plugins/artifact/viewer/src/shell/sections/common.tsx | keep | grab-bag of row styles, ScoreChip, and slice badges; a real but mild generic name |  |

## boundary-edge (0 of 0)

| Key | Agent label | Reason | Your label |
|---|---|---|---|

## twin-name (10 of 27)

| Key | Agent label | Reason | Your label |
|---|---|---|---|
| app | act | src/App.tsx (42 lines) has no importer in src; main.tsx uses shell/App; likely dead twin |  |
| sections | act | 8 files named sections, plus shell/sections/ folder; hard to grep and to open by name |  |
| indexload | act | two useIndexLoad hooks (app/ and shell/hooks/) that load the same index; merge or rename |  |
| rail | false | second file is a test helper in testSupport |  |
| config | false | two per-package config modules in different packages |  |
| hooks | false | second file is a testSupport stub |  |
| pane | false | two different plugins; no shared scope |  |
| records | false | two of three are testSupport fixtures |  |
| core | false | types/core and state/core; the folder gives the context |  |
| fixtures | false | per-feature testSupport fixtures; one name per folder is the pattern |  |

## duplicate-group (7 of 7)

| Key | Agent label | Reason | Your label |
|---|---|---|---|
| shared/_bundle_meta.py, shared/migrate_bundle.py | false | only an 8-line plugin.json version read; too small to extract |  |
| tests/_beads_pr_support.py, tests/_beads_support.py | false | 6-line fake runner constructor in test support; too small |  |
| shared/structure/boundary.py, shared/structure/slice_edges.py | false | 5-line list-append tail; no shared concept |  |
| plugins/architect/scripts/check_design_svg.py, plugins/architect/scripts/check_options_rep... | false | Result dataclass and main skeleton of two checkers; 6 lines of boilerplate |  |
| shared/tracker_port/beads_claim_next.py, shared/tracker_port/beads_ready.py | false | only imports and a 4-line main guard match |  |
| plugins/artifact/scripts/export_artifact.py, plugins/artifact/scripts/export_index.py, plu... | keep | 11 scripts repeat a 69-line git helper block (resolve_repo, detect_default_branch); a file says it is copied so each script runs alone |  |
| plugins/implement/scripts/tracker_sync_common.py, shared/tracker_port/sync_state.py | keep | 9-line flock probe copied across the hook and the port; one change point is better, but the hook is standalone by design |  |

## co-change (1 of 1)

| Key | Agent label | Reason | Your label |
|---|---|---|---|
| plugins/cobuilder-full-lifecycle/commands/install.md, plugins/cobuilder-full-lifecycle/skills/co... | false | a thin command and its skill; they change together by design |  |

## consumer-locality (3 of 3)

| Key | Agent label | Reason | Your label |
|---|---|---|---|
| plugins/artifact/viewer/src/shell/panels/index.ts | false | a barrel for panels/; its consumer is the app by design |  |
| plugins/artifact/viewer/src/shell/sections.tsx | keep | 3 importers, all in panels/; real, but the file holds the section list that panels share and shell/sections/ exists |  |
| plugins/artifact/viewer/src/shell/app/railKeys.ts | keep | only app/state imports it; moving it into state/ is cheap and clear |  |
