# Assessment — Branch design-design-mode

**Verdict:** Concerns
**Risk tier:** Architectural
**Stage:** pre-merge
**Author-flagged unknowns:** 4 (raises the tier by one step)

## Summary

The change solves the stated problem and now also carries a five-plugin split, three new ADRs, a
viewer regression repair, a retired sheet, and a real gate-enforcement fix. It is a very large
architectural PR that mixes many decisions. A reviewer should read ADR-0011, ADR-0014, ADR-0015,
ADR-0016, ADR-0017, ADR-0018, ADR-0019, and ADR-0020 as the map, not the full diff, and should
treat the uncommitted portion of the branch as part of the review.

## Question 1 — is this sensible?

Yes, against the author's stated problem. Design time is the missing moment, and the branch's
later work — the plugin split, Gate 4b enforcement, the viewer defects — grew directly out of
using design mode across five epics, not from scope creep unrelated to the original problem. The
problem belongs in this plugin family: the interview, the bundle, and the viewer already live
here.

Evidence: `ADR-0011` `ADR-0014` `ADR-0015` `ADR-0016` `ADR-0017` `district:skills`

## Question 2 — maintainability and readability

Helps the long term: one organising rule (authored docs/, derived bundle), one ADR schema, five
named plugins sharing a bundle seam, one shared slice-table parser replacing three regex sets
that had already drifted, and a gate script that fails loud instead of skipping silently. Hurts
the review of this PR: scripts, skills, commands, viewer, both fixtures, and now five plugin
directories move or split together, on top of a large uncommitted tail. A later session can
change one of those decisions only by reading several ADRs, which is the point of writing them.

**Constraint introduced:** Authored source lives in docs/. Derived projections live in the
bundle. Architecture modes refuse a foreign target. Design-time ADRs are decided until a human
merge stamps approved_by. No plugin's script or skill names another plugin's path directly;
shared code is vendored by symlink (ADR-0017). The viewer stays one committed file, but authoring
narrows to parts under viewer/src/ compiled at author time, never at install or in the browser
(ADR-0020). Gate 4b for a multi-slice epic must produce a real design file with all required
sections and a recorded approval, or verify_gate.py exits non-zero.

Evidence: `ADR-0014` `ADR-0016` `ADR-0017` `ADR-0020` `shared/slice_table.py`
`plugins/cobuilder-implement/scripts/verify_gate.py` `shared/build_index.py`

## Question 3 — new pattern, duplicate, or reinvention?

**New pattern, and it earns its place**

Design mode extends submit's intent capture earlier in time. The full-rebuild projection already
existed for diagrams; ADRs and designs now follow it, and pr-draft.md now projects into the
design record for the first time. The five-plugin split with shared/ vendored by symlink is a new
packaging pattern in this repo, and it earns its place because a single plugin could not keep
growing without a seam between its modes. The slice_table.py consolidation applies the same
insight to parsing: one parser instead of three that had already drifted and corrupted 14 slice
records.

Evidence: `ADR-0005` `ADR-0011` `ADR-0016` `ADR-0017` `shared/build_index.py`
`shared/slice_table.py`

## Will we regret this?

If this merges as one PR, the team inherits a plugin rename, a new authored-docs root, a five-way
plugin split, three new architecture ADRs, and a viewer regression repair at the same time. Six
months later, a session that wanted only design mode cannot revert the rename or the split
without moving every bundle and every plugin.json. The mitigation is already in the ADRs: they
separate the decisions in writing, even though the diff does not separate them in commits. The
remaining regret is operational: existing installs must follow the GitHub redirect, leftover
.prodyssey/ directories must migrate, and the plugin-split epics must clear Gate 4b before anyone
treats that split as done. A second, quieter regret is that `refine_epic_status()`'s placeholder
for open pull requests could silently go stale the next time an epic's linked PR number changes,
since nothing currently derives that value.

## Findings

| Severity | Finding | Evidence |
|---|---|---|
| concern | This PR ships far more than design mode: a five-plugin split, three new ADRs, a viewer regression repair, a retired sheet, and gate enforcement. A reviewer who treats it as design-mode-only will miss most of the structural change. | `ADR-0011, ADR-0014, ADR-0015, ADR-0016, ADR-0017, ADR-0018, ADR-0019, ADR-0020` |
| concern | ADR-0004 remains state approved and still says ste-writing stays off the install surface. ADR-0015 notes the clause is no longer current but does not reject ADR-0004. | `ADR-0004` |
| concern | Gate 4b fails today for five plugin-split epics (E1, E3, E4, E5, E6). The plugin-split design that this branch's own work depends on has not cleared the gate it enforces. | `plugins/cobuilder-implement/scripts/verify_gate.py` output |
| note | `refine_epic_status()` leaves a hardcoded placeholder for any epic pointing at an open pull request, because `collect_pull_requests()` reads only narrated merged pull requests from data/story.json. Eight epics point at pull request 11, which is not an entity in the record index, and the value reads correctly today by luck rather than derivation. | `shared/build_index.py:791-797, 641` |
| note | ADR-0020 records a decision to split the viewer into authored parts under viewer/src/, but the split has not started. The committed viewer/index.html is still one 4747-line file. | `docs/architecture/adr/ADR-0020-viewer-parts-and-an-author-time-build.md` |

**Suggestions**

- **This PR ships far more than design mode.** — Read the eight decided or tentative ADRs first,
  in the order they were written. Do not review the full diff as one story.
- **ADR-0004 contradicts ADR-0015 on ste-writing's install-surface status.** — On merge, add a
  history entry on ADR-0004 or mark the install-surface clause superseded.
- **Gate 4b fails for five plugin-split epics.** — Track the five missing epic-design documents
  as explicit follow-up work, distinct from this PR, and do not treat the plugin split as
  gate-complete until they exist and are approved.
- **The open-pull-request epic status is a placeholder, not a derivation.** — Treat this as a
  known gap. A future change should make `collect_pull_requests()` aware of open pull requests,
  or explicitly document why an open-PR epic status is out of scope for the record index.
- **The viewer-parts split is decided but not started.** — Keep the maintainable-viewer design's
  scope visible as backlog, not as something this PR already delivers.

## Boundary checks

| Result | Rule | Source | Evidence |
|---|---|---|---|
| not-checkable | Inner layers never import outer layers (HTTP, UI, DB drivers, framework code). | `stacks/generic.md` | `This plugin family has no domain package that must not import I/O. skills/ and scripts/ both read the filesystem by design.` |
| pass | Configuration crosses into code in one place, not scattered env reads. | `stacks/generic.md` | `GEMINI_API_KEY still resolves only in generate_audio.py and generate_prompts.py, unchanged from before this branch. Design and submit do not add a second key lookup.` |
| pass | No plugin's script or skill file names another plugin's plugins/<other-name>/... path directly. | `ADR-0016` | `plugins/cobuilder-architect/shared and plugins/cobuilder-pr/shared are symlinks to ../../shared, not literal cross-plugin references.` |

## District delta

**Districts added:** `docs`
**Edges added:** `odyssey-design-mode -> architecture-skill`, `build_adrs.py -> docs/architecture/adr`,
`cobuilder-implement/verify_gate.py -> shared/slice_table.py`, `shared/build_index.py -> shared/slice_table.py`,
`scripts/build_builds_view.py -> shared/slice_table.py`

---

_Generated by cobuilder-architect submit mode on 2026-08-25._
