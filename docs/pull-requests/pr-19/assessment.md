# Assessment — PR #19 — Gate-doc surfacing in the viewer, plus a slice-loop workflow-invocation fix

**Verdict:** Concerns  
**Risk tier:** Architectural  
**Stage:** pre-merge  
**Author-flagged unknowns:** 2 (raises the tier by one step)

## Summary

Two changes ship in one PR: the gate-doc-surfacing design (program_design/epic_design entities per ADR-0022, plus the viewer's clickable Gate Rail and design-doc chip) and an unrelated fix to plugins/implement/skills/build/workflows/slice-loop.js, found while dogfooding the implement workflow in a sister repo. Both are sound on their own; the summary finding below is that they are bundled.

## Question 1 — is this sensible?

Yes, against the stated problem for the design half: the Builds view already renders a Gate Rail and epic cards from an approval-state parse, but never the document content behind it, and this change attaches that content through the same index-projection pattern ADR-0018 already established. The slice-loop.js half is also sensible: a workflow script that can never be found (wrong Workflow-tool invocation) and can never run past its Gate 4b check (imports a Node API the runtime does not provide) is not a partially-working feature, it is dead code with tests never exercising it.

Evidence: `ADR-0018` `ADR-0022` `shared/build_index.py:discover_plan_gate_docs` `plugins/implement/skills/build/workflows/slice-loop.js`

## Question 2 — maintainability and readability

Helps: program_design/epic_design follow the same GOAL_FIELDS/project_fields(source, fields) shape every other entity in build_index.py already uses, so a future entity kind has one more precedent to copy rather than a special case to learn. The slice-loop.js fix removes a call the runtime silently could never satisfy and replaces it with an explicit caller-supplied field (epicDesignExists), which is more maintainable than a check that looked correct in isolation but failed to import at all. Hurts slightly: the PR mixes a feature and a bugfix, so `git blame` on workflows/slice-loop.js now attributes an unrelated design's commit range to a fix that has nothing to do with gate-doc surfacing.

**Constraint introduced:** A gate document's content is now reachable only through the record index (program_design/epic_design), never parsed ad hoc by the viewer. Workflow scripts in this plugin family must never import a Node.js/filesystem API; any existence check a script needs must be computed by the orchestrating session and passed in through `args`.

Evidence: `shared/build_index.py:249-250 (PROGRAM_DESIGN_FIELDS/EPIC_DESIGN_FIELDS)` `plugins/implement/skills/build/workflows/slice-loop.js (epicDesignExists)` `tests/test_build_index_gate_docs.py`

## Question 3 — new pattern, duplicate, or reinvention?

**Conforms to an existing pattern**

program_design/epic_design entities are a new kind, but they use the same project_fields(source, fields) projection every existing entity (GOAL_FIELDS, EPIC_FIELDS, INTENT_FIELDS, ASSESSMENT_FIELDS) already uses, and resolve_feature_gates() attaches the doc reference to the existing Gate 3 status parse rather than adding a parallel one. The slice-loop.js fix conforms to the Workflow tool's own documented contract (scriptPath for a plugin-shipped script, no filesystem access in the script body) rather than inventing a workaround.

Evidence: `shared/build_index.py:246-250` `shared/build_index.py:1073-1090 (resolve_feature_gates)`

## Will we regret this?

If this merges as written, the team gains a real gate-doc reading surface in the viewer and a workflow-invocation fix that unblocks the next multi-epic program-scale build, at the cost of a PR whose git history reviewers must read as two stories, not one. The likelier six-month regret is narrower: the inventory.yaml staleness noted above means the next assessment on this branch's district (or any branch touching plugins/) keeps approximating districts by path instead of reading a derived baseline, and that approximation compounds each time nobody re-runs baseline mode. A second, smaller regret is that the slice-loop.js fix has no automated coverage of its own; if a future edit reintroduces a Node API import above the meta literal, only the next real program-scale build will catch it, at the cost of a wasted Workflow invocation rather than a fast test failure.

## Findings

| Severity | Finding | Evidence |
|---|---|---|
| concern | This PR bundles two unrelated changes: the gate-doc-surfacing design (six commits) and a fix to plugins/implement/skills/build/workflows/slice-loop.js's Workflow-tool invocation and filesystem-access bug (one commit), found incidentally while using the plugin in a different repo. A reviewer who reviews only the design will miss the workflow fix, and vice versa. | `git log master..design/gate-doc-surfacing --oneline (7 commits: 6b89c69 through 210676c)` |
| note | .cobuilder-architect/self/inventory.yaml still lists the pre-plugin-split districts (skills, scripts, commands, viewer, docs, .cobuilder-architect) rather than the current plugins/{architect,pr,artifact,implement,cobuilder-full-lifecycle}/ layout, so the district delta and boundary checks below are approximated by path rather than derived from a current baseline. | `.cobuilder-architect/self/inventory.yaml:4-27 (dated 2026-08-19, predates the plugin-prefix-drop rename)` |
| note | No automated test exercises the corrected Workflow-tool invocation (scriptPath vs name) or the new epicDesignExists caller contract, because doing so requires the Workflow tool's own runtime, which the repo's pytest suite does not have access to. | `plugins/implement/skills/build/workflows/slice-loop.js (no matching tests/ file)` |

**Suggestions**

- **This PR bundles two unrelated changes: the gate-doc-surfacing design (six commits) and a fix to plugins/implement/skills/build/workflows/slice-loop.js's Workflow-tool invocation and filesystem-access bug (one commit), found incidentally while using the plugin in a different repo. A reviewer who reviews only the design will miss the workflow fix, and vice versa.** — Accept as one PR since the fix is already committed on this branch and splitting it now means branch surgery, but call out the workflow fix explicitly in the PR description so a reviewer does not read it as part of the gate-doc-surfacing design.
- **.cobuilder-architect/self/inventory.yaml still lists the pre-plugin-split districts (skills, scripts, commands, viewer, docs, .cobuilder-architect) rather than the current plugins/{architect,pr,artifact,implement,cobuilder-full-lifecycle}/ layout, so the district delta and boundary checks below are approximated by path rather than derived from a current baseline.** — Re-run baseline mode against the current tree so future assessments do not have to approximate district names.
- **No automated test exercises the corrected Workflow-tool invocation (scriptPath vs name) or the new epicDesignExists caller contract, because doing so requires the Workflow tool's own runtime, which the repo's pytest suite does not have access to.** — Treat the next real program-scale build (multiple epics per 04-slices.md) as the practical verification of this fix, since that is the first scenario that will actually invoke the workflow.

## Boundary checks

| Result | Rule | Source | Evidence |
|---|---|---|---|
| not-checkable | Inner layers (domain, business logic) never import outer layers (HTTP, UI, DB drivers, framework code). | `stacks/generic.md` | `This plugin family has no domain/adapter split to grep for; shared/build_index.py and the workflow script both read the filesystem and the plans directory by design.` |
| pass | Configuration crosses into code in one place, not scattered env reads. | `stacks/generic.md` | `Neither half of this diff adds a new environment-variable read; grep for os.environ / os.getenv in the diff hunks returns nothing.` |
| pass | No plugin's script or skill file names another plugin's plugins/<other-name>/... path directly. | `ADR-0016` | `grep of the diff for plugins/(architect\|pr\|artifact\|implement\|cobuilder-full-lifecycle)/ hits only each file's own plugin path (plugins/artifact/viewer/index.html, plugins/implement/skills/build/...), never a cross-plugin reference.` |

## District delta

**Districts added:** `shared/build_index.py:program_design,epic_design entities`
**Edges added:** `shared/build_index.py -> docs/plans/<slug>/03-program-design.md,epic-<id>-design.md`, `plugins/artifact/viewer/index.html -> window.INDEX.entities.program_design,epic_design`

---

_Generated by pr generate mode on 2026-09-03._
