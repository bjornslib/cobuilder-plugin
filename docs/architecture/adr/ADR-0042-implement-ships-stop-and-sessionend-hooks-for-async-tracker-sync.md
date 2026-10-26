---
title: "ADR-0042 — implement ships Stop and SessionEnd hooks for async tracker sync"
status: active
type: architecture
last_verified: 2026-10-22
owner: bjornslib
id: ADR-0042
source_pr: null
name: "implement ships Stop and SessionEnd hooks for async tracker sync"
state: decided
groups: [workflow, packaging]
approved_by: ""
problem: "Each beads write waits for bd sync, and that wait is slow. A slice loop makes many writes, so each one stalls the agent."
decision: "The beads adapter gets a sync key: write, async, or off. In async mode a write sets a dirty flag and starts a short-lived worker. The implement plugin ships a Stop hook that starts the worker when the flag is set, and a SessionEnd hook that runs one last sync. This amends ADR-0041 and ADR-0025. No other plugin ships these hooks."
maps_to:
  context: cobuilder-packaging
  modules: [plugins/implement/hooks/hooks.json, plugins/implement/scripts/tracker_sync_check.py, plugins/implement/scripts/tracker_sync_flush.py, shared/tracker_port/sync_worker.py]
  rule: "implement and cobuilder-memory may ship hooks/. Only implement may ship agents/. The implement hooks are the habit coach, the SessionStart reminder, the Stop sync check, and the SessionEnd sync flush."
forces:
  - "A bd sync pushes to a remote, so it can take seconds."
  - "A write must stay durable. A pending sync must not get lost when a session ends."
  - "A SessionEnd hook has a default budget of 1.5 seconds, and a sync can take longer."
  - "ADR-0025 lets only implement and the cobuilder-memory mod ship hooks."
alternatives:
  - option: "A long-lived daemon"
    rejected_because: "A daemon needs a start, a stop, a crash check, and a cleanup. A short-lived worker exits when the flag is clear, so nothing outlives the work."
  - option: "Keep the sync in every write"
    rejected_because: "It is the cause of the wait."
  - option: "Run only the SessionEnd sync"
    rejected_because: "A crash or a killed session loses the sync. The Stop hook publishes at the end of each turn."
delivers:
  capability: "A tracker write returns at once, and the sync runs in the background."
  benefit: "The agent does not wait for the remote, and the SessionEnd hook still flushes a pending or failed sync."
  beneficiary: [developer, implement-worker]
  enables: ["Other sync modes later"]
provenance: authored
history:
  - { state: decided, date: 2026-10-22, by: engineer, note: "Approved in session as an amendment to ADR-0041 and ADR-0025." }
related_decisions:
  - { type: amends, target: ADR-0041 }
  - { type: amends, target: ADR-0025 }
  - { type: is-related-to, target: ADR-0040 }
related:
  - "shared/tracker-usage.md"
---

# ADR-0042 — implement ships Stop and SessionEnd hooks for async tracker sync

## Context

ADR-0040 puts workflow state behind `shared/tracker.py`. The beads adapter runs `bd sync` at the end of each write. The sync pushes to a remote, and the agent waits for it. ADR-0041 gave `implement` a SessionStart reminder hook. ADR-0025 limits which plugins ship hooks.

## Decision

The key `sync` in `.cobuilder/tracker.yaml` takes three values. The default is `write`.

- `write`: each write runs `bd sync`, as before.
- `async`: each write sets the flag `.cobuilder/sync-dirty`. It starts `tracker.py sync-worker` detached, unless a worker holds the lock `sync-lock`.
- `off`: a write never syncs. Only `tracker.py sync` syncs.

The worker takes the lock without waiting. It syncs while the flag is set, writes `.cobuilder/sync-status.json`, and exits. After a failed sync it keeps the flag and stops, so it never loops hot. The line `sync-*` in `.cobuilder/.gitignore` keeps these files out of git.

The `implement` plugin ships two more hooks:

- **Stop** runs `tracker_sync_check.py`. When the mode is `async`, the flag is set, and no worker holds the lock, it starts the worker.
- **SessionEnd** runs `tracker_sync_flush.py`. When the mode is `async` and the flag is set or the last sync failed, it runs `tracker.py sync` in the foreground.

Each script uses a PEP 723 header, never calls bd itself, uses no network, and exits with 0 always.

## Why a short-lived worker and not a daemon

A daemon must start, stop, and survive a crash, and it can outlive the repo or the session. The worker runs only while work is pending. The flag and the lock are the only state, and a stale lock frees itself when the process dies.

## Timeout

A SessionEnd hook has a default budget of 1.5 seconds. That is too short for a sync. The hook entry sets `timeout` to 60 seconds, and the script limits its sync to 55 seconds.

## Consequences

- ADR-0025 now reads: `implement` may ship the habit coach on PostToolUse, the reminder on SessionStart, and the sync hooks on Stop and SessionEnd. Other plugins still ship no hooks, except the `cobuilder-memory` mod (ADR-0039).
- The `doctor` operation shows `sync`, `sync_pending`, and `last_sync`.
- The `implement` version rises to 0.13.0, and `cobuilder-full-lifecycle` rises to 0.5.4.
