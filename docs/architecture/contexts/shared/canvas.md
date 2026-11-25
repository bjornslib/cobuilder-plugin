---
title: "Bounded Context Canvas — shared"
status: draft
type: architecture
id: BCC-SHARED-001
last_verified: 2026-11-25
owner: bjoerns
related:
  - ../../standard.md
  - "docs/architecture/contexts/shared/boundary.yaml"
---

# Bounded Context Canvas — shared

> Documents `shared/` to the [Architecture Documentation Standard](../../standard.md). Grounded in code as of 2026-11-25 (commit `d5e49a42`). Full treatment. 12 top-level Python files, the 25-file `tracker_port/` package, `tracker.py`, three tracker docs, and two shared skills. Seven symlinks (`plugins/<name>/shared`) point here.

## 1. Name & purpose

**shared** (`shared`). It holds the code that more than one plugin needs: bundle version constants, the record index builder, the bundle verifier, the migration ladder, the comments ledger, the gate and slice parsers, the tracker port and its command (`tracker.py`, `tracker_port/`), the boundary check, the habit-smells runner, and the prose budget. Two skills, `mermaid` and `ste-writing`, live here too. It is the base layer. It does not depend on a plugin.

## 2. Strategic classification

- **Supporting domain.** Plugins meet at the bundle, and this context defines the bundle contract.
- **Model trait:** shared kernel plus tools run by shell. Small modules are imported. Large tools run by `uv run`.

## 3. Ubiquitous language

| Term | Meaning inside this context |
|------|-----------------------------|
| [**Vendoring**](../../../../DDD-VOCABULARY.md#vendoring) | The symlink of `shared/` into each plugin root (ADR-0017). |
| [**Bundle**](../../../../DDD-VOCABULARY.md#bundle) | The directory whose version, layout, and index this context owns. |
| [**Script**](../../../../DDD-VOCABULARY.md#script) | A PEP 723 file. Here it can also be a module that plugins import. |
| [**Plugin**](../../../../DDD-VOCABULARY.md#plugin) | A consumer. Seven plugins hold the symlink. Five import or run shared code. `cobuilder-memory` and `cobuilder-priority` import none today. |
| [**Prose budget**](../../../../DDD-VOCABULARY.md#prose-budget) | The word caps in `prose_budget.py`. `verify_bundle.py` fails a bundle past twice the cap. |
| [**Stale boundary**](../../../../DDD-VOCABULARY.md#stale-boundary) | A context that `boundary_check.py` lists. |

## 4. Business / capability decisions (what it owns)

- The bundle version constants, the design stages, and the compatibility gate (`_bundle_meta.py`).
- The record index: `build_index.py` is the only writer of `data/adrs.json` and `data/index.json`.
- The two-ladder migration: layout (`bundle_format`), then data (`schema_version`).
- The bundle verifier and the decision-state validator.
- The comments ledger, the gate-block parser, and the slice-table parser.
- The tracker port (ADR-0040): the port, the beads, files, and fake adapters, the projector, and `tracker.py`. Only the beads adapter names `bd`.
- The boundary check, the habit-smells runner, and the prose budget.
- It does **not** own: any narrative, ADR text, or viewer code. It does not author content.

## 5. Inbound communication (consumers)

| Consumer | Via |
|----------|-----|
| pr | Import `_bundle_meta` and `_manifest`. Shell: `migrate_bundle`, `build_index`, `verify_bundle`, `tracker` |
| artifact | Import `_bundle_meta`, `ledger`, `gate_status`, `slice_table`, and `tracker_port.reader`. Shell: `build_index`, `migrate_bundle` |
| implement | Import `slice_table`, `gate_status`, and `tracker_port.reader` (`verify_gate.py`). Shell: `build_index`, `tracker` |
| architect | Shell only: `build_index`, `migrate_bundle`, `prose_budget`, `boundary_check`, `validate_decision_state`, `habit_smells`, `tracker` |
| cobuilder-packaging | `watch_feedback.py` imports `ledger`. The setup skill runs `tracker.py` |
| cobuilder-memory, cobuilder-priority | Symlink only. No import or shell call today. `cobuilder-priority` is a planned consumer of `shared/priority-core/` (ADR-0051) |

## 6. Outbound communication (dependencies + integration pattern)

| Depends on | Integration pattern |
|------------|--------------------|
| Standard library, PyYAML, optional `ulid` and `PIL` (the PNG migration only) | External packages, resolved by `uv` |
| The artifact viewer file | **SMELL.** `migrate_bundle.py` finds and copies `plugins/artifact/viewer/index.html`. See Recorded smells. |
| git | `build_index.py` and `boundary_check.py` run `git` through `subprocess` |
| `bd` and `habit-sensors` | `bd` only through the beads adapter. `habit_smells.py` finds `habit-sensors` on PATH |

## 7. Public interface (what it publishes)

The symbols in `boundary.yaml` `public_interface`: the `_bundle_meta` constants and functions, `_manifest.rewrite_manifest`, the `ledger` API, `gate_status`, `slice_table`, the `tracker_port` reader, projector, port, and record, the shell tools (including `tracker.py`), and the two shared skills.

## 8. Owned data / state

- The code and the two shared skills.
- The derived files it writes into a bundle: `data/index.json`, `data/adrs.json`, `bundle.json` updates, and the refreshed `viewer/index.html` copy. The tracker adapters write workflow state to the tracker, and the sync files to `.cobuilder/`.
- It owns no authored source. `docs/` is read, never written, except by the boundary check, which only reads.

---

## C2 — Container diagram

```mermaid
flowchart TB
    subgraph sh["shared/"]
        meta["_bundle_meta, _manifest<br/>leaf modules"]
        idx["build_index, verify_bundle,<br/>validate_decision_state"]
        mig["migrate_bundle"]
        led["ledger, gate_status,<br/>slice_table"]
        chk["boundary_check, prose_budget,<br/>habit_smells"]
        trk["tracker.py, tracker_port/"]
        skl["skills: mermaid, ste-writing"]
    end
    plugins["5 plugins via symlink"]
    bundle[("bundle directory")]
    docs[("docs/ authored")]
    viewer["artifact viewer file"]

    plugins -->|import| meta
    plugins -->|import| led
    plugins -->|uv run| idx
    plugins -->|uv run| mig
    plugins -->|uv run| chk
    plugins -->|import, uv run| trk
    plugins -->|Skill call| skl
    idx -->|reads| docs
    idx -->|writes index| bundle
    mig -->|writes| bundle
    mig -.->|SMELL: probes path| viewer
```

## C3 — Component diagram

```mermaid
flowchart LR
    bm["_bundle_meta.py<br/>stdlib only"]
    mf["_manifest.py"]
    bi["build_index.py"]
    vb["verify_bundle.py"]
    mg["migrate_bundle.py"]
    gs["gate_status.py"]
    st["slice_table.py"]
    lg["ledger.py"]
    pb["prose_budget.py"]

    mf --> bm
    mg --> bm
    bi --> bm
    bi --> gs
    bi --> st
    bi --> pb
    bi --> tp["tracker_port/"]
    tp --> gs
    tp --> st
    tp --> bm
    vb --> bm
    vb --> pb
```

**Key invariant(s) (encoded in `boundary.yaml`):** `_bundle_meta.py` imports only the standard library. `ledger.py`, `gate_status.py`, and `slice_table.py` are leaves. `tracker_port/` imports only those leaves, `_bundle_meta`, and PyYAML, and only its beads adapter names `bd`. No file in `shared/` imports a plugin as Python.

## Recorded smells (→ ADR candidates)

1. **Shared reaches into the artifact plugin.** `migrate_bundle.py` `find_viewer_source` (lines 338-372) probes `plugins/artifact/viewer/index.html` and the sibling `artifact/<version>/viewer/index.html` cache. A warning at line 577 names `plugins/artifact/`. A base layer should not know a plugin path. ADR candidate: pass the viewer path as an argument.
2. **Comments name plugin paths.** `_bundle_meta.py` line 32 names `plugins/artifact/viewer/src/shell/workDeck.ts`. `slice_table.py` lines 23-24 name two plugin scripts. They are comments, so nothing breaks. Replace them with plugin names.
3. **Run-from-cache hazard.** CLAUDE.md warns that the installed cache copy refreshes the viewer with an older build. It is the same coupling as smell 1.

## Open items

- **ADR-0051 plans `shared/priority-core/`, the first TypeScript library under `shared/`.** The ADR (frontmatter `status: active`, `state: decided`) puts the Reading types, the card view model, the reader queue, and `evaluate` there. `plugins/cobuilder-priority` and `pi/cobuilder-priority` import it through the `shared` symlink. No TypeScript file exists under `shared/` today, and neither `plugins/cobuilder-priority` nor `pi/` imports shared code yet. When the library lands, give it its own module in `boundary.yaml` with `allowed_outbound: []`, because the ADR says it imports no host engine, and add `cobuilder-priority` and the Pi package to its `allowed_inbound`. The base-layer rule then also covers TypeScript (see `forbidden_dependencies`).
- **ADR candidates from this run:** smells 1 and 2 above, still open. Smell 3 follows smell 1. No new violation: `tracker_port/`, `habit_smells.py`, and the other files added since 2026-10-08 import only the standard library, PyYAML, and sibling shared modules.
- `governed_by` stays empty. ADR-0017 and ADR-0040 anchor to `cobuilder-packaging`.

## Governing decisions

ADR-0017 (vendored shared code and bundle compatibility), ADR-0040 (tracker port), ADR-0051 (planned `shared/priority-core/`), ADR-0006 (three-phase bundle self-migration), and ADR-0022 (gate doc projection into the index). ADR-0017 and ADR-0022 anchor to `cobuilder-packaging`, so `governed_by` here stays empty. ADR-0017's `require_compatible` gate now exists in `_bundle_meta.py`, and the packaging record from 2026-08-21 was wrong to call it absent.
