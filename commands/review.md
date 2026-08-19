---
title: "Archkit: Review"
status: active
type: command
last_verified: 2026-08-04
---

# Archkit: Review

Runs a full-spectrum codebase audit — security, architecture, code quality,
scaling, maintainability, dependency health, and testing. Always produces two
linked, self-contained HTML reports: a technical report first, then a
founder-facing one, each carrying a 0-100 health score and letter grade. The
full 14-file security corpus is loaded unconditionally for every review.

Pass `--repo <path>` to audit any local checkout rather than the current
repo, and `--store local|central` to override where the reports land.
Reports land in `<out-dir>/reports/` — `.archkit/self/reports/` for
self-analysis, or the per-hub cache (`<hub>/.archkit/<repo-slug>/reports/`)
for a foreign repo passed via `--repo`, so foreign checkouts are never
written into unless `--store local` overrides that.

Invoke the `architecture` skill in review mode, forwarding any arguments the
user supplied after `/archkit:review`:

```
Skill("architecture", args="review $ARGUMENTS")
```
