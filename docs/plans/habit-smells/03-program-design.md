# Program Design: Mechanical smells in review and maintenance (habit-smells)

## Files
- `shared/habit_smells.py` (new): shells out to `habit-sensors --branch <base> --json`, groups findings per smell and per file, writes `habit-smells.json` into `--out`, prints a summary. Flags: `--out`, `--branch`, `--repo`. PEP 723.
- `shared/verify_bundle.py`: optional warning key `habit.smells`.
- `plugins/architect/skills/architecture/SKILL.md`: the habit-hooks step in "### Review Mode" and "### Maintenance Mode".
- `plugins/architect/commands/review.md` and `plugins/architect/commands/maintenance.md`: one paragraph each about the step.
- `tests/test_habit_smells.py` (new): the script and the gate key, against a stub `habit-sensors` on PATH.
- `tests/test_habit_smells_integration.py` (new): pins the prose in both files and both commands, and pins that no `plugins/pr` file mentions habit-hooks.

## Types & signatures
```python
def collect(repo: Path, branch: str) -> dict        # shelles out; records run_complete / available
def group_findings(raw: dict) -> dict                # pairs of smell and file, with counts
def write_report(data: dict, out_dir: Path) -> Path  # habit-smells.json
def main(argv: list[str]) -> int                     # prints a summary, exits 0
```
The gate key in `verify_bundle.py`: `check_habit_smells(bundle_dir) -> str`, `ok` when `habit-smells.json` exists with `run_complete` true and its branch base at most 200 commits behind HEAD, `stale` past 200, nothing when the file is missing. Join the optional prefixes with `prose.soft` and `boundary.stale`.

## Call stack
`main` → `collect` (subprocess `habit-sensors --branch ... --json`) → `group_findings` → `write_report`. Verifier: `verify_bundle` → `check_habit_smells` → reads the file.

## Test plan
The tests build a fixture repo with a stub `habit-sensors` on PATH. Fake output covers: a full run with findings, an incomplete run (`run_complete` false, tool named), a missing tool (`available` false with the reason), grouping, the summary print, and the gate key at `ok`, `stale` past 200 commits, and missing. The integration tests read the prose files for the call, the P1 rules, the top-10 cap, the four tags, the prior-report diff, and the commands. They grep `plugins/pr` for the tool name.

## Least confident decisions
- The stale threshold is 200 commits. It is a first cut, not a measured number.
- Classification starts P1 for swallowed exceptions and for any group over 100 findings, and P2 otherwise. Review may re-classify with evidence. A group a tool finds heavily can still deserve a lower plan.
- The branch base argument is mandatory. A run with no base fails loud rather than guessing a default.