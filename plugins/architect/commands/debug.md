---
title: "architect: Debug"
status: active
type: command
last_verified: 2026-08-04
---

# architect: Debug

Diagnoses the root cause of a specific failure or bug through divergent
hypothesis generation, then ranks hypotheses by the cheapest test that would
discriminate between them. Delivers a root-cause diagnosis and a recommended
fix — it does not implement the fix itself.

This mode is self-only. It diagnoses a failure in the session's own repo.
It writes no report directory. If the user asks to analyse a different
local checkout, or to override where output lands, the skill will refuse.

Invoke the `architecture` skill in debug mode, forwarding any arguments the
user supplied after `/architect:debug`:

```
Skill("architecture", args="debug $ARGUMENTS")
```
