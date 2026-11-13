# Epic Technical Solution Design: E6 — Whole-repository view

Feature: structure-coaching
Epic ID: E6

## Scope and Intent

E6 runs each structure signal on the whole repository, for review mode and maintenance mode. Each signal uses the same algorithm as in E1 and E4. Only the input set changes: every file that is not excluded, with no new-code rule (ADR-0048 decision 16). The output is one findings file with a fixed schema. Review mode reports it, maintenance mode shows its trend, and a later `/architect:refactor` skill (E8) plans work from it.

Slice 13 writes the findings file. Slice 14 makes review mode and maintenance mode use it. E6 follows the pattern of the habit-hooks scan: a script writes a JSON record beside the reports, and maintenance compares it with the record of the last run.

## Files Touched

- `shared/structure_evidence.py` (slice 13): a `--repo` mode.
- `shared/structure/repo.py` (new, slice 13): the whole-repository run, the folder table, the change count, and `compare_findings`.
- `plugins/architect/skills/architecture/SKILL.md` (slice 14): one step in review mode and one in maintenance mode.
- `plugins/architect/skills/architecture/references/structure-review.md` (new, slice 14): how the agent reads the record and judges the rows.
- `tests/test_structure_repo.py` (new)

## Types & Signatures

```python
# shared/structure/repo.py
def change_counts(root: Path, days: int = 90) -> dict[str, int]: ...
def folder_table(root: Path, files: list[str]) -> list[dict]: ...
def repo_findings(root: Path, since: str | None) -> dict: ...
def compare_findings(previous: dict, current: dict) -> dict[str, str]: ...   # key -> new | worse | unchanged | fixed
```

`structure_evidence.py --repo --out <path> [--since <sha>] [--compare <previous record>]` writes the record and prints its path. With `--compare`, each finding gets a `trend` tag from `compare_findings`, and the record gets a `fixed` list.

## Algorithms

### D1. The input set

Every file from E1 A1, after the excluded paths. No new-code rule applies. For contract drift, `--since <sha>` gives the base: maintenance mode passes the commit of the last report. With no `--since`, the record holds no drift.

### D2. The signals

The script runs each coach signal of E1 on each file, and the duplicated code and consumer locality of E4. The key of each finding is the key of E2 B3, so a finding in two runs has one key. A crowded folder gives one finding for each folder, not one for each file. Three signals run in this view only, because the agencheck spike found them weak in the change view and useful here:

| Signal | Rule | Key | Result on agencheck |
|---|---|---|---|
| Twin name | Two or more non-test code files in different folders have the same lower-case stem, in one language family (Python, or TypeScript and JavaScript). Skip `twin_excluded_stems`: `index`, `__init__`, `main`, `types`, `conftest`, and the Next.js names `page`, `route`, `layout`, `loading`, `error`, `not-found`, `template`, and `default` | `twin-name|<stem>` | 55%, and 67% with the two filters |
| Co-change group | Over the last 365 days of `git log --no-merges --name-only`, skip commits with more than 30 files. Two files in different folders form a pair when `support >= 5` and `support / union >= 0.5`. Connected pairs form one group | `co-change|<sorted paths>` | 14 of 14 real, 7 `act` |
| Duplicate group | The duplicate windows of E4 C6 on all product code. Files that share a block form one group, a clone class | `duplicate-group|<sorted paths>` | 360 pairs became 79 groups, precision 87% |

Code-and-test pairs do not count as a co-change pair.

### D3. The change count and the order

`change_counts` runs `git log --since=<days>.days --name-only --no-merges --format=` once. When the 90-day window holds fewer than 20 commits, it uses 365 days, and the record states the window. The agencheck spike had 3 commits in 90 days. The count of a finding is the count of its path, or the largest count of a file in its folder for a folder finding. The record lists the findings with the largest count first, then by key. No formula with weights, because the research found no source for one.

### D4. The folder table

For each folder with three or more code files: `n` (code files), `internal` (import edges between siblings), `out` and `in` (edges that leave or enter the folder), `cf` = `2 × internal / (2 × internal + out + in)`, `instability` = `out / (out + in)`, `groups` (the import groups of E1 A9), and `test_share`. A folder with no edges gets `null` for `cf` and `instability`. The table has no limit. The agent reads the lowest rows and the rows that changed.

### D5. The record

```json
{
  "schema": 1,
  "commit": "<sha>",
  "since": "<sha or null>",
  "window_days": 90,
  "findings": [{"key": "", "signal": "", "path": "", "folder": "", "facts": {}, "changes": 0}],
  "folders": [{"folder": "", "n": 0, "internal": 0, "out": 0, "in": 0, "cf": 0.0, "instability": 0.0, "groups": [], "test_share": 0.0}],
  "not_analysed": []
}
```

Review mode writes it as `docs/architecture/review/structure-findings.json`, beside the dated reports and `habit-smells.json`. The repo has no run folders. The record is committed with the reports, so the committed copy is the previous record for maintenance mode.

### D6. The trend

`compare_findings` matches the findings of two records by key. A key only in the current record is `new`. A key only in the previous record is `fixed`. A key in both is `worse` when a count fact grew, such as `count` of a crowded folder, and `unchanged` otherwise.

### D7. The skill steps (slice 14)

- Review mode, after the habit-hooks scan: run `structure_evidence.py --repo`, read the record, and write a `## Structure` section in both reports. The section lists the top findings by change count and the folder table. Each finding the agent reports gets a judgment, as `structure-review.md` says: debt, accepted, or false.
- Maintenance mode: copy the committed `structure-findings.json` to a temporary path as the previous record. Run the script with `--since` set to the `commit` of that record and `--compare` set to the copy. The script tags each finding new, worse, or unchanged, and lists the fixed keys. The agent compares nothing by hand.
- When the script fails, the section says so and claims no clean result.

## Slice Decomposition

1. **Slice 13.** Depends on E5. D1 to D6. Ends with a record on a fixture repo, ranked by change count, and a trend of two records.
2. **Slice 14.** Depends on slice 13. D7. Ends with a blind review agent that writes the Structure section from a fixture record.

## Test Plan

- `test_structure_repo.py`: a fixture repo with a crowded folder, a name family, and a boundary edge gives each finding in an old file, which the change view does not report. The folder with more recent commits comes first. The folder table gives `cf` and `instability` for a folder with known edges, and `null` for a folder with no edges. `compare_findings` gives each of the four tags. Two `page.tsx` files give no twin. Two `util.py` files in two folders give one twin finding. A pair of files committed together in 5 of 6 commits gives one co-change group. A block in three files gives one duplicate group. A window of 5 commits in 90 days widens to 365 days. The record has the D5 keys.
- Slice 14: a blind pass. A fresh agent in review mode gets a fixture record and writes the section with a judgment for each reported finding. The transcript stays in the slice evidence. `tests/test_install_command.py` and the existing architect tests stay green.

## Risks & Open Questions

- The whole-repository run on a large repo may take seconds. The research measured 550 ms for the import graph of this repo.
- A finding key that holds a path changes when the file moves. A move gives one `fixed` and one `new`.
- E8 depends on the record schema. A schema change bumps `schema`.
