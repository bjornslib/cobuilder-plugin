---
title: "architect: Design"
status: active
type: command
last_verified: 2026-08-20
---

# architect: Design

Designs a change before any code exists. Interviews the engineer, explores
options, challenges the approach, and drafts an ADR. Writes
`docs/architecture/designs/<name>/` and one proposed ADR. The design stays
off the timeline until generate mode files it under a real pull request
number.

This mode is self-only. It analyses the session's own repo. If the user
asks to design against a different local checkout, or to override where
output lands, the skill will refuse.

Invoke the `architecture` skill in Design Mode, forwarding any arguments
the user supplied after `/architect:design` (`--non-interactive`):

```
Skill("architecture", args="design $ARGUMENTS")
```

Run it with no arguments. The skill asks for the outcome and the name
before it reads a file.

## What this writes

This command writes authored files under `docs/`. It does not write
application source. It does not push. It does not open a pull request.

- `docs/architecture/designs/<name>/goal.json`
- `docs/architecture/designs/<name>/intent.json`
- `docs/architecture/designs/<name>/narrative.json`
- `docs/architecture/designs/<name>/assessment.json`
- `docs/architecture/designs/<name>/pr-draft.md`
- `docs/architecture/designs/<name>/diagrams/level-{1,2,3}.mmd`
- `docs/architecture/adr/ADR-NNNN-<slug>.md` with `state: decided`

Stage 7 creates the first local branch after confirmation:
`design/<name>` or `design/<name>/<epic-slug>`.

## Stages

Seven stages, in order. Stage 0 names the design. Stage 4 is the
challenge gate. Stage 7 asks whether this is one pull request or
several, then creates the first local branch.

`--non-interactive` runs stages 0 through 6 and stops before stage 7.
There is nobody there to confirm the branch.

## Requirements

- A git repo and `uv` on PATH.
- No `GEMINI_API_KEY`. Design mode generates no art and no audio.
- No `--repo`. No `--store`. This mode is self-only.
- A baseline helps. If `data/story.json` or `inventory.yaml` is absent,
  the skill runs baseline first.

## Examples

```
/architect:design
/architect:design --non-interactive
```
