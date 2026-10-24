---
title: "cobuilder-full-lifecycle: Install"
description: "Set up the CoBuilder family in this repo: habit-hooks, the glossary check, and the Hindsight allow rules. Run it once per repo."
status: active
type: command
last_verified: 2026-10-16
---

# cobuilder-full-lifecycle: Install

Sets up the CoBuilder family for the target repo. It installs habit-hooks, checks the glossary, and adds the Hindsight allow rules after it asks. It then creates `.cobuilder/tracker.yaml` when the file is missing, after the engineer picks an adapter. For the beads adapter, it checks that the beads tool exists, and it does not install the tool. It offers the tracker backfill in `shared/tracker-backfill.md`: a `seed-from-files --dry-run` list first, and a write only after consent. When `tracker.py doctor` shows `mapping: legacy`, first take a snapshot with the tracker export described in the adapter notes. Then run `tracker.py migrate-mapping --dry-run`. Run `tracker.py migrate-mapping` only after the engineer approves the report. Run it once per repo, and again when the repo gains a language.

```
Skill("cobuilder-setup", args="install $ARGUMENTS")
```
