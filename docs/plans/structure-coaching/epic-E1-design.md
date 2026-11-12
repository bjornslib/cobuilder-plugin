# Epic Technical Solution Design: E1 — Structure signals

Feature: structure-coaching
Epic ID: E1

## Scope and Intent

E1 builds `shared/structure_signals.py`, the one source of the three signals. Slice 1 is also the spike. It proves that a second runner in the coach can carry a folder signal to GREEN. If it cannot, the first abort rule of the design applies, and the work stops. E1 does not apply the approved wording. Slice 1 uses a plain text that slice 4 replaces.

The script reports facts. It does not judge them. GREEN reads the facts as advice, and VALIDATE judges them in the Structure block (E4).

## Files Touched

- `shared/structure_signals.py` (new)
- `plugins/implement/scripts/structure_runner.py` (new, a plain `run` only in slice 1)
- `plugins/implement/scripts/habit_coach.py` (the second runner call)
- `tests/test_structure_signals.py` (new)
- `tests/test_habit_coach.py` (one new case for the joined text)

## Types & Signatures

As in `03-program-design.md`. Slice 1 adds `Config` with its defaults, `Finding`, `Report`, `repo_files`, `new_files`, `folder_counts`, `folder_limit`, `crowded_folder`, and `signals_for`, and a plain `structure_runner.run`. Slice 2 adds `split_tokens`, `is_test_name`, `stem_cluster`, `generic_name`, `excluded_by`, `load_config`, and `main`.

## Algorithms

Each step below names the rule, the default value, and the evidence for the default. The evidence is a count on this repo at commit `b860c01`, with the default excluded paths. No default has a source outside this repo. E5 calibrates each one.

### A1. The file list

1. `repo_files(root)` runs `git ls-files -z --cached --others --exclude-standard` once. The result holds each tracked file and each untracked file that `.gitignore` does not hide.
2. `excluded_by(path, config)` returns the first glob of `excluded_paths` that matches the path, or `None`. It uses `fnmatch.fnmatchcase`. A glob that starts with `**/` also matches the path with that part removed, so `**/fixtures/**` matches `fixtures/a.json` at the root.
3. The script drops each excluded file from the list. For each glob that matched, `Report.not_analysed` gets one line: the glob and the count of files it removed.

Default `excluded_paths`: `.*/**`, `docs/**`, `**/fixtures/**`, `**/__snapshots__/**`, `**/migrations/**`, `**/vendor/**`, `**/generated/**`. On this repo the first three globs remove 292, 426, and 209 files. The list keeps 1,028 files in 143 folders.

### A2. The new-file rule (the ratchet)

`new_files(root)` returns the union of three sets:

| Set | Command | Note |
|---|---|---|
| Untracked | `git ls-files -z --others --exclude-standard` | A file that GREEN wrote and did not stage. |
| Staged as added | `git diff -z --cached --name-only --no-renames --diff-filter=A` | `--no-renames` makes a rename target an added file. |
| Added on the branch | `git diff -z --name-only --no-renames --diff-filter=A <merge-base> HEAD` | Only when a merge-base exists. |

The merge-base is `git merge-base HEAD <default>`. The default branch is the target of `refs/remotes/origin/HEAD`. When that ref is absent, the script tries `main`, then `master`. When none exists, the third set is empty. On the default branch itself, the merge-base is `HEAD`, so the third set is also empty.

A file that is not in `new_files` gets no finding. An edit to an old file gives no signal, also in a crowded folder.

Cost on this repo: the four git calls take about 130 ms. The file list takes about 50 ms. The spike records the time for one real write.

### A3. The folder limit

1. `folder_counts(files)` counts the files whose parent folder is exactly that folder. A file in a sub-folder does not count for the parent. The root folder is `.`.
2. The percentile value uses the nearest rank. Sort the counts of all folders that hold one file or more. The value is the count at position `ceil(p / 100 × n)`, counted from 1.
3. `folder_limit` returns the larger of `folder_limit` from the config and the percentile value.
4. When fewer than `min_folders` folders hold files, the script does not use the percentile. With no `folder_limit` either, the crowded-folder signal does not run, and `not_analysed` says why.

| Setting | Default | Evidence on this repo |
|---|---|---|
| `percentile` | 90 | p75 is 8, p90 is 13, p95 is 22 |
| `folder_limit` | 15 | 11 folders have more than 15 files. Six hold code: `tests` (179), `plugins/artifact/viewer/src/shell` (65), `shared/tracker_port` (40), `.../shell/change` (22), `.../shell/app` (19), and `shared` (19). Five hold reference text, such as `references/books` (41). |
| `min_folders` | 10 | A guess. A repo with fewer folders gives a weak percentile. |

### A4. Signal 1: a crowded folder

The signal fires when the written file is new, and its folder has more files than the limit. The written file counts.

`Finding.facts`: `count`, `limit`, and `groups`. `groups` names the three largest first-token groups in the folder, from A5, such as `beads (14), fake (5), plan (4)` for `shared/tracker_port`. A group gives GREEN a named choice for a new sub-folder, and the research found that a named choice works better than a bare number.

### A5. The token split

`split_tokens(stem)` turns a file stem into lower-case tokens.

1. The stem is the file name without its last suffix. `foo.test.ts` gives `foo.test`.
2. Split the stem on each run of `_`, `-`, `.`, or white space.
3. Split each part on case changes with the pattern `[A-Z]+(?=[A-Z][a-z])|[A-Z]?[a-z]+|[A-Z]+|\d+`.
4. Make each token lower case.

| Stem | Tokens |
|---|---|
| `beads_claim_next` | beads, claim, next |
| `tracker-usage` | tracker, usage |
| `IntentDrawing` | intent, drawing |
| `HTTPServerError` | http, server, error |
| `foo.test` | foo, test |

`is_test_name(name)` is true when the stem starts with a `test_prefixes` entry, or ends with a `test_suffixes` entry. The defaults are `test_` and `test-`, and `.test`, `.spec`, and `_test`. They cover `test_x.py`, `x.test.ts`, `x.spec.ts`, and `x_test.go`.

### A6. Signal 2: a name-stem cluster

1. The written file must be new, and not a test name.
2. The first token of the written file is the stem. The script stops when the stem is in `excluded_stems`, or is all digits.
3. The siblings are the files in the same folder, the written file included, that are not test names and have the same first token.
4. The signal fires when the siblings number `cluster_min` or more, and no sub-folder of that folder has a name whose tokens are exactly `[stem]`.

`Finding.facts`: `stem`, `count`, and `examples`, which lists up to five sibling names in sort order.

| Setting | Default | Evidence on this repo |
|---|---|---|
| `cluster_min` | 3 | `shared/tracker_port` holds 14 `beads*` files and 5 `fake*` files. `plugins/implement/scripts` holds 4 `tracker*` files. |
| `excluded_stems` | `a`, `an`, `the`, `index`, `main`, `init` | Without them, `references/books` gives clusters on `a` and `the`. |

The rule compares the first token only, as ADR-0048 decision 2 says. A folder such as `tracker_port` does not stop a `tracker` cluster, because its tokens are `tracker` and `port`.

### A7. Signal 3: a generic name

The signal fires when the written file is new and is not a test name, and its stem is in `generic_names`. The match ignores case and a leading `_`.

`Finding.facts`: `stem`.

Default `generic_names`: `utils`, `util`, `helpers`, `helper`, `common`, `misc`, `manager`, `base`. On this repo three files match: `viewer/src/lib/utils.ts`, `sections/common.tsx`, and `IntentDrawing/helpers.ts`. The first is a shadcn/ui convention, so E5 may label it a false signal.

The list comes from the config only. ADR-0048 decision 2 says that the list starts from the `_Avoid_` terms of `DDD-VOCABULARY.md`. Those terms are rejected synonyms for one concept, not generic names. On this repo they include `reader`, `issue`, `connector`, and `bd`, and `shared/tracker_port/reader.py` would give a false signal. The engineer decides this point before slice 2 starts.

### A8. The report and the command

`signals_for(path, root, config)` runs the steps in this order, and stops at the first step that gives no work:

1. Make the path relative to the resolved git root.
2. When the path is excluded, return no findings, and name the path and its glob in `not_analysed`.
3. When the path is not in `new_files`, return no findings.
4. Run the three signals in this order: crowded folder, name-stem cluster, generic name.

A git error or a bad config never raises. The script returns no findings, and `not_analysed` names the error. The coach stays silent in that case, and VALIDATE sees the reason.

`main(argv)` prints a JSON report and returns 0. It returns 2 for a usage error.

| Option | Output | User |
|---|---|---|
| `--file <path>`, repeatable | The findings and `not_analysed` for each file | VALIDATE, with the new files of the slice diff |
| `--survey` | Each folder over the limit, with its count | The install step (slice 5) |
| `--defaults` | The default config as JSON | The install step (slice 5) |

The output has the keys `findings` and `not_analysed`. Each finding has the keys `signal`, `path`, `folder`, and `facts`.

## Slice Decomposition

1. **Slice 1, the tracer bullet.** Depends on nothing. A1 to A4 with the defaults in code, and A8 steps 1, 3, and 4 for one signal. Ends with a real coach message for a crowded folder.
2. **Slice 2.** Depends on slice 1. A5 to A7, the excluded paths of A1, the config file, and the command of A8. Ends with all three signals, the config, and `not_analysed` on synthetic trees.

## Test Plan

All cases use a `tmp_path` git repo with a synthetic tree. No case reads this repo.

- Slice 1: a new file in a folder over the limit gives a finding with `count` and `limit`. A folder at the limit gives none. An old file in a crowded folder gives none. An untracked, a staged, and a branch-added file each count as new. A repo with no merge-base counts untracked and staged files. A repo with fewer than `min_folders` folders and no `folder_limit` gives no crowded finding and a `not_analysed` line. A `test_habit_coach.py` case shows the joined text with a fake habit-hooks runner. The spike transcript is the evidence that the real hook delivers the text.
- Slice 2: `split_tokens` for the five stems in the A5 table. `is_test_name` for the four test forms. A cluster of three new siblings. No cluster of two. No cluster when a sub-folder named for the stem exists. No cluster of test files. No cluster on an excluded stem. A generic name with a leading `_`. A custom config that changes each limit. A missing config and a bad config give the defaults, and the bad config gives a `not_analysed` line. An excluded path names its glob. `--file`, `--survey`, and `--defaults` each print JSON that `json.loads` reads.

## Risks & Open Questions

- The generic-name source. The design follows the config only, and ADR-0048 says the `_Avoid_` terms. The engineer decides.
- The percentile on a repo with few folders. `min_folders` is a guess.
- A cluster can mix code and text files, such as `shared/tracker.py` and three `tracker-*.md` files. E5 labels these.
- The Java, PHP, and Ruby suffix habit, as in `UserService` and `UserRepository`, gives clusters on `user`. `excluded_stems` can silence a stem.
- The symlink import path in a cache install.
