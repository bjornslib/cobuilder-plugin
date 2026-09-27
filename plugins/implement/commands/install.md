---
title: "implement: Install"
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
