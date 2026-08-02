# Bundle output shape & storage rules

Hub resolution (exact rule + slug derivation lives in `skills/odyssey/SKILL.md` "Hub resolution" section):
- Self-analysis (no `--repo`, or `--repo` resolves to session's own checkout) → `<target>/.prodyssey/self/`
- Foreign repo (via `--repo`) → `<hub>/.prodyssey/<repo-slug>/`, where `<hub>` is the session's OWN repo, never the foreign one
- `--store local|central` overrides the automatic choice

Bundle contents:
```
<bundle-dir>/
  data/{story.json, story.js, adrs.json, adrs.js, manifest.js, diffs-pr{N}.js…, audio/pr{N}_{level}.wav}
  assets/pr-{N}/level-{1..3}.png
  inventory.yaml
  viewer/index.html
  exports/{publish-manifest.json, pr-{N}.html…, index.html}   # only after /prodyssey:publish has run
```

Everything under `.prodyssey/` is committed (not gitignored) except 3 bookkeeping entries: `.prodyssey/.view-server.pid`, `.prodyssey/.view-server.log`, `.prodyssey/active` (a symlink with an absolute path — would break in clones). Never suggest gitignoring `.prodyssey/` as a whole.

`.prodyssey/self/` = this repo's own generated bundle (tracked so engineers can review PRs as an odyssey).
`.prodyssey/cobuilder-harness-a103a550/` and `.prodyssey/digital-curator-80f83abb/` = committed TEST FIXTURES (bundles from other local repos via `--repo`), kept deliberately as demo/dogfooding data — do NOT delete as stale cache. `self` is reserved and never used as a foreign-repo slug.

Never touch anything in `<target>` outside `<target>/.prodyssey/self/` and a read-only check of `<target>/.env`; `<hub>/.prodyssey/` is also sanctioned for writes (central foreign-repo bundles + view-server bookkeeping).