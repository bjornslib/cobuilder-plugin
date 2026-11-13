# Label check for the engineer

This checklist samples up to 10 agent labels for each structure signal from `evaluation-labels.md`. The labels cover this repository at commit 115427d. The done list of `goal.json` asks the engineer to check 10 labels for each signal. The agencheck labels are in the section "For the engineer to check" of `spike-signals.md`.

Labels: `act` is a real cost to fix, `keep` is a real fact with a sound layout, and `false` is a fact that does not hold or is no cost here. Write your label in the last column only when you disagree.

## crowded-folder: 7 of 7 labels

| Key | Agent label | Reason | Your label |
|---|---|---|---|
| crowded-folder\|shared/tracker_port | act | 40 files, 14 beads_* files; a beads/ subpackage fits |  |
| crowded-folder\|plugins/artifact/viewer/src/shell | act | 65 files; about 40 are flat App.*/Pager.*/LevelSections.* test files beside sources |  |
| crowded-folder\|shop | keep | 25 tiny modules, 1 isolated group of 9; real count, small cost |  |
| crowded-folder\|shared | keep | 22 files, 2 over; tracker_port and structure already split out |  |
| crowded-folder\|tests | keep | 199 files in a flat pytest folder; flat is the pytest norm here, and prefixes keep order |  |
| crowded-folder\|plugins/artifact/viewer/src/shell/change | keep | 22 files, 2 over the limit; Diff and Assessment groups already read as units |  |
| crowded-folder\|shared/structure | keep | 27 files, but repo_* and slice_* prefixes keep the signal modules findable |  |

## name-stem-cluster: 10 of 34 labels

| Key | Agent label | Reason | Your label |
|---|---|---|---|
| name-stem-cluster\|shared/tracker_port\|beads | act | 14 beads_* modules next to 40 files; move into a beads/ package |  |
| name-stem-cluster\|plugins/artifact/viewer/src/shell/change\|diff | act | 5 Diff* files in a 22-file folder; a diff/ sub-folder fits (levels/ is the model) |  |
| name-stem-cluster\|tests\|migrate | false | 3 files; a 3-file test-helper prefix in a flat tests folder is sound |  |
| name-stem-cluster\|tests\|tracker | false | 3 files; a 3-file test-helper prefix in a flat tests folder is sound |  |
| name-stem-cluster\|tests\|viewer | false | 3 files; a 3-file test-helper prefix in a flat tests folder is sound |  |
| name-stem-cluster\|plugins/artifact/scripts\|export | false | count includes export_artifact.py.lock; only 2 real scripts |  |
| name-stem-cluster\|plugins/pr/scripts\|generate | false | count includes two .lock files; only 2 real scripts |  |
| name-stem-cluster\|plugins/architect/skills/architecture/references/books\|clean | false | a first word of a book or a corpus topic; the files are .mini/.nano variants or unrelated titles, not a name family |  |
| name-stem-cluster\|plugins/architect/skills/architecture/references/books\|code | false | a first word of a book or a corpus topic; the files are .mini/.nano variants or unrelated titles, not a name family |  |
| name-stem-cluster\|plugins/architect/skills/architecture/references/books\|designing | false | a first word of a book or a corpus topic; the files are .mini/.nano variants or unrelated titles, not a name family |  |

## generic-name: 3 of 3 labels

| Key | Agent label | Reason | Your label |
|---|---|---|---|
| generic-name\|plugins/artifact/viewer/src/shell/testSupport/IntentDrawing/helpers.ts | false | test helper in a one-feature testSupport folder; folder gives the context |  |
| generic-name\|plugins/artifact/viewer/src/lib/utils.ts | false | one-line cn helper; shadcn convention |  |
| generic-name\|plugins/artifact/viewer/src/shell/sections/common.tsx | keep | grab-bag of row styles, ScoreChip, and slice badges; a real but mild generic name |  |

## boundary-edge: 2 of 2 labels

| Key | Agent label | Reason | Your label |
|---|---|---|---|
| boundary-edge\|shared/migrate_bundle.py\|cobuilder-packaging | keep | real reference to plugin.json from shared; shared is vendored into a plugin, so the boundary file may need an allowance |  |
| boundary-edge\|shared/_bundle_meta.py\|cobuilder-packaging | keep | same plugin.json version read as the other boundary edge; fix the boundary file or the read |  |

## twin-name: 10 of 27 labels

| Key | Agent label | Reason | Your label |
|---|---|---|---|
| twin-name\|app | act | src/App.tsx (42 lines) has no importer in src; main.tsx uses shell/App; likely dead twin |  |
| twin-name\|sections | act | 8 files named sections, plus shell/sections/ folder; hard to grep and to open by name |  |
| twin-name\|indexload | act | two useIndexLoad hooks (app/ and shell/hooks/) that load the same index; merge or rename |  |
| twin-name\|rail | false | second file is a test helper in testSupport |  |
| twin-name\|config | false | two per-package config modules in different packages |  |
| twin-name\|hooks | false | second file is a testSupport stub |  |
| twin-name\|pane | false | two different plugins; no shared scope |  |
| twin-name\|records | false | two of three are testSupport fixtures |  |
| twin-name\|core | false | types/core and state/core; the folder gives the context |  |
| twin-name\|fixtures | false | per-feature testSupport fixtures; one name per folder is the pattern |  |

## duplicate-group: 7 of 7 labels

| Key | Agent label | Reason | Your label |
|---|---|---|---|
| duplicate-group\|shared/_bundle_meta.py, shared/migrate_bundle.py | false | only an 8-line plugin.json version read; too small to extract |  |
| duplicate-group\|tests/_beads_pr_support.py, tests/_beads_support.py | false | 6-line fake runner constructor in test support; too small |  |
| duplicate-group\|shared/structure/boundary.py, shared/structure/slice_edges.py | false | 5-line list-append tail; no shared concept |  |
| duplicate-group\|plugins/architect/scripts/check_design_svg.py, plugins/architect/scripts/check_options_rep... | false | Result dataclass and main skeleton of two checkers; 6 lines of boilerplate |  |
| duplicate-group\|shared/tracker_port/beads_claim_next.py, shared/tracker_port/beads_ready.py | false | only imports and a 4-line main guard match |  |
| duplicate-group\|plugins/artifact/scripts/export_artifact.py, plugins/artifact/scripts/export_index.py, plu... | keep | 11 scripts repeat a 69-line git helper block (resolve_repo, detect_default_branch); a file says it is copied so each script runs alone |  |
| duplicate-group\|plugins/implement/scripts/tracker_sync_common.py, shared/tracker_port/sync_state.py | keep | 9-line flock probe copied across the hook and the port; one change point is better, but the hook is standalone by design |  |

## co-change: 1 of 1 labels

| Key | Agent label | Reason | Your label |
|---|---|---|---|
| co-change\|plugins/cobuilder-full-lifecycle/commands/install.md, plugins/cobuilder-full-lifecycle/skills/co... | false | a thin command and its skill; they change together by design |  |

## consumer-locality: 3 of 3 labels

| Key | Agent label | Reason | Your label |
|---|---|---|---|
| consumer-locality\|plugins/artifact/viewer/src/shell/panels/index.ts | false | a barrel for panels/; its consumer is the app by design |  |
| consumer-locality\|plugins/artifact/viewer/src/shell/sections.tsx | keep | 3 importers, all in panels/; real, but the file holds the section list that panels share and shell/sections/ exists |  |
| consumer-locality\|plugins/artifact/viewer/src/shell/app/railKeys.ts | keep | only app/state imports it; moving it into state/ is cheap and clear |  |
