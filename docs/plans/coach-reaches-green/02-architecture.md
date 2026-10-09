# Architecture: The habit-hooks coach reaches the GREEN agent

## Fit
- `plugins/implement/scripts/habit_coach.py` is the only code that changes. The `PostToolUse` hook in `hooks/hooks.json` stays as it is.
- `plugins/implement/skills/build/SKILL.md` gets one new Install mode step, which runs the proof.
- The `implement` version rises from 0.6.0 to 0.7.0 in `plugin.json` and `marketplace.json`.
- The hook reaches habit-hooks through the `habit-hooks` command only. It never reads the habit-hooks package.

## Endpoints
none

## Data
none. The proof reads one tracked source file from the repo and writes nothing.

## Flow
1. The hook gets a GREEN payload with a file path.
2. It finds the git root of that file and runs `habit-hooks --file <path>` there.
3. Output that says "nothing scanned" or "is not a file in this project" is a failure, exit code 2. GREEN reads "habit-hooks failed to run" and reports it.
4. A missing `habit-hooks` command gives exit code 127. GREEN reads a notice to run `/implement:install`. The hook installs nothing.
5. Install mode ends with `habit_coach.py --check`. It picks a tracked source file, runs the same path, and prints "coaching works" or the reason it does not.

## External
`habit-hooks`, installed by `/implement:install`. No new dependency.
