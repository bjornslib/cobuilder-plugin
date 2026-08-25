---
title: "Architecture Description — authoring reference (describe mode)"
type: reference
status: active
last_verified: 2026-06-26
owner: bjoerns
---

# Architecture Description — authoring reference

How to document a bounded context to the project's Architecture Documentation Standard. Canonical
artifact definitions: `standard.md` (B0). This file is the *procedure*;
the standard is the *contract*. Templates: `templates/canvas-template.md`,
`templates/boundary-template.yaml`.

## 1. The artifact set per context

| Artifact | Job | Audience |
|----------|-----|----------|
| `canvas.md` | ddd-crew Bounded Context Canvas + embedded C4 C2/C3 Mermaid — the design intent | humans |
| `boundary.yaml` | Machine-diffable boundary spec (allowed/forbidden dependency edges, per-module rules) | drift detector |
| ADRs (`maps_to` → this context) | The approved decisions that sanction the boundary | governance |

`canvas.md` *describes*; `boundary.yaml` *constrains*. A context is "documented" only when it has
both, consistent with each other (STANDARD.md §8 minimum bar).

## 2. Verification discipline — ground every claim in code

**Never write a boundary rule you have not checked.** Before writing anything:

```bash
# 1. Enumerate the context's modules
find <path> -maxdepth 2 -type d; ls <path>/*.py

# 2. Real outbound edges: what does it import from other contexts?
grep -rhE "^(from|import) " <path> --include=*.py | grep -E "<own-package>|<other-contexts>" | sort -u

# 3. Real inbound edges: who imports it?
grep -rl "<import-path>" <repo> --include=*.py | grep -v "<path>"

# 4. Public interface: exported symbols
grep -nE "^class |^def |^__all__" <path>/__init__.py
```

Size the context (`find <path> -name "*.py" | wc -l`, LOC) and note its **activity** (how many
external importers) — a dormant context gets a lighter treatment, stated explicitly.

## 3. Canvas — the eight sections (+ diagrams)

From `templates/canvas-template.md`: 1 Name & purpose · 2 Strategic classification (core /
supporting / generic + model trait) · 3 Ubiquitous language (5–15 terms; **disambiguate homonyms**
shared with other contexts) · 4 Capability decisions (owns / does NOT own) · 5 Inbound
communication · 6 Outbound communication with the **integration pattern** per dependency
(Shared Kernel, ACL, Conformist, Open Host Service, Partnership) · 7 Public interface ·
8 Owned data/state. Then embedded **C2** (container) and **C3** (component) Mermaid diagrams —
≤ ~15 nodes each; if larger, the context is probably two contexts.

## 4. Boundary record

From `templates/boundary-template.yaml`. The load-bearing fields:

- `public_interface` — the symbols other contexts may import.
- `allowed_dependencies` / `forbidden_dependencies` — context-level edges. Every `forbidden` entry
  carries a `why`.
- `context_map` — the integration pattern per neighbour (mirrors canvas §6).
- `modules[]` — C3-level internal modules, each with `allowed_inbound`, `allowed_outbound`
  (`[]` = leaf), and a one-line `rule`. Leaf ports and ACLs are the rules drift detection cares
  about most.
- `governed_by` — the ADRs anchored to this context (may start empty).

## 5. Surfacing smells is a primary output

While verifying imports you will find violations — inverted edges, schema leakage, term
overloading, missing ACLs. Do not silently normalise them into the rules. Instead:

1. Record the *intended* rule in `boundary.yaml`, and the violation as a `forbidden_dependencies`
   entry (or a note on the module rule) marked **SMELL** with the evidence.
2. Explain it in a dedicated canvas section.
3. List it as an **ADR candidate**: the violation must either be sanctioned (an `approved` ADR) or
   fixed. That choice belongs to the human.

## 6. Bookkeeping

After documenting a context: update `{doc_root}/architecture/INVENTORY.md`
(doc status, findings, priorities) and validate the YAML parses
(`python3 -c "import yaml; yaml.safe_load(open('<boundary.yaml>'))"`).
