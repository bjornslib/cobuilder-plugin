# Resolve the viewer-shell structural smells, and commission the next cluster

## What

The habit-hooks scan reports 2,456 findings across 14 smells. This program
writes one catalog that clusters them and gives each cluster a verdict, clears
the viewer-shell structural cluster by area, and ends by commissioning the next
cluster as its own program.

## Why

ADR-0038 made the scan a standing check that review and maintenance run. A check
that reports never resolves. The viewer shell holds 346 findings in about 40
files that top every limit at once. This program makes the standing scan into a
work queue the next program opens by name.

## Scope

- `findings-catalog.md`: the scan, the 14 smells with counts, the six clusters,
   a verdict per cluster.
- E2 logic layer: `model.ts`, `bundle.ts`, `works.ts`, `joins.ts`, split under
   200 lines and complexity 10, exports kept stable.
- E3 atoms and sections, E4 the change surface, E5 the top-level shell and
   chrome, each split by render unit with the export surface kept.
- E6 commissions `type-surface-sweep` and marks its catalog row.

Out of scope: the 1,283 comment findings, the Python and cobuilder-memory
structural findings, the jscpd duplicate clusters, and the per-site narrowing of
the 12 swallowed exceptions.

## Done when

- The catalog lists every smell, count, cluster, and verdict.
- `habit-sensors` reports no oversized-file, high-complexity, duplicate-import,
   or too-many-parameters finding in the shell.
- The oversized-function residual is zero, or each residual is one render unit
   and the catalog records it.
- `npm run build` passes, the vitest suite passes, and the committed
   `index.html` rebuilds byte-identically after the logic epics.
- `type-surface-sweep/goal.json` exists and its catalog row is commissioned.

## Guard

A split that moves an export the tests import breaks the suite. The abort
condition that a split must change an export name guards the whole program.

See `docs/architecture/adr/ADR-0045` and
`docs/architecture/designs/mechanical-smells/findings-catalog.md`.
