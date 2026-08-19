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

Pass `--repo <path>` to run maintenance against any local checkout rather
than the current repo, and `--store local|central` to override where output
lands. Reports land in `<out-dir>/reports/` — `.archkit/self/reports/` for
self-analysis, or the per-hub cache for a foreign repo passed via
`--repo` — and maintenance mode finds its prior reports in that same
directory to compute the trend.

Invoke the `architecture` skill in maintenance mode, forwarding any arguments
the user supplied after `/archkit:maintenance`:

```
Skill("architecture", args="maintenance $ARGUMENTS")
```
