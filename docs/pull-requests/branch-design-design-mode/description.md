# Branch design-design-mode

## Problem

The plugin captured author intent at submit time, after the change existed. Nothing captured it
at design time, when the engineer still held the alternatives, the constraints, and the doubts.
Generate mode then reconstructed intent from merged code. Once design mode landed, three more
problems surfaced from using it: the single plugin could not scale to five modes without one
lifecycle surface to route them, the viewer had grown to 4917 lines with no committed way to
split it, and a documented process gate — Gate 4b, a design per multi-slice epic — ran for zero
of the epics that needed it, because nothing downstream mechanically required its output.

## Why this approach

Merge archkit main into this plugin, rename it cobuilder-architect, put authored source in
docs/, and add /cobuilder-architect:design. One design joins N pull requests through an epics
array and the branch name design/<name>[/<epic-slug>]. Submit loads that design's intent instead
of interviewing cold.

The branch then split the one plugin into five siblings under plugins/ — cobuilder-architect,
cobuilder-pr, cobuilder-artifact, cobuilder-implement, cobuilder-full-lifecycle — with the bundle
as the seam between them (ADR-0016), and vendored shared code by symlink so no plugin names
another plugin's path directly (ADR-0017). ADR-0018 gives the family one lifecycle surface with
realization derived from pull request state, never declared on a record. ADR-0019 adds anchored
comments as a durable ledger. ADR-0020 records the plan to author the viewer as parts under
viewer/src/ and compile them at author time, never at install and never in the browser, so the
build-free rule narrows instead of breaking. That plan is decided; the split itself has not run
yet, and the committed viewer/index.html is still one file.

Alongside those decisions, the branch fixed a viewer layout defect (the content column reached
only 444px of 1216px), repaired a regression where the #adr-sheet and #assessment-sheet markup
was deleted while its script and CSS survived, retired the Designs sheet in favor of two ported
sections in the Designs tab, closed the Gate 4b gap with a script that fails loud instead of
skipping, and replaced three divergent slice-table regex sets with one shared parser.

## Alternatives considered

- **Put design mode in archkit instead** — rejected because the interview, bundle, diagrams, and
  viewer live here. archkit's contribution is one skill call.
- **Keep archkit a soft, optional dependency** — rejected because a design mode whose corpus is
  optional degrades into a chat.
- **Ask which options they rejected, as an interview question** — rejected because a rejected
  option is an outcome of explore and challenge, not an input.
- **Mint a synthetic PR key so a design enters story.json** — rejected because four readers
  require a real integer pr.
- **Keep a lite JSON ADR store next to full markdown** — rejected because two stores drift.
  Architecture modes are self-only, so the foreign-repo premise is gone.
- **Leave designs and PR documents in exports/** — rejected because exports/ is the publish
  pipeline. Authored intent belongs in docs/.
- **Split the viewer into real sibling files loaded by script and link tags** — rejected because
  a published Artifact is a single file under a CSP that blocks every external request, and
  export_artifact.py inlines data because sibling files do not survive publishing (ADR-0020).
- **Adopt a bundler such as esbuild or Vite for the viewer** — rejected because it adds a Node
  toolchain to a repository of prose, Python scripts, and one HTML file. Concatenation of ordered
  parts is the whole requirement (ADR-0020).
- **Let a status file assert Gate 4b ran, on trust** — rejected because that is exactly how the
  gate went unenforced for five epics. A script that exits non-zero replaces the honor system.

## Out of scope

- opening a pull request from design mode
- pushing a branch or any other remote action from design mode
- element-level annotation or a send-to-agent channel in the viewer
- renaming the GitHub repository (the plugin and bundle directory are renamed; GitHub redirects)
- deciding the fate of the archkit repository
- foreign-repo architecture analysis
- epic decomposition (cobuilder-factory G1)
- actually splitting viewer/index.html into viewer/src/ parts (ADR-0020 records the decision;
  the split itself is a separate, not-yet-started change, tracked by the maintainable-viewer
  design)
- writing Gate 4b design documents for the plugin-split epics (the enforcement script now exists
  and correctly fails; writing the five missing designs is separate follow-up work)

## Risks

- a very large diff mixes rename, merge, store move, design mode, a five-way plugin split, and
  three ADRs, so a reviewer cannot isolate one decision
- ADR-0004 still says ste-writing is off the install surface
- a toothless challenge stage leaves an ADR with one option
- the designs view ships thinner than the PR view unless the three-level chrome lands
- Gate 4b fails today for five epics (plugin-split E1, E3, E4, E5, E6). That failure is the
  intended, honest state, not a bug, but it means the plugin-split design is incomplete by its
  own gate
- `refine_epic_status()` in shared/build_index.py leaves a hardcoded placeholder for any epic
  that points at an open pull request, because `collect_pull_requests()` reads only
  data/story.json, which holds narrated merged pull requests. Eight epics point at pull request
  11, which is not yet an entity in the record index, so the displayed status is correct today by
  luck of a matching hand-written value, not by derivation
- the branch carries a large amount of uncommitted work on top of its 32 commits: CLAUDE.md,
  three design goal.json files, the implement skill's references and workflow, shared/build_index.py,
  scripts/build_builds_view.py, both viewer copies, and new untracked files including the
  deny-git-stash hook, shared/slice_table.py, hindsight-routine.md, verify_gate.py, and three new
  test files

## How this was tested

verify_bundle on the self bundle and both fixtures. build_adrs.py and build_designs.py each run
twice. validate_decision_state.py over docs/architecture/adr/. Design resolve on this branch hits
docs/architecture/designs/design-mode/. shared/slice_table.py was proven byte-identical against
the three regex sets it replaced before the corruption it exposed was fixed as its own change.
`uv run pytest tests/ -q` passes 254 tests, including new coverage in tests/test_verify_gate.py,
tests/test_slice_table.py, and tests/test_deny_git_stash_hook.py. `uv run
plugins/cobuilder-implement/scripts/verify_gate.py --plan docs/plans/cobuilder-family` correctly
reports FAIL for Gate 4b on the five outstanding plugin-split epics.

## Where to focus

- the challenge gate in design-mode.md
- submit's branch-name lookup and per-epic drift
- authored source in docs/ versus the bundle projection
- the Designs | Pull requests switcher and the three-level design view
- ADR-0016 and ADR-0017 as the map for the five-plugin split, not the raw file-move diff
- ADR-0020's build-free narrowing, and whether the maintainable-viewer backlog design correctly
  scopes the not-yet-done part of that decision
- verify_gate.py's exit-1 behavior for Gate 4b, and whether slice-loop.js now stopping instead of
  skipping is the right failure mode for every caller
- the #adr-sheet / #assessment-sheet regression repair, to confirm nothing else was silently
  broken by the same commit that deleted the markup
- `refine_epic_status()`'s placeholder for open pull requests, since it is the one place the
  record index currently reads correctly by coincidence

The author flagged these parts as not fully understood:

- whether a semantic duplicate-design search is accurate enough
- how much the architecture skill slows a plugin install
- whether GitHub marketplace redirects cover every existing prodyssey install
- whether the Gate 4b enforcement script should also run automatically at a point earlier than
  slice-loop.js discovering the gap mid-loop

---

_Authorship: agent-assisted._
