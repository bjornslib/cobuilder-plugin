# Clear the viewer's habit-hooks findings, and hold the rest in a second epic

## What

The habit-hooks scan reports 2,340 findings across 14 smells. This program
writes one catalog that clusters them and gives each cluster a verdict. Epic
one clears the 1,637 viewer findings in seven slices. Epic two holds the other
703 findings in named groups, and a later pass cuts its slices.

## Why

ADR-0038 made the scan a standing check that review and maintenance run. A check
that reports never resolves. The viewer holds 70% of the findings, in 70 files
that top every limit at once. The engineer excluded the generated viewer
folders, so the scan now measures code the team owns.

## Scope

- `.habit-hooks/config.toml`: excludes `components/ui` and `components/smoothui`.
- `findings-catalog.md`: the scan, the 14 smells with counts, the seven clusters,
  a verdict per cluster.
- E1 viewer-findings: the logic layer, the atoms and sections, the change
  surface, the shell and chrome, the test files, and the comments in source and
  in tests. Each slice keeps the export surface.
- E2 remaining-findings: the 703 findings outside the viewer, held without
  slices.

## Done when

- The catalog lists every smell, count, cluster, and verdict.
- `habit-sensors` reports no finding in the viewer, apart from a recorded
  oversized-function residual.
- `npm run build` passes, the vitest suite passes, and the committed
  `index.html` rebuilds byte-identically after the logic slice.
- A reviewer sample of the comment slices finds no deleted comment that
  explained why.

## Guard

A split that moves an export the tests import breaks the suite. The abort
condition on a moved export guards every slice.

See `docs/architecture/adr/ADR-0046` and
`docs/architecture/designs/mechanical-smells/findings-catalog.md`.
