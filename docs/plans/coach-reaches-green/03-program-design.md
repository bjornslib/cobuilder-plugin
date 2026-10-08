# Program Design: The habit-hooks coach reaches the GREEN agent

## Files
- `plugins/implement/scripts/habit_coach.py` — change. Run from the git root, fail on "nothing scanned", remove the self-install, add `--check`.
- `plugins/implement/skills/build/SKILL.md` — change. Add Install mode step 8, "Prove the coach". Update the Prerequisite section, which names the old install behavior.
- `tests/test_habit_coach.py` — change. RED writes the new contract and deletes the seven tests that pin the self-install.
- `plugins/implement/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` — change. Version 0.7.0.

## Types & signatures
```python
UNSCANNED_MARKERS = ("nothing scanned", "is not a file in this project")

def git_root(path: str) -> str | None: ...
def is_unscanned(text: str) -> bool: ...
def _run_habit_hooks_once(path: str) -> tuple[int, str]: ...   # cwd = git_root(path)
def run_habit_hooks(path: str) -> tuple[int, str]: ...         # no install; 127 when missing; 2 when unscanned
def pick_probe_file(root: str) -> str | None: ...              # first tracked source file
def check(root: str, runner=run_habit_hooks, stdout=sys.stdout) -> int: ...
def main(stdin, stdout, runner=run_habit_hooks) -> int: ...    # also reads --check from argv
```
`install_habit_hooks` is removed.

## Call stack
- Hook: `main` → `run_habit_hooks` → `git_root` → `_run_habit_hooks_once` → `is_unscanned`.
- Proof: `main` (with `--check`) → `check` → `pick_probe_file` → `run_habit_hooks`.

## Test plan
- Unit: `git_root` returns the repo top for a file in a sub-folder. `is_unscanned` is true for both marker texts and false for a normal pass.
- Hook: a stub `habit-hooks` on PATH that prints "nothing scanned" with exit 0 makes `run_habit_hooks` return 2. A missing command returns 127 and `main` names `/implement:install`.
- Hook, subfolder: with `cwd` set to a sub-folder of a temporary git repo, the stub still receives the repo root as its working directory.
- Proof: `check` prints "coaching works" and returns 0 for a stub that coaches and for one that passes a scanned file. It returns 1 for unscanned output and for a missing command.
- Prose: `SKILL.md` Install mode names `--check` as a final step, and the Prerequisite section no longer says the hook installs anything.
- Regression: the full suite stays green.

## Least confident decisions
- A probe file for `--check` is the first tracked file with a source extension. A repo with none gets a clear "no probe file" failure. This is a first cut.
- The text markers for "nothing scanned" come from the current habit-hooks wording. A wording change in habit-hooks would hide the failure again. The proof step catches it, because its clean-scan check needs real scan evidence.
