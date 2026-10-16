---
title: "implement: Install"
description: "Hand over to the cobuilder-full-lifecycle install command, which sets up habit-hooks for this repo. Run it once before /implement:start."
status: active
type: command
last_verified: 2026-10-16
---

# implement: Install

The install steps live in the `cobuilder-full-lifecycle` plugin now.

Invoke the `cobuilder-setup` skill in install mode, forwarding any arguments the user supplied after `/implement:install`:

```
Skill("cobuilder-setup", args="install $ARGUMENTS")
```

If that call answers that the skill is unknown, tell the user to run `claude plugin install cobuilder-full-lifecycle@cobuilder-plugin`. Then stop.
