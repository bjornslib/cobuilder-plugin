# Evaluation: structure-coaching (E5, slice 9)

Date: 2026-11-14. Commit of the code under test: `115427d`.

This record holds the replay with the structure signals on and off, the precision of each signal, and the decision against the abort rules of `goal.json`.

## 1. The replay

### Setup

| Fact | Value |
|---|---|
| Seed repo | A small `shop` package with 20 Python files in one folder, at the folder limit of 20. A `payments` context holds the card gateway, and the `shop` boundary record forbids `payments/**`. The seed and the tasks are in `replay/` beside this file |
| Slices | Five tasks: discount codes, tax by region, shipping by weight, invoice text, and the refund of a line. A test file for each task exists before GREEN starts, as RED would write it. The tests import only from the `shop` package root, so the agent chooses where the code goes |
| Builder | `claude -p --agent implement:green`, Haiku, effort max, one session for each slice, with this repo's `implement` plugin and its coach hook |
| Condition on | The default structure config. The coach shows each structure finding once a session |
| Condition off | A structure config that excludes every path, so the coach gives habit-hooks text only |
| Runs | Three runs for each condition, five slices each |
| Follow-on tasks | Two tasks on each result, each in a fresh Haiku session without the coach: stacked discount codes, and a new region. A hidden test decides each one |
| Measures | The follow-on success rate, the largest folder, the duplicate groups, the contract drift with untouched callers, and the boundary edges. `structure_evidence.py --repo` and `--base <seed>` measure the last four |

### Results

| Run | Slices passed | Advice shown (per slice) | Largest folder | Duplicate groups | Silent contract changes | Boundary edges | Follow-on 1 | Follow-on 2 | GREEN time (s) |
|---|---|---|---|---|---|---|---|---|---|
| off-1 | 5 of 5 | 0, 0, 0, 0, 0 | shop 25 | 0 | 0 | 0 | pass | pass | 699 |
| off-2 | 5 of 5 | 0, 0, 0, 0, 0 | shop 25 | 0 | 0 | 0 | pass | pass | 748 |
| off-3 | 5 of 5 | 0, 0, 0, 0, 0 | shop 25 | 0 | 0 | 0 | pass | pass | 694 |
| on-1 | 5 of 5 | 1, 1, 1, 1, 1 | shop 25 | 0 | 0 | 0 | pass | pass | 812 |
| on-2 | 5 of 5 | 1, 1, 1, 1, 1 | shop 25 | 0 | 0 | 0 | pass | pass | 846 |
| on-3 | 5 of 5 | 1, 1, 1, 1, 1 | shop 25 | 0 | 0 | 0 | pass | pass | 718 |

"Advice shown" counts the finding keys in the coach session record of each slice. Each "on" slice got the crowded-folder finding for `shop`.

| Measure | On (mean, range) | Off (mean, range) | Gain |
|---|---|---|---|
| Follow-on success rate | 100% (6 of 6) | 100% (6 of 6) | none |
| Growth of the largest folder | +5 (5 to 5) | +5 (5 to 5) | none |
| New duplicate groups | 0 | 0 | none |
| Silent contract changes | 0 | 0 | none |
| New boundary edges | 0 | 0 | none |

### What GREEN did with the advice

In all 15 "on" slices, the GREEN report names the crowded folder and keeps the flat layout with a reason. That is the "keep, with a reason" choice that the message offers. The reason is nearly always the same: a move would refactor the files of earlier slices, and the GREEN scope contract rules that out. Two examples:

- on-1, slice 3: "Moving modules into sub-folders would change the `shop.cart`, `shop.line`, `shop.tax`, and `shop.discount` paths that earlier slices depend on, which is outside this slice."
- on-2, slice 4: "I kept the flat layout. Whether to split the folder is your call."

No "off" report mentions the folder. The advice reaches GREEN and gets a decision, but GREEN is the wrong role to act on it.

## 2. The precision of each signal

These are agent labels, not engineer labels. One agent read the files of each finding and gave `act`, `keep`, or `false`. Precision is `(act + keep) / labelled`. The labels of this repository and of the replay are in `evaluation-labels.md`. The agencheck labels come from `spike-signals.md`.

| Signal | This repository | Replay | agencheck spike | All three |
|---|---|---|---|---|
| Crowded folder | 6 labelled, 100% | 4 labelled, 100% | 26 labelled, 88% | 36, 92% |
| Name family (name-stem cluster) | 34 labelled, 50% | none | 34 labelled, 53% | 68, 51% |
| Generic name | 3 labelled, 33% | none | 1 labelled, 0% | 4, 25% |
| Boundary edge | 2 labelled, 100% | none | none (no records) | 2, 100% |
| Twin name | 27 labelled, 63% | none | 42 labelled, 55% | 69, 58% |
| Duplicate group | 7 labelled, 29% | none | 15 labelled, 87% | 22, 68% |
| Co-change group | 1 labelled, 0% | none | 14 labelled, 100% | 15, 93% |
| Consumer locality | 3 labelled, 67% | none | 16 labelled, 100% | 19, 95% |
| Contract drift, Python | none (no `--since`) | 0 events | 13 labelled, 100% | 13, 100% |

The false labels in this repository come from three sources. Name families count `.lock` files and book-name stems in the corpus folder. Five of the seven duplicate groups are 5 to 9 lines of boilerplate. Ten twin names are test-support files or files in different plugins.

## 3. The decision against the abort rules

| Rule in `goal.json` `abort_if` | Result | Holds? |
|---|---|---|
| The second runner cannot put a folder signal into the coach message | The coach shows it. Slice 1 and the replay session records show it | No |
| A hand label on three repositories gives each of the three signals a precision below 50%. A single signal below 50% is dropped instead | Crowded folder 92% and name family 51% stay above 50%. Generic name is 25% on 4 labels | No for the whole rule. Yes for the generic name alone |
| The replay shows no rise in the follow-on success rate, and no gain in folder growth, duplication, silent contract changes, or dependencies across a boundary | The follow-on rate is 100% in both conditions, and each of the four secondary measures is equal | Yes |
| The structure work needs a hard block on a write | No step needs a block | No |

**Decision, by the rules as written:**

1. The third abort rule holds. By the rule, the structure work stops here. No structure signal enters a slice score, and E7 and E8 do not start.
2. By the second rule, the generic-name signal is dropped from the coach. Its sample is 4 labels, so the engineer checks those labels before the drop.
3. No scored criterion enters the rubrics. ADR-0048 already keeps each signal outside the score until this decision. That stays.

**Limits of this replay, which the engineer weighs before the stop:**

- The follow-on tasks were too easy. Both conditions passed 12 of 12, so the main measure had no room to rise.
- The seed gave no reason to copy code or to cross the boundary, so three of the four secondary measures were 0 in both conditions.
- GREEN cannot act on the folder advice without a change to earlier slices, which its scope contract forbids. The advice needs a role that may move files: the orchestrator between slices, or the refactor skill of E8.
- The labels are agent labels. The engineer has not checked them.

## 4. Open for the engineer

- Accept the stop, or run a second replay with harder follow-on tasks and a step between slices that may move files.
- Keep or drop the generic-name signal in the coach. Section 5 gives the numbers.

## 5. The engineer check, 2026-11-14

The engineer checked the labels in `label-check.md` and agreed with every label except five.

| Key | Agent label | Engineer label |
|---|---|---|
| `crowded-folder\|tests` | keep | act |
| `crowded-folder\|shared/structure` | keep | act: the folder may grow disorganised |
| `generic-name\|.../shell/sections/common.tsx` | keep | act: rename, and split into files that name their content |
| `duplicate-group\|` 11 scripts with one git helper | keep | act: the reason for the copy is stale |
| `twin-name\|pane` | false | open: the engineer asked whether the folder names are clear |

Each change from keep to act leaves the precision as it is, because both labels count as a real fact. The table in section 2 stands.

The engineer also asked for a filter on test folders. A filter that removes each member under a folder whose name holds `test`, and drops a twin with fewer than two members left, removes 7 of the 27 twin names of this repository. Of those 7, 4 had a label, and all 4 were `false`. It keeps `twin-name\|sections`, which is `act`, at 7 members. The same filter removes the generic name `testSupport/IntentDrawing/helpers.ts`, which is `false`. Generic name then has 1 of 3 labels true, or 33%.

The copy reason of the 11 scripts is stale. `extract_diffs.py` says that it copies the helper so that it runs with no cross-imports. But 10 of the 11 scripts already import from `shared/`, through the `shared` symlink of each plugin.
