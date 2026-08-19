---
title: "Archkit: Debug"
status: active
type: command
last_verified: 2026-08-04
---

# Archkit: Debug

Diagnoses the root cause of a specific failure or bug through divergent
hypothesis generation, then ranks hypotheses by the cheapest test that would
discriminate between them. Delivers a root-cause diagnosis and a recommended
fix — it does not implement the fix itself.

Pass `--repo <path>` to diagnose a failure in any local checkout rather
than the current repo, and `--store local|central` to override where any
diagnosis artifacts land. Reproduction runs inside the target repo, so a
`--repo` other than the current session's affects where commands actually
execute, not just where output is written.

Invoke the `architecture` skill in debug mode, forwarding any arguments the
user supplied after `/archkit:debug`:

```
Skill("architecture", args="debug $ARGUMENTS")
```
