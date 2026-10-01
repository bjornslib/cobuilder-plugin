# Epic Technical Solution Design: E1 — The /architect:options mode

Feature: options-mode
Epic ID: E1

## Scope and Intent

Add `/architect:options` as a seventh architect mode. The mode writes one self-contained HTML report. A validator script checks the structure of the report. The design record is `docs/architecture/designs/options-mode/` and `ADR-0035`. The source requirements are the brief at `/Users/theb/Documents/Windsurf/think-with-ai/.claude/worktrees/think-with-ai-architecture-review/docs/prompts/options-mode/brief.md`, as changed by the decisions in `00-status.md`.

## Files Touched

See `03-program-design.md`, Files. One epic owns all of them. Slice 1 owns the command, `SKILL.md`, `options-mode.md`, and `tests/test_commands.py`. Slice 2 owns the template, the validator, and its tests and fixtures. Slice 3 owns the glossary, the manifests, and the count wording. Slice 4 owns the one generated report.

## Types & Signatures

The validator interface is in `03-program-design.md`, Types & signatures. The report contract: ten anchors (`summary`, `current`, `flow`, `inquiries`, `directions`, `proposed`, `gaps`, `order`, `decide`, `evidence`), three figures (`fig-current`, `fig-flow`, `fig-proposed`), one row `row-<ID>` and one block `dir-<ID>` for each inquiry, and the confidence values `Verified`, `ADR only`, and `Hypothesis`.

## Slice Decomposition

1. Slice 1 is the tracer bullet. It makes the mode exist and the test count seven. It needs nothing else.
2. Slice 2 depends on nothing in slice 1 for its code. `options-mode.md` names the template and the validator by path.
3. Slice 3 depends on slice 1 (the mode exists) and slice 2 (the validator exists), because the count and glossary text refers to both.
4. Slice 4 depends on slices 1 to 3. It runs the finished mode.

## Test Plan

- Slice 1: `uv run --with pytest pytest tests/test_commands.py -q`.
- Slice 2: `uv run --with pytest pytest tests/test_options_report.py -q`, plus a `node --check` of the inline script of the template.
- Slice 3: `uv run --with pytest pytest tests/ -q`.
- Slice 4: `uv run plugins/architect/scripts/check_options_report.py <report>` and a `git status` of the working tree.

## Risks & Open Questions

- The reference report lives outside this repo. Slice 2 reads it from the path above. If the path is missing, GREEN stops and reports.
- The viewer files `plugins/artifact/viewer/src/shell/model.ts` and `plugins/artifact/viewer/src/variations/sections-e/sections.tsx` hold the word "six". Slice 3 must check whether it counts architect modes. A change there needs a viewer rebuild, which is out of scope. If a change is needed, record it as a follow-up.
- A blind run of the mode in slice 4 cannot use the installed plugin, which is version 0.6.1 and has no options mode. The agent reads the skill files from the repo path.
