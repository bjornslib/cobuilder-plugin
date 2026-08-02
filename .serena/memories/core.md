prodyssey: a Claude Code plugin (`.claude-plugin/`), not an app with build/test/deploy. Turns merged PRs of any locally checked-out git repo into a 4-level narrated "codebase odyssey" (scene art, voice narration, retro ADRs) viewable in a portable HTML viewer.

Layout:
- `.claude-plugin/` — manifest (plugin.json) + marketplace.json
- `commands/` — thin dispatchers (baseline.md, generate.md, view.md, publish.md) → Skill("odyssey", args=...)
- `skills/odyssey/SKILL.md` — orchestration source of truth: prereq gate → baseline → per-PR sweep → view → publish → verify
- `skills/odyssey/references/` — loaded on demand (story-mode, decision-records-lite, baseline-derivation, adr-template, stacks/*)
- `scripts/` — 8 PEP-723 uv scripts (top-level, sibling of skills/, called via `${CLAUDE_PLUGIN_ROOT}/scripts/...`, never edited by the skill itself): extract_story.py, generate_prompts.py, generate_audio.py, extract_diffs.py, verify_bundle.py, export_artifact.py, export_index.py, record_publish.py
- `viewer/index.html` — the bundle viewer, ~2000 lines, single file, NOT self-contained (see `mem:viewer`)

`skills/` and `commands/` are auto-discovered — manifest doesn't declare them.

No test suite, no CI config, no package manager — this is prose + Python scripts + one HTML file.

For generation pipeline details: `mem:generation`.
For output/bundle directory shape and storage rules: `mem:bundle_output`.
For the viewer's external-file dependencies and the artifact-publish feature: `mem:viewer`.
For writing-style conventions (STE): `mem:conventions`.
For the repo's own PR history (this repo self-analyzes itself as an odyssey bundle at `.prodyssey/self/data/story.json`): `mem:pr_history/pr_1` covers the --repo central-store test-fixture PR (cobuilder-harness/digital-curator bundles + view command); `mem:pr_history/pr_2` covers the CLAUDE.md + artifact-publish-pipeline PR — read it for the ADR-0001/ADR-0002 rationale behind the publish feature.