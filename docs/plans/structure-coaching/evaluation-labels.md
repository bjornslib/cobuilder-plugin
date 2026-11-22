# Structure finding labels

**These are agent labels, not engineer labels.** One agent read the named files and judged each finding. Treat the precision figures as a rough guide, not as a measurement from an engineer.

Labels: `act` is a real cost to fix, `keep` is a real fact with a sound layout, `false` is a fact that does not hold or is no cost here.

All 83 findings of the cobuilder record were labelled. No sampling.

## Replay repositories

Every `on` run holds one finding, `crowded-folder|shop` (25 files, limit 20, no name family). The three `on` records are identical for that finding, so one label covers on-1, on-2, and on-3. The default config was run in a scratch clone of off-1 only: it gives the same single finding. off-2 and off-3 were not run; they came from the same seed.

The `shop` folder holds 25 small modules (3 to 30 lines). 9 files link in one group, 3 in another, and the rest (audit, catalog, events, ids, tags, and others) link to nothing. The count is real but the cost is mild: label `keep`.

| Repo | Key | Signal | Label | Reason |
|---|---|---|---|---|
| on-1 | crowded-folder\|shop | crowded-folder | keep | 25 tiny modules, 1 isolated group of 9; real count, small cost |
| on-2 | crowded-folder\|shop | crowded-folder | keep | 25 tiny modules, 1 isolated group of 9; real count, small cost |
| on-3 | crowded-folder\|shop | crowded-folder | keep | 25 tiny modules, 1 isolated group of 9; real count, small cost |
| off-1 (default config) | crowded-folder\|shop | crowded-folder | keep | 25 tiny modules, 1 isolated group of 9; real count, small cost |

## Repository: cobuilder-plugin at 115427d

| Key | Signal | Label | Reason |
|---|---|---|---|
| crowded-folder\|shared/tracker_port | crowded-folder | act | 40 files, 14 beads_* files; a beads/ subpackage fits |
| name-stem-cluster\|shared/tracker_port\|beads | name-stem-cluster | act | 14 beads_* modules next to 40 files; move into a beads/ package |
| name-stem-cluster\|shared/tracker_port\|fake | name-stem-cluster | keep | 5 fake_* modules form one test double; names are sound |
| name-stem-cluster\|shared/tracker_port\|plan | name-stem-cluster | keep | 4 plan_* modules, one topic; a sub-folder is optional |
| crowded-folder\|shared | crowded-folder | keep | 22 files, 2 over; tracker_port and structure already split out |
| duplicate-group\|plugins/artifact/scripts/export_artifact.py, plugins/artifact/scripts/export_index.py, plu... | duplicate-group | keep | 11 scripts repeat a 69-line git helper block (resolve_repo, detect_default_branch); a file says it is copied so each script runs alone |
| name-stem-cluster\|shared\|tracker | name-stem-cluster | keep | tracker.py plus 3 tracker-*.md docs; one name for one topic |
| crowded-folder\|plugins/artifact/viewer/src/shell | crowded-folder | act | 65 files; about 40 are flat App.*/Pager.*/LevelSections.* test files beside sources |
| twin-name\|app | twin-name | act | src/App.tsx (42 lines) has no importer in src; main.tsx uses shell/App; likely dead twin |
| crowded-folder\|tests | crowded-folder | keep | 199 files in a flat pytest folder; flat is the pytest norm here, and prefixes keep order |
| name-stem-cluster\|tests\|beads | name-stem-cluster | keep | 6 _beads_*_support helpers; prefix is the clear name in a flat tests folder |
| name-stem-cluster\|tests\|migrate | name-stem-cluster | false | 3 files; a 3-file test-helper prefix in a flat tests folder is sound |
| name-stem-cluster\|tests\|tracker | name-stem-cluster | false | 3 files; a 3-file test-helper prefix in a flat tests folder is sound |
| name-stem-cluster\|tests\|viewer | name-stem-cluster | false | 3 files; a 3-file test-helper prefix in a flat tests folder is sound |
| twin-name\|bundle | twin-name | keep | data/bundle.ts and change/levels/bundle.ts differ in role; the other 3 are test fixtures |
| co-change\|plugins/cobuilder-full-lifecycle/commands/install.md, plugins/cobuilder-full-lifecycle/skills/co... | co-change | false | a thin command and its skill; they change together by design |
| name-stem-cluster\|plugins/implement/scripts\|tracker | name-stem-cluster | keep | 4 hook scripts tracker_*; flat script folder, clear names |
| consumer-locality\|plugins/artifact/viewer/src/shell/sections.tsx | consumer-locality | keep | 3 importers, all in panels/; real, but the file holds the section list that panels share and shell/sections/ exists |
| twin-name\|rail | twin-name | false | second file is a test helper in testSupport |
| twin-name\|sections | twin-name | act | 8 files named sections, plus shell/sections/ folder; hard to grep and to open by name |
| boundary-edge\|shared/migrate_bundle.py\|cobuilder-packaging | boundary-edge | keep | real reference to plugin.json from shared; shared is vendored into a plugin, so the boundary file may need an allowance |
| crowded-folder\|plugins/artifact/viewer/src/shell/change | crowded-folder | keep | 22 files, 2 over the limit; Diff and Assessment groups already read as units |
| duplicate-group\|shared/_bundle_meta.py, shared/migrate_bundle.py | duplicate-group | false | only an 8-line plugin.json version read; too small to extract |
| name-stem-cluster\|plugins/artifact/scripts\|export | name-stem-cluster | false | count includes export_artifact.py.lock; only 2 real scripts |
| name-stem-cluster\|plugins/artifact/viewer/src/shell/change\|assessment | name-stem-cluster | keep | 3 Assessment* components; sound family, no cost |
| name-stem-cluster\|plugins/artifact/viewer/src/shell/change\|diff | name-stem-cluster | act | 5 Diff* files in a 22-file folder; a diff/ sub-folder fits (levels/ is the model) |
| twin-name\|config | twin-name | false | two per-package config modules in different packages |
| twin-name\|sheet | twin-name | keep | shadcn ui sheet and the app Sheet; the case and folder differ, mild confusion |
| boundary-edge\|shared/_bundle_meta.py\|cobuilder-packaging | boundary-edge | keep | same plugin.json version read as the other boundary edge; fix the boundary file or the read |
| duplicate-group\|tests/_beads_pr_support.py, tests/_beads_support.py | duplicate-group | false | 6-line fake runner constructor in test support; too small |
| twin-name\|frame | twin-name | keep | app/frame.tsx and change/Frame.tsx hold different parts; names differ only in case |
| twin-name\|hooks | twin-name | false | second file is a testSupport stub |
| twin-name\|joins | twin-name | keep | logic in data/joins.ts and types in data/types/joins.ts; paired by design |
| name-stem-cluster\|shared/skills/mermaid/references\|config | name-stem-cluster | keep | 6 config-*.md reference docs; prefix is a sound doc grouping |
| twin-name\|diff | twin-name | keep | Diff component and the levels/diff model; paired by design |
| twin-name\|pane | twin-name | false | two different plugins; no shared scope |
| twin-name\|records | twin-name | false | two of three are testSupport fixtures |
| consumer-locality\|plugins/artifact/viewer/src/shell/panels/index.ts | consumer-locality | false | a barrel for panels/; its consumer is the app by design |
| crowded-folder\|shared/structure | crowded-folder | keep | 27 files, but repo_* and slice_* prefixes keep the signal modules findable |
| duplicate-group\|shared/structure/boundary.py, shared/structure/slice_edges.py | duplicate-group | false | 5-line list-append tail; no shared concept |
| name-stem-cluster\|shared/structure\|repo | name-stem-cluster | keep | 6 repo_* modules of the whole-repo record; one topic |
| name-stem-cluster\|shared/structure\|slice | name-stem-cluster | keep | 4 slice_* modules of the slice packet; one topic |
| twin-name\|levels | twin-name | keep | change/levels.ts and model/levels.ts; different jobs, one name |
| consumer-locality\|plugins/artifact/viewer/src/shell/app/railKeys.ts | consumer-locality | keep | only app/state imports it; moving it into state/ is cheap and clear |
| duplicate-group\|plugins/implement/scripts/tracker_sync_common.py, shared/tracker_port/sync_state.py | duplicate-group | keep | 9-line flock probe copied across the hook and the port; one change point is better, but the hook is standalone by design |
| generic-name\|plugins/artifact/viewer/src/shell/testSupport/IntentDrawing/helpers.ts | generic-name | false | test helper in a one-feature testSupport folder; folder gives the context |
| name-stem-cluster\|plugins/artifact/viewer/src/shell/app\|level | name-stem-cluster | keep | 3 Level* files in a 20-file folder; mild |
| name-stem-cluster\|plugins/artifact/viewer/src/shell/atoms\|panel | name-stem-cluster | keep | Panel plus model and parts; the usual component split |
| name-stem-cluster\|plugins/artifact/viewer/src/shell/drawer\|deck | name-stem-cluster | keep | 7 deck* files in an 11-file drawer folder; one topic, folder is not crowded |
| name-stem-cluster\|plugins/artifact/viewer/src/shell/model\|rail | name-stem-cluster | keep | 3 rail* model files; clear names |
| name-stem-cluster\|plugins/artifact/viewer/src/shell/sections\|pull | name-stem-cluster | keep | 3 pullRequest* section files; clear names |
| name-stem-cluster\|plugins/artifact/viewer/src/shell/sheet\|adr | name-stem-cluster | keep | 3 Adr* files in a sheet folder; clear names |
| name-stem-cluster\|plugins/pr/scripts\|generate | name-stem-cluster | false | count includes two .lock files; only 2 real scripts |
| twin-name\|blocks | twin-name | keep | atoms/blocks and markdown/blocks hold different block types |
| twin-name\|core | twin-name | false | types/core and state/core; the folder gives the context |
| twin-name\|entities | twin-name | keep | loader in bundle/entities.ts and types in types/entities.ts; paired by design |
| twin-name\|fixtures | twin-name | false | per-feature testSupport fixtures; one name per folder is the pattern |
| twin-name\|gates | twin-name | keep | model/gates.ts and sections/gates.tsx; model and view pair |
| twin-name\|indexload | twin-name | act | two useIndexLoad hooks (app/ and shell/hooks/) that load the same index; merge or rename |
| twin-name\|notes | twin-name | keep | app/notes.tsx and atoms/notes.tsx hold different notes |
| twin-name\|paged.test.helpers | twin-name | false | two test helpers in testSupport folders |
| twin-name\|plan | twin-name | keep | data/works/plan.ts and sections/plan.tsx; model and view pair |
| twin-name\|pullrequests | twin-name | keep | panel and section pair; thin panel file |
| twin-name\|queries | twin-name | false | two testSupport helpers |
| twin-name\|rows | twin-name | keep | data/bundle/rows.ts and readiness/rows.ts hold different rows |
| twin-name\|shipped | twin-name | keep | thin Shipped panel and shipped section; pair by design |
| twin-name\|sources | twin-name | false | one is a testSupport helper |
| duplicate-group\|plugins/architect/scripts/check_design_svg.py, plugins/architect/scripts/check_options_rep... | duplicate-group | false | Result dataclass and main skeleton of two checkers; 6 lines of boilerplate |
| duplicate-group\|shared/tracker_port/beads_claim_next.py, shared/tracker_port/beads_ready.py | duplicate-group | false | only imports and a 4-line main guard match |
| generic-name\|plugins/artifact/viewer/src/lib/utils.ts | generic-name | false | one-line cn helper; shadcn convention |
| generic-name\|plugins/artifact/viewer/src/shell/sections/common.tsx | generic-name | keep | grab-bag of row styles, ScoreChip, and slice badges; a real but mild generic name |
| name-stem-cluster\|plugins/architect/skills/architecture/references/books\|clean | name-stem-cluster | false | a first word of a book or a corpus topic; the files are .mini/.nano variants or unrelated titles, not a name family |
| name-stem-cluster\|plugins/architect/skills/architecture/references/books\|code | name-stem-cluster | false | a first word of a book or a corpus topic; the files are .mini/.nano variants or unrelated titles, not a name family |
| name-stem-cluster\|plugins/architect/skills/architecture/references/books\|designing | name-stem-cluster | false | a first word of a book or a corpus topic; the files are .mini/.nano variants or unrelated titles, not a name family |
| name-stem-cluster\|plugins/architect/skills/architecture/references/books\|domain | name-stem-cluster | false | a first word of a book or a corpus topic; the files are .mini/.nano variants or unrelated titles, not a name family |
| name-stem-cluster\|plugins/architect/skills/architecture/references/books\|implementing | name-stem-cluster | false | a first word of a book or a corpus topic; the files are .mini/.nano variants or unrelated titles, not a name family |
| name-stem-cluster\|plugins/architect/skills/architecture/references/books\|patterns | name-stem-cluster | false | a first word of a book or a corpus topic; the files are .mini/.nano variants or unrelated titles, not a name family |
| name-stem-cluster\|plugins/architect/skills/architecture/references/books\|refactoring | name-stem-cluster | false | a first word of a book or a corpus topic; the files are .mini/.nano variants or unrelated titles, not a name family |
| name-stem-cluster\|plugins/architect/skills/architecture/references/books\|release | name-stem-cluster | false | a first word of a book or a corpus topic; the files are .mini/.nano variants or unrelated titles, not a name family |
| name-stem-cluster\|plugins/architect/skills/architecture/references/books\|working | name-stem-cluster | false | a first word of a book or a corpus topic; the files are .mini/.nano variants or unrelated titles, not a name family |
| name-stem-cluster\|plugins/architect/skills/architecture/references/corpus/principles/ddd\|domain | name-stem-cluster | false | a first word of a book or a corpus topic; the files are .mini/.nano variants or unrelated titles, not a name family |
| name-stem-cluster\|plugins/architect/skills/architecture/references/corpus/principles/design_patterns/gof\|... | name-stem-cluster | false | a first word of a book or a corpus topic; the files are .mini/.nano variants or unrelated titles, not a name family |
| name-stem-cluster\|plugins/architect/skills/architecture/references/corpus/principles/design_patterns/refac... | name-stem-cluster | false | a first word of a book or a corpus topic; the files are .mini/.nano variants or unrelated titles, not a name family |

## Summary by signal (cobuilder 83 plus 4 replay rows)

| Signal | Labelled | act | keep | false | Precision |
|---|---|---|---|---|---|
| boundary-edge | 2 | 0 | 2 | 0 | 1.00 |
| co-change | 1 | 0 | 0 | 1 | 0.00 |
| consumer-locality | 3 | 0 | 2 | 1 | 0.67 |
| crowded-folder | 10 | 2 | 8 | 0 | 1.00 |
| duplicate-group | 7 | 0 | 2 | 5 | 0.29 |
| generic-name | 3 | 0 | 1 | 2 | 0.33 |
| name-stem-cluster | 34 | 2 | 15 | 17 | 0.50 |
| twin-name | 27 | 3 | 14 | 10 | 0.63 |
| ALL | 87 | 7 | 44 | 36 | 0.59 |

The replay rows (4, all crowded-folder, all `keep`) count once each. Without them crowded-folder is 6 labelled.

Precision = (act + keep) / labelled.
