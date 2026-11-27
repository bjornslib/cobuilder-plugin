# Product: Linear as a tracker beside beads

## Problem

A team that plans its work in Linear cannot use CoBuilder today. CoBuilder keeps its plan and its progress in beads. The team must install beads and a data remote, and the Linear board shows none of the progress. People then plan in one tool and watch the build in another.

The team needs to plan the backlog, the epics, and the slices in Linear. The team needs CoBuilder to build from that plan. The team needs to watch the progress in Linear: the state of each slice, the score and attempts, the gate dates and program stage, and the pull request records.

## Success metric

A team that uses Linear runs one full build in a test workspace with no beads installed. The build goes from a planned backlog to a merged pull request.

The check has four parts. All four must pass in that one run:

- Each slice shows its state on the Linear board.
- Each closed slice shows its score and attempts.
- The program issue shows the gate dates and the stage.
- Each pull request shows as a linked issue.

A person reads the board at the end of the run and ticks the four parts. The live smoke test repeats the machine-checkable parts.

## Announcement — the blog post before the feature

CoBuilder now works with Linear. Set one line in your config, and CoBuilder reads your backlog, your epics, and your slices from Linear. You plan where you already plan.

While CoBuilder builds, your board stays current. Each slice moves across the board. Each closed slice shows its score and how many tries it took. The program shows its gate dates. Each pull request appears as a linked issue.

A slice counts as done only when an independent check scores it. If someone drags a slice to Done by hand, CoBuilder reads it as open until the score is there. You keep your beads setup if you prefer it. Each repo uses one of the two.

## Screens

No UI. The feature adds no screen. People see the result in the Linear board, which Linear owns.
