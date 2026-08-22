---
title: "cobuilder-architect: Decisions"
status: active
type: command
last_verified: 2026-08-04
---

# cobuilder-architect: Decisions

Authors new decision records or retro-extracts them from existing code and
history, following the ISO/IEC/IEEE 42010 decision-record standard: a
state machine per record and a mandatory `delivers` value block (the benefit,
not just the cost). Also refreshes the three generated viewpoint files that
index decisions across the project.

This mode is self-only. It analyses the session's own repo. Output lands
under `docs/architecture/` (`{doc_root}`). If the user asks to analyse a
different local checkout, or to override where output lands, the skill will
refuse.

Invoke the `architecture` skill in decisions mode, forwarding any arguments
the user supplied after `/cobuilder-architect:decisions`:

```
Skill("architecture", args="decisions $ARGUMENTS")
```
