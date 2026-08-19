---
title: "Archkit: Describe"
status: active
type: command
last_verified: 2026-08-04
---

# Archkit: Describe

Documents a bounded context: a ddd-crew canvas, C4 diagrams, and a
machine-diffable `boundary.yaml`. Every claim in the resulting documentation
is verified against real import edges in the codebase before it is written,
so the description can't silently drift from the code it describes.

This mode is self-only. It analyses the session's own repo. Output lands
under `docs/architecture/` (`{doc_root}`). If the user asks to analyse a
different local checkout, or to override where output lands, the skill will
refuse.

Invoke the `architecture` skill in describe mode, forwarding any arguments
the user supplied after `/archkit:describe`:

```
Skill("architecture", args="describe $ARGUMENTS")
```
