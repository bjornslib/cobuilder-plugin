# Epic Technical Solution Design: E6 — Whole-repository view

Feature: structure-coaching
Epic ID: E6

## Scope and Intent

E6 runs each structure signal on the whole repository, for review mode and maintenance mode. Each signal uses the same algorithm as in E1 and E4. Only the input set changes: every file that is not excluded, with no new-code rule (ADR-0048 decision 16). The output is one findings file with a fixed schema. Review mode reports it, maintenance mode shows its trend, and a later `/architect:refactor` skill (E8) plans work from it.

Slice 13 writes the findings file. Slice 14 makes review mode and maintenance mode use it. E6 follows the pattern of the habit-hooks scan: a script writes a JSON record beside the reports, and maintenance compares it with the record of the last run.

## Files Touched

- `shared/structure_evidence.py` (slice 13): a `--repo` mode.
- `shared/structure_repo.py` (new, slice 13): the whole-repository run, the folder table, the change count, and `compare_findings`.
- `plugins/architect/skills/architecture/SKILL.md` (slice 14): one step in review mode and one in maintenance mode.
- `plugins/architect/skills/architecture/references/structure-review.md` (new, slice 14): how the agent reads the record and judges the rows.
- `tests/test_structure_repo.py` (new)

## Types & Signatures

```python
# shared/structure_repo.py
def change_counts(root: Path, days: int = 90) -> dict[str, int]: ...
def folder_table(root: Path, files: list[str]) -> list[dict]: ...
def repo_findings(root: Path, since: str | None) -> dict: ...
def compare_findings(previous: dict, current: dict) -> dict[str, str]: ...   # key -> new | worse | unchanged | fixed
```

`structure_evidence.py --repo --out <path> [--since <sha>]` writes the record and prints its path.

## Algorithms

### D1. The input set

Every file from E1 A1, after the excluded paths. No new-code rule applies. For contract drift, `--since <sha>` gives the base: maintenance mode passes the commit of the last report. With no `--since`, the record holds no drift.

### D2. The signals

The script runs each coach signal of E1 on each file, and each kept VALIDATE signal of E4 that has a whole-repository form. The key of each finding is the key of E2 B3, so a finding in two runs has one key. A crowded folder gives one finding for each folder, not one for each file.

### D3. The change count and the order

`change_counts` runs `git log --since=<days>.days --name-only --no-merges --format=` once. The count of a finding is the count of its path, or the largest count of a file in its folder for a folder finding. The record lists the findings with the largest count first, then by key. No formula with weights, because the research found no source for one.

### D4. The folder table

For each folder with three or more code files: `n` (code files), `internal` (import edges between siblings), `out` and `in` (edges that leave or enter the folder), `cf` = `2 × internal / (2 × internal + out + in)`, `instability` = `out / (out + in)`, `groups` (the import groups of E1 A9), and `test_share`. A folder with no edges gets `null` for `cf` and `instability`. The table has no limit. The agent reads the lowest rows and the rows that changed.

### D5. The record

```json
{
  "schema": 1,
  "commit": "<sha>",
  "since": "<sha or null>",
  "findings": [{"key": "", "signal": "", "path": "", "folder": "", "facts": {}, "changes_90d": 0}],
  "folders": [{"folder": "", "n": 0, "internal": 0, "out": 0, "in": 0, "cf": 0.0, "instability": 0.0, "groups": [], "test_share": 0.0}],
  "not_analysed": []
}
```

Review mode writes it as `structure-findings.json` beside the reports in `docs/architecture/review/<run>/`.

### D6. The trend

`compare_findings` matches the findings of two records by key. A key only in the current record is `new`. A key only in the previous record is `fixed`. A key in both is `worse` when a count fact grew, such as `count` of a crowded folder, and `unchanged` otherwise.

### D7. The skill steps (slice 14)

- Review mode, after the habit-hooks scan: run `structure_evidence.py --repo`, read the record, and write a `## Structure` section in both reports. The section lists the top findings by change count and the folder table. Each finding the agent reports gets a judgment, as `structure-review.md` says: debt, accepted, or false.
- Maintenance mode: run the script with `--since` set to the commit of the last record, compare with that record, and tag each finding new, worse, unchanged, or fixed.
- When the script fails, the section says so and claims no clean result.

## Slice Decomposition

1. **Slice 13.** Depends on E5. D1 to D6. Ends with a record on a fixture repo, ranked by change count, and a trend of two records.
2. **Slice 14.** Depends on slice 13. D7. Ends with a blind review agent that writes the Structure section from a fixture record.

## Test Plan

- `test_structure_repo.py`: a fixture repo with a crowded folder, a name family, and a boundary edge gives each finding in an old file, which the change view does not report. The folder with more recent commits comes first. The folder table gives `cf` and `instability` for a folder with known edges, and `null` for a folder with no edges. `compare_findings` gives each of the four tags. The record has the D5 keys.
- Slice 14: a blind pass. A fresh agent in review mode gets a fixture record and writes the section with a judgment for each reported finding. The transcript stays in the slice evidence. `tests/test_install_command.py` and the existing architect tests stay green.

## Risks & Open Questions

- The whole-repository run on a large repo may take seconds. The research measured 550 ms for the import graph of this repo.
- A finding key that holds a path changes when the file moves. A move gives one `fixed` and one `new`.
- E8 depends on the record schema. A schema change bumps `schema`.
