# Status: Fix plugin-name/skill-name collisions

Fast-tracked: full product/architecture/program-design already settled through
direct conversation (see chat history), not re-interviewed. Gate 4c's
behavioral-rubric case applies to the two remaining SKILL.md renames, per the
exception in plugins/implement/skills/build/SKILL.md's "When to run the gates"
section.

Design mode: none, declined (no /architect:design record exists for this fix)

- Gate 1-3: n/a, superseded by direct conversation record
- Gate 4 — Slice plan, epic designs, and rubrics: in progress
  - 4a Slice plan: APPROVED (below)
  - 4b Epic technical solution designs: n/a (single-epic, single-slice-per-item work)
  - 4c Blind rubrics: in progress

## Slices
- [x] Slice 1 — rename artifact's skill (artifact -> cobuilder-artifacts)   score: PASS (Gate 4c blind check)
- [x] Slice 2 — rename cobuilder-full-lifecycle's skill (orientation -> cobuilder-full)   score: PASS (Gate 4c blind check)
- [x] Slice 3 — ADR-0016 addendum + plugin-split epic E8   score: n/a (documentation, not a behavioral-rubric slice)

## Gate 4c evidence

A fresh subagent, given only the shipped plugin.json/commands/*.md/SKILL.md
files and no memory of this conversation, was asked to trace what Skill()
call each of /artifact:view and /implement:start actually makes, and to
check every one of the five plugins for a name collision against its own
skills/commands. Result: both traced calls match their skill's declared
frontmatter name exactly, and all five plugins pass the no-collision check
(architect, pr, artifact, implement, cobuilder-full-lifecycle). Full test
suite: 309/313 passing (4 failures are a pre-existing local Pillow
architecture mismatch, unrelated).

Design mode: none, declined
Hindsight: not checked (bug-fix work, not a new feature)

## Notes for a fresh session
This fixes a real bug: renaming a plugin to the same name as its own skill
folder breaks Skill() resolution in Claude Code (reproduced live). The
implement plugin's own skill/command were already fixed (implement -> build,
implement.md -> start.md) in a prior bootstrap step, outside this plan
directory, before this plan was created.
