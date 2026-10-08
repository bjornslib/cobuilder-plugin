# Slice plan: Verified boundaries in design and baseline

| # | Epic | Slice | Ends with | Score | State |
|---|---|---|---|---|---|
| | **`describe-boundaries/E1` — A boundary check.** A script says if a context record is current. | | | | |
| 1 | `describe-boundaries/E1` | Tracer bullet and whole epic: `boundary_check.py`, the `verified_at` field, and the bundle warning | The script prints `ok`, `stale`, and `uncovered` for a temporary git repo and exits 1 under `--require`. The template and the describe procedure carry `verified_at`. `verify_bundle.py` warns `boundary.stale`. | 0.93 (attempt 2) | accepted |
| | **`describe-boundaries/E2` — Design runs describe.** Design mode gets verified boundaries before it challenges. | | | | |
| 2 | `describe-boundaries/E2` | Tracer bullet and whole epic: design stage 1 and stage 6 | `design-mode.md` runs the check and describe in stage 1, and the stage 6 reviewer fails a design when `--require` exits non-zero. A blind agent given the file follows the order. | 0.95 | accepted |
| | **`describe-boundaries/E3` — Baseline seeds boundaries.** Self-analysis baseline describes each district. | | | | |
| 3 | `describe-boundaries/E3` | Tracer bullet and whole epic: self-only describe in baseline, and the docs | `baseline-derivation.md` and `SKILL.md` run describe per district for self-analysis only, and keep describe-lite for `--repo`. A blind agent given a `--repo` run does not call describe. `SKILL.md` marks describe internal and names its two callers. | 0.98 | accepted |
