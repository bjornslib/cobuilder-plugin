# Epic Technical Solution Design: E1 — One plugin becomes five

Feature: cobuilder-family
Epic ID: plugin-split/E1

This design was written on 2026-08-25, after this epic's four slices were
built and accepted. Gate 4b did not run before implementation, so this
document records the design as built. It did not constrain the work. The
rubrics for this epic in `.cobuilder/rubrics/cobuilder-family/` were
derived without a written 4b design in hand.

## Scope and Intent

E1 turns one plugin into five sibling plugins under `plugins/`, each with
its own `.claude-plugin/plugin.json`, `commands/`, `skills/`, and `scripts/`.
It renames three modes inside the single plugin first, deletes the
duplicate `explore-design` command, fixes 33 cross-pillar references, then
splits the tree into five manifests, and ports two skills in from outside
the repository. ADR-0016 decided the five-way split. ADR-0017 decided the
vendoring mechanism E1 relies on but does not itself implement (E2 proves
it, E3 gates it).

## Files Touched

The whole split landed in commit `4156641` ("Slice 10 change"), together
with parts of E3, E4, and half of E5. `git show --stat 4156641` lists the
full file move. The load-bearing paths today are:

- `.claude-plugin/marketplace.json` — one file, five plugin entries.
- `plugins/cobuilder-architect/.claude-plugin/plugin.json`,
  `plugins/cobuilder-pr/.claude-plugin/plugin.json`,
  `plugins/cobuilder-implement/.claude-plugin/plugin.json`,
  `plugins/cobuilder-artifact/.claude-plugin/plugin.json`,
  `plugins/cobuilder-full-lifecycle/.claude-plugin/plugin.json` — one
  manifest per plugin.
- `plugins/cobuilder-architect/commands/{design,review,maintenance,
  decisions,describe,debug}.md` — six modes, `explore-design.md` deleted.
- `plugins/cobuilder-architect/skills/architecture/` — moved from the
  repository root, unchanged in content apart from path updates.
- `plugins/cobuilder-pr/skills/odyssey/` — the renamed modes: the old
  `submit` became `generate`, and the old `generate` became `review`.
- `plugins/cobuilder-artifact/scripts/{serve_bundle.py,export_artifact.py,
  export_index.py,record_publish.py}` and
  `plugins/cobuilder-artifact/viewer/index.html`.
- `plugins/cobuilder-full-lifecycle/skills/orientation/SKILL.md` and
  `plugins/cobuilder-full-lifecycle/scripts/watch_feedback.py`.
- Each plugin carries a `shared` symlink at its own root, verified by
  `test_shared_is_a_symlink_in_the_source_tree` in
  `tests/test_plugin_manifests.py`.

## Types & Signatures

E1 carries no new Python functions of its own. Its unit of work is the
manifest and the command dispatch line, not a function signature. The
contract each command file holds is a one-line `Skill(...)` dispatch, for
example `plugins/cobuilder-architect/commands/design.md` dispatching
`Skill("architecture", args="design $ARGUMENTS")`. `tests/test_commands.py`
asserts this shape directly:

```python
def test_command_dispatches_to_a_declared_mode(command_path): ...
def test_explore_design_command_does_not_exist(): ...
def test_no_two_commands_in_the_same_plugin_dispatch_identically(): ...
def test_cobuilder_pr_ships_its_own_review_command(): ...
def test_architecture_skill_declares_exactly_six_modes(): ...
```

## Slice Decomposition

Per `docs/plans/cobuilder-family/04-slices.md`, in build order:

1. **Slice 4 — renames inside today's single plugin.** No dependency. Six
   architecture modes land, `explore-design` is deleted, `submit` becomes
   `generate`, and the old `generate` becomes `review`. Completed on attempt
   2, score 1.00.
2. **Slice 5 — the 33 cross-pillar references are fixed.** Depends on
   slice 4 naming the modes the references must point to. The regression
   test runs and passes while the repository is still one plugin, so it
   guards the split rather than reporting on it. Completed on attempt 3,
   score 1.00.
3. **Slice 6 — five plugins, five manifests.** Depends on slices 4 and 5.
   `claude plugin validate` passes on each, and the family installs.
   Completed, score 1.00.
4. **Slice 7 — the two ports land.** Depends on slice 6 existing so the
   ported skills have a plugin to land in. `cobuilder-implement` is renamed
   and shipped, `collaborate-with-user` folds into `cobuilder-artifact`,
   and the orientation skill is written. Completed, score 1.00.

## Test Plan

- `tests/test_plugin_manifests.py` — `test_manifest_parses_and_has_
  required_fields`, `test_no_agent_hook_or_mcp_server` (asserts none of the
  five plugins declares an agent, a hook, or an MCP server, per the
  installation rule in `CLAUDE.md`), `test_marketplace_lists_all_five_
  plugins`, `test_umbrella_plugin_depends_on_the_other_four`, and
  `test_shared_is_a_symlink_in_the_source_tree`.
- `tests/test_commands.py` — the eight assertions listed above, covering
  the rename, the deletion, and the one-dispatch-per-command rule.
- `tests/test_pillar_boundaries.py` — `test_no_cross_pillar_references_in_
  repo` is the regression test slice 5 exists to write. It greps every
  plugin for `${CLAUDE_PLUGIN_ROOT}/skills/<other pillar>` and fails on a
  hit. The file also carries thirteen evasion tests (`test_evasion_*`)
  covering relative paths, backslashes, mixed case, and files outside the
  original allowlist.
- `tests/test_script_references.py` — `test_runnable_commands_name_
  existing_scripts` checks that a script path named in prose actually
  exists on disk after the move.

## Risks & Open Questions

- **The split landed inside a much larger commit.** `4156641` also carries
  parts of E3, E4, and half of E5. There is no commit boundary that isolates
  E1 on its own, so `git show --stat` on that one commit is the closest
  thing to an E1-only diff, and it is not a clean one.
- **`plugins/cobuilder-full-lifecycle/scripts/watch_feedback.py` exists.**
  `03-program-design.md`'s Files section proposed `scripts/watch_feedback.py`
  under `cobuilder-artifact`. The shipped location is under
  `cobuilder-full-lifecycle` instead. This is a placement drift from the
  program design, not a defect, and no ADR records the reason for the
  change.
- **No commit is titled after E1 or after any of its four slices by name.**
  The slice table's "completed" status and the rubric scores are the only
  record that ties specific work to specific slice numbers. A future
  session auditing this epic has to read `04-slices.md` and the rubric
  files, not `git log`, to find slice boundaries.
