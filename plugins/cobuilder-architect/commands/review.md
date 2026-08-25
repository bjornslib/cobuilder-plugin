---
title: "cobuilder-architect: Review"
status: active
type: command
last_verified: 2026-08-04
---

# cobuilder-architect: Review

Runs a full-spectrum codebase audit — security, architecture, code quality,
scaling, maintainability, dependency health, and testing. Always produces two
linked, self-contained HTML reports: a technical report first, then a
founder-facing one, each carrying a 0-100 health score and letter grade. The
full 14-file security corpus is loaded unconditionally for every review.

This mode is self-only. It analyses the session's own repo. Reports land in
`docs/architecture/review/`. If the user asks to analyse a different local
checkout, or to override where output lands, the skill will refuse.

Invoke the `architecture` skill in review mode, forwarding any arguments the
user supplied after `/cobuilder-architect:review`:

```
Skill("architecture", args="review $ARGUMENTS")
```
