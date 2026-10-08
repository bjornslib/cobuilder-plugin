---
title: "architect: Review"
description: "Audit the repo for security, architecture, and quality. Write a technical report and a founder report, each with a 0-100 score."
status: active
type: command
last_verified: 2026-08-04
---

# architect: Review

Runs a full-spectrum codebase audit — security, architecture, code quality,
scaling, maintainability, dependency health, and testing. Always produces two
linked, self-contained HTML reports: a technical report first, then a
founder-facing one, each carrying a 0-100 health score and letter grade. Every
review reads the first ~30 lines of all 14 security corpus files. It reads the
rest of a file in full, unless that file's summary shows no applicable surface
area in the codebase. When applicability is unclear, it reads the file in full.

This mode is self-only. It analyses the session's own repo. Reports land in
`docs/architecture/review/`. If the user asks to analyse a different local
checkout, or to override where output lands, the skill will refuse.

Invoke the `architecture` skill in review mode, forwarding any arguments the
user supplied after `/architect:review`:

```
Skill("architecture", args="review $ARGUMENTS")
```
