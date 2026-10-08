# Architecture: Verified boundaries in design and baseline

## Fit
- `shared/` gets one new script, `boundary_check.py`. Plugins reach it through their `shared/` symlink (ADR-0017).
- `architect` design mode (`references/design-mode.md`) calls the check in stage 1 and stage 6.
- `pr` baseline mode (`baseline-derivation.md`, `odyssey/SKILL.md`) calls `Skill("architect:architecture", args="describe ...")` for self-analysis only. It names the mode and never a path (principle 4).
- `boundary-template.yaml` gets a `verified_at` field. Describe mode stamps it.
- `shared/verify_bundle.py` warns on a stale context.

## Endpoints
none

## Data
One new field in `boundary.yaml`: `verified_at: <git commit sha>`. No schema version change. `build_index.py` ignores unknown fields.

## Flow
1. Design stage 1 lists the paths the change touches.
2. `boundary_check.py --paths ...` prints, per context, `ok`, `stale`, or `missing`, and lists `uncovered` paths.
3. For each stale, missing, or uncovered area, design runs describe, which writes `canvas.md` and `boundary.yaml` and stamps `verified_at`.
4. Design runs the check again. Stage 6 runs `--require`. A non-zero exit fails the review.
5. Baseline, self-analysis only: after the district map, run describe for each district with no current `boundary.yaml`.

## External
none. A stale context is one whose `path` has a commit after `verified_at`.
