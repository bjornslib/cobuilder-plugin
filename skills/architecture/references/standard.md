---
title: "Architecture Documentation Standard — portable extract"
type: reference
status: active
last_verified: 2026-06-26
owner: bjoerns
---

# Architecture Documentation Standard — portable extract

> This is a portable extract of the project's Architecture Documentation Standard, covering only
> the parts this skill enforces: the boundary record definition (§5.2), the decision record
> definition (§5.4), and the minimum bar for a documented context (§8). Section numbers are kept
> stable so existing citations elsewhere in this skill continue to resolve. Everything outside
> these three sections (the full layout, C4 mapping, governance model, viewpoint generation) lives
> in the source project this skill was extracted from and is out of scope here.

## 5.2 Boundary record (`boundary.yaml`) — *the machine-diffable core*

The structured statement of a bounded context's boundary. This is the novel, load-bearing
artifact: prose descriptions and diagrams *describe* a context; `boundary.yaml` *constrains* it.
Schema:

```yaml
id: <context-id>                      # stable; never renamed without an ADR
path: <repo/path/to/context>
name: "<human name>"
public_interface:                     # symbols other contexts may import
  - <module.Symbol>
allowed_dependencies:                 # context-ids this context may depend on
  - <context-id>
forbidden_dependencies:               # explicit anti-corruption rules (grep/graph-checkable)
  - target: <context-id or import path>
    why: "<the rule's reason>"
modules:                              # C3-level internal modules + their own dep rules
  - id: <module-id>
    path: <repo/path>
    public_interface: [<Symbol>, ...]
    allowed_inbound: [<module-id>, ...]   # who inside the context may import this module
    allowed_outbound: [<module-id>, ...]  # what this module may import ([] = leaf/stdlib only)
    rule: "<one-line invariant, human + machine readable>"
governed_by:                          # ADRs whose maps_to anchors to this context
  - ADR-NNNN
```

Each ADR's `maps_to.rule` (see §5.4) must correspond to a rule expressed here. Drift is: a real
import edge found in the codebase that violates `allowed_*`/`forbidden_*` **and** that no approved
ADR sanctions.

## 5.4 ADRs (`adr/ADR-NNNN-*.md`) — MADR + 42010 frontmatter

Each key structural decision is a record: **YAML frontmatter = machine-readable index**;
**Markdown body = full options analysis & consequences** (MADR style). The frontmatter carries the
42010 decision fields — `state`, `approved_by`, `alternatives`, `forces`, `related_decisions`,
`history`, and `maps_to` (the structural anchor). `maps_to.modules` must reference a
context/module that exists in a `boundary.yaml`.

**Every record must also describe the value it creates — not only its cost.** A record that lists
only problem/decision/tradeoffs reads as "we changed a thing"; readers (and the change description)
must also see *what is now possible and why it is worth it*. Required `delivers` block + a
`## Value delivered` body section:

```yaml
delivers:
  capability: "<what is now possible that was not before>"
  benefit:    "<the value created, and why it matters>"
  beneficiary: [operator | developer | validator-agent | the-business]
  enables:    [ADR-NNNN, "<future capability this unlocks>"]   # optional
```

Where a capability addresses a named governance problem for the project (e.g. drift, sub-optimal
decisions made in isolation, humans out of the loop, incoherent parallel edits), name it. This
`delivers` data is what a generated Capabilities & Benefits viewpoint is built from, and what a
PR / changelog description should **lead with**.

## 8. Minimum bar (definition of done for a documented context)

A bounded context is "documented to standard" when it has: a canvas document with all eight
required fields (name & purpose, strategic classification, ubiquitous language, capability
decisions, inbound communication, outbound communication, public interface, owned data/state) and
embedded C2 + C3 diagrams; a `boundary.yaml` whose module rules match the diagrams; and at least
the ADRs that establish its boundary, in `approved` state with `maps_to` anchored to its
`boundary.yaml`.

---

### Sources

This extract is derived from the project's internal Architecture Documentation Standard, which in
turn draws on: C4 model — c4model.com (Simon Brown). ddd-crew — Bounded Context Canvas, Context
Mapping, Starter Modelling Process (github.com/ddd-crew). MADR — Markdown Any Decision Records.
ISO/IEC/IEEE 42010 decision viewpoints — van Heesch, Avgeriou & Hilliard (2011).
