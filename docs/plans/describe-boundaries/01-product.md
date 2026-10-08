# Product: Verified boundaries in design and baseline

## Problem
A design that cites no verified boundary can only guess. Today `describe` is a command that an engineer must remember to run. Most repos have no `boundary.yaml`, so the design challenge and the PR assessment work without the facts they need.

## Success metric
After a `/architect:design` run, every context the change touches has a `boundary.yaml` that is current. Measure it with `boundary_check.py --require`. It exits 0.

## Announcement — the blog post before the feature
CoBuilder now checks the boundaries of your code before it designs a change. When a design touches a part of the repo with no boundary record, or with a stale one, design mode describes that part first. The challenge step then cites real import rules, not guesses. `/pr:baseline` does the same for each district of your own repo. A repo you read with `--repo` keeps the lighter baseline. The `describe` command leaves the menu, because the workflow now runs it for you.

## Screens
no UI
