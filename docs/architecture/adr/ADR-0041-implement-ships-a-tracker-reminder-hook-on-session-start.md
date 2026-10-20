---
# --- doc-gardener required frontmatter ---
title: "ADR-0041 — implement ships a tracker reminder hook on SessionStart"
status: active
type: architecture
last_verified: 2026-10-21
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0041
source_pr: null
name: "implement ships a tracker reminder hook on SessionStart"
state: decided
groups: [workflow, packaging]
approved_by: ""
problem: "An agent edits status files and goal.json by hand, because it forgets that ADR-0040 moved workflow state behind tracker.py. After a compaction or a new session, the rule is gone from its context."
decision: "The implement plugin may also ship a reminder hook on SessionStart. Its matcher is startup, resume, clear, and compact. The hook prints a short text that names the tracker command, or names the install command when .cobuilder/tracker.yaml is missing. It starts no process and uses no network. This amends ADR-0025. No other plugin ships a reminder hook."
maps_to:
  context: cobuilder-packaging
  modules: [plugins/implement/hooks/hooks.json, plugins/implement/scripts/tracker_reminder.py, tests/test_tracker_reminder_hook.py]
  rule: "implement and cobuilder-memory may ship hooks/. Only implement may ship agents/. The implement reminder hook runs on SessionStart and only prints text."
forces:
  - "ADR-0040 makes tracker.py the one entry point for workflow state, and a write exits 2 without .cobuilder/tracker.yaml."
  - "A compaction removes the instructions that the agent read at the start of the session."
  - "PostCompact cannot add context to the session. SessionStart with the compact matcher can."
  - "ADR-0025 lets only implement ship a hook, and it ships the habit coach."
alternatives:
  - option: "A PostCompact hook"
    rejected_because: "PostCompact cannot inject context, so the reminder would not reach the agent."
  - option: "Put the reminder in each skill only"
    rejected_because: "A skill runs only when someone starts it. A new session or a compaction has no skill in context."
  - option: "Ship the hook in the umbrella plugin"
    rejected_because: "ADR-0025 keeps hooks out of every plugin except implement and the cobuilder-memory mod."
  - option: "Run tracker.py doctor in the hook"
    rejected_because: "The hook must stay fast and safe. It starts no process, so it only checks that the config file exists."
delivers:
  capability: "Each new, resumed, cleared, or compacted session starts with the tracker rule in context."
  benefit: "The agent stops hand edits to status files and goal.json, and it knows to run the install command when the tracker is not set up."
  beneficiary: [developer, implement-worker]
  enables: ["A later reminder for another rule, in the same hook"]
provenance: authored
history:
  - { state: decided, date: 2026-10-21, by: engineer, note: "Approved in session as an amendment to ADR-0025." }
related_decisions:
  - { type: amends, target: ADR-0025 }
  - { type: is-related-to, target: ADR-0040 }
  - { type: is-related-to, target: ADR-0039 }
related:
  - "shared/tracker-usage.md"
---

# ADR-0041 — implement ships a tracker reminder hook on SessionStart

## Context

ADR-0040 puts every read and write of workflow state behind `shared/tracker.py`. An agent that forgets this edits `00-status.md`, `04-slices.md`, or `goal.json` by hand. The rule leaves the agent context at the start of a new session and after a compaction.

ADR-0025 lets `implement` ship the habit coach hook. ADR-0039 lets the `cobuilder-memory` mod ship hooks as well.

## Options considered

1. **A SessionStart hook in implement.** Chosen.
2. **A PostCompact hook.** Rejected. PostCompact cannot inject context.
3. **A reminder in each skill only.** Rejected. A skill does not run at session start.
4. **A hook in the umbrella plugin.** Rejected by ADR-0025.

## Decision

The `implement` plugin ships a second hook, on SessionStart, with the matcher `startup|resume|clear|compact`. The script `plugins/implement/scripts/tracker_reminder.py` reads the working folder from the hook payload, and it uses the current folder when the payload has none.

- With `.cobuilder/tracker.yaml`, it prints about eight lines. They name `/architect:design` and `/implement:start`, say that state moves only through `tracker.py`, list the key operations, and point to `shared/tracker-usage.md`.
- Without that file, it prints one line. The line tells the agent to run `/cobuilder-full-lifecycle:install`, because a tracker write exits 2 without the file.

The script starts no process, uses no network, and always exits with 0.

## Why SessionStart and not PostCompact

PostCompact runs after a compaction, but its output does not enter the session context. SessionStart runs with the source `compact` after a compaction, and its `additionalContext` does enter the context. So one SessionStart entry covers a new session, a resume, a clear, and a compaction.

## Consequences

- ADR-0025 now reads: `implement` may ship a reminder hook on SessionStart and the habit coach on PostToolUse. No other plugin ships a reminder hook. The `cobuilder-memory` mod keeps its own hooks (ADR-0039).
- Only `implement` ships agents. No plugin ships an MCP server.
- The `implement` version rises to 0.11.0, so installed copies get the hook.
