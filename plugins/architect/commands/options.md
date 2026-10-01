---
title: "architect: Options"
status: active
type: command
last_verified: 2026-10-01
---

# architect: Options

Asks whether the flow and the technology choices of a system are still
right, and what other options exist for the same outcome. Reads the repo,
its ADRs, and the corpus. Writes one self-contained HTML report that holds
three diagrams, a list of inquiries, and the alternatives for each. The mode
proposes. It never decides. Design mode stage 4 decides.

This mode is self-only. It analyses the repo of the session. If the user
asks for a different local checkout, or asks to change where the output
lands, the skill refuses.

Invoke the `architecture` skill in Options Mode. Forward any arguments the
user supplied after `/architect:options`: an optional scope sentence and
`--non-interactive`.

```
Skill("architecture", args="options $ARGUMENTS")
```

Run it with no arguments. The skill asks: "Which system area or question
should I examine?" With `--non-interactive`, the scope is the whole repo.

## What this writes

This command writes one file under `docs/`. It does not write application
source. It does not write to `.cobuilder-architect/`. It does not push. It
does not open a pull request.

- `docs/architecture/options/<name>/options-report-YYYY-MM-DD.html`

## Stages

Seven stages, 0 to 6, in order: Frame, Ground, Inquire, Options, Draw and
write, Verify, Hand off. Stage 5 runs the validator
`plugins/architect/scripts/check_options_report.py`. Stage 6 prints the
report path and the inquiry IDs. It suggests `/architect:design` as the
next command. It does not start that command.

## Requirements

- A git repo and `uv` on PATH.
- No `GEMINI_API_KEY`. Options mode generates no art and no audio.
- No `--repo`. No `--store`. No output override. This mode is self-only.
- A browser tool helps with the render check. It is optional.

## Examples

```
/architect:options
/architect:options the meeting flow
/architect:options --non-interactive
```
