---
title: "cobuilder-full-lifecycle: Install"
description: "Set up the CoBuilder family in this repo: habit-hooks, the glossary check, and the Hindsight allow rules. Run it once per repo."
status: active
type: command
last_verified: 2026-10-16
---

# cobuilder-full-lifecycle: Install

Sets up the CoBuilder family for the target repo. It installs habit-hooks, checks the glossary, and adds the Hindsight allow rules after it asks. Run it once per repo, and again when the repo gains a language.

```
Skill("cobuilder-setup", args="install $ARGUMENTS")
```
