# Slice plan: The habit-hooks coach reaches the GREEN agent

| # | Epic | Slice | Ends with | Score | State |
|---|---|---|---|---|---|
| | **`coach-reaches-green/E1` — A truthful hook.** The hook scans the right project or says it did not. | | | | |
| 1 | `coach-reaches-green/E1` | Tracer bullet and whole epic: scan from the git root, fail on "nothing scanned", no self-install | A GREEN payload for a file in a sub-folder of a temporary git repo reaches the stub with the repo root as its working directory. Output that says "nothing scanned" becomes a failure notice. A missing command gives a notice that names `/implement:install` and installs nothing. | 0.917 (attempt 1) | accepted |
| | **`coach-reaches-green/E2` — A proof after install.** Install mode shows the coach works. | | | | |
| 2 | `coach-reaches-green/E2` | Tracer bullet and whole epic: `habit_coach.py --check` and the install proof step | `--check` prints "coaching works" for a coached file and for a scanned clean file. It exits 1 for unscanned output, a missing command, and a repo with no probe file. Install mode ends with a step that runs it after every install. A blind agent given Install mode runs the proof last. | 1.00 (attempt 1) | accepted |
| | **`coach-reaches-green/E3` — A release.** Installed copies get the change. | | | | |
| 3 | `coach-reaches-green/E3` | Tracer bullet and whole epic: implement 0.7.0 in both manifests | `plugin.json` and `marketplace.json` both read 0.7.0 for `implement`, and the version-match test passes. | — | pending |
