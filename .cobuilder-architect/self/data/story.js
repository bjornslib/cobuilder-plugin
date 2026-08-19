window.STORY = {
  "meta": {
    "repo": "prodyssey",
    "generated": "2026-07-22",
    "schema_version": "1.2",
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
        "files": 78,
        "blurb": "Hub-local scratch for centrally-stored bundles and view-server bookkeeping (per-repo-slug subfolders, active symlink, view-server pid/log) — currently holds test-run bundles from prior sessions committed to git rather than gitignored.",
        "root_paths": [
          ".prodyssey"
        ]
      },
      {
        "id": "commands",
        "label": "Slash Commands",
        "kind": "tooling",
        "files": 5,
        "blurb": "Thin dispatchers (baseline.md, generate.md, view.md) that forward arguments straight into the odyssey skill — no logic of their own.",
        "root_paths": [
          "commands"
        ]
      },
      {
        "id": "scripts",
        "label": "Generation Scripts",
        "kind": "core",
        "files": 17,
        "blurb": "PEP 723 uv scripts doing the mechanical data movement the skill orchestrates: extract_story, extract_diffs, generate_prompts, generate_audio, verify_bundle.",
        "root_paths": [
          "scripts"
        ]
      },
      {
        "id": "skills",
        "label": "Odyssey Skill",
        "kind": "core",
        "files": 53,
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
    },
    {
      "pr": 5,
      "date": "2026-08-05",
      "title": "Close the API-key trust boundary, and fix three correctness bugs",
      "tagline": "A post-review pass closes a real credential leak from a foreign --repo target, locks the three scripts that hold that credential, and fixes three narrower correctness bugs a completeness test surfaced along the way.",
      "depth": "detailed",
      "size": {
        "files": 15,
        "adds": 2304,
        "dels": 35
      },
      "touched": {
        "(root)": 3,
        ".prodyssey": 1,
        "docs": 1,
        "scripts": 8,
        "skills": 2
      },
      "levels": {
        "landscape": {
          "narration": "This PR is a hardening pass, not a feature. Ten commits close a genuine credential leak, lock the three scripts that read the plugin's API key, and fix three smaller correctness bugs a stricter test surfaced along the way — a wrong diff range on merge commits, a data-loss guard with two blind spots, and a manifest field that quietly went stale every generate run."
        },
        "problem_solution": {
          "problem": "`generate_prompts.py` and `generate_audio.py` both called `load_dotenv(repo / \".env\")` against the arbitrary `--repo` target, not the hub. `--repo` is documented to accept any local checkout, so a target repo's `.env` could set `HTTPS_PROXY`, `SSL_CERT_FILE`, or any `GOOGLE_*`/`GEMINI_*` variable the `google-genai` SDK reads, and capture the session's own `GEMINI_API_KEY` on the next authenticated call. Once that was fixed, the fix itself needed a second correction: `load_dotenv()` with no argument does not search from the working directory by default — python-dotenv's `find_dotenv()` walks up from the *calling script's own file*, which only happens to be the hub in this dev checkout, not in an installed plugin whose scripts live under `~/.claude/plugins/cache/`.",
          "solution": "Both scripts now call `load_dotenv(find_dotenv(usecwd=True))`, anchoring resolution to the process's current working directory — which `SKILL.md`'s procedure always leaves at the hub before invoking any script. `SKILL.md`'s Step 0 prereq gate states this constraint explicitly now, so a future change to how scripts are invoked cannot silently break the anchor again. The same review pass added upper version bounds (`pillow<13`, `google-genai<2`, `python-dotenv<2`) and, once `uv` 0.12.1 made `uv lock --script` available, a hash-pinned lockfile for each of the three scripts that declare third-party dependencies — the two that hold the live Gemini credential, plus `export_artifact.py`'s `pillow` dependency for image recompression.",
          "narration": "Two related fixes anchor this PR. First, a real leak: an analyzed repo's own `.env` file could poison the environment the plugin's Gemini calls run in, including capturing the API key itself. The fix moves that lookup to the user's own hub directory and away from the repo being analyzed — and needed a second, subtler correction once the first attempt turned out to search from the wrong starting point for anyone running the installed plugin rather than a dev checkout. Second, the two scripts that hold that credential, plus one more that shares their dependency shape, now resolve to a locked, hash-verified set of package versions instead of whatever the latest release happens to be on a given day.",
          "beats": [
            {
              "kind": "background",
              "text": "`--repo` is documented (Target resolution in `SKILL.md`) to accept any local checkout, which by construction includes repos the user does not control — the plugin's stated design already treats the target as untrusted for source writes, but `generate_prompts.py`/`generate_audio.py`'s `.env` lookup did not carry that same distrust."
            },
            {
              "kind": "background",
              "text": "`load_dotenv`'s merge behavior is not scoped to one variable: it writes every assignment in the loaded file into `os.environ` (protected only by `override=False` for a variable already set), so a hostile `.env` gets a free shot at anything normally unset — `HTTPS_PROXY`, `HTTP_PROXY`, `REQUESTS_CA_BUNDLE`, `SSL_CERT_FILE`, and the `GOOGLE_*`/`GEMINI_*` family `google-genai` reads."
            },
            {
              "kind": "intuition",
              "text": "Concretely: a fixture repo whose `.env` set a decoy `GEMINI_API_KEY` plus `HTTPS_PROXY` and a marker variable was run through both scripts with `--repo` pointed at it. None of the three reached `os.environ` after the fix, regardless of which repo `--repo` named — the same probe against the hub's own `.env` resolved it correctly from cwd."
            }
          ]
        },
        "architecture": {
          "narration": "Two decisions carry real structural weight here — where the API key's environment is allowed to come from, and how tightly the scripts that hold it pin their own dependencies. The rest of the PR is bug fixes against existing conventions, not new ones.",
          "beats": [
            {
              "kind": "forces",
              "text": "`--repo` is documented to accept any local checkout, including ones the user does not fully trust — the environment-lookup fix has to match the write-boundary distrust `SKILL.md` already states for source access."
            },
            {
              "kind": "forces",
              "text": "`python-dotenv`'s `find_dotenv()` has two default search origins that look interchangeable but are not: `usecwd=False` walks from the calling frame's own file, `usecwd=True` walks from the process's working directory — only the latter matches where `SKILL.md`'s procedure actually leaves `cwd` (the hub) before invoking a script."
            },
            {
              "kind": "forces",
              "text": "`generate_prompts.py` and `generate_audio.py` hold a live `GEMINI_API_KEY` in process memory on every run; an unbounded or unlocked dependency on either is a live-credential supply-chain surface, not a routine upgrade risk."
            },
            {
              "kind": "contract",
              "text": "ADR-0007: `.env` resolution in the two Gemini-calling scripts anchors to `find_dotenv(usecwd=True)` — the process working directory, which is always the hub under `SKILL.md`'s invocation procedure — and never to the `--repo` target."
            },
            {
              "kind": "contract",
              "text": "ADR-0008: the three scripts with third-party dependencies (`generate_prompts.py`, `generate_audio.py`, `export_artifact.py`) get upper version bounds and a hash-pinned `uv` lockfile each; the other eight, stdlib-only scripts get neither."
            },
            {
              "kind": "boundary",
              "text": "A foreign `--repo` target's `.env` is now fully inert to this plugin's own process environment, verified against a hostile fixture repo. A tampered or unexpectedly major-bumped dependency in one of the three locked scripts now fails the hash check instead of executing silently."
            }
          ]
        },
        "file_changes": {
          "narration": "Fifteen files. Three groups: the trust-boundary and dependency-locking fix itself, three narrower correctness fixes a stricter completeness test surfaced, and the documentation plus test-plan updates that record both.",
          "groups": [
            {
              "title": "API-key trust boundary and dependency locking",
              "note": "generate_prompts.py and generate_audio.py anchor .env resolution to find_dotenv(usecwd=True) instead of the --repo target; all three third-party-dependency scripts gain version caps and a matching .lock file.",
              "files": [
                "scripts/generate_prompts.py",
                "scripts/generate_prompts.py.lock",
                "scripts/generate_audio.py",
                "scripts/generate_audio.py.lock",
                "scripts/export_artifact.py",
                "scripts/export_artifact.py.lock"
              ]
            },
            {
              "title": "Three correctness fixes from a stricter completeness test",
              "note": "extract_diffs.py's merge-commit diff range now matches extract_story.py's (first-parent, not <parent1>..<parent2>); the authored-field preservation guard gains timeline[].adrs and districts[].root_paths; rewrite_manifest()'s three copies now agree on the diagrams key and warn instead of silently discarding excluded_prs on a parse failure.",
              "files": [
                "scripts/extract_diffs.py",
                "scripts/extract_story.py",
                "scripts/verify_bundle.py"
              ]
            },
            {
              "title": "Test plan and top-level docs",
              "note": "docs/test-plan.md is new, recording the completeness-test design and the bugs it found; CLAUDE.md, README.md, and story-mode.md get their GEMINI_API_KEY / .env guidance corrected to point at the hub, not the target.",
              "files": [
                "docs/test-plan.md",
                "CLAUDE.md",
                "README.md",
                "skills/odyssey/references/story-mode.md",
                "skills/odyssey/SKILL.md"
              ]
            }
          ]
        }
      },
      "status": "merged",
      "commit": "789081f",
      "adrs": [
        "ADR-0007",
        "ADR-0008"
      ]
    },
    {
      "pr": 6,
      "date": "2026-08-05",
      "title": "Pr Odyssey Improvements 7Suouc",
      "tagline": "A fifth mode, submit, interviews a PR's author before it opens and writes what they said onto the timeline, so generate mode stops reconstructing intent from a diff that never recorded it.",
      "depth": "detailed",
      "size": {
        "files": 36,
        "adds": 3197,
        "dels": 124
      },
      "touched": {
        ".claude-plugin": 2,
        "(root)": 3,
        ".prodyssey": 16,
        "commands": 1,
        "scripts": 6,
        "skills": 7,
        "viewer": 1
      },
      "levels": {
        "landscape": {
          "narration": "This PR adds a fifth mode to the plugin: submit. Before now, baseline, generate, view, and publish all narrate history after the fact. Submit interviews the person making a change while they still remember why, assesses that change against everything the bundle already knows, and then opens the real pull request. Thirty-six files move, most of it new reference material and a new rendering script, plus a one-line schema bump that three existing bundles already carry."
        },
        "problem_solution": {
          "problem": "Every other mode reconstructs a PR's `intent` from its merged `diff`, long after the person who made the choices has forgotten them. `decision-records-lite.md` already carried an escape hatch for a rejected alternative that leaves no trace in the diff, precisely because generate mode has no way to recover intent nobody wrote down. That reconstruction is expensive, and it is lossy in exactly the cases that matter most: the alternative someone tried and threw away.",
          "solution": "Submit mode interviews the author before the PR opens, using only what the diff, the districts, the existing `adrs.json`, and the stack card cannot already answer (`interview-guide.md` §2-§3 caps this at six questions). It then assesses the change against the bundle's decision history, and ends the pre stage by running `gh pr create` for real, rather than staging a synthetic key. The interview's answers land as an `intent` block on the PR's own timeline entry once it exists, and a structured `assessment` block sits beside it. Both are new, optional `story.json` fields, protected by the same authored-field guard that already covers `tagline` and `depth` — `scripts/migrate_bundle.py:73` now lists `intent` and `assessment` in `AUTHORED_TIMELINE_FIELDS`, and a new `migrate_1_1_to_1_2` step stamps `schema_version: \"1.2\"` without backfilling either field on any older PR.",
          "narration": "Four modes already turn a repo's merged history into a story. None of them capture why a change happened before that history is written, so generate mode is left guessing from the diff alone — and guessing badly whenever an author tried something, rejected it, and left no trace. Submit mode closes that gap at the one moment it can still be closed: before the pull request exists. It asks the author a short, evidence-first set of questions, judges the change against what the bundle already knows, and only then opens the real PR, so the interview answers and the actual PR number are tied together from the start.",
          "beats": [
            {
              "kind": "background",
              "text": "Baseline, generate, view, and publish all narrate history that already happened — generate mode's job, in particular, is retro-extracting `problem`/`solution`/ADRs from a merged diff nobody annotated at the time."
            },
            {
              "kind": "background",
              "text": "`decision-records-lite.md` §3.4's escape hatch already existed for the case where a rejected alternative leaves no trace in the diff — evidence that generate mode was already hitting the limit of what a diff alone can recover."
            },
            {
              "kind": "intuition",
              "text": "PR #6's own timeline entry demonstrates the fix: its `intent.alternatives` records one real rejected option — minting a synthetic PR key for `story.json` instead of ending the pre stage with `gh pr create` — stated directly by the author, not reconstructed from a diff that shows only the option that was kept."
            }
          ]
        },
        "architecture": {
          "narration": "Two decisions carry real structural weight. First, where the PR number a timeline entry keys on is allowed to come from — the real `gh pr create` result, never a synthetic placeholder. Second, what protection the two new authored fields get once they exist, so a future schema migration cannot silently erase them the way an unguarded migration could erase `tagline` or `depth` today.",
          "beats": [
            {
              "kind": "forces",
              "text": "`story.json`'s timeline keys on an integer `pr`, and `verify_bundle.py`, `record_publish.py`, `manifest.js`, and the viewer all depend on that being the real PR number — a working branch has no such number until a PR actually opens."
            },
            {
              "kind": "forces",
              "text": "Once `intent` and `assessment` exist, they are exactly as irreplaceable as `tagline` and `depth` — nothing but an interview can reproduce an author's stated reasoning — so they need the same migration-proof guard, not a parallel or looser one."
            },
            {
              "kind": "forces",
              "text": "A schema bump has to stay safe for the three bundles already in this repo (`self`, `cobuilder-harness`, `digital-curator`) that predate submit mode entirely and carry neither field."
            },
            {
              "kind": "contract",
              "text": "Submit mode stages `description.json`/`intent.json`/`assessment.json` under `exports/branch-<slug>/` and only writes the real timeline entry after `gh pr create` returns a number, rather than inventing a branch key for `story.json` and reconciling it later."
            },
            {
              "kind": "contract",
              "text": "`AUTHORED_TIMELINE_FIELDS` in `scripts/migrate_bundle.py` grows from `(\"tagline\", \"depth\")` to `(\"tagline\", \"depth\", \"intent\", \"assessment\")`, and a new `migrate_1_1_to_1_2` step stamps `schema_version: \"1.2\"` as a pure version bump — it backfills neither field on any pre-existing PR."
            },
            {
              "kind": "boundary",
              "text": "`verify_bundle.py` reports `intent`/`assessment` as optional by default, so a bundle generated before this mode existed keeps passing unchanged; `--require-review` promotes them to required, which is what submit mode passes to confirm its own run landed. Neither field can be altered by a later migration unless that migration explicitly declares it in its own `touches` set."
            }
          ]
        },
        "file_changes": {
          "narration": "Thirty-six files, in four groups: the new submit-mode reference material, the mechanical script changes that support it, the authored-field guard extension shared with migration, and the three already-committed bundles picking up the resulting schema bump.",
          "groups": [
            {
              "title": "Submit mode itself",
              "note": "The command entry point, the orchestration skill's new mode, and the reference docs that carry the interview and assessment rules — the judgment-shaped content this mode runs on.",
              "files": [
                "commands/submit.md",
                "skills/odyssey/SKILL.md",
                "skills/odyssey/references/interview-guide.md",
                "skills/odyssey/references/review-mode.md",
                "skills/odyssey/references/pr-description-template.md"
              ]
            },
            {
              "title": "Rendering and extraction scripts",
              "note": "render_review.py is new — pure markdown layout for `intent`/`assessment`, no judgment and no `gh` calls. extract_diffs.py and extract_story.py gain the `--branch` pre-PR staging path.",
              "files": [
                "scripts/render_review.py",
                "scripts/extract_diffs.py",
                "scripts/extract_story.py"
              ]
            },
            {
              "title": "Schema bump and its guard",
              "note": "The authored-field guard now protects `intent` and `assessment`, `_bundle_meta.py` steps the shared schema constant to 1.2, and `verify_bundle.py` gains the optional-by-default `intent`/`assessment` checks plus `--require-review`.",
              "files": [
                "scripts/migrate_bundle.py",
                "scripts/_bundle_meta.py",
                "scripts/verify_bundle.py",
                "skills/odyssey/references/decision-records-lite.md",
                "skills/odyssey/references/story-mode.md"
              ]
            },
            {
              "title": "Existing bundles picking up schema 1.2, plus docs",
              "note": "The self-bundle and both foreign-repo fixtures (`cobuilder-harness`, `digital-curator`) get the unconditional viewer refresh and the 1.1-to-1.2 stamp; CLAUDE.md and README.md record the new mode.",
              "files": [
                ".prodyssey/self/bundle.json",
                ".prodyssey/self/viewer/index.html",
                ".prodyssey/cobuilder-harness-a103a550/bundle.json",
                ".prodyssey/digital-curator-80f83abb/bundle.json",
                "CLAUDE.md",
                "README.md"
              ]
            }
          ]
        }
      },
      "status": "merged",
      "commit": "7473b7f",
      "intent": {
        "captured": "2026-08-05",
        "source": "author",
        "authorship": "agent-assisted",
        "problem": "The plugin reconstructs a PR's author intent from its merged diff, long after the author who made the choices has forgotten them. That reconstruction is expensive and lossy — decision-records-lite.md already carried an escape hatch for the case where a rejected alternative leaves no trace in the diff, precisely because generate mode has no way to recover intent nobody wrote down.",
        "why_now": "The other four modes (baseline, generate, view, publish) all narrate history well, but none of them capture intent before it's forgotten. Submit mode closes that gap at the one point it can still be closed — before the history that later has to be narrated even exists.",
        "approach": "Interview the author before the PR opens, using only what the diff/districts/ADRs/stack card can't already answer; assess the change against the bundle's decision history; then end the pre stage by actually opening the PR (gh pr create) rather than staging it separately, so the flow's natural last step is the PR existing for real.",
        "alternatives": [
          {
            "option": "Mint a synthetic PR key for the story.json timeline entry instead of ending the pre stage by opening the real PR",
            "rejected_because": "It would have been hard to reliably connect what the author said in the interview back to the actual PR number once one existed. Opening the PR as the flow's last step keeps the interview answers and the real PR tied together from the start."
          }
        ],
        "out_of_scope": [
          "Deduplicating the three copies of rewrite_manifest() across extract_story.py/extract_diffs.py/generate_prompts.py",
          "Incorporating more of the architecture-review skill to further support the user in submitting a clean pull request"
        ],
        "risks": [
          "Whether the interview's question-budget and evidence-first discipline (never ask what the evidence already answers, target six questions) actually holds up across real PRs, or degrades toward a fixed questionnaire over time."
        ],
        "testing": "Verified the required-failure set for .prodyssey/self is identical to master, and the cobuilder-harness fixture bundle reports the same result count as before. The 1.1-to-1.2 schema migration is a one-line diff on each of the three bundles with zero authored-field guard violations, and it's idempotent. Browser tests cover the assessment sheet, the one-sheet-at-a-time rule, the Escape/scrim paths, switching PRs, and a PR with no assessment.",
        "reviewer_focus": [
          "The interview's question-budget and evidence-first discipline",
          "The authored-field preservation guard in migrate_bundle.py"
        ],
        "unknowns": [
          "The migration guard in migrate_bundle.py — the authored-field preservation logic that compares story.json before and after a schema migration. The author cannot fully explain or defend this part line-by-line."
        ]
      },
      "assessment": {
        "stage": "pre",
        "generated": "2026-08-05",
        "verdict": "concerns",
        "risk_tier": "sensitive",
        "summary": "A genuinely new capability — author interview plus bundle-grounded assessment — introduced cleanly, with no duplicate in adrs.json and no scattered env reads. The one real cost: the author cannot fully defend the authored-field preservation guard that now protects intent/assessment alongside every other hand-authored field, and that guard is the only thing standing between a future schema migration and silently destroyed narrative content.",
        "sensible": {
          "answer": "Yes. intent.problem states the diff-based reconstruction is expensive and lossy, and decision-records-lite.md's own integrity rule 4 (the ADR §3 'alternatives must be real' rule) already carried an escape hatch for exactly the case this PR fixes at the source — a rejected alternative with no trace in the diff. The problem is real, worth solving, and solved at the right layer (an interview before merge, not a smarter diff reader after).",
          "evidence": [
            "skills/odyssey/references/decision-records-lite.md",
            "skills/odyssey/references/interview-guide.md"
          ]
        },
        "maintainability": {
          "answer": "Helps. The change establishes one invariant and enforces it in one place: intent and assessment are authored, guard-protected fields, declared once in AUTHORED_TIMELINE_FIELDS, and no migration may touch either without declaring it in `touches`. That closes off a whole class of future bug (a migration silently dropping review content) with a single tuple edit plus the existing run_guard comparison, rather than a rule that lives only in a docstring somewhere.",
          "constraint_introduced": "intent and assessment, once written to a timeline entry, cannot be altered by any script — including a future schema migration — unless that migration explicitly declares the field in its `touches` set.",
          "evidence": [
            "scripts/migrate_bundle.py:73",
            "scripts/migrate_bundle.py:120-134"
          ]
        },
        "pattern": {
          "verdict": "new-valuable",
          "answer": "No existing ADR or district covers author-interview or pre-merge assessment — the closest prior art is generate mode's post-hoc ADR retro-extraction, which this PR explicitly does not touch or duplicate (review-mode.md §9 states submit mode writes no ADR). The pattern earns its place: it is the only mode that captures information that literally cannot be recovered later.",
          "duplicates": [],
          "evidence": [
            ".prodyssey/self/data/adrs.json",
            "skills/odyssey/references/review-mode.md"
          ]
        },
        "findings": [
          {
            "severity": "concern",
            "claim": "The author cannot fully explain or defend the authored-field preservation guard (harvest_authored/run_guard) that this PR extends to cover intent/assessment — per the author's own answer during this interview. That guard is now the sole mechanism protecting all hand-authored narrative, ADR, and review content across every future schema migration.",
            "evidence": "scripts/migrate_bundle.py:83-134",
            "district": "scripts",
            "suggestion": "Before the next schema migration is written, have the author (or a fresh review pass) trace run_guard() end-to-end against one deliberately-malformed migration, so the guard's failure mode is understood firsthand rather than trusted on the strength of passing tests."
          },
          {
            "severity": "note",
            "claim": "verify_bundle.py's check_assessment validates assessment shape only — a known verdict plus a non-empty `answer` string per question — and its own docstring says so directly. --require-review can therefore pass an assessment whose `evidence` arrays are empty and whose `findings` is `[]`, with no mechanical distinction from a thorough one.",
            "evidence": "scripts/verify_bundle.py:245-259",
            "district": "scripts",
            "suggestion": "No action needed now — review-mode.md is explicit that mechanical scripts never judge content quality, so this is working as designed. Worth remembering if --require-review is ever treated as a substitute for actually reading the assessment."
          }
        ],
        "boundary_checks": [
          {
            "rule": "The dependency rule: inner layers never import outer layers (generic.md stack card, Boundary Rules #1)",
            "source": "stacks/generic.md",
            "result": "not-applicable",
            "evidence": "This codebase has no domain/adapter layering to grep — it's an orchestration skill plus stdlib-only utility scripts, not a layered service."
          },
          {
            "rule": "Configuration crosses into code in one place, not scattered env reads (generic.md stack card, Boundary Rules #2)",
            "source": "stacks/generic.md",
            "result": "pass",
            "evidence": "grep -n \"os.environ|os.getenv|load_dotenv\" across all six scripts this PR touches (render_review.py, verify_bundle.py, migrate_bundle.py, extract_diffs.py, extract_story.py, _bundle_meta.py) returns zero matches — submit mode reads and writes only bundle files and git, consistent with SKILL.md's claim that it never calls Gemini."
          }
        ],
        "delta": {
          "districts_added": [],
          "districts_changed": [
            {
              "id": "scripts",
              "files_before": 12,
              "files_after": 13
            },
            {
              "id": "skills",
              "files_before": 50,
              "files_after": 53
            },
            {
              "id": "commands",
              "files_before": 4,
              "files_after": 5
            }
          ],
          "edges_added": [],
          "edges_removed": []
        },
        "regret_risk": "The safety property this PR leans on hardest — the authored-field guard that now also protects intent/assessment — is understood by its own author only at the level of \"the tests pass,\" not \"I can predict what happens when a future migration's shape disagrees with harvest_authored()'s assumptions.\" That's a tolerable regret today because the guard fails closed (no partial writes) rather than failing open, but it means the next schema bump that needs new authored-field coverage has no one who can defend the guard's behavior end-to-end without re-deriving it. The smaller regret: --require-review checks assessment shape, not substance, so a future submit-mode run under time pressure could satisfy the gate with empty-evidence answers and nothing mechanical would flag it.",
        "drift": []
      },
      "adrs": [
        "ADR-0009"
      ]
    },
    {
      "pr": 9,
      "date": "2026-08-06",
      "title": "Deduplicate rewrite_manifest(); add interview self-consistency check; STE clarity pass",
      "tagline": "Three duplicate copies of one function become one, and submit mode's own interview now checks the author's account against itself before writing anything down.",
      "depth": "detailed",
      "size": {
        "files": 30,
        "adds": 1204,
        "dels": 1098
      },
      "touched": {
        ".prodyssey": 13,
        "scripts": 4,
        "skills": 13
      },
      "levels": {
        "landscape": {
          "narration": "This PR does three things at once. It collapses three near-identical copies of one function into a single shared module. It teaches submit mode's interview to check itself — the interviewing Claude now asks the author two questions blind, before showing its own reading of the diff, and compares the two against each other. And it runs an active-voice clarity pass over the plugin's own reference documentation. Thirty files move: four scripts, thirteen reference docs and skill files, and the self-bundle's own regenerated data for the two PRs before it."
        },
        "problem_solution": {
          "problem": "Three scripts — `extract_story.py`, `extract_diffs.py`, and `generate_prompts.py` — each carried an identical copy of `rewrite_manifest()`, the function that rebuilds `data/manifest.js` after any bundle change. Separately, submit mode's interview (added in PR #6) had no way to catch an author's own account of a change disagreeing with itself, or with what the diff actually showed — a gap the author found live, mid-interview, on this very PR.",
          "solution": "`scripts/_manifest.py` now holds the one `rewrite_manifest()` implementation, imported by all three callers the way `scripts/_bundle_meta.py` already anchors `SCHEMA_VERSION` — no behavior change, verified by running each script's `--help` after the refactor. `interview-guide.md` gains §3a: the interviewing Claude asks the problem and approach questions blind, before showing its own diff-derived hypothesis, then compares all three accounts by judgment, never by keyword matching. A material mismatch is raised to the author directly, with a choice to resolve it in the interview or log it to the existing `unknowns` field — never dropped there silently. `SKILL.md`'s step 5 and `story-mode.md`'s drift paragraph were updated to describe the new order.",
          "narration": "This change does two unrelated-sounding things that share one motive: catching a problem once, in one place, instead of three times or not at all. One duplicate function became one shared function. And the interview that captures a PR author's intent gained a check on itself — it now asks two questions before showing its own guess at the answer, so it can notice when what the author says does not add up, instead of trusting it by default.",
          "beats": [
            {
              "kind": "background",
              "text": "`scripts/_bundle_meta.py` already holds this repo's one precedent for a shared, imported-never-executed module — `SCHEMA_VERSION` lives there once, read by five scripts that used to hardcode the literal. `_manifest.py` follows the same pattern for `rewrite_manifest()`."
            },
            {
              "kind": "background",
              "text": "Submit mode's interview (PR #6) already drafts a private hypothesis from the diff before asking anything, and already caps the interview at six to eight questions (`interview-guide.md` §2-§3) — the self-consistency check had to fit inside that existing discipline, not add a new stage or a new schema field."
            },
            {
              "kind": "intuition",
              "text": "On this very PR, the author's first blind answer to \"what problem does this solve\" described unrelated viewer-level work — assessment placement on Level 2 versus Level 3 of the bundle viewer — while the diff in front of Claude showed a `rewrite_manifest()` dedup and a documentation clarity pass. Neither account led to the other. A keyword match on either answer would have missed that they described two different changes entirely; only reading both against the diff caught it."
            }
          ]
        },
        "architecture": {
          "narration": "Two decisions carry structural weight here. First, the order the interview asks its own questions in: the blind pair comes before the hypothesis is ever shown, because showing it first would anchor the author's answers instead of testing them independently. Second, what happens once a comparison finds a real mismatch — the author gets a choice between resolving it now or logging it, not a script that silently picks for them.",
          "beats": [
            {
              "kind": "forces",
              "text": "Submit mode's `intent` block feeds ADRs and narrative downstream (`story-mode.md`), so an unreconciled misunderstanding written to disk propagates into everything that later reads it."
            },
            {
              "kind": "forces",
              "text": "The question budget in §3 caps interviews at six to eight topics; a new interview stage would compete with that budget instead of living inside it."
            },
            {
              "kind": "forces",
              "text": "The interviewing Claude already drafts a hypothesis from the diff before asking anything (§2) — showing it early would anchor the author's answers instead of testing them independently."
            },
            {
              "kind": "contract",
              "text": "Ask the problem and approach questions back to back, blind, before showing the hypothesis drafted from the diff (§2/§3a). Compare all three accounts by judgment. When a mismatch survives a re-check against the diff, offer the author a choice: work through it now, or log it."
            },
            {
              "kind": "boundary",
              "text": "The check produces no new artifact of its own. A resolved mismatch is folded straight into `problem`/`approach` with no separate trace; only an unresolved one lands in the existing `unknowns` field, exactly as an author-reported gap already does (ADR-0010)."
            }
          ]
        },
        "file_changes": {
          "narration": "Thirty files, in five groups: the manifest dedup itself, the self-consistency design that motivated this PR, an active-voice pass split across the skill's core references and its stack cards, and the self-bundle's own regenerated data for PR #5 and PR #6.",
          "groups": [
            {
              "title": "Manifest dedup",
              "note": "`_manifest.py` is new — the single `rewrite_manifest()` implementation, imported by all three callers via the pattern `_bundle_meta.py` already established.",
              "files": [
                "scripts/_manifest.py",
                "scripts/extract_diffs.py",
                "scripts/extract_story.py",
                "scripts/generate_prompts.py"
              ]
            },
            {
              "title": "Self-consistency design",
              "note": "`interview-guide.md` gains §3a plus two supporting additions to §2 and §3; `SKILL.md`'s step 5 and `story-mode.md`'s drift paragraph are updated to match the new question order.",
              "files": [
                "skills/odyssey/SKILL.md",
                "skills/odyssey/references/interview-guide.md",
                "skills/odyssey/references/story-mode.md"
              ]
            },
            {
              "title": "STE clarity pass — core references",
              "note": "Active-voice, shorter-sentence pass over the judgment-shaped reference docs. Meaning is unchanged; verified by re-linting and diffing field names and cross-references before and after.",
              "files": [
                "skills/odyssey/references/adr-template.md",
                "skills/odyssey/references/baseline-derivation.md",
                "skills/odyssey/references/decision-records-lite.md",
                "skills/odyssey/references/diagram-mode.md",
                "skills/odyssey/references/review-mode.md"
              ]
            },
            {
              "title": "STE clarity pass — stack cards",
              "note": "Same pass, applied to the five per-technology stack cards.",
              "files": [
                "skills/odyssey/references/stacks/README.md",
                "skills/odyssey/references/stacks/generic.md",
                "skills/odyssey/references/stacks/nextjs.md",
                "skills/odyssey/references/stacks/python-fastapi.md",
                "skills/odyssey/references/stacks/react-typescript.md"
              ]
            },
            {
              "title": "Self-bundle regeneration for PR #5 and PR #6",
              "note": "This repo commits its own bundle alongside its code. These are the already-generated data files for PR #5 and PR #6, refreshed to reflect the branch's own history — not new content authored by this PR.",
              "files": [
                ".prodyssey/self/data/adrs.js",
                ".prodyssey/self/data/adrs.json",
                ".prodyssey/self/data/diagrams.js",
                ".prodyssey/self/data/diagrams/pr5-level1.mmd",
                ".prodyssey/self/data/diagrams/pr5-level2.mmd",
                ".prodyssey/self/data/diagrams/pr5-level3.mmd",
                ".prodyssey/self/data/diffs-pr5.js",
                ".prodyssey/self/data/diffs-pr6.js",
                ".prodyssey/self/data/manifest.js",
                ".prodyssey/self/data/story.js",
                ".prodyssey/self/data/story.json",
                ".prodyssey/self/exports/pr-6-assessment.md",
                ".prodyssey/self/exports/pr-6-description.md"
              ]
            }
          ]
        }
      },
      "status": "open",
      "commit": "d27793e49425ac5553a9d608ed4db25658b76216",
      "intent": {
        "captured": "2026-08-06",
        "source": "author",
        "authorship": "agent-generated",
        "problem": "Three near-identical copies of rewrite_manifest() existed across extract_story.py, extract_diffs.py, and generate_prompts.py — plain code duplication. Separately, submit mode's interview had no way to catch when an author's own account of a change wasn't internally coherent, or didn't match what the diff actually showed — a gap the author noticed mid-interview on a real PR. The odyssey docs (SKILL.md + references/) also needed a clarity pass.",
        "why_now": "The self-consistency gap surfaced live, during a real PR interview — worth fixing before it recurred on the next one, rather than filing it for later.",
        "approach": "Consolidated rewrite_manifest() into scripts/_manifest.py, following the existing _bundle_meta.py shared-module pattern — no behavior change, verified via `--help` on all three callers. Added §3a to interview-guide.md: ask the problem and approach questions blind, before showing Claude's diff-derived hypothesis, then compare all three accounts by LLM judgment (not regex/keyword matching) — a real mismatch gets raised to the author with a choice to resolve now or log it, never silently dropped into unknowns. Ran an STE-flavored active-voice pass across SKILL.md and every references/ file.",
        "alternatives": [],
        "out_of_scope": [
          "Viewer-level assessment placement (Level 2 vs Level 3 UI work) — unrelated work from a different branch, not part of this change.",
          "No new intent schema field and no new interview stage — the self-consistency check reorders two questions §3 already budgets."
        ],
        "risks": [
          "The mismatch-detection in §3a leans on Claude's judgment call at interview time — a subtler mismatch than a clean example (like the one we just walked through) could be missed or over-flagged.",
          "The STE prose pass touched 14 files; despite verification, a subtle meaning drift in reworded prose is the main risk of that kind of edit."
        ],
        "testing": "Dedup verified via `uv run <script>.py --help` on all three refactored scripts post-change. STE pass verified via ste-lint.py before/after scores on all 14 touched files, plus manual diffing of field names, JSON keys, and §-cross-references before/after to catch accidental semantic drift from the prose edits. interview-guide.md reread end-to-end for internal coherence after both passes landed.",
        "reviewer_focus": [
          "§3a in interview-guide.md — the core new design; read it end to end for coherence",
          "SKILL.md step 5 — confirm it still matches interview-guide.md's actual flow",
          "The STE-pass diffs generally, for any accidental meaning drift introduced while rewording"
        ],
        "unknowns": []
      },
      "assessment": {
        "stage": "pre",
        "generated": "2026-08-06",
        "verdict": "sound",
        "risk_tier": "architectural",
        "summary": "Deduplicates three identical copies of rewrite_manifest() into scripts/_manifest.py, following the repo's existing _bundle_meta.py shared-module pattern, with no behavior change. Adds a self-consistency check (interview-guide.md §3a) that asks the author the problem and approach blind before showing Claude's own diff-derived hypothesis, then compares all three accounts by judgment rather than keyword matching — a cross-cutting change to how every future submit-mode interview runs. Also runs an STE-flavored active-voice pass across SKILL.md and every references/ file.",
        "sensible": {
          "answer": "Yes, on both halves. The dedup solves a real, named duplication problem in the scripts district, at the layer it belongs (a shared module, matching the _bundle_meta.py precedent already in the codebase). The self-consistency check solves a gap the author found live, during a real PR interview — the interview had no mechanism to catch an author's own unsettled or incorrect account of their change, which is exactly the kind of judgment work this repo's references/ docs are meant to hold.",
          "evidence": [
            "scripts/_manifest.py",
            "skills/odyssey/references/interview-guide.md",
            "scripts/_bundle_meta.py"
          ]
        },
        "maintainability": {
          "answer": "Helps on both fronts. The dedup removes the second and third places a manifest-shape bug could hide, collapsing three call sites onto one function. The self-consistency check adds no new schema field and no new interview stage — it reorders two questions §3 already budgets, so it costs no new surface for the intent block or verify_bundle.py to track.",
          "constraint_introduced": "rewrite_manifest() has exactly one implementation (scripts/_manifest.py); the three callers may never re-inline their own copy. The interview must show the drafted hypothesis only after both the problem and approach questions are answered blind.",
          "evidence": [
            "scripts/_manifest.py:1-83",
            "skills/odyssey/references/interview-guide.md:63-64,104-106"
          ]
        },
        "pattern": {
          "verdict": "conforms",
          "answer": "The dedup conforms to the shared-module pattern scripts/_bundle_meta.py already established for exactly this problem (one script imported, never executed, by its callers). The STE pass conforms to the Writing standard section of this repo's own CLAUDE.md, which already mandates STE for these exact files. The self-consistency check is new — no ADR or district already covers author-side consistency checking inside the interview — but it extends interview-guide.md and review-mode.md's existing risk_tier/unknowns machinery rather than introducing a parallel one, so it reads as an extension of an established pattern, not a reinvention.",
          "duplicates": [],
          "evidence": [
            "scripts/_bundle_meta.py",
            "skills/odyssey/references/interview-guide.md",
            "skills/odyssey/references/review-mode.md:169-172"
          ]
        },
        "findings": [
          {
            "severity": "note",
            "claim": "The mismatch-detection in §3a is a judgment call made at interview time, with no mechanical check — its accuracy depends entirely on how carefully the interviewing Claude compares the three accounts.",
            "evidence": "skills/odyssey/references/interview-guide.md:115-118",
            "district": "skills",
            "suggestion": "No action needed now; worth watching in practice for false negatives (a real mismatch missed) or false positives (a register difference wrongly raised as material)."
          }
        ],
        "boundary_checks": [
          {
            "rule": "Configuration crosses into code in one place, not scattered env reads.",
            "source": "skills/odyssey/references/stacks/generic.md",
            "result": "pass",
            "evidence": "No env var or config reads added or changed in this diff — grep for os.environ/getenv across the four changed scripts shows no new occurrences."
          }
        ],
        "delta": {
          "districts_added": [],
          "districts_changed": [
            {
              "id": "scripts",
              "files_before": 12,
              "files_after": 13
            },
            {
              "id": "skills",
              "files_before": 12,
              "files_after": 12
            }
          ],
          "edges_added": [],
          "edges_removed": []
        },
        "regret_risk": "Low. The dedup is mechanically verified (all three callers still run) and reduces, not adds, the number of places to change. The bigger long-term cost is the self-consistency check's judgment-based nature: if Claude ever runs the §3a comparison carelessly, it either misses a real mismatch (defeating the point) or over-flags a harmless register difference (training authors to expect friction and answer defensively, the exact failure mode §3 already warns about). Neither failure leaves a trace in story.json today, since the check produces no artifact of its own besides what lands in unknowns. The team lives with a process step whose quality is only as good as the interviewing session that ran it, with no automated regression check to catch drift over time.",
        "drift": []
      },
      "adrs": [
        "ADR-0010"
      ]
    }
  ]
};
