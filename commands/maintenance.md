---
title: "Archkit: Maintenance"
status: active
type: command
last_verified: 2026-08-04
---

# Archkit: Maintenance

Re-runs the same review corpus chain used by review mode, then diffs the
results against the most recent prior `architecture-review-YYYY-MM-DD-*.html`
report, surfacing findings as NEW, ESCALATED, STABLE, or RESOLVED. If no
prior report exists, this run establishes the baseline instead of a trend.

This mode is self-only. It analyses the session's own repo. Reports land in
`docs/architecture/review/`. Prior-scan detection reads that same directory
and sorts by the date in the filename. If the user asks to analyse a
different local checkout, or to override where output lands, the skill will
refuse.

Invoke the `architecture` skill in maintenance mode, forwarding any arguments
the user supplied after `/archkit:maintenance`:

```
Skill("architecture", args="maintenance $ARGUMENTS")
```
