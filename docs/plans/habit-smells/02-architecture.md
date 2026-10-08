# Architecture: Mechanical smells in review and maintenance (habit-smells)

## Fit
- `shared/` gets one new script, `habit_smells.py`. Architect reaches it through its `shared/` symlink (ADR-0017).
- Review and maintenance modes (`SKILL.md`) call the script and read its output file. No plugin ships the sensors (ADR-0025): the script shells out to the installed `habit-sensors`.
- `shared/verify_bundle.py` gains optional key `habit.smells`.
- No plugins/pr file mentions habit-hooks. The family meets at the script, not the tool (principle 4).

## Endpoints
none. The script calls one external tool, `habit-sensors --branch <base> --json`, on this machine.

## Data
One new artifact next to the reports: `habit-smells.json`. It holds the branch base, the run state, and the findings grouped per smell and per file. No schema version change. `build_index.py` reads it never.

## Flow
1. The mode runs `uv run shared/habit_smells.py --out docs/architecture/review/<run>/ --branch <base> --repo .`.
2. The script reads the JSON findings, groups them per smell and per file, and writes `habit-smells.json`.
3. Review reads the file and writes a `## Mechanical smells` section into the technical report and the founder report, before they are finalized. The section names the tool and the branch base, applies the P1 and P2 rules, and caps a large group at one count plus the top 10 files.
4. Maintenance reads the same file and the prior report's Mechanical smells section, tags each pair, and feeds the pairs into the trend report next to the corpus findings.
5. `verify_bundle.py` reports `habit.smells` as `ok`, `stale`, or nothing, from the file beside the reports.

## External
The states the script records when the tool fails: `run_complete: false` with the tool name on an incomplete run, and `available: false` with the reason when `habit-sensors` is missing. A mode shows both as stated facts and claims no clean scan.