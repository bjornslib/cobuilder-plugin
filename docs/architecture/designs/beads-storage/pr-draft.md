# envisioned PR — beads-storage

## Summary

Beads v1.3.0 becomes the storage layer for CoBuilder programs, epics, and slices. The narrated repo gains one `.beads/` tracker. Stateful records become issues with a namespaced metadata envelope; prose records stay files with pointers.

## Motivation

ADR-0031. Slice state, scores, and attempts live in markdown tables today, and epic joins are hand-maintained. Nothing answers what is next, what blocks what, or what changed while two sessions worked one ladder.

## Changes

1. `shared/beads_seed.py` seeds programs, epics, slices, and decisions idempotently by `external_ref`, dry-run first, counts verified against `data/index.json` (16 designs, 77 epics, 47 slices, 30 ADRs).
2. `shared/build_index.py` projects entities and joins from one `bd list --json` read beside the unchanged file sources; the viewer and `data/index.json` keep their shapes.
3. State writers in `plugins/implement` and `plugins/architect` flip slice and epic state through `bd` commands with envelope files, append evidence files, and manage PR gates; scripts fall back to the file flow when `bd` is absent.

## Test plan

- Seed a repo copy; compare projected counts with the current index.
- Round-trip one envelope through `bd create`, `bd update`, `bd export`, and `bd list --json`.
- Close slice n and assert `bd ready` names slice n+1.
- Create a gate with `--blocks <epic>` and assert it holds until `bd gate resolve`.
- Run the full existing suite; the index byte-comparison test covers the read model.
