# PR #1 — updated skills and locally generated assets for pull requests for artefact publishing

Status: merged (2026-07-22T02:27:30Z), commit 66782c79db859c8a360a8e91bb7cf47352a73134 (single commit), merged via 7bd668f "Merge pull request #1 from bjornslib/master". Size: 29 files, +6159/-40.

This PR is the demo/dogfooding proof for `--repo` external-checkout targeting: it commits two centrally-stored test-fixture bundles generated against OTHER local repos —
- `.prodyssey/cobuilder-harness-a103a550/` (data/story.json+story.js+manifest.js, viewer/index.html, assets/pr-1/level-{1,2,3}.png — no audio/diffs/ADRs generated for this one)
- `.prodyssey/digital-curator-80f83abb/` (full bundle: story.json/js, manifest.js, adrs.json/js, diffs-pr1.js, prompts.json, inventory.yaml, viewer/index.html, audio/pr1_{landscape,architecture,problem_solution}.wav)

These are the same two fixture dirs documented in `mem:bundle_output` as deliberately-committed test fixtures, not stale cache — this PR is where they were created.

Also touches: README.md (+47/-… section), `commands/view.md` (new — the view-server command), `skills/odyssey/SKILL.md` (+279 lines), `skills/odyssey/references/story-mode.md` (+58/-…). Also adds `.prodyssey/.view-server.log`, `.prodyssey/.view-server.pid`, `.prodyssey/active` symlink — the 3 bookkeeping entries later noted as candidates for gitignore (per `mem:bundle_output`), and removes a `.gitignore` line (stopped ignoring these paths so they'd commit).

Net effect: this PR is what actually exercises and proves the Hub-resolution `--store central` path end-to-end (two foreign repos' bundles landing in this hub's `.prodyssey/<repo-slug>/`), plus ships the `view` command for serving a bundle locally.