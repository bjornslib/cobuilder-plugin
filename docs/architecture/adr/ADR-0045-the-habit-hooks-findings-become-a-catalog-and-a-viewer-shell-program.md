---
title: "ADR-0045 — the habit-hooks findings become a catalog and a viewer-shell program"
status: active
type: architecture
last_verified: 2026-10-24
owner: bjornslib
id: ADR-0045
source_pr: null
name: "the habit-hooks findings become a catalog and a viewer-shell program"
state: decided
groups: [refactor, maintainability]
approved_by: ""
problem: "The habit-hooks scan reports 2,456 findings across 14 smells, and none is named for the next person to take. The viewer shell holds 346 of them in about 40 files that top every limit at once."
decision: "The findings live in one catalog that clusters them into six and gives each cluster a verdict. The program resolves the viewer-shell structural cluster by area, logic first, keeping the shell's export surface stable. The 12-line function limit is a recorded exception. The last epic commissions the next cluster, type-surface-sweep."
maps_to:
  context: artifact
  modules: [plugins/artifact/viewer/src/shell/model.ts, plugins/artifact/viewer/src/shell/atoms.tsx, plugins/artifact/viewer/src/shell/sections.tsx, plugins/artifact/viewer/src/shell/App.tsx, docs/architecture/designs/mechanical-smells/findings-catalog.md]
  rule: "The shell's public surface is its contract: a split keeps every export name and re-exports the moved units, and a shell file is done when habit-sensors reports no finding for it. The findings catalog is the standing record the next program opens."
forces:
   - "ADR-0038 made the scan a standing check for review and maintenance. A check that reports but never resolves leaves 2,456 findings standing."
   - "The same 40 files top every limit at once. A split by smell reopens each file seven times."
   - "ADR-0016 keeps the plugins as a bundle seam. A program that touches 105 files across three families breaks the seam."
   - "The shell's export surface is the contract the tests import. A split that moves an export breaks them."
   - "The 12-line function limit is aggressive for React. A 13-line component is often one render unit."
   - "ADR-0023 set the typed component model to make the shell small. Tuning the sensor card throws that away."
alternatives:
   - option: "Tune the sensor card for the viewer instead of refactoring to the limits"
    rejected_because: "It hides the debt behind a higher limit and leaves 1,560-line files. ADR-0023 set the component model to make the shell small."
   - option: "Split by smell, one epic per smell across the whole repo"
    rejected_because: "It reopens each of the 40 files seven times and mixes the shell with the Python scripts. By-area keeps one surface stable."
   - option: "Refactor the whole repo's structural findings now, Python and cobuilder-memory included"
    rejected_because: "It widens the blast radius to 105 files across three families, which ADR-0016's seam keeps separate."
   - option: "Resolve every cluster now, including the 1,283 comment findings"
    rejected_because: "The comment count is a habit about density, and ADR-0004 values explanation. Deleting it on a scan verdict is not safe."
delivers:
  capability: "A next program opens a deferred cluster by name from the catalog, and the viewer shell carries no structural finding."
  benefit: "The standing scan becomes a work queue. Each cluster has a verdict and an owner, and the viewer shell is small and stable."
  beneficiary: [developer]
  enables: ["type-surface-sweep resolves the next cluster", "a later program resolves the duplicate and comment clusters by name"]
provenance: authored
history:
   - { state: decided, date: 2026-10-24, by: engineer, note: "Decided in session: the catalog, the by-area order with logic first, the 12-line function-line exception, and the commissioning of type-surface-sweep as the last epic." }
related_decisions:
   - { type: depends-on, target: ADR-0038 }
   - { type: depends-on, target: ADR-0023 }
   - { type: is-related-to, target: ADR-0016 }
   - { type: is-related-to, target: ADR-0004 }
   - { type: is-related-to, target: ADR-0020 }
related:
   - "docs/architecture/designs/mechanical-smells/findings-catalog.md"
   - "docs/architecture/designs/mechanical-smells/goal.json"
   - "docs/architecture/designs/type-surface-sweep/goal.json"
---

# ADR-0045 — the habit-hooks findings become a catalog and a viewer-shell program

## Context

ADR-0038 made the habit-hooks scan a standing check that review and maintenance run, and `shared/habit_smells.py` writes its result to `docs/architecture/review/habit-smells.json`. A standing check that only reports never resolves. A full-tree run of `habit-sensors --all` on 2026-10-24 reports 2,456 findings across 14 smells.

The findings concentrate in the viewer shell. Its non-test subset is 346 findings in about 40 files under `plugins/artifact/viewer/src/shell/` and `.../data/`. The same files top every limit at once: `sections.tsx` has 20 oversized functions and 3 complex paths, `sidebar.tsx` has 19 oversized functions, and `App.tsx` is 1,560 lines with 11 oversized functions and 7 duplicate imports. The shell is the largest cluster a bounded program can take, and it is one district under the `artifact` context.

The shell's export surface is large and imported widely. `model.ts` exports 30 names, `atoms.tsx` exports the UI vocabulary, `sections.tsx` exports the seven section renderers, and `App.tsx` exports `ShellApp` and the `Theme` type. A split must keep these names or the tests that import them break.

## Options considered

1. **Tune the sensor card for the viewer.** It hides the debt behind a higher limit and leaves 1,560-line files. ADR-0023 set the typed component model to make the shell small, and a tuned card throws that away. Rejected.
2. **Split by smell, one epic per smell across the whole repo.** It reopens each of the 40 files seven times and mixes the shell with the Python scripts and the cobuilder-memory tests. By-area keeps one surface stable in one epic. Rejected.
3. **Refactor the whole repo's structural findings now.** It widens the blast radius to 105 files across three plugin families, and ADR-0016 keeps the plugins as a bundle seam. Rejected for this program; the Python and cobuilder-memory structural findings stay in their own later programs.
4. **Resolve every cluster now, including the 1,283 comment findings.** The comment count is a habit about density, and ADR-0004 ste-writing values explanation. Deleting 1,283 comments on a scan verdict is not safe. Rejected; the catalog defers it as a decision.
5. **A catalog plus a by-area viewer-shell program, logic first, ending by commissioning the next cluster. Chosen.** It resolves one district, keeps the export surface stable, and turns the standing scan into a work queue the next program opens by name.

## Decision

1. **The catalog.** `docs/architecture/designs/mechanical-smells/findings-catalog.md` holds the scan, the 14 smells with counts, the six clusters, and a verdict per cluster. A later design opens the catalog, not a fresh scan.
2. **The clusters and their verdicts.** Structural is in scope. Type surface is commissioned next. Hygiene splits between the shell and a later Python program. Duplicates, Python exceptions, and comment habit defer, each with a named owner.
3. **The order.** The program splits the shell by area, logic first. The logic layer, `model.ts` and `bundle.ts`, comes first, because pure logic proves a split keeps behavior with the vitest suite alone. Then the atoms and sections, the change surface, and the top-level shell. Each epic keeps the export names and re-exports the moved units.
4. **The limits.** The file limit of 200 lines and the complexity limit of 10 are hard. The 12-line function limit is a recorded exception: a 13-to-30-line component that is one render unit may stay, and the catalog names the decision. A file is done when `habit-sensors` reports no finding for it.
5. **The commissioning.** The last epic decides the next cluster, the type surface, and authors `type-surface-sweep/goal.json`. It marks the catalog row commissioned and names the duplicate, Python-exception, and comment-habit clusters as the following candidates.
6. **Out of scope.** The comment-habit deletion, the Python and cobuilder-memory structural findings, the jscpd duplicate clusters, the per-site narrowing of the 12 swallowed exceptions, and any change to what the generation scripts write into the bundle.

## Consequences

- **Positive:** the standing scan becomes a work queue. Each cluster has a verdict and an owner, and the viewer shell is small and stable.
- **Constraint introduced:** the shell's public surface is its contract. A split keeps every export name and re-exports the moved units, and a shell file is done when `habit-sensors` reports no finding for it. The catalog is the standing record the next program opens. This matches `maps_to.rule` and the `artifact` context.
- **Negative / accepted:** a split that moves an export breaks the tests that import it, so the abort condition that a split must change an export name guards the whole program. The 12-line exception lets some components stay larger than the limit, and the catalog records each.
- **Precedent:** the last epic is the first place a design authors another design's `goal.json`. It writes a skeletal program and marks its row commissioned, so the commissioned design runs its own design mode when it starts.

## Value delivered

- **New capability:** a next program opens a deferred cluster by name from the catalog, and the viewer shell carries no structural finding.
- **Benefit:** the standing scan becomes a work queue. Each cluster has a verdict and an owner, and the viewer shell is small and stable.
- **Beneficiary:** the developer who changes the viewer.

## Maps to

Context `artifact`, modules `plugins/artifact/viewer/src/shell/model.ts`, `.../atoms.tsx`, `.../sections.tsx`, `.../App.tsx`, and the catalog under `docs/architecture/designs/mechanical-smells/`. See the boundary record's rule and the `artifact` context canvas.
