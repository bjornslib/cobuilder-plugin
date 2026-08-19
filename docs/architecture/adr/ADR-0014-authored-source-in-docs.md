---
# --- doc-gardener required frontmatter ---
title: "ADR-0014 — Authored source lives in docs/; the bundle is derived"
status: active
type: architecture
last_verified: "2026-08-19"
owner: bjoerns
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0014
name: "Authored source lives in docs/; the bundle is derived"
state: decided
groups: []
approved_by: ""
problem: "The bundle directory had become a document store. ADRs lived only as JSON, designs and PR write-ups sat under exports/, and a future session could not tell authored text from a compiled projection."
decision: "Keep authored source in docs/ (ADRs, designs, reviews, pull-request files). Rebuild data/adrs.json, adrs.js, and designs.js from that tree by full rebuild, never merge. exports/ keeps only publish artifacts and the gitignored diff cache."
alternatives:
- option: "Keep a lite JSON ADR store next to the full markdown store"
  rejected_because: "Two stores drift. The lite schema existed because records described a foreign repo; architecture modes are now self-only, so that premise is gone."
- option: "Leave designs and PR documents in exports/"
  rejected_because: "exports/ is the publish pipeline. Mixing authored intent with generated HTML hides the documents from ordinary review."
- option: "Merge new ADRs into data/adrs.json in place"
  rejected_because: "build_diagrams.py already shows the rule: the authored files are the source, and the projection is a full rebuild."
forces:
- "migrate_bundle.py's authored-field guard does not cover adrs.json"
- "the viewer reads window.ADRS and must keep that shape"
- "foreign fixtures must not grow a docs/ tree"
related_decisions:
- {type: is-related-to, target: ADR-0003}
- {type: is-related-to, target: ADR-0006}
- {type: is-related-to, target: ADR-0011}
related_concerns: []
history:
- {state: decided, date: "2026-08-19", note: "Recorded with the cobuilder-architect merge. Chosen on this branch; not approved until a human merges."}
maps_to:
  district: scripts
  unanchored: true
  modules:
  - scripts
  - docs/architecture
  rule: "Authored source lives in docs/. Derived projections live in the bundle. build_adrs.py and build_designs.py are self-only full rebuilds."
delivers:
  capability: "A reviewer reads ADRs, designs, and PR write-ups as ordinary markdown in docs/."
  benefit: "Paid bundle content stays derived, and a session cannot silently edit JSON that was supposed to be compiled."
  beneficiary:
  - developer
  - reviewer
provenance: authored
---

## Context

`build_diagrams.py` already treats `.mmd` files as the source and `diagrams.js`
as a full rebuild. ADRs and designs did not follow that rule. The lite JSON
store was justified by foreign-repo history. Phase 2 removed that premise.

## Options considered

1. **Two ADR stores.** Rejected. They drift.
2. **Keep designs in exports/.** Rejected. That directory is the publish
   pipeline.
3. **Full rebuild from docs/** (chosen). Same rule as diagrams.

## Decision

`docs/architecture/adr/` is the ADR register. `docs/architecture/designs/`
holds design directories. `docs/pull-requests/` holds description and
assessment files. `build_adrs.py` and `build_designs.py` rebuild the self
bundle only. A foreign `--bundle-dir` is refused. `exports/` keeps
`pr-N.html`, `index.html`, `publish-manifest.json`, and `branch-*/diff.json`.

## Consequences

- **Positive:** authored text is reviewable in git as markdown.
- **Constraint introduced:** generate and submit write markdown, then compile.
- **Negative / accepted:** the two committed fixtures keep their JSON ADRs
  and grow no `docs/` tree.

## Value delivered

- **New capability:** one organising rule for every authored document.
- **Benefit:** the bundle stops being a document store.
- **Beneficiary:** developer, reviewer.

## Maps to

District `scripts`. Unanchored until a boundary.yaml exists.
