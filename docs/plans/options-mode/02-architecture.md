# Architecture: architect options mode

## Fit

- `plugins/architect/commands/options.md` (new): a thin dispatcher, the same shape as `design.md`.
- `plugins/architect/skills/architecture/SKILL.md`: gains `### Options Mode`, and the mode lists change from six to seven.
- `plugins/architect/skills/architecture/references/options-mode.md` (new): the full procedure.
- `plugins/architect/skills/architecture/references/reports/options-report-TEMPLATE.html` (new): the report skeleton, built from the reference report.
- `plugins/architect/scripts/check_options_report.py` (new): the validator.
- `tests/test_commands.py`, `tests/test_options_report.py` (new), `tests/fixtures/options_report/` (new).
- `DDD-VOCABULARY.md`, `README.md`, `CLAUDE.md`, both manifests, and the umbrella skill: wording and version.

## Endpoints

None.

## Data

One file for each run: `docs/architecture/options/<name>/options-report-YYYY-MM-DD.html`. No JSON file. No change to `.cobuilder-architect/`.

## Flow

1. The engineer runs `/architect:options [scope] [--non-interactive]`.
2. The command file calls `Skill("architecture", args="options ...")`.
3. The skill follows `references/options-mode.md`, stages 0 to 6.
4. The skill copies the template, fills it, and runs `check_options_report.py` on the result.
5. The skill prints the report path, the inquiry IDs, and the suggested next command.
6. The engineer pastes the decisions text into `/architect:design`.

## External

None. The report loads no network resource. The validator uses the Python standard library only.
