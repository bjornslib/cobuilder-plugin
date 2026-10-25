# Product: Clear the viewer's habit-hooks findings (mechanical-smells)

## Problem

A maintainer who opens the viewer code meets files of 1,500 lines, functions of
100 lines, and more than a thousand comments that the standing scan flags. The
scan reports 2,340 findings in the repo. The viewer holds 1,637 of them. Review
and maintenance list the findings each time, and nobody owns them, so the count
does not fall. A change to the viewer is slow and risky, because each file is
large and each export has many importers.

## Success metric

The scan reports no finding in the viewer, apart from a short list of recorded
residuals. The engineer measures it with `habit-sensors --all`. The viewer count
falls from 1,637 to the residual list, and the viewer tests and the build still
pass. The other 703 findings sit in one named epic, so no finding is unowned.

## Announcement — the blog post before the feature

The viewer is now small enough to change with confidence. Each file stays under
200 lines, each path stays simple, and the comments that remain explain why, not
what. The scan that reports on the repo now reads clean for the viewer. The
generated parts of the viewer no longer count against it. The remaining findings
in the repo have a named epic, with a count and an approach for each group. A
later pass cuts that epic into slices.

## Screens

no UI change: the viewer renders the same pages
