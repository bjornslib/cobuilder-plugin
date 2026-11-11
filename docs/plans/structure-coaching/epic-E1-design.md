# Epic Technical Solution Design: E1 — Structure signals

Feature: structure-coaching
Epic ID: E1

## Scope and Intent

E1 builds `shared/structure_signals.py`, the one source of the three signals. Slice 1 is also the spike. It proves that a second runner in the coach can carry a folder signal to GREEN. If it cannot, the first abort rule of the design applies, and the work stops. E1 does not apply the approved wording. Slice 1 uses a plain text that slice 4 replaces.

## Files Touched

- `shared/structure_signals.py` (new)
- `plugins/implement/scripts/structure_runner.py` (new, a plain `run` only in slice 1)
- `plugins/implement/scripts/habit_coach.py` (the second runner call)
- `tests/test_structure_signals.py` (new)
- `tests/test_habit_coach.py` (one new case for the joined text)

## Types & Signatures

As in `03-program-design.md`. Slice 1 adds `Config`, `Finding`, `Report`, `new_files`, `folder_limit`, `crowded_folder`, `signals_for`, and a plain `structure_runner.run`. Slice 2 adds `split_tokens`, `stem_cluster`, `generic_name`, `load_config`, `to_findings_json`, and `main`.

`new_files(root)` returns the union of:

1. `git ls-files --others --exclude-standard` (untracked files).
2. `git diff --name-only --diff-filter=A --cached` (staged new files).
3. `git diff --name-only --diff-filter=A <merge-base>..HEAD`, when a merge-base with the default branch exists.

A rename into a folder counts as new for that folder. `git diff -M` reports it as `R`, so the third call also reads `R` targets.

`folder_limit(root, config)` returns the larger of the engineer limit and the percentile file count over all folders that are not excluded. With no engineer limit, it returns the percentile.

## Slice Decomposition

1. **Slice 1, the tracer bullet.** Depends on nothing. Ends with a real coach message for a crowded folder.
2. **Slice 2.** Depends on slice 1. Ends with all three signals, the config, and `not_analysed` on synthetic trees.

## Test Plan

- Slice 1: `test_structure_signals.py` cases for a crowded folder, an old file, an untracked file, and no merge-base. A `test_habit_coach.py` case shows the joined text with a fake habit-hooks runner. The spike transcript is the evidence that the real hook delivers the text.
- Slice 2: the cases for the stem cluster, the generic name, the four token-split forms, the test prefix, the sub-folder exclusion, the config file, the defaults, and `not_analysed`.

## Risks & Open Questions

- The cost of three git calls per write. The spike records the time for one write on this repo.
- The percentile on a repo with few folders.
- The symlink import path in a cache install.
