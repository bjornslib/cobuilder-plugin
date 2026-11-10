---
title: "ADR-0046 — the habit-hooks findings become a catalog and two epics"
status: active
type: architecture
last_verified: 2026-10-25
owner: bjornslib
id: ADR-0046
source_pr: null
name: "the habit-hooks findings become a catalog and two epics"
state: decided
groups: [refactor, maintainability]
approved_by: ""
problem: "The habit-hooks scan reports 2,340 findings across 14 smells, and none is named for the next person to take. The viewer holds 1,637 of them in 70 files that top every limit at once."
decision: "The findings live in one catalog that clusters them into seven and gives each cluster a verdict. Epic one clears every viewer finding by area, logic first, keeping the export surface stable. Epic two holds the 703 findings outside the viewer, and a later pass cuts its slices. The sensor config excludes the generated viewer folders."
maps_to:
  context: artifact
  modules: [plugins/artifact/viewer/src/shell/model.ts, plugins/artifact/viewer/src/shell/atoms.tsx, plugins/artifact/viewer/src/shell/sections.tsx, plugins/artifact/viewer/src/shell/App.tsx, .habit-hooks/config.toml, docs/architecture/designs/mechanical-smells/findings-catalog.md]
  rule: "The viewer's public surface is its contract: a split keeps every export name and re-exports the moved units, and a viewer file is done when habit-sensors reports no finding for it. The findings catalog is the standing record a later pass opens."
forces:
   - "ADR-0038 made the scan a standing check for review and maintenance. A check that reports but never resolves leaves 2,340 findings standing."
   - "These 70 viewer files top every limit at once. A split by smell reopens each file once per smell."
   - "ADR-0016 keeps the plugins as a bundle seam. An epic that touches 129 more files across the plugin families breaks the seam."
   - "The viewer's export surface is the contract the tests import. A split that moves an export breaks them."
   - "The 12-line function limit is aggressive for React components and test callbacks. A 13-line unit is often one unit."
   - "components/ui is shadcn output and components/smoothui is a registry copy. A split of generated code is lost on the next generate."
alternatives:
      - { option: "Tune the sensor card for the viewer instead of refactoring to the limits", rejected_because: "It hides the debt behind a higher limit and leaves 1,560-line files." }
      - { option: "Split by smell, one epic per smell across the whole repo", rejected_because: "It reopens each of the 70 viewer files once per smell and mixes the viewer with the Python scripts. By-area keeps one surface stable." }
      - { option: "Refactor the whole repo now, Python and cobuilder-memory included, in one epic", rejected_because: "It widens the blast radius to 129 more files across the plugin families, which ADR-0016's seam keeps separate." }
      - { option: "Leave the viewer's 1,080 comment findings out of the viewer epic", rejected_because: "They are two thirds of the viewer's findings, so the viewer would never read clean. Per-comment review keeps every comment that explains why." }
delivers:
  capability: "The viewer carries no habit-hooks finding, and a later pass opens the second epic by name from the catalog."
  benefit: "The standing scan becomes a work queue. Each cluster has a verdict, and the viewer is small and stable."
  beneficiary: [developer]
  enables: ["a later pass cuts the remaining-findings epic into slices", "a later decision settles the comment habit outside the viewer"]
provenance: authored
history:
   - { state: decided, date: 2026-10-25, by: engineer, note: "Decided in session: two epics, the viewer cut into seven slices and the rest cut later. The generated components/ui and components/smoothui folders leave the scan. The viewer comments go in the last two slices, with a per-comment review." }
related_decisions:
   - { type: depends-on, target: ADR-0038 }
   - { type: depends-on, target: ADR-0023 }
   - { type: is-related-to, target: ADR-0016 }
   - { type: is-related-to, target: ADR-0020 }
related:
   - "docs/architecture/designs/mechanical-smells/findings-catalog.md"
   - "docs/architecture/designs/mechanical-smells/goal.json"
---

# ADR-0046 — the habit-hooks findings become a catalog and two epics

## Context

ADR-0038 made the habit-hooks scan a standing check that review and maintenance run, and `shared/habit_smells.py` writes its result to `docs/architecture/review/habit-smells.json`. A standing check that only reports never resolves. A full-tree run of `habit-sensors --all` reports 2,459 findings across 14 smells. The engineer then excluded two generated viewer folders in `.habit-hooks/config.toml`, which leaves 2,340 findings.

The viewer under `plugins/artifact/viewer/` holds 1,637 of them, in 70 files. That is 70% of the total, and 50% of the findings that are not comments. Comments are 1,080 of the viewer's findings. The remaining 557 are structural, import, type, and React-lint findings. The same files top every limit at once: `sections.tsx` has 20 oversized functions and 3 complex paths, and `App.tsx` is 1,560 lines with 11 oversized functions and 7 duplicate imports.

The other 703 findings sit in 129 files: `cobuilder-memory` holds 460, and the Python scripts, the root tests, and the duplicated code hold the rest.

The viewer's export surface is large and imported widely. `model.ts` exports more than 40 names, `atoms.tsx` exports the UI vocabulary, `sections.tsx` exports the seven section renderers, and `App.tsx` exports `ShellApp` and the `Theme` type. A split must keep these names or the tests that import them break.

The folder `components/ui` is shadcn output, and `components.json` configures it. The folder `components/smoothui` holds five registry components. They hold 117 findings, and a regenerate would undo any split.

## Options considered

1. **Tune the sensor card for the viewer.** It hides the debt behind a higher limit and leaves 1,560-line files. Rejected.
2. **Split by smell, one epic per smell across the whole repo.** It reopens each of the 70 viewer files once per smell and mixes the viewer with the Python scripts and the cobuilder-memory tests. By-area keeps one surface stable. Rejected.
3. **Refactor the whole repo in one epic.** It widens the blast radius to 129 more files across the plugin families, and ADR-0016 keeps the plugins as a bundle seam. Rejected.
4. **Leave the viewer's comments out of the viewer epic.** They are two thirds of the viewer's findings, so the viewer would never read clean. Rejected. The first draft deferred them, because deleting comments on a scan verdict is not safe. A per-comment review answers that risk.
5. **A catalog, a viewer epic cut into slices, and a second epic cut later. Chosen.** It clears one district, keeps the export surface stable, and leaves the rest as named work.

## Decision

1. **The catalog.** `docs/architecture/designs/mechanical-smells/findings-catalog.md` holds the scan, the 14 smells with counts, the seven clusters, and a verdict per cluster. A later pass opens the catalog, not a fresh scan.
2. **The exclusion.** `.habit-hooks/config.toml` lists the python and typescript globs in full and excludes `components/ui` and `components/smoothui`. A root `files` key replaces the plugin defaults, so the list repeats them.
3. **Epic one, `viewer-findings`.** It clears every viewer finding in seven slices: the logic layer, the atoms and sections, the change surface, the shell and chrome, the test files, the comments in source, and the comments in tests. The logic layer comes first, because pure logic proves a split keeps behavior with the vitest suite alone. Each slice keeps the export names and re-exports the moved units.
4. **The limits.** The file limit of 200 lines and the complexity limit of 10 are hard. The 12-line function limit is a recorded exception: a 13-to-30-line component or test callback that is one unit may stay, and the catalog names it. A file is done when `habit-sensors` reports no finding for it, apart from that recorded residual.
5. **The comment slices.** Each flagged comment is deleted, or kept and reworded when it explains why. A reviewer samples each slice. More than one deleted comment in twenty that explained why fires the abort condition.
6. **Epic two, `remaining-findings`.** It holds the 703 findings outside the viewer, in named groups with a count and an approach each. It has no slices. A later pass cuts them.
7. **Out of scope.** Any change to what the generation scripts write into the bundle, and any change to the generated viewer folders.

## Consequences

- **Positive:** the standing scan becomes a work queue. Each cluster has a verdict, and the viewer is small and stable.
- **Constraint introduced:** the viewer's public surface is its contract. A split keeps every export name and re-exports the moved units, and a viewer file is done when `habit-sensors` reports no finding for it. This matches `maps_to.rule` and the `artifact` context.
- **Negative / accepted:** a split that moves an export breaks the tests that import it, so the abort condition on a moved export guards every slice. The 12-line exception lets some units stay larger than the limit. The config now repeats the plugin globs, so a change to the plugin defaults does not reach this repo.
- **Negative / accepted:** epic two has no slices, so it can stall. The catalog and the tracker keep it in view.

## Value delivered

- **New capability:** the viewer carries no habit-hooks finding, and a later pass opens the second epic by name from the catalog.
- **Benefit:** the standing scan becomes a work queue. Each cluster has a verdict, and the viewer is small and stable.
- **Beneficiary:** the developer who changes the viewer.

## Maps to

Context `artifact`, modules `plugins/artifact/viewer/src/shell/model.ts`, `.../atoms.tsx`, `.../sections.tsx`, `.../App.tsx`, the sensor config `.habit-hooks/config.toml`, and the catalog under `docs/architecture/designs/mechanical-smells/`. See the boundary record's rule and the `artifact` context canvas.
