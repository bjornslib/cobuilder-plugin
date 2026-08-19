---
title: "cobuilder-architect: Explore Design"
status: active
type: command
last_verified: 2026-08-04
---

# cobuilder-architect: Explore Design

This command is the architecture skill's divergent-exploration design pass.
The new seven-stage `/design` mode (not yet written) will wrap it.

Produces an Architecture Decision Record (ADR) for a new or evolving system,
with component boundaries and interface contracts. Runs a divergent
exploration pass first, so rejected options are captured in the ADR alongside
the reasons they were rejected — not just the winning design.

This mode is self-only. It analyses the session's own repo. Output lands
under `docs/architecture/` (`{doc_root}`). If the user asks to analyse a
different local checkout, or to override where output lands, the skill will
refuse.

Invoke the `architecture` skill in design mode, forwarding any arguments the
user supplied after `/cobuilder-architect:explore-design`:

```
Skill("architecture", args="design $ARGUMENTS")
```
