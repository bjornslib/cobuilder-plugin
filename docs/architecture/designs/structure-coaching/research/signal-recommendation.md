# Structure signals: what to include

Date: 2026-11-12. Source: `algorithm-proposal.md` (Fable 5.2), filtered after the engineer's answers.

## Answers recorded

| # | Question | Answer |
|---|---|---|
| 1 | A small boundary check now, before E7 | Yes |
| 2 | Ratchet: new files for the coach, the slice diff for VALIDATE | Yes |
| 3 | Amend ADR-0048 decision 2: `_Avoid_` words are leads, and the vocabulary agent judges | Yes |
| 4 | tree-sitter and PyYAML in the VALIDATE script only | Yes |
| 5 | E4 grows to three slices | Yes |
| 6 | Count only non-test files for a crowded folder | No. The count keeps every file that is not excluded |

## Two views

The engineer pointed out that the proposal looks at the change only. That holds for GREEN and VALIDATE. It does not hold for review mode and maintenance mode, which must read the whole repository. A later `/architect:refactor` skill reads the whole-repository findings and plans refactor work from them.

| View | Who reads it | Scope | Ratchet |
|---|---|---|---|
| Change view | GREEN through the coach, VALIDATE, the vocabulary agent | One written file, or the slice diff | Yes |
| Whole-repository view | Review mode, maintenance mode, and later `/architect:refactor` | Every file that is not excluded | No. Findings are ranked by the change count of the last 90 days |

Each signal uses one algorithm in both views. Only the input set changes.

## The include list

Status values: **Build** means the plan gets slices now. **Spike** means a throwaway version runs on a second repository first, and the result decides. **Review only** means E6. **Drop** means not built.

| # | Signal | Change view | Whole-repository view | Status | Evidence on this repo |
|---|---|---|---|---|---|
| 1 | Contract drift, Python (`ast`) | VALIDATE | Maintenance: drift since the last report | Build | 35 events in 250 commits after the move filter |
| 1b | Contract drift, TypeScript (tree-sitter) | VALIDATE | As above | Spike | Name-level drift found 0 real events. A parser is needed |
| 2 | Missing co-change partner | VALIDATE | Files that change together but live apart | Spike | 51 warnings in 218 commits. 39% changed within 5 commits, base rate 10% |
| 3 | Boundary edge | Coach and VALIDATE | Every edge against `boundary.yaml` | Build | 9 path strings. 6 match smells that the records already name |
| 4 | Duplicated code | VALIDATE | Every clone pair | Spike | 50 file pairs. One real 63-line clone. Script preambles give false hits |
| 5 | Twin name | Coach | Every twin pair | Spike | 29 files. About 1 in 4 is real |
| 6 | Crowded folder with groups | Coach | Every folder over the limit, with its groups | Build | Counts all files, as answer 6 says |
| 7 | Name family and generic name | Coach | Every family and generic name | Build | 60 and 1 |
| 8 | Consumer locality | VALIDATE, as evidence | Every file used from one other folder only | Spike | 6 at HEAD. About 1 in 3 is real |
| 9 | Folder table (Cluster Factor, instability) and change-count order | No | Review and maintenance, with trend | Review only | No fixed limit. A low value is a lead, not a finding |
| 10 | Vocabulary leads from the glossary | The vocabulary agent | Review mode vocabulary check | Build | A plain `_Avoid_` match gave 25 hits and 0 real ones, so a lead is not a finding |

## Dropped

| Candidate | Reason from the data |
|---|---|
| Placement score (which folder a file belongs to) | The own folder was the best match for 47% of files by imports and 35% by name tokens |
| Dependency direction between folders | All 11 flagged pairs were a parent folder that imports its own child |
| Cluster Factor limit of 0.25 as a finding | 4 of 7 flagged folders were false. Kept as a review table without a limit |
| `_Avoid_` match as a finding | 0 of 25. Kept as a lead for the vocabulary agent |
| DIOE, the Hotspot Priority Score, the fixed thresholds | No source found |
| The reference engine in the research spec | It loses about 500 of 629 Python edges and misses the `@/` alias |

## The spike

The spike tests the five Spike rows on a repository other than this one: `~/Documents/Windsurf/zenagent/agencheck`.

| Fact about agencheck | Value |
|---|---|
| Commits without merges | 3,312 |
| Tracked files | 5,432 |
| Code files | 1,090 `.py`, 391 `.tsx`, 284 `.ts` |
| `boundary.yaml` records | None found |
| `DDD-VOCABULARY.md` | None found |
| Checked-out branch | `claude/verifier-callback-page-zOulU`, last commit 2026-04-13 |

Steps:

1. Build each Spike signal as a throwaway script, from the scratch scripts of the proposal.
2. Run each one on agencheck at its default branch. Read only. Treat the files of the last ten merged pull requests as new.
3. Label 30 findings for each signal, or all when fewer exist: `act`, `keep`, or `false`. An agent labels. The engineer checks 10 for each signal.
4. Keep a signal when its precision, `(act + keep) / all`, is 50% or more, and it has one `act` or more. This is the 50% bar of the abort rule in `goal.json`.
5. Also run the Build signals that need no record, to show that they work outside this repo.
6. Write the result to `docs/plans/structure-coaching/spike-signals.md`.

Boundary edges and vocabulary leads cannot run on agencheck, because it has no boundary records and no glossary.

## Epic changes

| Epic | Change |
|---|---|
| E1 | Signals 3, 6, and 7 for the coach. A new slice, the signal spike, comes after slice 1. |
| E2 | Messages for signals 3, 6, and 7, and for signal 5 if the spike keeps it. |
| E4 | Three slices: the evidence packet with Python drift. Then boundary edges and each kept spike signal. Then the Structure block and the hand-over to the vocabulary agent. |
| E6 | The whole-repository view of each kept signal, and the folder table. One findings file with a fixed schema. |
| E7 | Smaller: the diagram and more languages. The parser core arrives in E1 and E4. |
| E8 (new, backlog) | `/architect:refactor` reads the E6 findings file and plans refactor slices. |

## Open items

- Each label and precision value in the proposal is a first estimate by Fable, from one repository.
- The figures 83.3%, 28.9%, 5.6%, and the odds ratio 1.83 were not checked again.
- agencheck is checked out on a branch from April 2026. The spike reads the default branch.
