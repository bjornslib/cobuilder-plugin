# Product: The habit-hooks coach reaches the GREEN agent

## Problem
The coach is a hook that runs habit-hooks after each file the GREEN agent writes. It can fail without a sign. If the hook starts in a sub-folder, habit-hooks says "nothing scanned", prints a pass, and exits 0. GREEN is told nothing and believes its code is clean. If habit-hooks is missing, the hook installs a Python-only copy and drops the TypeScript checks. Install mode never tests the hook, so nobody sees either fault.

## Success metric
After `/implement:install`, a synthetic GREEN edit through the hook returns real findings or a clean scan of a file that was scanned. Measure it with `habit_coach.py --check`. It exits 0 and prints "coaching works".

## Announcement — the blog post before the feature
The coach now tells GREEN the truth. It runs habit-hooks from the root of your repo, whatever folder the session started in. A scan that checked nothing is now a failure that GREEN reports, not a pass. The hook no longer installs its own Python-only copy. It tells GREEN to run `/implement:install`, which names every language in one command. That command now ends by proving the coach works.

## Screens
no UI
