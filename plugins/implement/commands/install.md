---
title: "implement: Install"
description: "Set up habit-hooks for this repo. Run it once before /implement:start."
status: active
type: command
last_verified: 2026-09-27
---

# implement: Install

Sets up habit-hooks for the target repo. Detects the repo's languages, asks
before it installs anything, then installs habit-hooks, its per-project
detectors, and runs `habit-hooks init`.

Invoke the `build` skill in install mode, forwarding any arguments the user
supplied after `/implement:install`:

```
Skill("build", args="install $ARGUMENTS")
```

During the setup-and-verify pass, check whether `DDD-VOCABULARY.md` exists
at the repository root, and state the result. When it is absent, say that
vocabulary checking will run against no glossary, and that one is created
with the vocabulary bootstrap in `/architect:design` stage 1 (ADR-0036).
Install never runs the bootstrap itself, and it never interviews the
engineer about terms.
