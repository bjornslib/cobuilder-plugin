# Program Design: Verified boundaries in design and baseline

## Files
- `shared/boundary_check.py` (new): reads `boundary.yaml` files and git history, prints JSON.
- `tests/test_boundary_check.py` (new): builds temporary git repos.
- `plugins/architect/skills/architecture/references/templates/boundary-template.yaml`: add `verified_at`.
- `plugins/architect/skills/architecture/references/architecture-documentation.md`: stamp step.
- `plugins/architect/skills/architecture/references/design-mode.md`: stage 1 and stage 6.
- `plugins/architect/skills/architecture/SKILL.md`: describe mode note.
- `plugins/pr/skills/odyssey/references/baseline-derivation.md` and `plugins/pr/skills/odyssey/SKILL.md`: self-only describe step.
- `shared/verify_bundle.py`: `boundary.stale` warning.
- `tests/test_describe_integration.py` (new): prose and wiring assertions.

## Types & signatures
```python
def load_contexts(repo: Path) -> list[Context]            # id, path, verified_at
def context_status(repo: Path, ctx: Context) -> str       # "ok" | "stale"
def classify(repo: Path, paths: list[str]) -> Report      # contexts touched, uncovered paths
def main(argv: list[str]) -> int                           # 0, or 1 under --require when stale or uncovered
```
CLI: `uv run shared/boundary_check.py --repo . [--paths P ...] [--require]`. With no `--paths`, it checks every context.

## Call stack
`main` → `load_contexts` → `classify` → `context_status` → `git log <sha>..HEAD -- <path>`.

## Test plan
Temporary git repos cover: a current context, a stale context after a later commit, a missing `verified_at`, an uncovered path, an ignored path, `--require` exit codes, and a bad `verified_at` sha. Wiring tests read the prose files for the call and for the self-only rule.

## Least confident decisions
- Baseline describes every district. A large repo makes that costly. A later change may cap it.
- Staleness means any commit under `path`. It may over-report on a formatting commit.
- The ignore list for uncovered paths is fixed: `docs/`, `tests/`, `.cobuilder*`.
