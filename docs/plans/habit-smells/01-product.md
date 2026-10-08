# Product: Mechanical smells in review and maintenance (habit-smells)

## Problem
A review runs on reading and judgment. It runs no linter. A smell a tool can count stays invisible. On this repo, habit-hooks reports 930 duplicated-code hits, 21 high-complexity functions, and 148 oversized files that a corpus read does not name. A report that carries the counts names the source, so the reader can trust tool output as tool output.

## Success metric
A `/architect:review` run writes a Mechanical smells section into both reports, with a classification for each smell group and the tool name. A `/architect:maintenance` run tags each pair of smell and file NEW, ESCALATED, STABLE, or RESOLVED against the prior report. `verify_bundle.py` reports `habit.smells` as `ok` when the last scan is current.

## Announcement — the blog post before the feature
CoBuilder reviews now come with the numbers. Every review names the smells the habit-hooks sensors count, sorts and classifies them, and marks an incomplete scan instead of hiding it. The maintenance mode then tells you which smell group grew since the last report and which you fixed. The bundle check warns you when the last scan is stale, so you never act on a months-old count.

## Screens
no UI