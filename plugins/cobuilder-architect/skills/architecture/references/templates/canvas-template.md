---
title: "Bounded Context Canvas — <name>"
status: draft
type: architecture
id: BCC-<CONTEXT-ID>-001
last_verified: YYYY-MM-DD
owner: <owner>
related:
  - ../standard.md
  - "{doc_root}/architecture/contexts/<context-id>/boundary.yaml"
---

# Bounded Context Canvas — <name>

> Documents the `<repo/path>` bounded context to the
> [Architecture Documentation Standard](../standard.md). Grounded in code as of
> `last_verified`. <State depth/treatment if lighter than full, e.g. dormant context.>

## 1. Name & purpose

**<Name>** (`<context-id>`). <One paragraph: what it does and what it deliberately is not.>

## 2. Strategic classification

- **<core | supporting | generic> domain** — <why>.
- **Model trait:** <state machine / ports-and-adapters / pipeline / CRUD / …>

## 3. Ubiquitous language

| Term | Meaning inside this context |
|------|-----------------------------|
| **<term>** | <definition> |

<!-- If terms are homonyms with another context, add a contrast column disambiguating them. -->

## 4. Business / capability decisions (what it owns)

- <capability>
- It does **not** own: <the neighbouring responsibilities it must not absorb>.

## 5. Inbound communication (consumers)

| Consumer | Via |
|----------|-----|
| <who> | <interface / mechanism> |

## 6. Outbound communication (dependencies + integration pattern)

| Depends on | Integration pattern |
|------------|--------------------|
| <what> | <Shared Kernel / ACL via <adapter> / Conformist / OHS / data-only> |

## 7. Public interface (what it publishes)

<The symbols/messages other contexts may use — must match boundary.yaml `public_interface`.>

## 8. Owned data / state

<The state it owns and does not share by reaching into others' internals.>

---

## C2 — Container diagram

```mermaid
flowchart TB
    %% the context + its runnable parts, stores, subprocesses, external actors. <=15 nodes.
```

## C3 — Component diagram

```mermaid
flowchart LR
    %% ports, adapters, services inside the context; show dependency DIRECTION.
    %% This is what boundary.yaml encodes textually. <=15 nodes.
```

**Key invariant(s) (encoded in `boundary.yaml`):** <the rule(s) drift detection enforces —
e.g. "X is a leaf port; A imports X, never the reverse".>

<!-- ## Recorded smells (→ ADR candidates)
If verification surfaced violations, describe each with evidence and mark the
boundary.yaml entry SMELL. Deleting this section is fine when there are none. -->

## Governing decisions

- <ADR links, or "(none yet — candidates listed above)">
