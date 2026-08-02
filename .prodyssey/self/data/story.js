<<<<<<< Updated upstream
window.STORY = {"meta": {"repo": "prodyssey", "generated": "2026-07-22", "schema_version": "1.0", "title": "prodyssey — Codebase Odyssey", "description": "", "levels": ["PR Landscape", "Problem & Solution", "Architecture", "File Changes"]}, "world": {"districts": [{"id": ".prodyssey", "label": "Central Bundle Cache", "kind": "tooling", "files": 25, "blurb": "Hub-local scratch for centrally-stored bundles and view-server bookkeeping (per-repo-slug subfolders, active symlink, view-server pid/log) — currently holds test-run bundles from prior sessions committed to git rather than gitignored.", "root_paths": [".prodyssey"]}, {"id": "commands", "label": "Slash Commands", "kind": "tooling", "files": 4, "blurb": "Thin dispatchers (baseline.md, generate.md, view.md) that forward arguments straight into the odyssey skill — no logic of their own.", "root_paths": ["commands"]}, {"id": "scripts", "label": "Generation Scripts", "kind": "core", "files": 9, "blurb": "PEP 723 uv scripts doing the mechanical data movement the skill orchestrates: extract_story, extract_diffs, generate_prompts, generate_audio, verify_bundle.", "root_paths": ["scripts"]}, {"id": "skills", "label": "Odyssey Skill", "kind": "core", "files": 10, "blurb": "SKILL.md orchestration procedure plus on-demand reference docs (story-mode, decision-records-lite, baseline-derivation, adr-template, per-stack detection cards) that hold all the judgment-shaped guidance.", "root_paths": ["skills"]}]}, "timeline": [{"pr": 2, "date": "2026-07-22", "title": "docs: add CLAUDE.md with codebase orientation + artifact feasibility findings", "tagline": "This PR proposes an orientation doc, plus a full pipeline that turns any generated PR narrative into a shareable Claude Artifact.", "depth": "detailed", "size": {"files": 29, "adds": 7586, "dels": 43}, "touched": {".odyssey": 16, ".prodyssey": 3, "(root)": 2, "commands": 1, "scripts": 5, "skills": 2}, "adrs": ["ADR-0001", "ADR-0002"], "levels": {"landscape": {"narration": "This PR is now much bigger than it started: 29 files, over 7,500 lines added. It still adds the orientation doc, but the bulk of it is a new pipeline for publishing PR stories as shareable pages.", "voice": "This PR has grown well past where it started. Twenty-nine files, over seventy-five hundred lines added. It still adds the orientation doc, but most of the change is a new pipeline for publishing PR stories as shareable pages."}, "problem_solution": {"problem": "prodyssey had no in-repo orientation document (the original gap this PR set out to close), and separately, no way to share a generated PR story outside a local checkout — the bundle viewer only works served from a real `.odyssey/` directory with its sibling `data/`/`assets/` folders present, so \"send someone the story\" meant \"send someone the repo.\"", "solution": "`CLAUDE.md` covers layout, the generation flow, and the bundle shape. Alongside it, three new scripts (`export_artifact.py`, `export_index.py`, `record_publish.py`) and a new Publish mode in `SKILL.md` turn a generated PR into a self-contained HTML file — story, ADRs, diff, scene art, and narration all inlined — that Claude publishes directly as a Claude Artifact via `/prodyssey:publish`, plus an index artifact that stays current across every publish run.", "narration": "This PR still writes down how prodyssey fits together, so a session doesn't reconstruct that from scratch. It also solves a second, related problem: a generated PR story only worked if you had the repo checked out and a local server running. Now one command turns that story into a link anyone can open.", "beats": [{"kind": "background", "text": "prodyssey's only structure-documenting file was `skills/odyssey/SKILL.md`, orchestration procedure rather than repo layout or bundle-shape conventions."}, {"kind": "background", "text": "The bundle viewer (`viewer/index.html`) depends on sibling `<script src=\"../data/*.js\">` tags, relative asset/audio paths, and two external CDN requests — none of it obvious without having built and served a real bundle."}, {"kind": "intuition", "text": "Concretely: `export_artifact.py` takes the digital-curator bundle's PR #1 — three ~5MB scene-art PNGs, three narration WAVs — and produces one 8.83 MiB HTML file, under the 16 MiB Artifact cap, by recompressing the images to JPEG at 1400px/q78 (~150KB each) and embedding the audio unmodified. That file was actually published this session and renders correctly."}], "voice": "This proposes writing down how prodyssey fits together, so a session doesn't reconstruct that from scratch. It also solves a second problem: a generated PR story only worked if you had the repo checked out and a local server running. Now one command turns that story into a link anyone can open."}, "architecture": {"narration": "Two decisions here: how to make the viewer artifact-safe at all, and how to know when a published artifact needs updating.", "voice": "Two decisions here: how to make the viewer artifact-safe at all, and how to know when a published artifact needs updating.", "beats": [{"kind": "forces", "text": "Claude Artifacts enforce a strict CSP — one self-contained file, no external requests, 16 MiB cap — while the viewer was built assuming a real multi-file bundle directory."}, {"kind": "forces", "text": "`extract_story.py` already resolves a merge-commit or branch-head SHA per PR internally and discarded it; open-PR entries are explicitly not immutable, so publish-time staleness has to track the same thing the narrative does."}, {"kind": "contract", "text": "ADR-0001: inline story/manifest/diff/ADR data as literal JSON, rewrite the three relative-path touch points to read from embedded data-URI maps, drop both CDN tags, recompress images with a budget-checked retry loop."}, {"kind": "contract", "text": "ADR-0002: persist each PR's commit SHA, combine it with a content hash of the narrative/ADRs/diff in `exports/publish-manifest.json`, and only call the Artifact tool again when one of those changed — reusing the recorded URL so a republish updates in place."}, {"kind": "boundary", "text": "One artifact per PR, not a combined multi-PR export — the 16 MiB budget is comfortable for one PR's images+audio but not several. `exports/publish-manifest.json` is tracked in git, not disposable output, the same footing as `data/`/`assets/`."}]}, "file_changes": {"narration": "29 files: the orientation doc, the three new export scripts and their skill/command wiring, a couple of pre-existing scripts touched for open-PR/commit support, and the regenerated bundle output — including this PR's own just-published artifacts — for both the self-analysis bundle and one other repo's centrally-stored bundle.", "groups": [{"title": "Orientation docs", "note": "New CLAUDE.md plus README updates describing the plugin's layout, generation flow, and the new publish surface.", "files": ["CLAUDE.md", "README.md"]}, {"title": "Publish skill wiring", "note": "The new /prodyssey:publish command and its Publish-mode orchestration in SKILL.md, plus the open-PR narration-tense guidance the earlier commit added to story-mode.md.", "files": ["commands/publish.md", "skills/odyssey/SKILL.md", "skills/odyssey/references/story-mode.md"]}, {"title": "Generation + export scripts", "note": "Three new mechanical scripts implementing ADR-0001/ADR-0002, plus the extract_story.py commit-persistence addition and extract_diffs.py's earlier open-PR diff-base support.", "files": ["scripts/export_artifact.py", "scripts/export_index.py", "scripts/record_publish.py", "scripts/extract_story.py", "scripts/extract_diffs.py"]}, {"title": "Self-analysis bundle refresh", "note": "16 files under .odyssey/ — this PR's own regenerated story/diff data plus the pr-2.html and index.html artifacts actually published this session, and their publish-manifest.json record.", "files": ["data/story.json", "data/story.js", "data/manifest.js", "data/diffs-pr2.js", "data/prompts.json", "assets/pr-2/level-1.png", "assets/pr-2/level-2.png", "assets/pr-2/level-3.png", "data/audio/pr2_landscape.wav", "data/audio/pr2_problem_solution.wav", "data/audio/pr2_architecture.wav", "inventory.yaml", "viewer/index.html", "exports/pr-2.html", "exports/index.html", "exports/publish-manifest.json"]}, {"title": "Central-store proof (digital-curator)", "note": "The published artifact + index + manifest for a different repo's bundle, committed as evidence the pipeline works outside self-analysis too.", "files": [".prodyssey/digital-curator-80f83abb/exports/pr-1.html", ".prodyssey/digital-curator-80f83abb/exports/index.html", ".prodyssey/digital-curator-80f83abb/exports/publish-manifest.json"]}]}}, "status": "open", "commit": "70f51543af31cc77e1a5505a8225ba5a6c07b53e"}]};
=======
window.STORY = {
  "meta": {
    "repo": "prodyssey",
    "generated": "2026-07-22",
    "schema_version": "1.1",
    "title": "prodyssey — Codebase Odyssey",
    "description": "",
    "levels": [
      "PR Landscape",
      "Problem & Solution",
      "Architecture",
      "File Changes"
    ]
  },
  "world": {
    "districts": [
      {
        "id": ".prodyssey",
        "label": "Central Bundle Cache",
        "kind": "tooling",
        "files": 25,
        "blurb": "Hub-local scratch for centrally-stored bundles and view-server bookkeeping (per-repo-slug subfolders, active symlink, view-server pid/log) — currently holds test-run bundles from prior sessions committed to git rather than gitignored.",
        "root_paths": [
          ".prodyssey"
        ]
      },
      {
        "id": "commands",
        "label": "Slash Commands",
        "kind": "tooling",
        "files": 4,
        "blurb": "Thin dispatchers (baseline.md, generate.md, view.md) that forward arguments straight into the odyssey skill — no logic of their own.",
        "root_paths": [
          "commands"
        ]
      },
      {
        "id": "scripts",
        "label": "Generation Scripts",
        "kind": "core",
        "files": 9,
        "blurb": "PEP 723 uv scripts doing the mechanical data movement the skill orchestrates: extract_story, extract_diffs, generate_prompts, generate_audio, verify_bundle.",
        "root_paths": [
          "scripts"
        ]
      },
      {
        "id": "skills",
        "label": "Odyssey Skill",
        "kind": "core",
        "files": 10,
        "blurb": "SKILL.md orchestration procedure plus on-demand reference docs (story-mode, decision-records-lite, baseline-derivation, adr-template, per-stack detection cards) that hold all the judgment-shaped guidance.",
        "root_paths": [
          "skills"
        ]
      }
    ]
  },
  "timeline": [
    {
      "pr": 2,
      "date": "2026-07-22",
      "title": "docs: add CLAUDE.md with codebase orientation + artifact feasibility findings",
      "tagline": "This PR proposes an orientation doc, plus a full pipeline that turns any generated PR narrative into a shareable Claude Artifact.",
      "depth": "detailed",
      "size": {
        "files": 29,
        "adds": 7586,
        "dels": 43
      },
      "touched": {
        ".odyssey": 16,
        ".prodyssey": 3,
        "(root)": 2,
        "commands": 1,
        "scripts": 5,
        "skills": 2
      },
      "adrs": [
        "ADR-0001",
        "ADR-0002"
      ],
      "levels": {
        "landscape": {
          "narration": "This PR is now much bigger than it started: 29 files, over 7,500 lines added. It still adds the orientation doc, but the bulk of it is a new pipeline for publishing PR stories as shareable pages.",
          "voice": "This PR has grown well past where it started. Twenty-nine files, over seventy-five hundred lines added. It still adds the orientation doc, but most of the change is a new pipeline for publishing PR stories as shareable pages."
        },
        "problem_solution": {
          "problem": "prodyssey had no in-repo orientation document (the original gap this PR set out to close), and separately, no way to share a generated PR story outside a local checkout — the bundle viewer only works served from a real `.odyssey/` directory with its sibling `data/`/`assets/` folders present, so \"send someone the story\" meant \"send someone the repo.\"",
          "solution": "`CLAUDE.md` covers layout, the generation flow, and the bundle shape. Alongside it, three new scripts (`export_artifact.py`, `export_index.py`, `record_publish.py`) and a new Publish mode in `SKILL.md` turn a generated PR into a self-contained HTML file — story, ADRs, diff, scene art, and narration all inlined — that Claude publishes directly as a Claude Artifact via `/prodyssey:publish`, plus an index artifact that stays current across every publish run.",
          "narration": "This PR still writes down how prodyssey fits together, so a session doesn't reconstruct that from scratch. It also solves a second, related problem: a generated PR story only worked if you had the repo checked out and a local server running. Now one command turns that story into a link anyone can open.",
          "beats": [
            {
              "kind": "background",
              "text": "prodyssey's only structure-documenting file was `skills/odyssey/SKILL.md`, orchestration procedure rather than repo layout or bundle-shape conventions."
            },
            {
              "kind": "background",
              "text": "The bundle viewer (`viewer/index.html`) depends on sibling `<script src=\"../data/*.js\">` tags, relative asset/audio paths, and two external CDN requests — none of it obvious without having built and served a real bundle."
            },
            {
              "kind": "intuition",
              "text": "Concretely: `export_artifact.py` takes the digital-curator bundle's PR #1 — three ~5MB scene-art PNGs, three narration WAVs — and produces one 8.83 MiB HTML file, under the 16 MiB Artifact cap, by recompressing the images to JPEG at 1400px/q78 (~150KB each) and embedding the audio unmodified. That file was actually published this session and renders correctly."
            }
          ],
          "voice": "This proposes writing down how prodyssey fits together, so a session doesn't reconstruct that from scratch. It also solves a second problem: a generated PR story only worked if you had the repo checked out and a local server running. Now one command turns that story into a link anyone can open."
        },
        "architecture": {
          "narration": "Two decisions here: how to make the viewer artifact-safe at all, and how to know when a published artifact needs updating.",
          "voice": "Two decisions here: how to make the viewer artifact-safe at all, and how to know when a published artifact needs updating.",
          "beats": [
            {
              "kind": "forces",
              "text": "Claude Artifacts enforce a strict CSP — one self-contained file, no external requests, 16 MiB cap — while the viewer was built assuming a real multi-file bundle directory."
            },
            {
              "kind": "forces",
              "text": "`extract_story.py` already resolves a merge-commit or branch-head SHA per PR internally and discarded it; open-PR entries are explicitly not immutable, so publish-time staleness has to track the same thing the narrative does."
            },
            {
              "kind": "contract",
              "text": "ADR-0001: inline story/manifest/diff/ADR data as literal JSON, rewrite the three relative-path touch points to read from embedded data-URI maps, drop both CDN tags, recompress images with a budget-checked retry loop."
            },
            {
              "kind": "contract",
              "text": "ADR-0002: persist each PR's commit SHA, combine it with a content hash of the narrative/ADRs/diff in `exports/publish-manifest.json`, and only call the Artifact tool again when one of those changed — reusing the recorded URL so a republish updates in place."
            },
            {
              "kind": "boundary",
              "text": "One artifact per PR, not a combined multi-PR export — the 16 MiB budget is comfortable for one PR's images+audio but not several. `exports/publish-manifest.json` is tracked in git, not disposable output, the same footing as `data/`/`assets/`."
            }
          ]
        },
        "file_changes": {
          "narration": "29 files: the orientation doc, the three new export scripts and their skill/command wiring, a couple of pre-existing scripts touched for open-PR/commit support, and the regenerated bundle output — including this PR's own just-published artifacts — for both the self-analysis bundle and one other repo's centrally-stored bundle.",
          "groups": [
            {
              "title": "Orientation docs",
              "note": "New CLAUDE.md plus README updates describing the plugin's layout, generation flow, and the new publish surface.",
              "files": [
                "CLAUDE.md",
                "README.md"
              ]
            },
            {
              "title": "Publish skill wiring",
              "note": "The new /prodyssey:publish command and its Publish-mode orchestration in SKILL.md, plus the open-PR narration-tense guidance the earlier commit added to story-mode.md.",
              "files": [
                "commands/publish.md",
                "skills/odyssey/SKILL.md",
                "skills/odyssey/references/story-mode.md"
              ]
            },
            {
              "title": "Generation + export scripts",
              "note": "Three new mechanical scripts implementing ADR-0001/ADR-0002, plus the extract_story.py commit-persistence addition and extract_diffs.py's earlier open-PR diff-base support.",
              "files": [
                "scripts/export_artifact.py",
                "scripts/export_index.py",
                "scripts/record_publish.py",
                "scripts/extract_story.py",
                "scripts/extract_diffs.py"
              ]
            },
            {
              "title": "Self-analysis bundle refresh",
              "note": "16 files under .odyssey/ — this PR's own regenerated story/diff data plus the pr-2.html and index.html artifacts actually published this session, and their publish-manifest.json record.",
              "files": [
                "data/story.json",
                "data/story.js",
                "data/manifest.js",
                "data/diffs-pr2.js",
                "data/prompts.json",
                "assets/pr-2/level-1.png",
                "assets/pr-2/level-2.png",
                "assets/pr-2/level-3.png",
                "data/audio/pr2_landscape.wav",
                "data/audio/pr2_problem_solution.wav",
                "data/audio/pr2_architecture.wav",
                "inventory.yaml",
                "viewer/index.html",
                "exports/pr-2.html",
                "exports/index.html",
                "exports/publish-manifest.json"
              ]
            },
            {
              "title": "Central-store proof (digital-curator)",
              "note": "The published artifact + index + manifest for a different repo's bundle, committed as evidence the pipeline works outside self-analysis too.",
              "files": [
                ".prodyssey/digital-curator-80f83abb/exports/pr-1.html",
                ".prodyssey/digital-curator-80f83abb/exports/index.html",
                ".prodyssey/digital-curator-80f83abb/exports/publish-manifest.json"
              ]
            }
          ]
        }
      },
      "status": "open",
      "commit": "70f51543af31cc77e1a5505a8225ba5a6c07b53e"
    },
    {
      "pr": 3,
      "date": "2026-07-28",
      "title": "Unify bundle storage under .prodyssey/, self-analysis into .prodyssey/self/",
      "tagline": "Two bundle-storage roots become one: self-analysis now lands at .prodyssey/self/, right alongside the central cache it used to sit apart from.",
      "depth": "detailed",
      "size": {
        "files": 51,
        "adds": 2228,
        "dels": 428
      },
      "touched": {
        ".claude": 3,
        ".claude-plugin": 1,
        ".prodyssey": 29,
        "(root)": 3,
        "commands": 3,
        "scripts": 7,
        "skills": 5
      },
      "adrs": [
        "ADR-0003",
        "ADR-0004"
      ],
      "levels": {
        "landscape": {
          "narration": "This PR moves house. Fifty-one files change, but almost all of it is one mechanical rename: the self-analysis bundle that used to live at .odyssey now lives at .prodyssey/self, right next to the bundles the plugin already caches for other repos. Alongside that move, a new writing-style skill arrives for the repo's own docs.",
          "voice": "This PR moves house. Fifty-one files change, but almost all of it is one mechanical rename. The self-analysis bundle that used to live at dot-odyssey now lives at dot-prodyssey slash self, right next to the bundles the plugin already caches for other repos. Alongside that move, a new writing-style skill arrives for the repo's own documentation."
        },
        "problem_solution": {
          "problem": "The plugin had grown two separate bundle-storage roots for the same kind of output: self-analysis lived at `<target>/.odyssey/`, while foreign-repo bundles were cached centrally at `<hub>/.prodyssey/<repo-slug>/`. Every script's `--bundle-dir` default, every skill reference, and the commands all carried two path conventions in parallel, and there was no single root to write one `.gitignore` rule against for the view-server's bookkeeping files.",
          "solution": "Self-analysis now defaults to `<target>/.prodyssey/self/`, with `self` reserved as a slug no repo-derived hash can collide with. `extract_story.py` and every other script's `--bundle-dir` default moves to match, `SKILL.md`'s Hub-resolution rule is rewritten around the single root, and a legacy-layout check stops any mode that finds an old `.odyssey/` bundle with the exact `git mv .odyssey .prodyssey/self` command to run by hand, rather than silently treating it as \"no baseline\" and re-generating at Gemini API cost. Separately, this PR also adds a `ste-writing` skill for the repo's own ASD-STE100 documentation standard, deliberately placed under `.claude/skills/` rather than `skills/` so the plugin's install surface doesn't grow by one unrelated skill.",
          "narration": "Two storage locations for the same kind of bundle became one. Self-analysis bundles now sit right where the plugin already caches other repos' bundles, just under their own reserved subfolder. An old bundle isn't moved automatically — the plugin tells you the exact command to run yourself. A second, smaller change gives this repo's own docs a consistent writing style, without changing what anyone installing the plugin actually receives.",
          "beats": [
            {
              "kind": "background",
              "text": "Before this PR, `extract_story.py` and every other script defaulted `--bundle-dir` to `<repo>/.odyssey`, a convention set before the central-cache feature (`<hub>/.prodyssey/<repo-slug>/`) existed; the two roots grew independently and every reference to \"where does a bundle live\" had to account for both."
            },
            {
              "kind": "background",
              "text": "`<hub>/.prodyssey/` already held `active` (a symlink), `.view-server.pid`, and `.view-server.log` as hub-local bookkeeping — but with self-analysis bundles living outside that root at `.odyssey/`, there was no single directory whose contents could be gitignored with one rule."
            },
            {
              "kind": "intuition",
              "text": "Concretely: this repo's own bundle moves from `.odyssey/data/story.json` to `.prodyssey/self/data/story.json` — same file, same content, new address — while `.prodyssey/cobuilder-harness-a103a550/` and `.prodyssey/digital-curator-80f83abb/` (other repos' cached bundles) don't move at all, since they were already under the unified root."
            }
          ],
          "voice": "Two storage locations for the same kind of bundle become one. Self-analysis bundles now sit right where the plugin already caches other repos' bundles, just under their own reserved subfolder. An old bundle isn't moved automatically — the plugin tells you the exact command to run yourself. A second, smaller change gives this repo's own documentation a consistent writing style, without changing what anyone installing the plugin actually receives."
        },
        "architecture": {
          "narration": "Two decisions: where a bundle physically lives, and where a repo-local writing-style skill should live so it doesn't leak into every plugin install.",
          "voice": "Two decisions here. Where a bundle physically lives, and where a repo-local writing-style skill should live, so it doesn't leak into every plugin install.",
          "beats": [
            {
              "kind": "forces",
              "text": "Roughly ten places across scripts, `SKILL.md`, `README.md`, and `CLAUDE.md` hardcoded the `.odyssey` default independently, duplicating the same path assumption."
            },
            {
              "kind": "forces",
              "text": "A legacy `.odyssey/` bundle must never be silently reinterpreted as \"no baseline exists\" and regenerated — that would burn real Gemini API cost re-deriving content a maintainer already authored by hand."
            },
            {
              "kind": "forces",
              "text": "The plugin's minimal-install-surface stance (no agents, no hooks, no MCP servers) was already an explicit design constraint before this PR, and `skills/` is auto-discovered by the plugin manifest with no allowlist to exclude an individual skill."
            },
            {
              "kind": "contract",
              "text": "ADR-0003: unify bundle storage under `<target>/.prodyssey/self/` for self-analysis, reserve `self` as a slug, and detect-but-don't-auto-migrate a legacy `.odyssey/` layout."
            },
            {
              "kind": "contract",
              "text": "ADR-0004: keep `ste-writing` under `.claude/skills/`, outside the plugin manifest's discovered `skills/` tree, so an install of `prodyssey@prodyssey` still gets exactly two skills, never three."
            },
            {
              "kind": "boundary",
              "text": "`self` can never be used as a foreign-repo slug going forward. Any bundle generated before this PR needs a one-time manual `git mv .odyssey .prodyssey/self`, not an automatic one. Repo-local-only tooling defaults to `.claude/skills/`, not `skills/`, unless it's meant to ship with the plugin."
            }
          ]
        },
        "file_changes": {
          "narration": "Fifty-one files: the storage-unification rename itself (29 files under .prodyssey, mostly this repo's own re-pathed bundle plus a new cobuilder-harness test fixture), the seven scripts and five skill references updated to default onto the new path, three commands and the top-level docs describing it, plus the new ste-writing skill and its .gitignore/plugin-manifest wiring.",
          "groups": [
            {
              "title": "Storage-unification rename",
              "note": "The self-analysis bundle's data/assets/viewer files move from .odyssey/ to .prodyssey/self/ verbatim (git-detected as renames), alongside a new cobuilder-harness-a103a550 test-fixture bundle added under the same unified root.",
              "files": [
                ".prodyssey/self/data/story.json",
                ".prodyssey/self/data/adrs.json",
                ".prodyssey/self/inventory.yaml",
                ".prodyssey/self/viewer/index.html",
                ".prodyssey/cobuilder-harness-a103a550/data/story.json",
                ".prodyssey/cobuilder-harness-a103a550/inventory.yaml"
              ]
            },
            {
              "title": "Scripts and skill references: new bundle-dir default",
              "note": "Every script's --bundle-dir default and the skill's Hub-resolution/legacy-detection rule move onto <repo>/.prodyssey/self.",
              "files": [
                "scripts/extract_story.py",
                "scripts/extract_diffs.py",
                "scripts/generate_prompts.py",
                "scripts/generate_audio.py",
                "scripts/verify_bundle.py",
                "scripts/export_artifact.py",
                "scripts/export_index.py",
                "skills/odyssey/SKILL.md",
                "skills/odyssey/references/baseline-derivation.md",
                "skills/odyssey/references/decision-records-lite.md",
                "skills/odyssey/references/adr-template.md",
                "skills/odyssey/references/story-mode.md"
              ]
            },
            {
              "title": "Commands and top-level docs",
              "note": "baseline.md, generate.md, and view.md re-path their examples; CLAUDE.md and README.md are rewritten around the unified storage rule (README.md also gets a general simplification pass and an extra worked example).",
              "files": [
                "commands/baseline.md",
                "commands/generate.md",
                "commands/view.md",
                "CLAUDE.md",
                "README.md"
              ]
            },
            {
              "title": "New ste-writing skill, dev-local",
              "note": "The controlled-language writing skill and its linter land under .claude/skills/, not skills/, per ADR-0004 — kept out of the plugin's install surface.",
              "files": [
                ".claude/skills/ste-writing/SKILL.md",
                ".claude/skills/ste-writing/ste-lint.py",
                ".claude/skills/ste-writing/test_ste_lint.py"
              ]
            },
            {
              "title": "Housekeeping",
              "note": "The old .prodyssey/.view-server.pid/.log/active bookkeeping files are removed from tracking (already gitignored) and .gitignore itself is touched to match.",
              "files": [
                ".gitignore",
                ".claude-plugin/plugin.json"
              ]
            }
          ]
        }
      }
    },
    {
      "pr": 4,
      "date": "2026-08-02",
      "title": "Mermaid diagrams for levels 1-3, and self-upgrading bundles",
      "tagline": "This PR proposes a second visual family alongside Gemini scene art — text-only Mermaid diagrams authored by a per-PR subagent — plus a mechanism that upgrades any older bundle in place before a session touches it.",
      "depth": "detailed",
      "status": "open",
      "size": {
        "files": 71,
        "adds": 23349,
        "dels": 332
      },
      "touched": {
        ".claude-plugin": 1,
        ".prodyssey": 16,
        "(root)": 3,
        "commands": 1,
        "scripts": 8,
        "skills": 41,
        "viewer": 1
      },
      "commit": "a3119dbac24e7ec3d4cdb2e13513be718f736249",
      "adrs": [
        "ADR-0005",
        "ADR-0006"
      ],
      "levels": {
        "landscape": {
          "narration": "This PR is dominated by one new reference library: over fifty new files under a mermaid skill, teaching Claude how to author every kind of Mermaid diagram. Underneath that bulk sit two real mechanisms — diagrams as a second visual option next to scene art, and a bundle-upgrade system so an old bundle never quietly falls out of date.",
          "voice": "This PR is dominated by one new reference library. Over fifty new files teach Claude how to author every kind of Mermaid diagram. Underneath that bulk sit two real mechanisms. Diagrams become a second visual option next to scene art, and a bundle-upgrade system means an old bundle never quietly falls out of date."
        },
        "problem_solution": {
          "problem": "Scene art was the only visual family a PR could get, and it costs a Gemini call and API budget per image, plus base64-inflated bytes that squeeze the 16 MiB Claude Artifact publish cap hardest of anything in the bundle. Separately, as the bundle format kept gaining new pieces (this PR's own diagrams among them), older committed bundles had no way to catch up automatically — a real incident already showed the risk: a bundle's viewer copy went stale and silently lost diagram support, because nothing forced it to refresh after the shipped viewer changed.",
          "solution": "A new `--art both|diagram|image` flag lets a sweep choose diagrams, scene art, or both. For diagrams, generate mode spawns one subagent per PR that invokes `Skill(\"prodyssey:mermaid\")`, reads this PR's timeline entry and diff, and writes three typed files — a `C4Container` for the landscape level, a `sequenceDiagram` for problem and solution, a `classDiagram` for architecture — which `build_diagrams.py` then compiles and validates mechanically. For staleness, a new `migrate_bundle.py` runs three phases before any of the four modes touches a bundle: it unconditionally refreshes the viewer copy, steps a `LAYOUT_MIGRATIONS` ladder keyed on a new `bundle_format` integer, then steps a `SCHEMA_MIGRATIONS` ladder keyed on `story.json`'s own `meta.schema_version` — guarding every schema step against touching any hand-authored field it didn't declare, so a migration either writes cleanly or doesn't write at all.",
          "narration": "This PR proposes letting a PR carry diagrams instead of, or alongside, illustrated scene art — authored the same careful way narrative and decision records already are, by a subagent with the right reference material, not generated by a script. It also proposes to fix a real problem this session already hit once: an older bundle silently falling behind the plugin's current shape. From now on, every command would check and repair that automatically before doing anything else.",
          "beats": [
            {
              "kind": "background",
              "text": "Scene art (`generate_prompts.py --generate`) was, until this PR, the only way a PR entry got illustrated levels 1-3, at a Gemini API cost per image and roughly a third size inflation once base64-embedded for artifact publishing."
            },
            {
              "kind": "background",
              "text": "The `mermaid` skill this PR adds is a large, general-purpose authoring reference (C4, sequence, class, flowchart, gitgraph, and dozens of other diagram types) — too large to keep loaded against every PR's authoring context whether or not that PR needs diagrams."
            },
            {
              "kind": "intuition",
              "text": "Concretely: a diagram-only PR sweep produces three plain-text `.mmd` files (`pr{N}-level1.mmd`, `level2.mmd`, `level3.mmd`) instead of three ~5 MB PNGs — for the 16 MiB Claude Artifact publish cap from ADR-0001, that's the difference between a handful of kilobytes and megabytes per PR."
            }
          ],
          "voice": "This PR proposes letting a PR carry diagrams instead of, or alongside, illustrated scene art, authored the same careful way narrative and decision records already are, by a subagent with the right reference material, not generated by a script. It also proposes fixing a real problem this session already hit once: an older bundle silently falling behind the plugin's current shape. From now on, every command would check and repair that automatically before doing anything else."
        },
        "architecture": {
          "narration": "Two decisions: who is allowed to author a diagram's actual content, and how a bundle catches itself up to the plugin's current shape without risking the hand-authored content already inside it.",
          "voice": "Two decisions here. Who is allowed to author a diagram's actual content, and how a bundle catches itself up to the plugin's current shape without risking the hand-authored content already inside it.",
          "beats": [
            {
              "kind": "forces",
              "text": "The plugin's existing convention, already true for narrative and ADRs: a mechanical script only compiles and validates content a subagent already wrote — it never authors that content itself."
            },
            {
              "kind": "forces",
              "text": "`viewer/index.html` is a pure build artifact with nothing authored to preserve, while `story.json` mixes derived fields with hand-authored narrative and paid Gemini TTS/art content in the same file — one migration strategy can't safely treat both the same way."
            },
            {
              "kind": "forces",
              "text": "All four modes (Baseline, Generate, View, Publish) need bundle self-healing to run first and unconditionally, so a stale bundle never gets read before it's repaired."
            },
            {
              "kind": "contract",
              "text": "ADR-0005: diagram authoring goes through a per-PR subagent invoking the mermaid skill; build_diagrams.py only compiles and validates, and any validation failure routes back to that same subagent to fix."
            },
            {
              "kind": "contract",
              "text": "ADR-0006: migrate_bundle.py runs an unconditional viewer refresh, then a bundle_format-keyed layout ladder, then a meta.schema_version-keyed data ladder guarded by a declared touches set per migration step."
            },
            {
              "kind": "boundary",
              "text": "The orchestrating Claude must never write or hand-patch a `.mmd` file directly. A schema migration that would touch an authored field outside its declared `touches` set writes nothing at all, rather than partially applying — this repo's own bundle plus the cobuilder-harness and digital-curator fixture bundles are the first three bundles this mechanism runs against."
            }
          ]
        },
        "file_changes": {
          "narration": "Seventy-one files, but the shape is lopsided: forty-one of them are the new mermaid skill's reference docs (one file per diagram type, largely vendored authoring rules), eight are the mechanical scripts implementing diagram compilation and bundle migration, and the rest are this repo's own regenerated bundle output plus documentation updates describing the new --art flag and migration behavior.",
          "groups": [
            {
              "title": "New mermaid skill",
              "note": "SKILL.md plus over forty reference docs, one per Mermaid diagram type (C4, sequence, class, flowchart, gitgraph, state, and many more) — the authoring reference the diagram-writing subagent is required to load via Skill(\"prodyssey:mermaid\").",
              "files": [
                "skills/mermaid/SKILL.md",
                "skills/mermaid/references/c4.md",
                "skills/mermaid/references/sequenceDiagram.md",
                "skills/mermaid/references/classDiagram.md",
                "skills/mermaid/references/flowchart.md"
              ]
            },
            {
              "title": "Diagram compilation and versioning scripts",
              "note": "build_diagrams.py (new) compiles/validates .mmd sources into diagrams.js; migrate_bundle.py (new) runs the three-phase self-migration; _bundle_meta.py (new) centralizes the schema_version/bundle_format constants both scripts and verify_bundle.py now import.",
              "files": [
                "scripts/build_diagrams.py",
                "scripts/migrate_bundle.py",
                "scripts/_bundle_meta.py",
                "scripts/verify_bundle.py"
              ]
            },
            {
              "title": "Existing scripts updated for --art and versioning",
              "note": "extract_diffs.py, extract_story.py, generate_prompts.py, and export_artifact.py each gain --art-aware behavior or import the new shared version constants.",
              "files": [
                "scripts/extract_diffs.py",
                "scripts/extract_story.py",
                "scripts/generate_prompts.py",
                "scripts/export_artifact.py"
              ]
            },
            {
              "title": "Skill, command, and viewer wiring",
              "note": "SKILL.md documents diagram authoring and the --art flag; diagram-mode.md (new) is the per-level diagram-content reference; generate.md documents --art; viewer/index.html adds Mermaid rendering (via the CDN, with a documented graceful no-op fallback) for the <pre class=\"mermaid\"> blocks levels 1-3 can now carry.",
              "files": [
                "skills/odyssey/SKILL.md",
                "skills/odyssey/references/diagram-mode.md",
                "commands/generate.md",
                "viewer/index.html"
              ]
            },
            {
              "title": "Top-level docs and bundle metadata",
              "note": "CLAUDE.md and README.md are substantially rewritten around the --art flag, migration mechanism, and versioning; plugin.json bumps to 0.2.0; .gitignore adds the .migration-backup/ pattern.",
              "files": [
                "CLAUDE.md",
                "README.md",
                ".claude-plugin/plugin.json",
                ".gitignore"
              ]
            },
            {
              "title": "Bundle refresh (self + fixtures)",
              "note": "This repo's own .prodyssey/self/ bundle regenerates story.js and gains bundle.json; the digital-curator fixture bundle's viewer and story.json are refreshed by the same migration mechanism this PR adds, proving it against a second bundle.",
              "files": [
                ".prodyssey/self/bundle.json",
                ".prodyssey/self/data/story.js",
                ".prodyssey/self/data/story.json",
                ".prodyssey/self/viewer/index.html",
                ".prodyssey/digital-curator-80f83abb/viewer/index.html",
                ".prodyssey/digital-curator-80f83abb/data/story.json"
              ]
            }
          ]
        }
      }
    }
  ]
};
>>>>>>> Stashed changes
