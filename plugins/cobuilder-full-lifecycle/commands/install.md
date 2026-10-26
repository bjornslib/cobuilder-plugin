---
title: "cobuilder-full-lifecycle: Install"
description: "Set up the CoBuilder family in this repo: habit-hooks, the glossary check, and the Hindsight allow rules. Run it once per repo."
status: active
type: command
last_verified: 2026-10-16
---

# cobuilder-full-lifecycle: Install

Sets up the CoBuilder family for the target repo. It installs habit-hooks, checks the glossary, and adds the Hindsight allow rules after it asks. It then creates `.cobuilder/tracker.yaml` when the file is missing, after the engineer picks an adapter. For the beads adapter, it checks that the beads tool exists, and it does not install the tool. It offers the tracker backfill in `shared/tracker-backfill.md`: a `seed-from-files --dry-run` list first, and a write only after consent. When `tracker.py doctor` shows `mapping: legacy`, first take a snapshot with the tracker export described in the adapter notes. Then run `tracker.py migrate-mapping --dry-run`. Run `tracker.py migrate-mapping` only after the engineer approves the report. For an existing tracker, take three more steps in this order. First, take a snapshot, as in the snapshot step above. Second, run `tracker.py repair-status --dry-run --plans-dir docs/plans --index .cobuilder-architect/self/data/index.json`, read the list with the engineer, and get approval. Then run it without `--dry-run`, and run `tracker.py sync`. Third, rebuild the index with `build_index.py`, run `uv run shared/strip_goal_stage.py --dry-run`, and read the list. Then run it without `--dry-run`. A design with no stage anywhere needs `tracker.py set-program-stage <design> backlog --plans-dir docs/plans`. Run it once per repo, and again when the repo gains a language.

```
Skill("cobuilder-setup", args="install $ARGUMENTS")
```
