---
title: "implement: Debug"
status: active
type: command
last_verified: 2026-08-26
---

# implement: Debug

Diagnoses the root cause of a specific failure or bug through divergent
hypothesis generation, then ranks hypotheses by the cheapest test that would
discriminate between them. Delivers a root-cause diagnosis and a recommended
fix. It does not implement the fix itself.

This command is `architect:debug`, reached from the `implement` plugin
because an engineer stuck mid-build often looks for a debugging mode here
first. It runs `architect`'s own self-only debug mode unchanged: it
diagnoses a failure in the session's own repo, refuses a foreign target, and
writes no report directory.

Invoke the `architecture` skill in debug mode, forwarding any arguments the
user supplied after `/implement:debug`:

```
Skill("architecture", args="debug $ARGUMENTS")
```

Ground the diagnosis in the repository's own names: with that grounding
step, check whether `DDD-VOCABULARY.md` exists at the repository root, and
state the result. When it is absent, say that vocabulary checking will run
against no glossary, and that one is created with the vocabulary bootstrap
in `/architect:design` stage 1 (ADR-0036). Debug never runs the bootstrap
itself.
