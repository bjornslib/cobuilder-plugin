window.STORY = {
  "meta": {
    "repo": "prodyssey",
    "generated": "2026-07-22",
    "schema_version": "1.3",
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
        "id": "skills",
        "label": "Skills",
        "kind": "core",
        "files": 0,
        "blurb": "Four skills, invoked by name, not by path: odyssey holds the orchestration procedure and its on-demand references (story-mode, decision-records-lite, baseline-derivation, design-mode, stack cards). architecture holds review, maintenance, design, decisions, describe, and debug modes. mermaid authors the Mermaid diagrams. ste-writing is a dev-local linter for plain-English prose, and it never ships with the plugin.",
        "root_paths": [
          "skills"
        ]
      },
      {
        "id": "scripts",
        "label": "Scripts",
        "kind": "core",
        "files": 1,
        "blurb": "Eighteen PEP 723 uv scripts that move data mechanically. Each skill mode calls them; none of them author narrative, ADRs, or diagrams. build_adrs.py and build_designs.py compile authored markdown into JSON the viewer reads. render_review.py lays out an assessment without judging it.",
        "root_paths": [
          "scripts"
        ]
      },
      {
        "id": "commands",
        "label": "Commands",
        "kind": "tooling",
        "files": 0,
        "blurb": "Thin dispatchers, one per mode (baseline, generate, view, publish, submit, design, review, maintenance, decisions, describe, debug, explore-design). Each forwards its arguments straight into a skill and holds no logic of its own.",
        "root_paths": [
          "commands"
        ]
      },
      {
        "id": "viewer",
        "label": "Viewer",
        "kind": "core",
        "files": 0,
        "blurb": "One HTML file that renders a generated bundle: story timeline, ADR sheet, assessment sheet, and Mermaid diagrams. It depends on sibling data files inside a real bundle directory, and it is not a self-contained artifact as-is.",
        "root_paths": [
          "viewer"
        ]
      },
      {
        "id": "docs",
        "label": "Docs",
        "kind": "authored-source",
        "files": 209,
        "blurb": "Authored source that no script regenerates: architecture decision records under architecture/adr and adr, design proposals under architecture/designs, two architecture review reports, a plan for cobuilder-factory, and staged pull-request content under pull-requests. Submit and design mode write here. Generate mode never does.",
        "root_paths": [
          "docs"
        ]
      },
      {
        "id": ".cobuilder-architect",
        "label": "Bundle Store",
        "kind": "tooling",
        "files": 106,
        "blurb": "The plugin's own generated output, committed alongside the code it narrates. self holds this repo's own bundle. Two named subfolders hold committed test fixtures generated against other local checkouts. An active symlink and view-server pid and log files are the only entries meant to stay out of git.",
        "root_paths": [
          ".cobuilder-architect"
        ]
      }
    ]
  },
  "timeline": [
    {
      "pr": 1,
      "date": "2026-07-22",
      "title": "Master",
      "tagline": "",
      "depth": "summary",
      "size": {
        "files": 29,
        "adds": 6159,
        "dels": 40
      },
      "touched": {
        "(root)": 2,
        ".prodyssey": 22,
        "commands": 3,
        "skills": 2
      },
      "levels": {},
      "status": "merged",
      "commit": "7bd668f"
    },
    {
      "pr": 2,
      "date": "2026-07-24",
      "title": "docs: add CLAUDE.md with codebase orientation + artifact feasibility findings",
      "tagline": "This PR proposes an orientation doc, plus a full pipeline that turns any generated PR narrative into a shareable Claude Artifact.",
      "depth": "detailed",
      "size": {
        "files": 31,
        "adds": 7850,
        "dels": 51
      },
      "touched": {
        ".odyssey": 18,
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
      "status": "merged",
      "commit": "96c1531",
      "intent": {
        "captured": "2026-09-23",
        "source": "inferred",
        "authorship": "agent-assisted",
        "problem": "prodyssey had no in-repo orientation document. `skills/odyssey/SKILL.md` holds an orchestration procedure, not the repo layout or the bundle-shape conventions, so a session reconstructed both from scratch. Separately, a generated PR story could only be read from a real `.odyssey/` bundle directory with its sibling `data/` and `assets/` folders present, so sharing one story meant sending the repo and running a local server.",
        "why_now": "No author statement of the timing survives, so this field is my reading. The PR's own title pairs the two halves and calls the artifact work the feasibility findings for the orientation doc, so the two landed as one change: the document that explains the bundle also explains what a flattened copy of it costs.",
        "approach": "`CLAUDE.md` records the layout, the generation flow, and the bundle shape. Three new scripts plus a Publish mode turn one generated PR into a self-contained HTML file. `export_artifact.py` inlines this PR's timeline entry, its referenced ADRs, its diff, and its scene art and narration as literal globals, rewrites the viewer's three relative-path lookups to read embedded data-URI maps, drops the Google Fonts and Motion CDN tags, and recompresses the hero art from PNG to JPEG under a byte budget. `record_publish.py` writes the Artifact tool's returned URL back into `exports/publish-manifest.json`, and `export_index.py` renders a landing page over that manifest. `extract_story.py` now persists each PR's merge commit, which gives the pipeline a stable reference to test for staleness.",
        "alternatives": [
          {
            "option": "Publish the raw `.odyssey` bundle directory as-is",
            "rejected_because": "An Artifact is one file with no siblings and a CSP that blocks every external request, so the viewer's `<script src=\"../data/*.js\">` tags and its relative asset paths do not resolve."
          },
          {
            "option": "Keep the scene art as lossless PNG",
            "rejected_because": "The source PNGs run about 5 MB each, so three of them approach the 16 MiB cap before the narration audio is counted."
          },
          {
            "option": "Republish on every `/prodyssey:publish` run",
            "rejected_because": "It spends an Artifact call and mints a second URL for a PR that has not changed since its last publish."
          },
          {
            "option": "Test staleness on the content hash alone, with no commit SHA",
            "rejected_because": "The commit SHA was already computed and discarded one function away, and it catches an open PR whose branch moved while the narrated text stayed the same."
          }
        ],
        "out_of_scope": [
          "A multi-PR export in one file. The 16 MiB budget is comfortable for one PR's images and audio and not for several.",
          "`--format notion`. The flag is accepted and reports that it has no implementation behind it.",
          "Any action on GitHub beyond opening nothing at all: the mode posts no comment, edits no existing PR body, sets no label, and merges nothing."
        ],
        "risks": [
          "An export over the byte budget is written anyway with a warning, and the Artifact platform may then reject it at its 16 MiB hard cap.",
          "`exports/publish-manifest.json` is load-bearing state tracked in git, so a lost or hand-edited manifest costs the recorded Artifact URL.",
          "A PR generated before this change carries no `commit` field, so the staleness check has nothing to compare until that PR is regenerated."
        ],
        "testing": "Not recorded by an author, because no interview ran. The evidence the diff carries is the export this session wrote and published, and the committed `exports/pr-2.html`, `exports/index.html`, and `exports/publish-manifest.json` beside `.prodyssey/digital-curator-80f83abb/exports/` — a second repo's bundle, which is the proof the pipeline works outside self-analysis too.",
        "reviewer_focus": [
          "`export_artifact.py`'s three relative-path rewrites and its `escape_script_close` guard. The viewer breaks quietly if a rewrite misses, or if a diff carries a literal `</script>`.",
          "The compression tiers, and the choice to write an over-budget export with a warning instead of failing.",
          "`exports/publish-manifest.json` as committed state rather than disposable build output."
        ],
        "unknowns": []
      },
      "assessment": {
        "stage": "retrospective",
        "generated": "2026-09-23",
        "verdict": "concerns",
        "risk_tier": "architectural",
        "summary": "A merged, retrospective reading of PR 2, written after the fact, so this assessment carries observations and drift rather than predictions. Two problems are solved at the right layer and neither is a duplicate of anything the repo already had. Two records in the bundle do not agree with the tree any more: the entry names a merge commit that master no longer carries for PR #2, and the recorded file count disagrees with the extracted diff. The stack card's boundary greps for the touched paths return empty on every rule, which says more about this repo — prose plus standalone PEP 723 scripts, with no layered domain packages — than about the code.",
        "sensible": {
          "answer": "Both halves solve a real problem at the layer that owns it. The orientation gap belongs in the repo root, and `CLAUDE.md` is where this repo keeps it. The sharing gap belongs to the bundle's consumer side, and an export script beside the other bundle scripts is the right home. The second half is a new capability rather than a documentation change, and it ships under a `docs:` title, so a reader who reads the title and not the diff meets a 456-line exporter they did not expect. That is a presentation cost, not a design fault. `intent.source` is `inferred`, so this answer judges the change against my own reading of the problem, not against a statement the author gave.",
          "evidence": [
            "CLAUDE.md",
            "commands/publish.md",
            "scripts/export_artifact.py",
            "ADR-0001"
          ]
        },
        "maintainability": {
          "answer": "The change helps. It takes a decision that lived only in a served directory — what a story needs in order to travel — and moves it into one script with one budget and one retry ladder. It costs readability in one spot: `export_artifact.py` rewrites three strings inside the viewer's own JavaScript by regex, so a later viewer edit can break the export without breaking the viewer. Nothing tests that coupling. The viewer itself gained no test when its paths became data-URI lookups.",
          "constraint_introduced": "`exports/publish-manifest.json` is state, not output. The per-PR commit SHA and content hash in it decide whether a republish happens, and the `artifact_url` in it is the only pointer to the live page.",
          "evidence": [
            "scripts/export_artifact.py",
            "scripts/record_publish.py",
            "ADR-0002",
            "exports/publish-manifest.json"
          ]
        },
        "pattern": {
          "verdict": "new-valuable",
          "answer": "No script in this repo exported a bundle before this change, and no ADR described a publish path, so nothing here duplicates or reinvents an existing pattern. The pattern earns its place: it removes the repo checkout from sharing a story, and it makes a second publish run cheap and safe. The honest caveat is that the bundle holds two ADRs and one earlier PR at this point, which is a thin history to judge against. A richer corpus could have shown a static-site export or a hosted reader already in use somewhere the districts do not reach.",
          "duplicates": [],
          "evidence": [
            "ADR-0001",
            "ADR-0002",
            "data/adrs.json"
          ]
        },
        "findings": [
          {
            "kind": "drift",
            "id": "pr2-commit-moved",
            "severity": "concern",
            "title": "The recorded commit is not the merge master carries",
            "claim": "PR 2's timeline entry names commit `96c1531`, but the merge of PR #2 reachable from `master` today is `948a4d3`. Both subjects read `Merge pull request #2`. A mechanical re-run therefore rewrites the field, which matters because ADR-0002 keys the publish staleness check on exactly this value.",
            "detail": "PR 2's timeline entry names commit `96c1531`, but the merge of PR #2 reachable from `master` today is `948a4d3`. Both commit subjects read `Merge pull request #2`. A mechanical re-run of `extract_story.py` therefore rewrites the field, which matters because ADR-0002 keys the publish staleness check on exactly this value.",
            "evidence": "git log --merges master => 948a4d3 Merge pull request #2; data/story.json timeline[2].commit = 96c1531; extract_story.py --prs 2 --dry-run rewrites it to 948a4d3",
            "district": "scripts",
            "suggestion": "Decide which merge commit the record should name before any later re-run of extract_story.py. This bundle keeps `96c1531` by running the extractor with `--dot-range 96c1531`, which reproduces story.json with no changes at all."
          },
          {
            "kind": "drift",
            "id": "pr2-no-pre-merge-intent",
            "severity": "note",
            "title": "No pre-merge intent was captured, so drift kinds cannot be computed",
            "claim": "This PR merged before Generate mode existed. It carried no `intent` block, so review-mode.md section 7's four drift kinds — `out_of_scope`, `unaddressed_risk`, `adopted_alternative`, `delta_shift` — have nothing to compare against. This assessment is the retrospective account instead.",
            "detail": "This PR merged before Generate mode existed, so it carried no `intent` block and review-mode.md section 7's four drift kinds have nothing to compare against. The `intent` on this entry today is inferred from the diff, the ADRs, and the narration, and it is marked `source: inferred`. Do not read it as the author's own statement.",
            "evidence": "data/story.json timeline[2] carried no intent block until 2026-09-23",
            "district": ".odyssey",
            "suggestion": "Read this assessment as the retrospective account it is, and expect no out_of_scope or unaddressed_risk entry for this PR."
          },
          {
            "kind": "observation",
            "id": "pr2-file-count-disagrees",
            "severity": "note",
            "title": "The recorded file count disagrees with the extracted diff",
            "claim": "The timeline entry records `size.files` as 31, and its `touched` map sums to 31, while the extracted diff holds 29 file entries and the authored `file_changes` narration says 29 files. Two independent numbers describe one change.",
            "detail": "The timeline entry records `size.files` as 31, and its `touched` map sums to 31, while `data/diffs-pr2.js` holds 29 file entries and the authored `file_changes` narration says 29 files. The two numbers come from different commands: `git diff --stat` for the size, and `extract_diffs.py`'s own scan for the diff.",
            "evidence": "data/story.json timeline[2].size.files = 31 versus data/diffs-pr2.js (29 keys)",
            "district": ".odyssey",
            "suggestion": "Record which number is authoritative before a later slice asserts a file count for this PR. Leave both records alone until then."
          },
          {
            "kind": "observation",
            "id": "pr2-over-budget-warning",
            "severity": "note",
            "title": "An over-budget export is written, not refused",
            "claim": "After the tightest compression tier and the audio drop, `export_artifact.py` still writes an over-budget file and prints a warning. The publish step can then be rejected by the platform's 16 MiB hard cap, one step later than the problem appeared.",
            "detail": "After the tightest compression tier and the audio drop, `export_artifact.py` still writes an over-budget file and prints a warning. The publish step can then be rejected by the platform's 16 MiB hard cap, one step later than the problem appeared. This is a deliberate trade: a warning plus a written file is easier to inspect than a silent failure.",
            "evidence": "scripts/export_artifact.py main — the WARNING branch after the last tier",
            "district": "scripts",
            "suggestion": "Keep the warning. A failed publish is cheaper to recover from than a silently truncated file, and the warning names the size."
          },
          {
            "kind": "observation",
            "id": "pr2-manifest-is-state",
            "severity": "note",
            "title": "The publish manifest is committed state and the only URL pointer",
            "claim": "`exports/publish-manifest.json` becomes load-bearing in the same change that creates it. ADR-0002 records it as tracked state, so a merge conflict or a hand edit in it silently changes what the pipeline believes is published, and loses the recorded Artifact URL.",
            "detail": "`exports/publish-manifest.json` becomes load-bearing in the same change that creates it. ADR-0002 records it as tracked state rather than disposable output, so a merge conflict or a hand edit in it silently changes what the pipeline believes is published, and loses the recorded Artifact URL that a republish needs in order to update the same page instead of minting a second one.",
            "evidence": "ADR-0002 consequences; scripts/record_publish.py writes artifact_url into it",
            "district": ".odyssey",
            "suggestion": "Treat a conflict in that file as data loss, not as a formatting conflict, and resolve it by re-running the exporter."
          }
        ],
        "boundary_checks": [
          {
            "rule": "The dependency rule: inner layers (domain, business logic) never import outer layers (HTTP, UI, DB drivers, framework code). Identify the codebase's inner packages, then grep them for framework/driver imports.",
            "source": "stacks/generic.md",
            "result": "not-checkable",
            "evidence": "This repo has no inner package. It is prose plus standalone PEP 723 scripts, with no layered domain module to grep. The grep itself ran: the five files this PR adds or changes import only stdlib and Pillow, and no framework or driver import appears in any of them."
          },
          {
            "rule": "Configuration crosses into code in one place, not scattered env reads.",
            "source": "stacks/generic.md",
            "result": "pass",
            "evidence": "grep -n 'environ|getenv' over the five files this PR adds or changes returns no hit: none of them reads configuration, so the PR adds no new place for config to cross in. Run over the whole repo, the same grep hits three files — plugins/pr/scripts/generate_prompts.py:268, plugins/pr/scripts/generate_audio.py:67, and shared/validate_decision_state.py:69 — none of them touched here."
          }
        ],
        "delta": {
          "districts_added": [],
          "districts_changed": [],
          "edges_added": [],
          "edges_removed": [],
          "note": "Left empty on purpose, because no honest value exists. This PR's own `touched` map names six districts and their file counts - .odyssey 18, .prodyssey 3, (root) 2, commands 1, scripts 5, skills 2 - but the count each district held BEFORE the change is recorded nowhere, and writing 0 would invent a number. The inventory in the bundle has also been re-derived since, so its districts are not the ones this PR touched. No import edge is claimed either: this repo's districts are directories of markdown and standalone PEP 723 scripts, no script imports another, and a grep in both directions finds no edge to add."
        },
        "regret_risk": "What the team lives with is a second place to change whenever the viewer moves. `export_artifact.py` holds three regex rewrites and a regex that finds the viewer's script block, so a later viewer edit that changes those strings leaves the export quietly wrong rather than loudly broken. The cost shows up as a published page that renders but shows no hero image, and nothing in the repo tests it. The second cost is the manifest. It is committed state that decides what is already live, and its contents are a URL that exists on one platform and nowhere else. Lose it in a merge and the next publish mints a second page for a PR that already has one. Both costs are accepted for a capability the repo did not have, and both are worth a test before the viewer moves again.",
        "drift": []
      }
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
        ".claude-plugin": 1,
        ".claude": 3,
        "(root)": 3,
        ".prodyssey": 29,
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
      },
      "status": "merged",
      "commit": "fb4be22"
    },
    {
      "pr": 4,
      "date": "2026-08-02",
      "title": "Mermaid diagrams for levels 1-3, and self-upgrading bundles",
      "tagline": "This PR proposes a second visual family alongside Gemini scene art — text-only Mermaid diagrams authored by a per-PR subagent — plus a mechanism that upgrades any older bundle in place before a session touches it.",
      "depth": "detailed",
      "status": "merged",
      "size": {
        "files": 71,
        "adds": 23349,
        "dels": 332
      },
      "touched": {
        ".claude-plugin": 1,
        "(root)": 3,
        ".prodyssey": 16,
        "commands": 1,
        "scripts": 8,
        "skills": 41,
        "viewer": 1
      },
      "commit": "065654d",
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
      "pr": 7,
      "date": "2026-08-05",
      "title": "Pr Odyssey Improvements 7Suouc",
      "tagline": "",
      "depth": "summary",
      "size": {
        "files": 8,
        "adds": 129,
        "dels": 73
      },
      "touched": {
        ".prodyssey": 6,
        "scripts": 1,
        "viewer": 1
      },
      "levels": {},
      "status": "merged",
      "commit": "630aa4f"
    },
    {
      "pr": 8,
      "date": "2026-08-06",
      "title": "Ste Writing Style Claude Fd5Fzs",
      "tagline": "",
      "depth": "summary",
      "size": {
        "files": 1,
        "adds": 44,
        "dels": 10
      },
      "touched": {
        "(root)": 1
      },
      "levels": {},
      "status": "merged",
      "commit": "d9a81d7"
    },
    {
      "pr": 9,
      "date": "2026-08-06",
      "title": "Deduplicate rewrite_manifest(); add interview self-consistency check; STE clarity pass",
      "tagline": "Three duplicate copies of one function become one, and submit mode's own interview now checks the author's account against itself before writing anything down.",
      "depth": "detailed",
      "size": {
        "files": 45,
        "adds": 2893,
        "dels": 670
      },
      "touched": {
        ".prodyssey": 27,
        "scripts": 4,
        "skills": 13,
        "viewer": 1
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
      "status": "merged",
      "commit": "139de94",
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
    },
    {
      "pr": 10,
      "date": "2026-08-06",
      "title": "Swift Best Practices Fbx48M",
      "tagline": "",
      "depth": "summary",
      "size": {
        "files": 7,
        "adds": 329,
        "dels": 8
      },
      "touched": {
        "(root)": 1,
        "skills": 6
      },
      "levels": {},
      "status": "merged",
      "commit": "6b2fce6"
    },
    {
      "pr": 11,
      "date": "2026-08-25",
      "title": "Design cobuilder-architect and cobuilder-implement, split repo into five plugins and skills",
      "tagline": "One plugin doing four jobs became five, a new design mode now interviews before code exists, and the biggest ADR of the batch admits the viewer split it decided is not built yet.",
      "depth": "detailed",
      "size": {
        "files": 558,
        "adds": 101594,
        "dels": 2507
      },
      "touched": {
        ".claude-plugin": 2,
        ".claude": 3,
        ".cobuilder-architect": 91,
        ".cobuilder": 15,
        "(root)": 4,
        ".lavish": 8,
        ".prodyssey": 6,
        ".serena": 1,
        "docs": 64,
        "plugins": 298,
        "scripts": 2,
        "shared": 49,
        "skills": 3,
        "tests": 12
      },
      "status": "merged",
      "commit": "a389892",
      "adrs": [
        "ADR-0016",
        "ADR-0017",
        "ADR-0018",
        "ADR-0019",
        "ADR-0020"
      ],
      "levels": {
        "landscape": {
          "narration": "This PR reorganized the whole plugin around five jobs instead of one, and gave it a way to capture a design's intent before the first line of code exists. Five hundred fifty-eight files moved, most of them carried unchanged into their new plugin home under the new plugins directory, with about a hundred thousand lines added against twenty-five hundred removed.",
          "voice": "This one change reshapes the whole plugin. What used to be a single install now splits into five separate plugins, one per job, so a person who only wants pull request narration no longer has to take the design tooling and the paid art pipeline along with it. It also adds a brand new design mode, so a decision gets written down before anyone writes the code that follows from it. Five hundred fifty-eight files moved in this one change, most of them carried into their new home unchanged, with roughly a hundred thousand lines added against twenty-five hundred removed."
        },
        "problem_solution": {
          "problem": "The plugin had grown to cover four separate jobs inside one install: narrating merged history, generating and reviewing pull requests, serving and publishing the bundle, and auditing architecture. A user who wanted only one of those jobs installed the whole corpus anyway, including the paid Gemini art pipeline. Separately, every mode operated only after code existed. Nothing captured why a change was being made until a diff was already sitting there to read, so review mode spent its effort reconstructing intent nobody had written down. And `viewer/index.html` had grown to 4917 lines in one file, with 145 functions in a single JavaScript closure and one card fragment copy-pasted eighteen times, with no plan for how a future engineer could split it.",
          "solution": "The plugin split into five sibling plugins under a new `plugins/` directory: `cobuilder-architect` for design, review, maintenance, decisions, describe, and debug; `cobuilder-pr` for the five Odyssey history modes plus the new generate mode; `cobuilder-artifact` for serving and publishing the bundle; `cobuilder-implement` for building a design's epics; and `cobuilder-full-lifecycle` as an umbrella that depends on the other four. Code every plugin needs moved into one marketplace-level `shared/` directory, vendored into each plugin's own root by a symlink, so a cached plugin never reaches across another plugin's file path. A new `/cobuilder-architect:design` mode now runs an interview before any code exists, producing an ADR plus an `intent.json` that later review work can read instead of re-deriving. Four architecture decisions from this same change now live in the bundle as ADR-0016 through ADR-0019, covering the five-plugin split, the vendored shared code, one lifecycle surface with a derived record index, and an anchored-comments ledger. A fifth, ADR-0020, records a plan to split the viewer into authored parts under `viewer/src/`, compiled by a build step that runs only when an engineer changes the viewer — decided, but deliberately not executed in this PR.",
          "narration": "The plugin used to be one thing that did four jobs. Now it is five separate things, each doing one job, sharing their common code through one folder instead of copying it around. On top of that split, a brand new mode sits at the very start of the process: before anyone writes code, it interviews the person making the change and writes down what they intend, so nobody has to guess at it later by reading a diff. And the file that draws the viewer, which had grown past five thousand lines with no way to split it, now has a written plan for how it will be split — though that plan is not carried out yet.",
          "beats": [
            {
              "kind": "background",
              "text": "Before this PR, one plugin held four skills, thirteen commands, and twenty-two scripts, installed as a single unit. `viewer/index.html` was the one file every one of those four jobs read from or wrote to, which is why the split could not simply divide the plugin down the middle without duplicating the viewer."
            },
            {
              "kind": "background",
              "text": "Gate 4b, the technical-solution-design sub-step of `cobuilder-implement`'s Gate 4, existed in documentation before this PR but had never actually run for any multi-slice epic. This PR's own five `plugin-split` epics are the first real test of that gate, and Gate 4b came back outstanding for all five, which is why `verify_gate.py` now exits non-zero by design rather than by bug."
            },
            {
              "kind": "intuition",
              "text": "The clearest number in this change is `viewer/index.html` itself: 4917 lines, 881 of them CSS, 3872 of them JavaScript packed into a single IIFE holding 145 functions, with one card fragment duplicated eighteen times across five interleaved view modes. ADR-0020 names that exact shape as the reason nobody had been able to split the file before now, and the fix it records — parts under `viewer/src/`, compiled by `build_viewer.py` only when an engineer touches the viewer — is deliberately a decision on paper, not a change to the file in this diff."
            }
          ],
          "voice": "The problem this change set out to fix was that one plugin was doing the work of four. Anyone who wanted just one of those jobs, say narrating pull requests, ended up installing the design tooling and the paid image generation pipeline too, whether they wanted them or not. On top of that, every mode only ever ran after the code already existed, so review work spent real effort guessing at intent that nobody had written down. The fix splits the plugin into five separate plugins, one per job, sharing their common code through a single shared folder. It also adds a new design mode that interviews the person making a change before any code is written, so that intent is captured once, at the source, instead of reconstructed later from a diff."
        },
        "architecture": {
          "narration": "Five decisions carry the structural weight of this change. Splitting into five plugins fixes the install-surface problem, at the cost of needing a seam between them that is not a file path. Vendoring shared code by symlink keeps that seam from drifting between plugins that each hold their own copy. One lifecycle surface with a derived record index keeps the viewer from splintering into one page per artifact family as the family of artifacts grows. An anchored-comments ledger gives the viewer, the largest reading surface in the system, a way for a reader to talk back. And a viewer split into authored parts is recorded as the plan for the file that none of the other four decisions could touch without first agreeing on how it would be maintained going forward.",
          "beats": [
            {
              "kind": "forces",
              "text": "The install surface is the unit a user actually chooses at `/plugin install` time. A directory inside one plugin is not separately installable, so a user who wanted only pull-request narration still took the whole corpus, the viewer, and the paid-art pipeline along with it (ADR-0016)."
            },
            {
              "kind": "forces",
              "text": "A cached plugin cannot read outside its own directory: `${CLAUDE_PLUGIN_ROOT}` resolves only to that plugin's own cache. Splitting into five plugins therefore could not let one plugin call another's script by file path, and needed a vendoring mechanism instead (ADR-0017)."
            },
            {
              "kind": "forces",
              "text": "The lifecycle now produces forty-one artifacts across seven reading surfaces, with the joins between them declared in authored source and resolved nowhere — a decision was reachable only when some other change happened to cite it (ADR-0018)."
            },
            {
              "kind": "forces",
              "text": "The viewer is the largest reading surface in the system, and until this PR it carried no way for a reader to respond to what they read: someone could read a whole pull request narrative and have nowhere to leave a reaction the agent would ever see (ADR-0019)."
            },
            {
              "kind": "forces",
              "text": "`viewer/index.html` had to keep shipping as one self-contained file, because a published Artifact is a single file under a content-security policy that blocks every external request. That constraint is exactly why nobody had split the file before, and why ADR-0020 proposes a build step rather than real sibling files loaded by script tags (ADR-0020)."
            },
            {
              "kind": "contract",
              "text": "The plugin split into five siblings under `plugins/`, integrating only through the bundle directory on disk. Shared code moved into one marketplace-level `shared/` directory, vendored into each plugin by symlink, with a compatibility gate that every writer calls before it writes rather than a promise kept only in skill prose. The viewer became one lifecycle surface backed by a derived `data/index.json` record index. Comments on that viewer get computed from the live DOM at annotation time and appended to a durable, append-only ledger. And the viewer's own future split was decided — authored parts under `viewer/src/`, compiled by `build_viewer.py`, run only when an engineer changes the viewer — without being executed in this PR."
            },
            {
              "kind": "boundary",
              "text": "None of the five plugins ships an agent, a hook, or an MCP server, by design, so no plugin in the family can touch another session's permission surface. A known gap ships alongside the split: `refine_epic_status()` in `shared/build_index.py` reads only narrated, merged pull requests from `data/story.json`, so an open pull request is not yet a real entity in the record index. This repo's own PR 11 is the case in point — eight epics across the family point their `branch` at it, and the index falls back to a hardcoded `\"open\"` placeholder for every one of them, a recorded gap that `inflight-record-store`'s first epic exists to close, not a bug introduced here."
            }
          ],
          "voice": "Five decisions give this change its architectural shape. Splitting one plugin into five fixes who has to install what, at the price of needing a seam between them that is not just a shared file path. Vendoring the shared code by symlink keeps that seam from drifting out of step. Turning the viewer into one surface, backed by one derived index, keeps new kinds of records from each demanding a new page of their own. Giving that viewer a durable, appended ledger of comments means a reader finally has somewhere to leave a reaction. And the plan to split the viewer file itself into authored parts, compiled at build time, is written down and agreed, even though it is not built yet in this change."
        },
        "file_changes": {
          "narration": "Five hundred fifty-eight files moved in seven groups: the new five-plugin scaffold, the shared code vendored by symlink, the design-mode skill and its references, Gate 4b enforcement in cobuilder-implement, the five ADRs this PR wrote to record its own decisions, the bundle store carried over from its old .prodyssey/ location, and the new tests covering the packaging invariants this split introduced.",
          "groups": [
            {
              "title": "Five-plugin scaffold",
              "note": "New `plugins/` directory holding five plugin manifests and their own commands, skills, and scripts, replacing the single top-level plugin this repo used to ship.",
              "files": [
                ".claude-plugin/marketplace.json",
                "plugins/cobuilder-architect/.claude-plugin/plugin.json",
                "plugins/cobuilder-pr/.claude-plugin/plugin.json",
                "plugins/cobuilder-artifact/.claude-plugin/plugin.json",
                "plugins/cobuilder-implement/.claude-plugin/plugin.json",
                "plugins/cobuilder-full-lifecycle/.claude-plugin/plugin.json"
              ]
            },
            {
              "title": "shared/ vendored by symlink",
              "note": "One marketplace-level shared/ directory holding bundle-meta, manifest, build_index, ledger, migration, and slice-table code, symlinked into each plugin's own root per ADR-0017.",
              "files": [
                "shared/_bundle_meta.py",
                "shared/_manifest.py",
                "shared/build_index.py",
                "shared/ledger.py",
                "shared/migrate_bundle.py",
                "shared/validate_decision_state.py",
                "shared/verify_bundle.py"
              ]
            },
            {
              "title": "Design mode skill and references",
              "note": "The new /cobuilder-architect:design mode, its interview and challenge references, and the design-mode ADR that records the mode's own shape.",
              "files": [
                "plugins/cobuilder-architect/skills/architecture/SKILL.md",
                "docs/architecture/adr/ADR-0011-design-mode.md",
                "docs/architecture/adr/ADR-0012-cobuilder-implement.md",
                "docs/architecture/adr/ADR-0013-design-mode-implement-join.md",
                "docs/architecture/designs/design-mode/goal.json",
                "docs/architecture/designs/design-mode/intent.json",
                "docs/architecture/designs/design-mode/narrative.json"
              ]
            },
            {
              "title": "Gate 4b enforcement",
              "note": "cobuilder-implement's first script, checking Gates 4a, 4b, and 4c and failing closed when a multi-slice epic is missing an approved technical solution design.",
              "files": [
                "plugins/cobuilder-implement/scripts/verify_gate.py",
                "docs/plans/cobuilder-family/00-status.md",
                "docs/plans/cobuilder-family/04-slices.md",
                "tests/test_gate_hardening.py"
              ]
            },
            {
              "title": "New ADRs for this PR's own decisions",
              "note": "ADR-0016 through ADR-0020, authored by design mode itself to record the five-plugin split, the vendored shared code, the one-surface record index, the anchored-comments ledger, and the (not-yet-executed) viewer-parts plan.",
              "files": [
                "docs/architecture/adr/ADR-0016-five-sibling-plugins-bundle-as-seam.md",
                "docs/architecture/adr/ADR-0017-vendored-shared-code-and-bundle-compatibility.md",
                "docs/architecture/adr/ADR-0018-one-lifecycle-surface-and-a-record-index.md",
                "docs/architecture/adr/ADR-0019-anchored-comments-as-a-durable-ledger.md",
                "docs/architecture/adr/ADR-0020-viewer-parts-and-an-author-time-build.md"
              ]
            },
            {
              "title": "Bundle store rename and self-bundle carryover",
              "note": "The bundle root moved from .prodyssey/ to .cobuilder-architect/, carrying this repo's own self bundle and its two committed foreign-repo test fixtures along with it.",
              "files": [
                ".cobuilder-architect/self/bundle.json",
                ".cobuilder-architect/self/data/story.json",
                ".cobuilder-architect/self/viewer/index.html",
                ".cobuilder-architect/cobuilder-harness-a103a550/bundle.json",
                ".cobuilder-architect/digital-curator-80f83abb/bundle.json"
              ]
            },
            {
              "title": "Test suite growth for the new packaging invariants",
              "note": "New tests covering plugin manifests, pillar boundaries, the shared-code symlinks, the migration ladder, and the viewer's mode switching, added alongside the split rather than after it.",
              "files": [
                "tests/test_plugin_manifests.py",
                "tests/test_pillar_boundaries.py",
                "tests/test_shared_manifest.py",
                "tests/test_migrate_bundle.py",
                "tests/test_viewer_modes.py",
                "tests/test_build_index.py"
              ]
            }
          ]
        }
      }
    },
    {
      "pr": 12,
      "date": "2026-08-25",
      "title": "Retire adr-draft, close Gate 4b retrospectively, and record two ADR maintenance rules",
      "tagline": "Pull request eleven left three kinds of debt, and this change pays each one off honestly, including a recovery that could have lost the whole branch.",
      "depth": "detailed",
      "size": {
        "files": 46,
        "adds": 3635,
        "dels": 1143
      },
      "touched": {
        ".claude": 2,
        ".cobuilder-architect": 7,
        "(root)": 2,
        "docs": 18,
        "plugins": 11,
        "scripts": 1,
        "shared": 2,
        "tests": 3
      },
      "status": "merged",
      "commit": "be93c04",
      "adrs": [],
      "levels": {
        "landscape": {
          "narration": "This change cleans up three loose ends that pull request eleven left behind: a documented artifact type nobody ever produced, a review gate that never actually ran, and pull-request notes that stopped a third of the way through the work. Forty-six files changed, most of them documentation and process records rather than working code.",
          "voice": "This change cleans up after the big five-plugin split. It retires a documented step that no tool ever carried out, it closes a review gate for five pieces of work after the fact and says so plainly, and it writes down two rules about how architecture decision records should age. Forty-six files changed, and almost all of them are documentation rather than application code."
        },
        "problem_solution": {
          "problem": "Pull request eleven left three kinds of debt. `adr-draft.md` was named in `CLAUDE.md` and `README.md` as an output of design mode, but no skill procedure ever told anyone to write one. The one draft that existed on disk, for `ADR-0011`, had already been promoted to a real record and still named a retired command and a retired export path. Separately, Gate 4b, which requires a technical solution design for any epic with more than one slice, had run for none of the five `plugin-split` epics, because it was the only Gate 4 sub-step with no downstream consumer forcing it to happen. And the four pull-request documents for the cleanup branch itself described only the first third of the work, stopping at an early commit.",
          "solution": "The `adr-draft.md` artifact type is gone from both documents, and the stale draft is deleted outright. Five retrospective epic designs, one per multi-slice `plugin-split` epic, now live at `docs/plans/cobuilder-family/epic-E{1,3,4,5,6}-design.md`, each opening with a block that says plainly the gate did not run before implementation and the document records what was built after the fact. `00-status.md` marks Gate 4b approved with that same qualifier, so `verify_gate.py` passes honestly instead of by omission. Two rules that were missing are now recorded: an ADR's Context, Decision, and Consequences prose is never edited to match the tree, only its index fields (`maps_to`, `state`, `last_verified`, `source_pr`) are kept current, and a drift finding is a report to weigh, not a work item to clear. The design-mode design gets the retrospective assessment it was missing, with findings of kind `observation` and `drift`, never `prediction`, so the record does not dress up hindsight as foresight.",
          "narration": "Pull request eleven's big split left some paperwork unfinished. This change finishes it. It removes a process step that nobody ever actually performed, it closes out a review gate for five pieces of already-shipped work while saying clearly that the gate ran late, and it writes down two rules for keeping decision records honest as the codebase around them keeps changing.",
          "beats": [
            {
              "kind": "background",
              "text": "`adr-draft.md` sat in `CLAUDE.md` and `README.md` as a documented output of design mode, but the skill procedure never produced one. The single draft on disk was for `ADR-0011`, already promoted to `docs/architecture/adr/`, and it still referenced the retired `/prodyssey:design` command and a retired `exports/` path."
            },
            {
              "kind": "background",
              "text": "Gate 4b requires a technical solution design for any epic carrying more than one slice. It had run for zero of the five `plugin-split` epics, because nothing downstream mechanically consumed its output, so a documented step went silently unenforced until `verify_gate.py` and `00-status.md`'s sub-steps started checking for it."
            },
            {
              "kind": "background",
              "text": "The pull-request documents on the cleanup branch itself, `docs/pull-requests/branch-design-design-mode/{description,assessment,intent}`, described only the first third of the branch's real work, stopping at an earlier commit than the branch actually reached."
            },
            {
              "kind": "intuition",
              "text": "A git stash round-trip popped a modern working tree onto a local `master` that was 33 commits stale, predating the five-plugin split. Conflict markers landed in four files, and in regions the tool considered unconflicted it silently kept the old side, reverting whole paragraphs to pre-rename naming. `git fsck --unreachable` found the dropped commit `80ce0367` still intact, and a second commit took its content verbatim, leaving only a difference in test count against the reconstructed branch."
            }
          ],
          "voice": "Pull request eleven, the big five-plugin split, left some paperwork unfinished. This change finishes it. It removes a process step that nobody ever actually performed, it closes out a review gate for five pieces of already-shipped work while saying plainly that the gate ran late, and it writes down two rules for keeping decision records honest as the codebase around them keeps changing. Along the way, a git stash round trip nearly lost real work: a modern tree landed on a local main branch that was thirty-three commits stale, and four files picked up silent conflict-marker corruption. A file system check for unreachable commits found the dropped stash still intact, and its content was taken verbatim into the fix."
        },
        "architecture": {
          "narration": "This change makes no new decision about a module boundary, a dependency direction, or a public interface. It closes a documentation and process gap that a prior decision, the five-plugin split, left open, and it records two rules for keeping existing decision records honest over time.",
          "beats": [
            {
              "kind": "boundary",
              "text": "This is a retrospective process-cleanup and documentation change, not a module-boundary or interface decision. It carries no new structural ADR: it retires an undelivered artifact type, closes a review gate after the fact with the outcome stated plainly, and writes two maintenance rules into existing reference documents."
            },
            {
              "kind": "contract",
              "text": "What was actually decided is procedural, not architectural: a technical solution design produced after implementation must say so on its face, rather than reading as if the gate ran on time. A drift finding recorded against an ADR is a report to weigh, with three valid responses, only one of which is routine index maintenance. An ADR's Context, Decision, and Consequences prose is never edited to match the current tree; only its index fields (`maps_to`, `state`, `last_verified`, `source_pr`) get kept current."
            }
          ],
          "voice": "This change makes no new decision about a module boundary, a dependency direction, or a public interface. It closes a documentation and process gap that an earlier decision, the five-plugin split, left open, and it records two rules for keeping existing decision records honest over time. First, a decision record never gets its context, decision, or considered options edited to match the current tree. Only its index fields, such as its state and its source pull request, get kept current. Second, a drift finding is a report, not a work item. The correct response can be to leave the record alone, as a true account of what was believed at the time."
        },
        "file_changes": {
          "groups": [
            {
              "files": [
                "docs/plans/cobuilder-family/epic-E1-design.md",
                "docs/plans/cobuilder-family/epic-E3-design.md",
                "docs/plans/cobuilder-family/epic-E4-design.md",
                "docs/plans/cobuilder-family/epic-E5-design.md",
                "docs/plans/cobuilder-family/epic-E6-design.md",
                "docs/plans/cobuilder-family/00-status.md"
              ],
              "note": "Five retrospective Gate 4b designs, one per multi-slice `plugin-split` epic, each declaring itself written after implementation, plus the status file recording Gate 4b as approved with that qualifier."
            },
            {
              "files": [
                "docs/architecture/designs/inflight-record-store/goal.json",
                "docs/architecture/designs/maintainable-viewer/goal.json"
              ],
              "note": "Two new backlog designs, correctly shaped as `goal.json` only, since design mode's later stages have not run for either yet."
            },
            {
              "files": [
                "docs/architecture/designs/design-mode/adr-draft.md",
                "docs/architecture/designs/design-mode/assessment.json",
                "docs/architecture/designs/design-mode/goal.json",
                "CLAUDE.md",
                "README.md"
              ],
              "note": "The `adr-draft.md` artifact type retired from both top-level documents, the one stale draft deleted, and the design-mode design's missing retrospective assessment added with `observation`/`drift` findings."
            },
            {
              "files": [
                "tests/test_verify_gate.py",
                "tests/test_slice_table.py",
                "shared/slice_table.py",
                "plugins/cobuilder-implement/scripts/verify_gate.py"
              ],
              "note": "`test_verify_gate.py` rewritten to assert the script's contract rather than a fixed pass/fail state, with a new test pinning that an `APPROVED` status line keeps its retrospective qualifier and never silently downgrades."
            },
            {
              "files": [
                ".claude/hooks/deny-git-stash.py",
                ".claude/settings.json",
                "tests/test_deny_git_stash_hook.py"
              ],
              "note": "A local development-only hook added after the recovery incident recorded in the Intuition beat, plus its test."
            },
            {
              "files": [
                "plugins/cobuilder-architect/skills/architecture/references/decision-records.md",
                "plugins/cobuilder-pr/skills/odyssey/references/review-mode.md"
              ],
              "note": "The two new ADR maintenance rules: an ADR's Context/Decision/Consequences prose is never edited to match the tree, and a drift finding is a report, not a work item, recorded into the two reference documents that govern decision records and per-PR review."
            },
            {
              "files": [
                "docs/pull-requests/branch-design-design-mode/description.md",
                "docs/pull-requests/branch-design-design-mode/assessment.md",
                "docs/pull-requests/branch-design-design-mode/assessment.json",
                "docs/pull-requests/branch-design-design-mode/intent.json"
              ],
              "note": "The branch's own pull-request documents brought current, replacing the earlier draft that stopped a third of the way through the work."
            },
            {
              "files": [
                ".cobuilder-architect/self/data/adrs.json",
                ".cobuilder-architect/self/data/adrs.js",
                ".cobuilder-architect/self/data/designs.js",
                ".cobuilder-architect/self/data/index.json",
                ".cobuilder-architect/self/data/index.js",
                "shared/build_index.py"
              ],
              "note": "The self-bundle record index rebuilt to reflect the new designs, the retired `adr-draft.md` reference, and the design-mode design's added assessment."
            }
          ],
          "narration": "The forty-six changed files split into eight groups: the five retrospective epic designs and the status file that closes Gate 4b, two new backlog designs, the retired `adr-draft.md` reference plus the design-mode design's missing assessment, the rewritten Gate 4b tests, a new local development hook plus its test, the two new ADR maintenance rules in their reference documents, the branch's own updated pull-request notes, and the self-bundle record index rebuilt to match all of it."
        }
      }
    },
    {
      "pr": 16,
      "date": "2026-08-26",
      "title": "book-index.md gains a nano tier, and the security corpus stops reading unconditionally in full",
      "tagline": "",
      "depth": "summary",
      "size": {
        "files": 49,
        "adds": 2088,
        "dels": 64
      },
      "touched": {
        ".cobuilder-architect": 5,
        ".cobuilder": 3,
        "(root)": 1,
        "docs": 9,
        "plugins": 31
      },
      "levels": {},
      "status": "open",
      "commit": "6bad882c30e7ea84a2e1d950e604859ffd211595",
      "intent": {
        "captured": "2026-08-26",
        "source": "author",
        "authorship": "agent-generated",
        "design": {
          "name": "book-index-tiering",
          "epic": null
        },
        "problem": "book-index.md's Tier 2 escalation jumps straight from a cheap corpus heuristic to one full vendored book (300-1000 lines), skipping the nano (~20-40 line) and mini (~80-150 line) tiers upstream ciembor/agent-rules-books now publishes. Review/Maintenance mode's mandatory 14-file security corpus load has the same shape: 2179 lines read unconditionally, in full, every run.",
        "why_now": "The escalation ladder was missing rungs upstream already provides for free, and the security corpus load had never been scrutinized on cost the way the book ladder now has been.",
        "approach": "Vendor nano.md and mini.md alongside each book's existing full.md (26 new files, 13 books). Rewrite book-index.md's escalation rule: load a minimum of three nano excerpts, then escalate any one book to mini or full only when judged to matter — full-tier loading is never automatic, and the old 1-primary-plus-1-companion cap is explicitly superseded. For the security corpus, no vendoring was needed: each YAML already separates a metadata-plus-summary block (17-24 lines) from its worked examples, so the same shape applies as a same-file partial read — read the first ~30 lines of all 14 unconditionally, then read a file's remainder in full unless the summary clearly rules out applicability, defaulting to full on ambiguity (the opposite bias from book escalation, because a missed security finding costs more than a wasted read). Also added a behavioral-rubric case to cobuilder-implement's Gate 4c, since neither the 'skip the gates for small tasks' exemption nor the existing test-suite rubric model could verify whether prose that governs another mode's own procedure is actually followed — then applied that new gate to this change itself, twice, with two independent blind subagent runs.",
        "alternatives": [
          {
            "option": "3 nanos, then always the full book, unconditionally (the original approach)",
            "rejected_because": "Making the full-book read unconditional defeats the reason a cheap tier exists, and silently breaks the existing 1+1 cap with no stated replacement."
          },
          {
            "option": "Signed evidence ledger gating the full-book read behind three committed nano entries",
            "rejected_because": "Solves an auditability problem nobody named, at the cost of a new file surface."
          },
          {
            "option": "Content-addressed cold storage with per-session materialization and LRU eviction",
            "rejected_because": "Sized for a corpus of 140+ books; this repo vendors 14. Conflicts with the plugin family's vendor-in-tree convention (ADR-0017)."
          },
          {
            "option": "Live-fetch the nano tier from upstream URLs at task time",
            "rejected_because": "Blocked by a security classifier during divergent exploration — an injection and supply-chain risk this plugin family's self-only design avoids."
          },
          {
            "option": "Pre-concatenated per-book ladder file with a stop-early marker",
            "rejected_because": "Scored highest with the critic, but its stop-early discipline has no mechanical consumer — the same Gate 4b failure mode this repo's own history already lived through."
          },
          {
            "option": "Ad hoc subagent fan-out, one Task-tool call per book, verdict-only return",
            "rejected_because": "ADR-0015 fixes the install surface at no agents, hooks, or MCP servers."
          },
          {
            "option": "Panic-grep pre-filter: one hand-written line per nano file, grepped before any tier loads",
            "rejected_because": "The critic's starred non-obvious survivor, deferred rather than bundled in — orthogonal to the chosen mechanism."
          },
          {
            "option": "Judgment-gate the security corpus the same symmetric way as book escalation (skip-on-ambiguity)",
            "rejected_because": "A missed finding in a compliance-weighted report is a worse failure than a design session under-reading one book. Security stays biased toward reading in full."
          }
        ],
        "out_of_scope": [
          "Fixing or creating scripts/sync-books.sh",
          "Re-vendoring the existing full/ books against upstream's current commit",
          "Vendoring separate nano/mini files for the security corpus",
          "Extending this pattern to Decisions, Describe, or Debug mode, none of which consult book-index.md or the security corpus today"
        ],
        "risks": [
          "Both new escalation rules (book tiering, security applicability read) have no mechanical enforcement. This repo's own Gate 4b history shows an unenforced step tends to erode under time pressure.",
          "Vendoring surface for books triples from 14 files to 42, while the sync pipeline that would check them against upstream (scripts/sync-books.sh) is already missing.",
          "The behavioral-rubric verification is one blind pass per rule, not repeated or adversarial. A rule that happens to be followed correctly once is evidence, not a guarantee."
        ],
        "testing": "No application code changed. Two blind behavioral rubric passes verify the two new escalation rules: a fresh subagent given only the new book-index.md correctly loaded 3 distinct nanos and escalated exactly one book to full for a resilience-design task; a fresh subagent given only the new SKILL.md security section correctly read all 14 summaries, escalated 7 to full with evidence-backed reasoning, and escalated its one self-described ambiguous case to full rather than skipping it. Both rubrics and their evidence are committed at .cobuilder/rubrics/book-index-tiering/. Full test suite run: 304 passed, 1 pre-existing unrelated failure (an untracked agent-browser skill directory from this session's marketplace sync, not part of this diff).",
        "reviewer_focus": [
          "Whether the judgment-gated book escalation language is specific enough to actually change agent behavior long-term, not just on the one blind pass that already confirmed it once",
          "Whether the security corpus's opposite default bias (full-on-ambiguity) is stated clearly enough that a session doesn't quietly collapse it into the same skip-on-ambiguity behavior as book escalation",
          "Whether Gate 4c's new behavioral-rubric case is itself specific enough for a future engineer to apply to a different prose-governs-agent-behavior change without re-deriving the pattern from scratch"
        ],
        "unknowns": []
      },
      "assessment": {
        "stage": "pre",
        "generated": "2026-08-26",
        "verdict": "concerns",
        "risk_tier": "architectural",
        "summary": "Vendors 26 book files and rewrites two escalation rules that govern how Design/Review/Maintenance mode consult reference material. Both new rules verified behaviorally with a blind subagent pass each (5/5 criteria, both CRITICAL, on the first attempt). The stack card's boundary rules and review checks are not-checkable here — this diff touches no application source, only prose that governs agent behavior, which generic.md's checks were not written to evaluate.",
        "sensible": {
          "answer": "Yes. The diff solves the stated problem on both halves: book-index.md now uses the nano/mini tiers upstream publishes instead of jumping straight to full, and the security corpus load now discriminates instead of reading 2179 lines unconditionally every run. The problem belongs in the skills district, at the reference-file layer, consistent with ADR-0011 and ADR-0015, which already live there.",
          "evidence": [
            "ADR-0011",
            "ADR-0015",
            "docs/architecture/adr/ADR-0021-book-index-nano-mini-full-tiering.md"
          ]
        },
        "maintainability": {
          "answer": "Helps: consolidates two previously-unstated or under-specified loading behaviors (full-book-only escalation, unconditional-full security load) into explicit, stated rules with an explicit ceiling, replacing a cap that the original approach would have silently violated. Hurts modestly: the vendored surface for books triples (14 to 42 files) with no working sync script to keep them current, and both new rules are judgment-gated with no mechanical enforcement at merge time — only a one-time behavioral verification.",
          "constraint_introduced": "A design or review-mode session must load a minimum of three nano-tier book excerpts before escalating any one book to mini or full; full-tier loading is judgment-gated, never unconditional. A review or maintenance session must read the first ~30 lines of all 14 security corpus files unconditionally, and may read a file's remainder in full only when the summary shows applicability or ambiguity, never when judgment alone says to skip.",
          "evidence": [
            "plugins/cobuilder-architect/skills/architecture/references/book-index.md",
            "plugins/cobuilder-architect/skills/architecture/SKILL.md"
          ]
        },
        "pattern": {
          "verdict": "new-valuable",
          "answer": "No ADR or district in this repo previously covered tiered escalation for reference material an agent reads mid-task. This buys a stated, checkable ceiling on a previously-unbounded read (books) and a large unconditional read (security corpus), in both cases without adding infrastructure ADR-0015/ADR-0017 would forbid.",
          "duplicates": [],
          "evidence": [
            "district:skills"
          ]
        },
        "findings": [
          {
            "severity": "concern",
            "claim": "Both new escalation rules are enforced by prose alone, with no mechanical consumer. This repo's own CLAUDE.md documents this exact failure mode from the Gate 4b history: an unenforced step erodes under time pressure.",
            "evidence": "plugins/cobuilder-architect/skills/architecture/references/book-index.md",
            "district": "skills",
            "suggestion": "The new Gate 4c behavioral-rubric case (cobuilder-implement's SKILL.md) gives future changes to this prose a repeatable way to re-verify it. Consider re-running a blind pass periodically, not only at merge time, since a rule that was followable once is not a guarantee it stays followable as the surrounding prose grows."
          },
          {
            "severity": "note",
            "claim": "books/README.md's scripts/sync-books.sh drift-check script still does not exist, and this diff triples the number of files that script would need to check (14 to 42).",
            "evidence": "plugins/cobuilder-architect/skills/architecture/references/books/README.md",
            "district": "skills",
            "suggestion": "Explicitly out of scope for this change, per intent.out_of_scope, but the gap grows with this diff and is worth a follow-up design."
          },
          {
            "severity": "note",
            "claim": "Both behavioral rubrics passed on the first blind attempt, which is a positive signal but a single data point, not a statistical guarantee of the rule's robustness across many future sessions.",
            "evidence": ".cobuilder/rubrics/book-index-tiering/slice-1.md",
            "district": "skills",
            "suggestion": "No action needed now; noted so a reviewer does not over-read one passing attempt as proof the rule can never be followed incorrectly."
          }
        ],
        "boundary_checks": [
          {
            "rule": "The dependency rule: inner layers never import outer layers.",
            "source": "stacks/generic.md",
            "result": "not-checkable",
            "evidence": "This diff changes zero application source files (no .py, no import statements). generic.md's boundary rules target code dependency direction, which this diff has none of — only markdown reference files, JSON design/index documents, and one Python-skill's own SKILL.md prose."
          },
          {
            "rule": "Configuration crosses into code in one place, not scattered env reads.",
            "source": "stacks/generic.md",
            "result": "not-checkable",
            "evidence": "No config or environment-variable-reading code changed in this diff."
          }
        ],
        "delta": {
          "districts_added": [],
          "districts_changed": [
            {
              "id": "skills",
              "files_before": 233,
              "files_after": 259
            }
          ],
          "edges_added": [],
          "edges_removed": []
        },
        "regret_risk": "If the judgment gates in both new rules erode under time pressure the way this repo's Gate 4b history shows unenforced steps tend to, the team is left with the worst of both worlds: the vendoring cost (42 book files instead of 14, still no sync script) and the unconditional-read cost this change was meant to remove, because sessions quietly revert to reading full every time. The one mitigation in place is that Gate 4c's new behavioral-rubric case gives a cheap, repeatable way to re-check this specific risk — but that check has to actually get re-run periodically for the mitigation to hold. Nothing currently schedules that re-run.",
        "drift": []
      }
    },
    {
      "pr": 17,
      "date": "2026-08-26",
      "title": "Rename plugins to drop the cobuilder- prefix; fix Mermaid click/copy-paste in the feedback drawer",
      "tagline": "",
      "depth": "summary",
      "size": {
        "files": 345,
        "adds": 578,
        "dels": 358
      },
      "touched": {
        ".claude-plugin": 1,
        ".claude": 2,
        ".cobuilder-architect": 2,
        "(root)": 2,
        "plugins": 324,
        "scripts": 1,
        "shared": 2,
        "tests": 11
      },
      "levels": {},
      "status": "open",
      "commit": "1d0c5ceb27a7df8dfaf4e3d36e2ebf9993a27735",
      "intent": {
        "captured": "2026-08-26",
        "source": "author",
        "authorship": "agent-generated",
        "problem": "The plugin family's slash commands repeated the repo's own cobuilder- prefix on every plugin name (/cobuilder-architect:design, /cobuilder-pr:generate, ...), making them harder to remember and type than they needed to be.",
        "why_now": "Noticed through day-to-day use of the plugin. A second, unrelated friction surfaced the same way, through the author's own manual testing of the viewer: clicking a Mermaid diagram opened the feedback drawer instead of just panning/zooming it, and copy/paste inside that drawer was not explicitly guaranteed.",
        "approach": "Renamed the four non-umbrella plugins (cobuilder-architect, cobuilder-pr, cobuilder-artifact, cobuilder-implement) to drop the cobuilder- prefix in their plugin.json name field and plugins/ directory, since the repo itself (cobuilder-plugin) already carries that prefix. cobuilder-full-lifecycle keeps its name, because it is the umbrella plugin the repo's own prefix already names. Fixed several commands and skill files that had documented themselves under the wrong plugin's prefix since before the five-way split (a leftover from when everything lived in one plugin). Wired implement mode to check for an existing /architect:design record before Gate 1 and ground the epic slugs in it when one exists, per ADR-0013, which nothing had done before. Separately, excluded the Mermaid diagram viewport from the click-to-open-feedback-drawer handler, and made the comments drawer explicitly declare copy/paste-friendly text selection.",
        "alternatives": [
          {
            "option": "Keep the plugin command namespace as-is and accept the cobuilder- repetition",
            "rejected_because": "Defeats the stated goal: the point was to make commands easier to remember and type."
          },
          {
            "option": "Rename all five plugins, including the umbrella cobuilder-full-lifecycle",
            "rejected_because": "The umbrella plugin's name is the family/repo identity itself, so it keeps the prefix the other four are shedding."
          },
          {
            "option": "Consolidate each plugin's several mode-commands into one command per plugin (e.g. a single architect.md dispatching on its first argument) to get a literal bare short name",
            "rejected_because": "Investigation confirmed Claude Code always namespaces a command as /<plugin-name>:<command-name>, with no override -- consolidating would not produce a truly bare command, so renaming the plugin identity itself was the simpler, sufficient fix."
          }
        ],
        "out_of_scope": [
          "Renaming the .cobuilder-architect/ bundle directory convention -- a separate, unrelated concept that happens to share a string with the old plugin name",
          "Rewriting historical ADRs, designs, or pull-request records to use the new plugin names",
          "Auditing every other pre-existing cross-plugin reference bug beyond the ones directly intersecting the renamed lines",
          "Writing a new ADR to record this naming-convention change"
        ],
        "risks": [
          "A stale installed plugin cache still resolves the old cobuilder-pr/cobuilder-architect names until the marketplace is refreshed or reinstalled",
          "The generators map key in bundle.json intentionally still reads \"cobuilder-architect\" for historical bundles -- a future reader unfamiliar with that distinction could mistake it for a missed rename"
        ],
        "testing": "Ran the full pytest suite (309/313 passing; the 4 failures are a pre-existing local Pillow architecture mismatch unrelated to this change). Smoke-tested scripts/export-agent-skills.sh against the renamed architect plugin. Ran shared/migrate_bundle.py (dry-run, then for real) against the self-bundle to confirm the viewer-refresh path fix and that no unexpected bundle.json changes occurred.",
        "reviewer_focus": [
          "The disambiguation of which plugin actually owns each renamed slash command -- several were previously mis-attributed pre-split leftovers",
          "The new design-mode-record step added to implement mode's SKILL.md"
        ],
        "unknowns": []
      },
      "assessment": {
        "stage": "pre",
        "generated": "2026-08-26",
        "verdict": "concerns",
        "risk_tier": "architectural",
        "summary": "A straightforward, well-scoped rename that fixes real pre-existing cross-plugin doc bugs along the way, but it amends ADR-0016's naming decision with no new ADR, and the naming convention it establishes has no mechanical enforcement.",
        "sensible": {
          "answer": "Yes. The stated problem -- redundant, hard-to-remember plugin-prefixed commands -- is real, and this is the right layer to fix it: plugin.json's name field and the plugins/ directory, which is what determines the slash-command namespace. The keep-the-umbrella-name decision is consistent, since cobuilder-full-lifecycle is the family identity the repo's own cobuilder- prefix already names.",
          "evidence": [
            "plugins/architect/.claude-plugin/plugin.json:2",
            ".claude-plugin/marketplace.json",
            "ADR-0016-five-sibling-plugins-bundle-as-seam.md"
          ]
        },
        "maintainability": {
          "answer": "Helps overall. It removes a redundant prefix and fixes several commands and skill files that had documented the wrong owning plugin since before the five-way split (baseline.md/generate.md/review.md in pr, view.md/publish.md in artifact all previously said /cobuilder-architect:*). It also tightens two Skill() calls in pr's own skill files that had been reaching across into architect's vendored mermaid/ste-writing copies instead of pr's own -- a boundary ADR-0017 exists specifically to prevent.",
          "constraint_introduced": "A plugin's own identity (its plugin.json name, which sets its command namespace) never repeats the marketplace repo's own cobuilder- prefix; only the umbrella plugin, which names the family, keeps it.",
          "evidence": [
            "plugins/pr/skills/odyssey/SKILL.md:436",
            "plugins/pr/skills/odyssey/references/decision-records-lite.md:17",
            "tests/test_plugin_manifests.py:38"
          ]
        },
        "pattern": {
          "verdict": "conforms",
          "answer": "The underlying mechanism -- plugin identity equals plugin.json's name field equals the plugins/ directory name -- is unchanged; this PR only changes the chosen values, which test_plugin_manifests.py's test_manifest_parses_and_has_required_fields already enforced before and after. It does not introduce a new pattern or duplicate an existing one.",
          "duplicates": [],
          "evidence": [
            "tests/test_plugin_manifests.py:38"
          ]
        },
        "findings": [
          {
            "severity": "concern",
            "claim": "This PR amends ADR-0016's chosen plugin names with no new ADR recording the rename, unlike how consistently this repo's own history documents naming and structural decisions (ADR-0016 itself, ADR-0017, ADR-0020).",
            "evidence": "docs/architecture/adr/ADR-0016-five-sibling-plugins-bundle-as-seam.md",
            "district": "docs",
            "suggestion": "Consider a short follow-up ADR recording the rename and the umbrella-plugin exception, matching this repo's own convention."
          },
          {
            "severity": "concern",
            "claim": "The convention this PR establishes (a plugin's own name never repeats the repo's cobuilder- prefix) is stated in prose (CLAUDE.md) but not mechanically enforced -- nothing stops a future plugin from reintroducing the prefix.",
            "evidence": "CLAUDE.md (Recent history entry for this rename)",
            "district": "docs",
            "suggestion": "A cheap follow-up: a test asserting no plugin.json name (other than cobuilder-full-lifecycle) contains \"cobuilder-\"."
          },
          {
            "severity": "note",
            "claim": "Correcting which plugin owns each renamed slash command across SKILL.md/README.md/CLAUDE.md prose was manual and repo-wide; test_commands.py verifies each command file's own Skill() dispatch, but nothing automatically checks that a prose mention of another plugin's command (e.g. inside artifact's SKILL.md referencing /pr:baseline) stays correct over time.",
            "evidence": "tests/test_commands.py:81",
            "district": "docs",
            "suggestion": "No action required now; worth knowing this class of doc drift has no automated guard."
          }
        ],
        "boundary_checks": [
          {
            "rule": "Inner layers never import outer layers (domain/business logic vs. HTTP/UI/DB/framework code)",
            "source": "stacks/generic.md",
            "result": "not-checkable",
            "evidence": "This repo has no domain/I-O layering to check against -- it is plugin manifests, markdown skill instructions, and PEP 723 utility scripts, not a layered application."
          },
          {
            "rule": "Configuration crosses into code in one place, not scattered env reads",
            "source": "stacks/generic.md",
            "result": "pass",
            "evidence": "Each writer script declares its own plugin identity as exactly one named constant (PLUGIN_NAME = \"pr\" / \"artifact\"), grepped and confirmed consistent across plugins/pr/scripts/*.py and plugins/artifact/scripts/*.py."
          }
        ],
        "delta": {
          "districts_added": [],
          "districts_changed": [],
          "edges_added": [],
          "edges_removed": [
            "pr -> architect (removed: pr's own SKILL.md/references previously invoked Skill(\"cobuilder-architect:mermaid\") and Skill(\"cobuilder-architect:ste-writing\"), reaching into architect's vendored copies instead of pr's own; now Skill(\"pr:mermaid\")/Skill(\"pr:ste-writing\")"
          ]
        },
        "regret_risk": "If this merges as written, the team lives with three things. First, a naming convention (no plugin repeats the repo's own cobuilder- prefix) that is documented but not mechanically enforced, so a future new plugin can silently violate it again. Second, prose across SKILL.md, README.md, and CLAUDE.md that names a specific owning plugin per slash command, verified by hand in this PR but not continuously -- a later doc edit could reintroduce the exact cross-plugin misattribution this PR just fixed, since no test greps prose for plugin-command consistency. Third, this PR changes a decision ADR-0016 made with no new ADR recording why, which breaks the pattern the rest of this repo's history otherwise follows closely, and makes the rename harder for a future reader to trace back to a rationale.",
        "drift": []
      }
    },
    {
      "pr": 19,
      "date": "2026-09-02",
      "title": "Gate-doc surfacing in the viewer, plus a slice-loop workflow-invocation fix",
      "tagline": "",
      "depth": "summary",
      "size": {
        "files": 40,
        "adds": 2467,
        "dels": 90
      },
      "touched": {
        ".cobuilder-architect": 7,
        ".cobuilder": 7,
        "docs": 20,
        "plugins": 4,
        "shared": 1,
        "tests": 1
      },
      "levels": {},
      "status": "open",
      "commit": "9ee7ce2330f2f7e6fc20c4e72e4a777416350dc7",
      "intent": {
        "captured": "2026-09-03",
        "source": "inferred",
        "authorship": "agent-assisted",
        "design": {
          "name": "gate-doc-surfacing",
          "epic": null
        },
        "problem": "Gate 3 program-design docs and Gate 4b epic technical-design docs live at docs/plans/<slug>/*.md, but the viewer's index tracks only adr, design, epic, slice, and pull_request entities. A reviewer who wants to watch a build's Gate 3 progress in the viewer sees nothing: the Gate Rail already shows approval state from 00-status.md, but never the document content behind it. A prior session's workaround was publishing the doc as a one-off Claude Artifact, disconnected from docs/plans/ with no rebuild hook and undiscoverable from the viewer.",
        "why_now": "The gap surfaced live when an engineer asked to see a Gate 3 design in the viewer and the agent found no entity for it. The Builds view (renderBuildsMainContent) already renders a Gate Rail and epic cards, which are the natural attachment point for a doc link, so the fix slots into an existing surface rather than adding a new one.",
        "approach": "Extend shared/build_index.py with discover_plan_gate_docs()/project_program_design()/project_epic_design(), following the existing GOAL_FIELDS/project_fields(source, fields) pattern, to project docs/plans/<slug>/03-program-design.md and epic-<id>-design.md into two new index entities, program_design and epic_design (ADR-0022). resolve_feature_gates() now attaches a doc reference to a feature's Gate 3 entry when a program-design doc exists. In the viewer, Gate Rail cards became clickable, opening a sheet modeled on the existing ADR sheet, and epic cards with an approved Gate 4b design gained a design-doc chip. Both entities and the viewer change are covered by tests/test_build_index_gate_docs.py (10 cases). Separately, while using this plugin's implement workflow in an unrelated sister repo, two defects surfaced in plugins/implement/skills/build/workflows/slice-loop.js: it invoked the Workflow tool with `name: \"slice-loop\"`, which only resolves built-in or .claude/workflows/-registered workflows and never finds a plugin-shipped script, and it imported node:fs and called existsSync() for a Gate 4b check, which workflow scripts cannot do because they run with no filesystem access at all (and the import also violated the requirement that `export const meta` be the script's first statement). Both are fixed here: the SKILL.md and reference doc now say to invoke with `scriptPath`, and the existence check moves to the orchestrating session (e.g. via verify_gate.py), which passes the result in as each slice's new `epicDesignExists` field.",
        "alternatives": [
          {
            "option": "Add a new top-level 'Plans' or 'Gate Docs' tab in the viewer",
            "rejected_because": "ADR-0018 decided one lifecycle surface with a derived record index precisely to stop the reading surface count from growing per artifact type. A gate doc is scoped to a build already living in the viewer's Builds view (district: viewer), a sibling tab duplicates that context instead of joining it."
          },
          {
            "option": "Parse gate docs ad hoc in the viewer's client-side JS at render time, skipping the index",
            "rejected_because": "ADR-0018's whole point is that joins get resolved once, in build_index.py, not scattered across client fetches. The viewer is also a single committed HTML file with no direct filesystem access model beyond its bundled data/ scripts (district: viewer): it cannot read docs/plans/ at render time at all."
          },
          {
            "option": "Split viewer/index.html into parts now, and add gate docs to the new module structure",
            "rejected_because": "ADR-0020 decided the viewer-parts split but is explicitly not executed yet. Starting that execution as a side effect of this design is scope creep this design does not own."
          },
          {
            "option": "Keep publishing gate docs as one-off Claude Artifacts",
            "rejected_because": "This is the workaround that exposed the gap: no rebuild hook ties it to docs/plans/, so it drifts, and it is not discoverable from the viewer itself."
          },
          {
            "option": "For the slice-loop fix, have the orchestrating session poll or retry existsSync inside the workflow script",
            "rejected_because": "Workflow scripts have no filesystem or Node.js API access at all (confirmed against the tool's own authoring reference), so no retry inside the script can make the check work. The only place the check can run is the orchestrating session, before it invokes the workflow."
          }
        ],
        "out_of_scope": [
          "a new top-level viewer tab for plans or gate docs",
          "editing a gate doc from the viewer, read-only sheet only",
          "changing how 00-status.md's approval state is parsed or displayed",
          "PDF or standalone-artifact export of a gate doc",
          "executing ADR-0020's viewer-parts split, this design writes into the current monolithic viewer/index.html",
          "re-scoring or re-running any slice that already ran under the old, broken slice-loop.js invocation"
        ],
        "risks": [
          "a gate doc grows long enough that the sheet reading UX (built for ADR text, a few hundred lines) degrades",
          "program_design/epic_design entity ids collide with, or get confused with, the existing epic entity's <design>/<epic-id> scoping",
          "the sheet becomes stale between build_index.py runs the same way the pre-fix Artifact was, if a future gate step forgets to rebuild",
          "a future edit to slice-loop.js reintroduces a Node.js API call (fs, path, etc.) above the meta literal, which fails the same two ways this fix corrects"
        ],
        "testing": "tests/test_build_index_gate_docs.py (10 cases) covers discover_plan_gate_docs, project_program_design, project_epic_design, and the Gate 3 doc-reference attachment in resolve_feature_gates. E2 was verified live in-browser against the running viewer (see commit 651b07a). The slice-loop.js fix was verified by reading the workflow-authoring reference's constraints (no filesystem access, meta must be the first statement) and by running the full pytest suite (322 passed, 4 pre-existing unrelated Pillow/webp failures from an arch-mismatched local Pillow install) after the change; no automated test exercises the Workflow tool invocation itself, since that requires the tool's runtime.",
        "reviewer_focus": [
          "whether program_design/epic_design entity ids collide with the epic entity's own id scheme",
          "whether the sheet UX holds up for a long program-design doc",
          "whether the Gate Rail card / epic chip is discoverable without extra instruction",
          "whether bundling the unrelated slice-loop.js fix into this design's PR, rather than a separate PR, is acceptable given it was found while dogfooding this same plugin"
        ],
        "unknowns": [
          "how large a typical 03-program-design.md or epic-<id>-design.md gets across real features, and whether the sheet needs pagination or truncation",
          "whether a design with no docs/plans/<slug>/ directory at all (a design never taken to implement mode) should render an empty Gate Rail or hide it entirely"
        ]
      },
      "assessment": {
        "stage": "pre",
        "generated": "2026-09-03",
        "verdict": "concerns",
        "risk_tier": "architectural",
        "summary": "Two changes ship in one PR: the gate-doc-surfacing design (program_design/epic_design entities per ADR-0022, plus the viewer's clickable Gate Rail and design-doc chip) and an unrelated fix to plugins/implement/skills/build/workflows/slice-loop.js, found while dogfooding the implement workflow in a sister repo. Both are sound on their own; the summary finding below is that they are bundled.",
        "sensible": {
          "answer": "Yes, against the stated problem for the design half: the Builds view already renders a Gate Rail and epic cards from an approval-state parse, but never the document content behind it, and this change attaches that content through the same index-projection pattern ADR-0018 already established. The slice-loop.js half is also sensible: a workflow script that can never be found (wrong Workflow-tool invocation) and can never run past its Gate 4b check (imports a Node API the runtime does not provide) is not a partially-working feature, it is dead code with tests never exercising it.",
          "evidence": [
            "ADR-0018",
            "ADR-0022",
            "shared/build_index.py:discover_plan_gate_docs",
            "plugins/implement/skills/build/workflows/slice-loop.js"
          ]
        },
        "maintainability": {
          "answer": "Helps: program_design/epic_design follow the same GOAL_FIELDS/project_fields(source, fields) shape every other entity in build_index.py already uses, so a future entity kind has one more precedent to copy rather than a special case to learn. The slice-loop.js fix removes a call the runtime silently could never satisfy and replaces it with an explicit caller-supplied field (epicDesignExists), which is more maintainable than a check that looked correct in isolation but failed to import at all. Hurts slightly: the PR mixes a feature and a bugfix, so `git blame` on workflows/slice-loop.js now attributes an unrelated design's commit range to a fix that has nothing to do with gate-doc surfacing.",
          "constraint_introduced": "A gate document's content is now reachable only through the record index (program_design/epic_design), never parsed ad hoc by the viewer. Workflow scripts in this plugin family must never import a Node.js/filesystem API; any existence check a script needs must be computed by the orchestrating session and passed in through `args`.",
          "evidence": [
            "shared/build_index.py:249-250 (PROGRAM_DESIGN_FIELDS/EPIC_DESIGN_FIELDS)",
            "plugins/implement/skills/build/workflows/slice-loop.js (epicDesignExists)",
            "tests/test_build_index_gate_docs.py"
          ]
        },
        "pattern": {
          "verdict": "conforms",
          "answer": "program_design/epic_design entities are a new kind, but they use the same project_fields(source, fields) projection every existing entity (GOAL_FIELDS, EPIC_FIELDS, INTENT_FIELDS, ASSESSMENT_FIELDS) already uses, and resolve_feature_gates() attaches the doc reference to the existing Gate 3 status parse rather than adding a parallel one. The slice-loop.js fix conforms to the Workflow tool's own documented contract (scriptPath for a plugin-shipped script, no filesystem access in the script body) rather than inventing a workaround.",
          "duplicates": [],
          "evidence": [
            "shared/build_index.py:246-250",
            "shared/build_index.py:1073-1090 (resolve_feature_gates)"
          ]
        },
        "findings": [
          {
            "severity": "concern",
            "claim": "This PR bundles two unrelated changes: the gate-doc-surfacing design (six commits) and a fix to plugins/implement/skills/build/workflows/slice-loop.js's Workflow-tool invocation and filesystem-access bug (one commit), found incidentally while using the plugin in a different repo. A reviewer who reviews only the design will miss the workflow fix, and vice versa.",
            "evidence": "git log master..design/gate-doc-surfacing --oneline (7 commits: 6b89c69 through 210676c)",
            "district": "docs",
            "suggestion": "Accept as one PR since the fix is already committed on this branch and splitting it now means branch surgery, but call out the workflow fix explicitly in the PR description so a reviewer does not read it as part of the gate-doc-surfacing design."
          },
          {
            "severity": "note",
            "claim": ".cobuilder-architect/self/inventory.yaml still lists the pre-plugin-split districts (skills, scripts, commands, viewer, docs, .cobuilder-architect) rather than the current plugins/{architect,pr,artifact,implement,cobuilder-full-lifecycle}/ layout, so the district delta and boundary checks below are approximated by path rather than derived from a current baseline.",
            "evidence": ".cobuilder-architect/self/inventory.yaml:4-27 (dated 2026-08-19, predates the plugin-prefix-drop rename)",
            "district": "docs",
            "suggestion": "Re-run baseline mode against the current tree so future assessments do not have to approximate district names."
          },
          {
            "severity": "note",
            "claim": "No automated test exercises the corrected Workflow-tool invocation (scriptPath vs name) or the new epicDesignExists caller contract, because doing so requires the Workflow tool's own runtime, which the repo's pytest suite does not have access to.",
            "evidence": "plugins/implement/skills/build/workflows/slice-loop.js (no matching tests/ file)",
            "district": "scripts",
            "suggestion": "Treat the next real program-scale build (multiple epics per 04-slices.md) as the practical verification of this fix, since that is the first scenario that will actually invoke the workflow."
          }
        ],
        "boundary_checks": [
          {
            "rule": "Inner layers (domain, business logic) never import outer layers (HTTP, UI, DB drivers, framework code).",
            "source": "stacks/generic.md",
            "result": "not-checkable",
            "evidence": "This plugin family has no domain/adapter split to grep for; shared/build_index.py and the workflow script both read the filesystem and the plans directory by design."
          },
          {
            "rule": "Configuration crosses into code in one place, not scattered env reads.",
            "source": "stacks/generic.md",
            "result": "pass",
            "evidence": "Neither half of this diff adds a new environment-variable read; grep for os.environ / os.getenv in the diff hunks returns nothing."
          },
          {
            "rule": "No plugin's script or skill file names another plugin's plugins/<other-name>/... path directly.",
            "source": "ADR-0016",
            "result": "pass",
            "evidence": "grep of the diff for plugins/(architect|pr|artifact|implement|cobuilder-full-lifecycle)/ hits only each file's own plugin path (plugins/artifact/viewer/index.html, plugins/implement/skills/build/...), never a cross-plugin reference."
          }
        ],
        "delta": {
          "districts_added": [
            "shared/build_index.py:program_design,epic_design entities"
          ],
          "districts_changed": [
            "plugins/artifact/viewer (Gate Rail click, epic design-doc chip)",
            "shared (build_index.py projection)",
            "plugins/implement/skills/build (slice-loop.js, SKILL.md, slice-loop.md)",
            "docs/plans/gate-doc-surfacing",
            "docs/architecture/adr (ADR-0022)",
            "docs/architecture/designs/gate-doc-surfacing"
          ],
          "edges_added": [
            "shared/build_index.py -> docs/plans/<slug>/03-program-design.md,epic-<id>-design.md",
            "plugins/artifact/viewer/index.html -> window.INDEX.entities.program_design,epic_design"
          ],
          "edges_removed": []
        },
        "regret_risk": "If this merges as written, the team gains a real gate-doc reading surface in the viewer and a workflow-invocation fix that unblocks the next multi-epic program-scale build, at the cost of a PR whose git history reviewers must read as two stories, not one. The likelier six-month regret is narrower: the inventory.yaml staleness noted above means the next assessment on this branch's district (or any branch touching plugins/) keeps approximating districts by path instead of reading a derived baseline, and that approximation compounds each time nobody re-runs baseline mode. A second, smaller regret is that the slice-loop.js fix has no automated coverage of its own; if a future edit reintroduces a Node API import above the meta literal, only the next real program-scale build will catch it, at the cost of a wasted Workflow invocation rather than a fast test failure.",
        "drift": []
      }
    },
    {
      "pr": 21,
      "date": "2026-09-23",
      "title": "viewer: the Work board lands, with the plan for the rest of the program",
      "tagline": "",
      "depth": "summary",
      "size": {
        "files": 231,
        "adds": 67512,
        "dels": 211
      },
      "touched": {
        ".cobuilder-architect": 8,
        ".cobuilder": 17,
        "(root)": 2,
        "docs": 54,
        "plugins": 144,
        "shared": 5,
        "tests": 1
      },
      "levels": {},
      "status": "open",
      "commit": "74fb1a8999e2d9f65894069396f2339a1a2916c2",
      "intent": {
        "captured": "2026-09-23",
        "source": "inferred",
        "authorship": "agent-assisted",
        "design": {
          "name": "cobuilder-viewer",
          "epic": "work-prototype"
        },
        "problem": "The bundle viewer is one committed HTML file with no landing surface. A reader arriving at a bundle meets a route that names a work item, and a route that names none falls through to the error the shell keeps for an unknown id. Nothing lists the bundle's designs, so a reader cannot survey what the bundle holds before choosing one. The typed data layer a board needs does not exist either. The committed file resolves its own joins in the browser, and ADR-0018 already put that work into one derived index.",
        "why_now": "The viewer is being rebuilt as TypeScript and React under ADR-0023, so the landing surface arrives while the surface is new rather than being retrofitted onto a 4,747-line file. The engineer also cut the program to two surfaces on 2026-09-22, which makes the Work surface the first thing a reader meets and the surface the rest of the narrowed program sits beside.",
        "approach": "The viewer becomes a TypeScript and React program under plugins/artifact/viewer/src/, mounted from src/main.tsx, with the reviewed prototype at src/variations/sections-e/ ported into src/shell/. The shell owns the route. The bare route renders a board of every design, and a route that names a work item renders that item's Work surface. A row is an anchor whose address names a level the design can fill, so a design whose only record is goal.json still opens. The board reads the index through src/data/ and derives no join. Beside the surface, the branch carries the plan that governs the rest of the program: the Gate 3 program design, the Gate 4a slice ladder, four Gate 4b epic designs, and sixteen Gate 4c rubrics.",
        "alternatives": [
          {
            "option": "Ship react-viewer and review-flight-deck as two designs, sequenced",
            "rejected_because": "That order would build the ordering UI against the viewer E5 is about to replace, then rebuild it in React. Someone would also resolve the name collision twice, once informally now and once for real later."
          },
          {
            "option": "Keep ADR-0020 as decided: ordered parts under viewer/src/, concatenated by build_viewer.py, in plain JavaScript",
            "rejected_because": "Carried from react-viewer's own record unchanged. It fixes file size and fixes nothing about state, and it cannot type the joins that ADR-0018 already computes."
          },
          {
            "option": "Two artefacts: a React application served locally, and a reduced single file for publishing",
            "rejected_because": "Carried from react-viewer's own record unchanged. It splits the truth. ADR-0001 exists because the served file and the published file are the same file."
          },
          {
            "option": "Build single-pull-request and multi-pull-request mode as one epic",
            "rejected_because": "Multi-pull-request mode needs the typed data layer and the open-pull-request entity that single-pull-request mode does not. One epic means neither reaches parity before the other's risk lands on top of it."
          }
        ],
        "out_of_scope": [
          "the Reference surface and its prototype",
          "the describe-on-arrival path",
          "the whole multi-pull-request mode, and its merge-order simulation and path runner",
          "the ledger's three state subtypes and its audit",
          "publish parity",
          "the workflow-polish carryover and the feedback path",
          "any change to what the generation scripts write into the bundle",
          "a new record type, a new join, or a schema version bump beyond OpenPullRequest",
          "the diff view's own rendering, which the team ports as it stands",
          "publishing a Notion target, which stays a reserved flag value"
        ],
        "risks": [
          "a contributor now needs Node and npm to change the viewer, which the repository has never required",
          "a committed build artifact goes stale the moment somebody edits the output instead of the source, and the committed index.html is absent from this diff while 131 source files are in it",
          "a byte-equal rebuild depends on a pinned toolchain, and a version drift makes the guard test fail for the wrong reason",
          "the React runtime is inlined into every published Artifact, which spends part of the 16 MiB budget",
          "the viewer no longer reaches its data at a relative path, because the built file requests an absolute one"
        ],
        "testing": "The viewer suite runs under vitest in plugins/artifact/viewer/: 61 tests across 7 files, all passing, with tsc --noEmit clean. Two slices were validated in a real browser through the ChromeDevTools MCP tools. Slice 6, the board, scored 1.00 across nine criteria, and slice 7, a row opening the Work surface, scored 1.00 across five. The browser checks measured the document never scrolling, the board's pane owning the scroll, one box on screen per paged level, no console message at any level, and no failed request. Two defects were found by those checks and fixed: the board's pane had no definite height on any route, and a diagram tile rendered a raw Mermaid comment as its title.",
        "reviewer_focus": [
          "the committed viewer and the React source can drift today, because E2 has not landed and no test compares the two",
          "the board's address rule repeats levelsOf's Intent rule and gatesOf's Build rule, in two files",
          "a slice's score has two sources, and only the status checklist has a reader",
          "the rubrics generator holds its slice count as the constant 14 and defaults to the wrong rubrics directory, so this plan's sixteen rubrics reach no page",
          "E1's exporter seam must land before any bundled output, or publishing breaks silently"
        ],
        "unknowns": []
      },
      "assessment": {
        "stage": "pre",
        "generated": "2026-09-23",
        "verdict": "concerns",
        "risk_tier": "architectural",
        "summary": "This branch executes ADR-0023. It replaces the one committed viewer file with a TypeScript and React program under plugins/artifact/viewer/src/, gives that program a typed reader of ADR-0018's derived index, and lands the Work surface with a board for a bundle that holds designs. The intent block is inferred, not stated by an author, so this assessment measures the change against my reading of the problem and not against a person's account. The change is the right shape for its district. The join stays in shared/build_index.py, and no join moves into the browser. It carries concerns, and most of them are records that disagree with the tree. Gate 4 reads pending while four epic designs sit on disk, the status checklist calls Gate 4c pending while the plan's own mechanical checker reports it ok, and CLAUDE.md still describes ADR-0020 as decided and unexecuted while 131 files under plugins/artifact/viewer/src/ execute its successor. On the boundary checks, the react-typescript card does match this repo, because package.json declares react and typescript, tsconfig.json is present, and no next dependency is declared. Its three clean greps and one not-checkable rule therefore carry a real signal, and no fallback to generic.md was needed. The one not-checkable rule targets src/features/, a layer this viewer does not use. No card returned an all-empty set of greps.",
        "sensible": {
          "answer": "Yes on both halves. The problem is real at this layer. The board's own rule states that a route naming no work item is a valid address, and a route whose id the bundle lacks resolves no work item, so before this change a reader had no surface that listed what the bundle holds. The viewer district owns rendering, and the index the board needs already exists in the scripts district, so this is the right place for the fix. The change also keeps the join where ADR-0018 put it. shared/build_index.py:1433 writes data/index.json, and plugins/artifact/viewer/src/data/bundle.ts:90 reads that file rather than resolving a join in the browser. The second half holds for the same reason. The problem belongs to the viewer and not to the generation scripts, and the branch writes nothing new into generation output. One caveat travels with this answer. intent.source is inferred, so I am reading the problem off the evidence rather than judging a claim an author made.",
          "evidence": [
            "ADR-0018",
            "ADR-0023",
            "plugins/artifact/viewer/src/shell/model.ts:588",
            "shared/build_index.py:1433",
            "plugins/artifact/viewer/src/data/bundle.ts:90"
          ]
        },
        "maintainability": {
          "answer": "It helps on balance, and it hurts in three named ways. It helps because it moves a decision to one place. The epic-to-design-document join now lives in the new link_epic_design_docs(), which reconciles two id spaces that previously matched only when a design directory name happened to equal a plan slug. It removes the browser's own join work. It also gives the viewer its first test suite, and I ran that suite: 61 tests across 7 files pass, and tsc --noEmit exits clean. tsconfig.json sets strict, so the typed layer is real and not nominal. It hurts first by adding a Node and npm requirement to a repository of prose, Python scripts, and one HTML file. It hurts second because the board's rule for which levels a design can fill now exists in three model files instead of one. It hurts third because a change must land in both the committed viewer file and the 131 React sources, and no test compares the two. A reviewer will also meet three smell hits in the comparison harness rather than in the shipped shell, and the findings below record them.",
          "constraint_introduced": "The viewer is a compiled application that reads one bundle's derived index read-only across a mount. It resolves no join in the browser, and its committed single file is refreshed by a build step rather than by hand.",
          "evidence": [
            "shared/build_index.py:742",
            "plugins/artifact/viewer/tsconfig.json:12",
            "plugins/artifact/viewer/vitest.config.ts",
            "plugins/artifact/viewer/src/shell/model.ts:421"
          ]
        },
        "pattern": {
          "verdict": "new-valuable",
          "answer": "New, and it earns its place. The repository had one hand-edited HTML file for its viewer, and ADR-0023 chose a TypeScript and React program compiled at author time. The change follows that record rather than inventing a second answer to the same question. It is not a duplicate, because no district and no ADR already provides a React viewer. It is not a reinvention either, because ADR-0020's ordered-parts solution is cited by name and its rejection is reasoned inside ADR-0023's own alternatives, which is the test the reference sets. What the pattern buys is a typed data layer in place of hand-written markup blocks and a test suite where the file had none. One thing the change adds beyond the record is a third renderer in the tree. The committed viewer file and the bundle's copy of it remain, and the new React program renders the same bundle to a gitignored dist/.",
          "duplicates": [],
          "evidence": [
            "ADR-0023",
            "ADR-0020",
            "plugins/artifact/viewer/vite.config.ts:117",
            "plugins/artifact/viewer/src/data/bundle.ts:53"
          ]
        },
        "findings": [
          {
            "severity": "concern",
            "claim": "Gate 4 is not APPROVED for this plan, and the branch has already landed implementation. The four epics that owe a Gate 4b approval, E2, E5, E7, and E19, each carry a design file with every required section, and each reads pending approval. I ran the plan's own checker, plugins/implement/scripts/verify_gate.py, against it, and it reports Overall: FAIL on those four lines alone. The build skill states that no implementation code is written before Gate 4 writes the ladder and the rubrics, and this branch adds 131 source files under plugins/artifact/viewer/src/. The two slices that reached a score, 6 and 7, shipped while the gate they sit behind reads pending.",
            "evidence": "docs/plans/cobuilder-viewer/00-status.md:15",
            "district": "docs",
            "suggestion": "Record the approval on each of the four epic designs, or state in the status file why the build starts with Gate 4b open."
          },
          {
            "severity": "concern",
            "claim": "Two records of one gate disagree, and the mechanical one is the record nobody reads. The status checklist calls Gate 4c, the blind rubrics, pending. The same plan's verify_gate.py reports rubrics.count 16 and rubrics.per_slice ok, and all sixteen rubric files exist under .cobuilder/rubrics/cobuilder-viewer/. A reader who trusts the checklist cannot tell that the rubrics are complete. This inverts the lesson the repository already recorded for Gate 4b, where a step with no mechanical consumer was skipped. Here the consumer exists and its answer is not being read.",
            "evidence": "docs/plans/cobuilder-viewer/00-status.md:16",
            "district": "docs",
            "suggestion": "Set the 4c line to the state verify_gate.py reports, and let the status file quote the checker rather than restate it."
          },
          {
            "severity": "concern",
            "claim": "The builds-view page cannot show this plan's rubrics, and it fails quietly. plugins/artifact/scripts/build_builds_view.py holds the slice count as a constant and its rubrics directory as a separate default. That count is 14 and that directory is cobuilder-family, while this branch adds sixteen rubrics under cobuilder-viewer. The page therefore renders a different plan's rubrics and omits slices 15 and 16 with no error. The generator reads its slice table from the plan it is given, so the count, the rubrics directory, and the plan can disagree while the run stays green.",
            "evidence": "plugins/artifact/scripts/build_builds_view.py:33",
            "district": "scripts",
            "suggestion": "Read the rubric count from the plan's slice table instead of a constant, and default the rubrics directory to the plan's own slug."
          },
          {
            "severity": "concern",
            "claim": "The new STE gate fails open on every error, which makes a mechanical gate advisory. The loader's own docstring says a missing linter must not block a push and that a present linter which fails is a real failure. Both the loader and the lint call then catch every exception and return an empty violation list. A broken or moved linter therefore reports a clean record instead of a failure. The same file shows the intended shape a few hundred lines later, where a fail-open path prints a warning before it continues.",
            "evidence": "shared/validate_decision_state.py:147",
            "district": "scripts",
            "suggestion": "Let an exception from a present linter propagate, or print a warning and mark the record as not checked, the way the fail-open path at line 532 already does."
          },
          {
            "severity": "concern",
            "claim": "The shipped single-file build carries the whole prototype comparison harness, and the board's rule is in three files rather than two. src/shell/App.tsx imports Variations from ../Variations and renders it on its own route, and Variations.tsx imports all five variations. gatesOf and levelsOf are each defined three times, in src/shell/model.ts, src/variations/sections-e/model.ts, and src/variations/app-shell/model.ts. The intent names this rule in two files. It is in three, and all three are in the built output because the harness is reachable from the shipped shell.",
            "evidence": "plugins/artifact/viewer/src/shell/App.tsx:86",
            "district": "viewer",
            "suggestion": "Decide whether the harness ships. Exclude variations/ from the build if it does not. If it does, state in the shell header why three copies of the board's rule are kept, and add a test that holds them equal."
          },
          {
            "severity": "concern",
            "claim": "The tree now holds two renderers of one bundle, and nothing compares them. The committed plugins/artifact/viewer/index.html is absent from this diff while 131 files under plugins/artifact/viewer/src/ are in it, and the Vite build writes to a gitignored dist/ rather than to the committed file. ADR-0001 exists because the served file and the published file are the same file. After this branch they are still the same file, and the React program is a third artefact that renders the same bundle and reaches no publication path at all. The ordering is the risk. The exporter seam that would write the committed file from the source is E1, and E1 is not in this branch.",
            "evidence": "plugins/artifact/viewer/vite.config.ts:117",
            "district": "viewer",
            "suggestion": "Land E1's exporter seam and E2's build pipeline before publishing from this bundle again, and add the byte-equal guard test in the same change."
          },
          {
            "severity": "note",
            "claim": "CLAUDE.md's ADR-0020 paragraph is stale on two counts. It calls ADR-0020 decided and not executed, while the record's own state is rejected and ADR-0023 declares supersedes: ADR-0020. The rejected state is correct and not the error here. The decision-records reference marks a superseded decision rejected and moves the replaces edge onto its successor. The paragraph also says no viewer/src/ directory exists yet, which this branch makes false by adding 131 files under plugins/artifact/viewer/src/. The branch edits CLAUDE.md in two other places, so it had the chance to repoint this paragraph and did not.",
            "evidence": "CLAUDE.md:28",
            "district": "docs",
            "suggestion": "Repoint the paragraph to ADR-0023 and delete the sentence about viewer/src/ not existing. Leave ADR-0020's rejected state alone, because it follows the documented convention."
          },
          {
            "severity": "note",
            "claim": "inventory.yaml cannot carry this delta, and the assessment records that rather than papering over it. The districts are dated 2026-08-19 and declare root paths such as skills, scripts, commands, and viewer, which is the layout from before the five-plugin split. They match today's tree by name and not by path prefix, so every count in the delta below is name-matched. No district covers .cobuilder/, shared/, tests/, CLAUDE.md, or .gitignore, and this branch touches all five of those areas. The world map is therefore a weaker instrument on this change than on one from August.",
            "evidence": "inventory.yaml:1",
            "district": "docs",
            "suggestion": "Re-derive inventory.yaml against the split layout, and add a district for the rubric store, which now holds six plans."
          },
          {
            "severity": "note",
            "claim": "State duplication in the record-mosaic variation. index.tsx copies props.index into local state, and the loading effect returns early whenever props.index is set. A later change to that prop therefore never reaches the rendered state, so the two sources of truth for one value drift apart. This is the card's named smell, in a file the comparison harness can still render. The shipped shell has a similar pair of values, and its own comment records the choice as deliberate, so I did not score that one as a hit.",
            "evidence": "plugins/artifact/viewer/src/variations/record-mosaic/index.tsx:81",
            "district": "viewer",
            "suggestion": "Derive the ready state from props.index instead of copying it, or drop the prop from the effect's guard and deps together."
          },
          {
            "severity": "note",
            "claim": "Two silenced dependency arrays in the epic-first-mosaic variation, where the effect body reads a value outside the list. The body reads scope.designId while scope is absent from the dependencies, at two separate effects in the same file. The port in the shipped shell does not carry this pattern, so the harness can render a comparison that no longer matches the surface it exists to compare against.",
            "evidence": "plugins/artifact/viewer/src/variations/epic-first-mosaic/index.tsx:557",
            "district": "viewer",
            "suggestion": "Add scope to the dependency list, or read designId into a plain value before the effect and depend on that."
          },
          {
            "severity": "note",
            "claim": "Prop drilling in the epic-first-mosaic variation. The theme value is owned in index.tsx and threaded through LensTiles into DiagramRow into MermaidDiagram, which is four components deep with no context. The shipped shell threads the same value through two layers. The harness therefore costs more to change than the surface it is kept beside, which is the card's drilling smell at the layer where it is cheapest to fix.",
            "evidence": "plugins/artifact/viewer/src/variations/epic-first-mosaic/index.tsx:308",
            "district": "viewer",
            "suggestion": "Leave the harness alone if it retires with the arrangements. Otherwise pass theme through a small context, as the shipped shell's two-layer shape already suggests."
          }
        ],
        "boundary_checks": [
          {
            "rule": "Components never call HTTP clients directly. Data access goes through hooks or the feature's api.ts.",
            "source": "stacks/react-typescript.md",
            "result": "pass",
            "evidence": "grep over plugins/artifact/viewer/src/components/ returns no hit. The pattern is live in this repo, so the empty result is meaningful: fetch( appears at plugins/artifact/viewer/src/data/bundle.ts:90, outside components/."
          },
          {
            "rule": "No cross-feature deep imports. Import a feature's index.ts, not its internals.",
            "source": "stacks/react-typescript.md",
            "result": "not-checkable",
            "evidence": "plugins/artifact/viewer/src/features/ does not exist. The viewer lays out as src/shell/, src/variations/, src/components/, src/data/, src/hooks/, and src/lib/, and it uses no feature folders, so the rule targets a layer this codebase does not have."
          },
          {
            "rule": "Shared components/ never import from features/.",
            "source": "stacks/react-typescript.md",
            "result": "pass",
            "evidence": "grep for from.*features/ over plugins/artifact/viewer/src/components/ returns no hit."
          },
          {
            "rule": "Presentational components do not import global stores. State arrives through props or feature hooks.",
            "source": "stacks/react-typescript.md",
            "result": "pass",
            "evidence": "grep for useStore, useSelector, and useAtom over plugins/artifact/viewer/src/components/ returns no hit. No store library is declared either: plugins/artifact/viewer/package.json lists no zustand, redux, or jotai."
          },
          {
            "rule": "The dependency rule. Inner layers (domain, business logic) never import outer layers (HTTP, UI, DB drivers, framework code).",
            "source": "stacks/generic.md",
            "result": "pass",
            "evidence": "The four changed Python files import the standard library and their own siblings only. No framework, no driver, and no HTTP client. shared/build_index.py imports argparse, datetime, json, re, subprocess, sys, pathlib, hashlib, yaml, and three local modules. One caveat weakens this test: these files are flat CLI scripts with no declared inner layer, so the rule has little to test here."
          },
          {
            "rule": "Configuration crosses into code in one place, not scattered env reads.",
            "source": "stacks/generic.md",
            "result": "pass",
            "evidence": "Three env reads exist, and all three sit in one file: shared/validate_decision_state.py:69, :78, and :433. shared/build_index.py, shared/skills/ste-writing/ste-lint.py, and tests/test_build_index.py read no environment variable."
          }
        ],
        "delta": {
          "districts_added": [],
          "districts_changed": [
            {
              "id": "viewer",
              "files_before": 1,
              "files_after": 139
            },
            {
              "id": "docs",
              "files_before": 148,
              "files_after": 199
            },
            {
              "id": "skills",
              "files_before": 335,
              "files_after": 335
            },
            {
              "id": "scripts",
              "files_before": 25,
              "files_after": 25
            },
            {
              "id": ".cobuilder-architect",
              "files_before": 101,
              "files_after": 101
            }
          ],
          "edges_added": [
            "scripts -> skills",
            "viewer -> .cobuilder-architect"
          ],
          "edges_removed": []
        },
        "regret_risk": "The cost the team carries is a second toolchain and a second truth. Today this repository is prose, Python scripts, and one HTML file, and every script runs under uv with no install. After this merge a reader who changes the viewer needs Node 22 and npm, and that is the first such requirement the repository has ever had. The deeper cost is that two renderers of one bundle now live in the tree and nothing compares them. The committed viewer file is untouched by this branch while 131 React sources land around it, and the build writes to a gitignored dist/, so the day somebody refreshes the committed file from a build is the day the served bundle and the published Artifact can first disagree since ADR-0001. E1's exporter seam and E2's build pipeline are the two epics that close that gap, and neither is in this branch. Merge as written and the regret is one of ordering. The risk lands before the seam that was designed to absorb it. The gate records are cheap to fix, and the harness duplication is a review cost that should retire when the arrangements stop being read.",
        "drift": []
      }
    },
    {
      "pr": 22,
      "date": "2026-09-23",
      "title": "cobuilder-viewer: the build owns the committed viewer, with FlightDeck's prototype",
      "tagline": "",
      "depth": "summary",
      "size": {
        "files": 264,
        "adds": 84360,
        "dels": 5103
      },
      "touched": {
        ".cobuilder-architect": 18,
        ".cobuilder": 17,
        "(root)": 2,
        "docs": 64,
        "plugins": 154,
        "shared": 5,
        "tests": 4
      },
      "levels": {},
      "status": "open",
      "commit": "2f1985fdb3831f62288269d818a90948c5d9d191",
      "intent": {
        "captured": "2026-09-23",
        "source": "inferred",
        "authorship": "agent-assisted",
        "design": {
          "name": "cobuilder-viewer",
          "epic": null
        },
        "design_note": "The epic field is null on purpose, and a reader should know why. The branch's second segment names epic E7's slug, flightdeck-single-pr, and that name is wrong for what the branch carries. This branch delivers slices across four epics of one design: E1 carries slice 1, E2 carries slices 2 and 3, E19 carries slices 6 and 7, and E6 carries slice 14. E7's own two slices are 15, a single pull request at parity, and 16, the joins rail, and the status checklist holds both at unchecked. Naming E7 here would let the record read as though E7 has an open pull request. It does not. The design name is the honest scope, because one design owns all four epics and the branch name names one of them.",
        "problem": "The bundle viewer is one committed HTML file, and the work to replace it landed in two halves that do not meet. The React program under plugins/artifact/viewer/src/ is a real application with a shell, a Work board, and a typed reader of the bundle's record index, and the file the bundle actually serves is still the 4,747-line hand-written page the program was meant to replace. The three things that join the halves are the build, the exporter seam, and parity. The build must reproduce the committed file byte for byte, or the committed file is a guess nobody can refresh. The exporter must match markers the build emits on purpose, or publishing breaks the moment the build changes its output. FlightDeck must read a pull request's narration, diagrams, scene art, audio, diff, and intent so that a reader meets the same content the old page showed. A build with no parity is a swap that loses content. A swap with no working publish loses the Artifact path ADR-0001 exists to protect.",
        "why_now": "The swap is the moment the two halves must meet, and it cannot be deferred past E2. E2's outcome asks the build to produce the committed plugins/artifact/viewer/index.html, and the engineer moved slices 14, 15, and 16 ahead of slices 4, 5, and 8 through 13 on 2026-09-23 for one reason: once the committed file is the React application, a reader who presses a pull request meets a surface that reads none of that pull request's story records, and slice 15 is where it starts to. Slice 14 also ends in an approval, so it stops the run rather than opening the gap wider. The exporter seam was sequenced first, at E1, precisely so that E2 could not break publishing, and E2 broke it anyway.",
        "approach": "The branch lands four things. First, the exporter's named-marker seam: export_artifact.py holds MARKERS as module data, matches each region by name, and stops with a message naming a missing marker rather than writing a half-rewritten page. Second, the build pipeline: a pinned lockfile, Node 22.22.3, and vite-plugin-singlefile, so npm run build in plugins/artifact/viewer/ writes the committed index.html in place and a test rebuilds it and fails on any differing byte. The six marker pairs were moved into a classic inline script in src/index.html, because the default esbuild minifier strips every // comment and esbuild's TypeScript transform strips them from a .ts module even unminified. Turning minification off is not enough either, and it costs 1,261,969 bytes. Third, the FlightDeck prototype: one surface with two modes behind one switch, at plugins/artifact/viewer/src/variations/flightdeck/, with its own dev entry and two recorded state screenshots. Fourth, the plan the program is built against: six ADRs, the Gate 3 program design, the Gate 4a slice ladder, four Gate 4b epic designs, and sixteen Gate 4c rubrics. The branch name says flightdeck-single-pr, and E7's own slices are not built. The design_note field in this file states why the epic field is null.",
        "alternatives": [
          {
            "option": "Ship react-viewer and review-flight-deck as two designs, sequenced",
            "rejected_because": "That order would build the ordering UI against the viewer E5 is about to replace, then rebuild it in React. Someone would also resolve the name collision twice, once informally now and once for real later. Carried unchanged from docs/architecture/designs/cobuilder-viewer/intent.json, source: design."
          },
          {
            "option": "Keep ADR-0020 as decided: ordered parts under viewer/src/, concatenated by build_viewer.py, in plain JavaScript",
            "rejected_because": "It fixes file size and fixes nothing about state, and it cannot type the joins that ADR-0018 already computes. Carried unchanged from docs/architecture/designs/cobuilder-viewer/intent.json, source: design."
          },
          {
            "option": "Two artefacts: a React application served locally, and a reduced single file for publishing",
            "rejected_because": "It splits the truth. ADR-0001 exists because the served file and the published file are the same file. Carried unchanged from docs/architecture/designs/cobuilder-viewer/intent.json, source: design."
          },
          {
            "option": "Build single-pull-request and multi-pull-request mode as one epic",
            "rejected_because": "Multi-pull-request mode needs the typed data layer and the open-pull-request entity that single-pull-request mode does not. One epic means neither reaches parity before the other's risk lands on top of it. Carried unchanged from docs/architecture/designs/cobuilder-viewer/intent.json, source: design."
          }
        ],
        "out_of_scope": [
          "publish parity: a publish of the React viewer does not run on this branch, and the engineer accepted that gap on 2026-09-23",
          "E7's own two slices, 15 and 16, so FlightDeck reads none of a pull request's narration, diagrams, art, audio, diff, or intent sheet yet",
          "the Work surface's own sections, E5's slices 8 through 13, which have not run",
          "the typed data layer's remaining globals: slice 4, which owns window.STORY, window.ODYSSEY, window.DIFFS, window.ADRS, and window.DIAGRAMS",
          "the Reference surface and its prototype, and the twelve epics deferred on 2026-09-22",
          "any change to what the generation scripts write into the bundle",
          "a new record type, a new join, or a schema version bump beyond OpenPullRequest",
          "the diff view's own rendering, which the team ports as it stands",
          "publishing a Notion target, which stays a reserved flag value"
        ],
        "risks": [
          "a publish of the committed viewer does not run, because the exporter matches a sibling data script block and a Mermaid CDN tag that the React build carries neither of. Five test cases fail on that seam",
          "the bundle's own viewer copy still holds the 249,710-byte legacy page while the plugin's committed viewer holds the 1,184,484-byte React build, and shared/migrate_bundle.py refreshes the copy unconditionally from the plugin, so the next run that touches the bundle carries the broken publish path into the bundle",
          "slice 3 broke slice 1's four marker tests, and E1 was sequenced before E2 to prevent exactly that",
          "a contributor now needs Node 22 and npm to change the viewer, which the repository has never required",
          "a committed build artifact goes stale the moment somebody edits the output instead of the source, so the guard test is the only thing holding the two together",
          "a byte-equal rebuild depends on a pinned toolchain, and a version drift makes the guard test fail for the wrong reason",
          "two affordances the React viewer does not carry: a boundary finding no longer advertises itself as a decision candidate, and an n/a gate renders like a pending one with no approved-gate count",
          "the prototype is unreviewed, so the surface slices 15 and 16 build against has no approval behind it",
          "registering the FlightDeck prototype in the comparison harness would pull its code into the shipped file, because src/Variations.tsx imports every variation statically"
        ],
        "testing": "No interview ran, so this block is inferred from the evidence and not stated by an author. The evidence is four things. One, the session's own record in docs/plans/cobuilder-viewer/00-status.md, which carries a measured result per slice. Two, the commands this assessment ran: uv run pytest over tests/test_viewer_build.py, tests/test_export_artifact_markers.py, and tests/test_viewer_modes.py, which reports 5 failed, 20 passed, and 1 skipped over the three files; the same run over the four webp test files, which reports 4 failed and 4 passed on a Pillow architecture fault; and uv run plugins/implement/scripts/verify_gate.py --plan docs/plans/cobuilder-viewer, which reports Overall: FAIL on the four Gate 4b approval lines alone. Three, the build's own measurement: two runs of npm run build wrote 1,184,484 bytes each at sha256 0af3663e, and the build guard test passes. Four, the browser checks the slice records name, which this assessment did not repeat. Those nine cases are every red case in the suite. One further case is skipped, and its skip message names slice 10.",
        "reviewer_focus": [
          "the branch name says flightdeck-single-pr, which is E7's slug, and the branch delivers one slice of E6 and none of E7. Read the design.epic field as null and the design_note above it as the reason",
          "the bundle's viewer copy and the plugin's committed viewer now disagree by 934,774 bytes, and shared/migrate_bundle.py:309 refreshes the copy unconditionally, so the first run that touches the bundle makes publishing stop",
          "the committed viewer is the React application, and it reads two of the bundle's seven globals, window.INDEX and window.DESIGNS. A reader who presses a pull request meets three panels that state the gap in words",
          "the FlightDeck prototype is unreviewed, and its two approval screenshots are untracked files, so a reader of the branch cannot open them",
          "the four Gate 4b epic designs each read pending while five slices have run against them"
        ],
        "unknowns": []
      },
      "assessment": {
        "stage": "pre",
        "generated": "2026-09-23",
        "verdict": "concerns",
        "risk_tier": "architectural",
        "summary": "This branch is the swap. It moves the build in, so plugins/artifact/viewer/index.html is now produced by npm run build instead of by hand, it gives the exporter six named marker regions that survive that build, and it lands the FlightDeck prototype against the swap so a reviewer can see the surface the next two slices build. The direction is right and it follows ADR-0023 to the letter, including the rule that a test rebuilds from source and fails on any difference. It carries concerns, and they cluster on one seam. The committed viewer is the React application and the application reads two of the bundle's seven globals, so pressing a pull request renders three panels that state in words that the surface does not read that pull request's story records. A publish of the new viewer does not run, which the engineer accepted on 2026-09-23, and the bundle's own viewer copy still holds the old 249,710-byte page while the plugin holds the 1,184,484-byte build. shared/migrate_bundle.py refreshes that copy unconditionally, and a dry run confirms it would refresh today, so the next mode that touches the bundle carries the broken publish path into the bundle. The intent block is inferred, not stated by an author, so this assessment measures the change against my reading of the problem and not against a person's account. On the boundary checks, the react-typescript card does match this repo's viewer sub-tree, because package.json declares react and typescript, tsconfig.json is present, and no next dependency is declared. Its three clean greps and its one not-checkable rule therefore carry a real signal, and no fallback to generic.md was needed for that sub-tree. The generic card covers the Python half. No card returned an all-empty set of greps.",
        "sensible": {
          "answer": "Yes on both halves, with one qualifier on the second. First half: the change solves the problem intent.problem states. The build now writes the committed file at plugins/artifact/viewer/index.html, two builds write identical bytes, and a test rebuilds from source and fails on one edited byte. The six marker pairs live in a classic inline script in src/index.html, and the built file carries all six names, which is the one position that survives both the minifier and esbuild's TypeScript transform. Second half: the problem belongs in this repo, at this layer, and in these districts. It belongs to the viewer, because the viewer is what the design replaces, and it belongs to the scripts district, because export_artifact.py is the shipped mode that rewrites the viewer. The change is the right layer for it and it writes nothing new into the bundle's generation output. The qualifier is about timing rather than place. The branch lands the swap before the parity that makes the swap safe, so a reader who presses a pull request meets a surface that reads none of it. The record names that gap honestly for the export seam and does not name it as plainly for the parity gap. A reviewer should read the two as one decision and not two. One caveat travels with this answer. intent.source is inferred, so I am reading the problem off the evidence rather than judging a claim an author made.",
          "evidence": [
            "ADR-0023",
            "ADR-0001",
            "plugins/artifact/viewer/src/index.html:101",
            "plugins/artifact/viewer/vite.config.ts:120",
            "tests/test_viewer_build.py:533",
            "plugins/artifact/scripts/export_artifact.py:128"
          ]
        },
        "maintainability": {
          "answer": "It helps on balance, and it hurts in three named ways. It helps because it moves a decision to one place. Before this branch the committed viewer was a hand-written file and the only way to change it was to edit it, which is the exact stale-output rule ADR-0023's force list warns about. The build now owns that file, one edited byte fails the guard, and the marker seam gives the exporter six names instead of incidental literals, so a change to the data inside a region cannot stop an export. It also gives the build pipeline eleven passing test cases where the file had none. It also removes a real duplicate: the marker names now exist once, in export_artifact.py's MARKERS list, and the built file carries them rather than the exporter copying them. It hurts first by adding a Node 22 and npm requirement to a repository of prose, Python scripts, and one HTML file, which is a cost this branch makes concrete and permanent. It hurts second because the swap lands while the exporter cannot read the new file, so two shipped paths now disagree about what the committed viewer is: the serving path reads it, and the publishing path refuses it. A reader has to hold both in mind to know which mode works. It hurts third because the FlightDeck prototype's modules must stay out of the shipped graph by convention rather than by structure: src/Variations.tsx imports every variation statically, so registering the new one would pull it into the built file, and Tailwind scans every file under src/, so even an unregistered variation can move the shipped hash through class names alone. The repair is a written rule in 00-status.md and one inline-style habit, not a mechanism, and the next variation author can still break it.",
          "constraint_introduced": "The committed viewer file is a build output. An engineer edits a source file and never the output, a test rebuilds from source and fails on any differing byte, the shipped file asks for its data beside itself at a relative path, and the six regions the exporter rewrites are named markers in a classic inline script that the bundler carries through untouched.",
          "evidence": [
            "ADR-0023",
            "plugins/artifact/viewer/vite.config.ts:116",
            "plugins/artifact/viewer/src/index.html:16",
            "plugins/artifact/scripts/export_artifact.py:128",
            "plugins/artifact/viewer/src/Variations.tsx:3",
            "docs/plans/cobuilder-viewer/00-status.md:144"
          ]
        },
        "pattern": {
          "verdict": "conforms",
          "answer": "The change uses a pattern this repo already decided, in the way the record says to use it. ADR-0023's decision states that the viewer is authored as TypeScript and React under plugins/artifact/viewer/src/, compiled into the committed plugins/artifact/viewer/index.html, that the build runs only when an engineer changes the viewer, and that a test rebuilds from source and fails when the committed output differs. ADR-0023's maps_to.rule repeats the same three claims, and this branch implements each one: vite.config.ts:120 sets outDir to the plugin root with emptyOutDir false, tests/test_viewer_build.py:533 holds the committed file to a fresh build, and the build carries no install-time or browser step. ADR-0023's force list also predicts this branch's two hard problems in words, that a bundler moves every literal export_artifact.py matches, and that migrate_bundle.py copies the plugin's viewer into every bundle unconditionally. The named-marker seam is this repo's answer to the first, and E1's Gate 4b design owns it. So the verdict is conforms and not new-valuable: the pattern is not new, and the branch is the execution of it. It is not a duplicate, because no district and no ADR already produces the viewer from source. It is not a reinvention either, because ADR-0020's ordered-parts solution is named and its rejection is reasoned inside ADR-0023's own rejected options, which is the test the reference sets.",
          "duplicates": [],
          "evidence": [
            "ADR-0023",
            "ADR-0020",
            "plugins/artifact/viewer/vite.config.ts:120",
            "tests/test_viewer_build.py:533",
            "plugins/artifact/scripts/export_artifact.py:128",
            "shared/migrate_bundle.py:309"
          ]
        },
        "findings": [
          {
            "kind": "prediction",
            "severity": "concern",
            "claim": "The bundle's viewer copy and the plugin's committed viewer now disagree, and the next mode that touches the bundle makes publishing stop. The bundle copy is 249,710 bytes at sha256 7c3cb520, the legacy hand-written page. The plugin's committed file is 1,184,484 bytes at sha256 0af3663e, the React build. Commit dd26227 refreshed the copy to match the plugin while the plugin still held the legacy page, and commit d2490fb then replaced the plugin's file with the build and did not touch the copy. shared/migrate_bundle.py:309 refreshes the copy unconditionally and content-compares it, and the script resolves its source at :303 to plugins/artifact/viewer/index.html when run from this working tree. I ran the script read-only: uv run shared/migrate_bundle.py --bundle-dir .cobuilder-architect/self --dry-run printed 'viewer: refreshed' and wrote nothing. Every mode that reads a bundle runs that script first, including /artifact:view at plugins/artifact/skills/cobuilder-artifacts/SKILL.md:158 and /artifact:publish at :245, and pr's baseline, review, and generate at plugins/pr/skills/odyssey/SKILL.md:333, :361, and :540. The moment any of them runs, the bundle holds a viewer the exporter refuses, and every publish in this repository exits 1. The engineer accepted 'no publishing parity' on 2026-09-23, and that acceptance names publishing the React viewer. This is the same failure arriving through a mode nobody scoped, with the bundle's own committed file changing under it.",
            "evidence": "shared/migrate_bundle.py:309",
            "district": "viewer",
            "suggestion": "Decide which of the two the repository wants before merge. Either land the exporter's support for the built file inside this branch, or make refresh_viewer skip a viewer the exporter cannot rewrite and print why, so the bundle keeps a file that both serving and publishing accept. Record the answer in 00-status.md:246, because a reader of the branch cannot see this from the branch."
          },
          {
            "kind": "prediction",
            "severity": "concern",
            "claim": "The exporter's own remedy text misdiagnoses this failure, so the next engineer repairs the wrong thing. The message reads 'error: viewer/index.html's Mermaid CDN <script> tag not found verbatim.' followed by 'remediation: the viewer was edited - update export_artifact.py's MERMAID_CDN_RE to match.' Neither clause holds here. The viewer was not edited; a build replaced it. MERMAID_CDN_RE is correct; the built file carries the Mermaid URL as a JavaScript string constant for a dynamic import, at six places, and carries no <script src> tag for it. I checked both by reading the regex at export_artifact.py:94 and matching it against the committed file: the pattern returns no hit and the script block pattern at :78 returns no hit either. The check fires at :443 and exits 1 at :449. All four failing marker cases in tests/test_export_artifact_markers.py end on that same SystemExit with that same stderr. A message that names a hand edit for a machine-written file sends a reader to a regex that needs no change and away from the seam that needs one.",
            "evidence": "plugins/artifact/scripts/export_artifact.py:445",
            "district": "scripts",
            "suggestion": "Broaden the message so it names both causes: the viewer was edited, or the viewer is now a build output that no longer carries the tag verbatim. Point the second cause at the marker seam in src/index.html."
          },
          {
            "kind": "prediction",
            "severity": "concern",
            "claim": "The swap lands before the parity that makes it safe, and the shipped surface admits it in three panels rather than rendering the content. The committed viewer became the React application, and that application reads two of the bundle's seven globals: window.INDEX and window.DESIGNS, through src/data/bundle.ts:102 and :339. Pressing a pull request renders three panels, each reading 'This surface does not read a pull request's own story records yet, so this level renders nothing.' at src/shell/sections.tsx:613, under the three level titles the module declares at :556. So the four narration levels, the three diagrams, the three scene-art files, the three audio files, the diff, and the intent and assessment sheet that the legacy viewer showed are all absent from the shipped file today. Slices 15 and 16 carry the fix, both are unchecked in the checklist, and slice 14 sits between the swap and them and waits on the engineer. The three panels are the honest choice over silence, and they are also the state a reader meets if this branch merges and slices 15 and 16 do not follow promptly.",
            "evidence": "plugins/artifact/viewer/src/shell/sections.tsx:613",
            "district": "viewer",
            "suggestion": "State the parity gap in 00-status.md at the same weight as the export seam gap, so a reviewer reads the swap as a swap and not as a completed port. Keep slices 15 and 16 ahead of slices 4, 5, and 8 through 13, which the plan already does."
          },
          {
            "kind": "prediction",
            "severity": "concern",
            "claim": "Six of the sixteen slices have run against epics whose Gate 4b design still reads pending, and the plan's own checker says so. I ran uv run plugins/implement/scripts/verify_gate.py --plan docs/plans/cobuilder-viewer. It reports design.file ok and design.sections ok for E2, E5, E7, and E19, and design.approved pending on all four, and it ends Overall: FAIL on those four lines alone. Gate 4a reports 16 slices and 4c reports 16 rubrics, both ok. The build skill states that no implementation code is written before Gate 4 writes the ladder and the rubrics, and this branch adds 139 source files under plugins/artifact/viewer/src/ and lands six slices: 1, 2, 3, 6, 7, and the slice 14 prototype. The status file's Gate 4 line at :13 reads pending, so the two records agree, and the tree already carries the implementation both of them gate.",
            "evidence": "docs/plans/cobuilder-viewer/00-status.md:15",
            "district": "docs",
            "suggestion": "Record the approval on each of the four epic designs, or state in the status file why the build starts with Gate 4b open. The Gate 4b precedent this repository already recorded is exactly this: a step with no mechanical consumer gets skipped, and here the consumer exists and its answer is pending."
          },
          {
            "kind": "prediction",
            "severity": "concern",
            "claim": "One note in the status file contradicts the tree it describes, and the branch is what made it false. At :246 it reads 'The built viewer asks for its data at an absolute path. It requests /bundle/data/index.json... E2 owns the fix, and it must land before the build is allowed to write the committed index.html.' Both clauses are now wrong. The build does write the committed index.html, at commit d2490fb, which is the same commit that fixed the path. src/data/bundle.ts:63 sets the data base from import.meta.env.DEV, so the shipped file asks for ../ and the dev server keeps /bundle/. I confirmed the shipped answer by matching the built file: it holds one occurrence of \"../\" and none of \"/bundle/\", and tests/test_viewer_build.py:664 fails the build when the literal appears. The paragraph was written at commit e68fd3d and not touched by d2490fb. The same paragraph at :101 is a different matter and stands: it records what slice 2 measured at the time, and a slice record is history.",
            "evidence": "docs/plans/cobuilder-viewer/00-status.md:248",
            "district": "docs",
            "suggestion": "Rewrite :246 to state that the path rule is now compile-time, keep :101 as the dated slice-2 record, and move the paragraph out of the forward-looking notes so it cannot read as an open item."
          },
          {
            "kind": "prediction",
            "severity": "concern",
            "claim": "Slice 3's own regression check fails two of its three clauses, and the failing clause is the seam E1 was sequenced to protect. The status file records it at :292. Clause 2 holds, because no file outside the slice scope changed. Clause 1 does not: ten cases that passed at the pre-slice commit 39c1065 failed after it, five of them rewritten against the React shell at f42809d and the other five the export seam. Clause 3 does not: a publish of the newly built file stops with the exporter's own message, exits 1, and writes no file. E1 was sequenced before E2 for exactly this reason, at docs/plans/cobuilder-viewer/04-slices.md:119, and E1's slice 1 is escalated rather than accepted, so the guard E2 was meant to be protected by is not in place. I measured the seam directly: uv run pytest over tests/test_export_artifact_markers.py, tests/test_viewer_modes.py, and tests/test_viewer_build.py reports 5 failed, 20 passed, and 1 skipped. Four of the five failures are in the marker file and the fifth is test_export_artifact_parses_updated_viewer, and all five end on SystemExit: 1 from export_artifact.py:449. The other four red cases in the suite are a Pillow architecture fault in the local environment and predate this branch: the installed _imaging.cpython-311-darwin.so is arm64 and the interpreter is x86_64.",
            "evidence": "docs/plans/cobuilder-viewer/00-status.md:292",
            "district": "viewer",
            "suggestion": "Land the exporter's support for the built file before merge, or record the seam as unmet in the epic record for E1 rather than only in the slice note. Nine red cases is the honest count, and five of them are this seam."
          },
          {
            "kind": "prediction",
            "severity": "note",
            "claim": "The evidence slice 14's approval rests on is not in the branch. The status file at :123 names two recorded states, .mode-1-single-pull-request.png and .mode-2-multi-design.png, in plugins/artifact/viewer/src/variations/flightdeck/. All three screenshots in that directory are untracked: git status --porcelain lists them with ??, and git check-ignore exits 1 for them, so no ignore rule hides them. Nine more untracked screenshots sit directly under plugins/artifact/viewer/. A reviewer who checks out this branch and opens the prototype directory sees the source and no images, so the fourth criterion of the slice 14 rubric rests on files a reader of the merge cannot see.",
            "evidence": "docs/plans/cobuilder-viewer/00-status.md:123",
            "district": "viewer",
            "suggestion": "Commit the three flightdeck screenshots, or state in the slice note that the approval was given from images held outside the repository."
          },
          {
            "kind": "prediction",
            "severity": "note",
            "claim": "The prototype's class names can move the shipped bytes even though its modules never reach the shipped graph, and the only guard is a written rule. src/Variations.tsx:3 through :8 import every variation statically, so registering the flightdeck variation would pull its eleven modules into the built file. The status file records at :144 that the clause nearly failed for a different reason: Tailwind scans every file under src/, so twenty-three utility rules that only this variation's markup named were emitted into the build stylesheet and moved the hash by 1,836 bytes. The repair the same note records is a convention, to use only class names the shipped stylesheet already holds. Nothing mechanical holds it. The build's guard test would catch the consequence, because it fails on any differing byte, but it would report a changed hash and not a reason, and a future variation author meets it as a mystery.",
            "evidence": "plugins/artifact/viewer/src/Variations.tsx:3",
            "district": "viewer",
            "suggestion": "Add a case that names the cause, for example one that fails when a class name in variations/ appears in no shipped module, or state the rule in a place the next variation author must read before adding a file."
          },
          {
            "kind": "prediction",
            "severity": "note",
            "claim": "Two affordances of the legacy viewer did not survive the swap, and one of them has no owner. The legacy plugins/artifact/viewer/index.html advertised a boundary finding as a decision candidate: the removed markup carried .badge-candidate, .text-candidate, and the literal strings 'Decision candidate' and 'marked as decision candidates'. It also counted approved gates: the removed markup carried '${approvedGates} of ${totalGates} Gates Approved', and a removed comment records that an 'n/a' gate fell to 'is-planned' and read as not started. Neither affordance is in the React shell. Slice 10 owns the surface for the second, and the skip message at tests/test_viewer_modes.py:450 says so and adds that slice 10's rubric does not require the claim, so it is unowned by rubric. The first has no slice and no rubric at all.",
            "evidence": "docs/plans/cobuilder-viewer/00-status.md:311",
            "district": "viewer",
            "suggestion": "Either add both claims to slice 10's rubric, or record them as deliberately dropped in the design's assessment so a reader does not read the absence as an oversight."
          },
          {
            "kind": "prediction",
            "severity": "note",
            "claim": "The board's rule for which levels a design can fill is stated three times, and the comparison harness that holds the copies ships in the built file. gatesOf and levelsOf are each defined three times: src/shell/model.ts:361 and :421, src/variations/sections-e/model.ts:349 and :409, and src/variations/app-shell/model.ts:349 and :402. The three copies are byte-identical in signature and diverge only in file. The harness reaches the shipped output because src/shell/App.tsx:86 imports VariationsHarness from ../Variations and renders it on its own route at :500, and Variations.tsx imports all five variations. So the comparison arrangements a later change would delete still cost bytes in the file the exporter inlines into a 16 MiB Artifact. The intent block for the previous branch named this rule in two files, and it is in three.",
            "evidence": "plugins/artifact/viewer/src/shell/App.tsx:86",
            "district": "viewer",
            "suggestion": "Decide whether the harness ships. Exclude variations/ from the build if it does not. If it does, state in the shell header why three copies of the board's rule are kept and add a test that holds them equal."
          },
          {
            "kind": "prediction",
            "severity": "note",
            "claim": "inventory.yaml cannot carry this delta, and this assessment records that rather than papering over it. The districts are dated 2026-08-19 and declare root paths such as skills, scripts, commands, viewer, and docs, which is the layout from before the five-plugin split. They match today's tree by name and not by path prefix, so every count in the delta below is name-matched. No district covers shared/, tests/, .cobuilder/, CLAUDE.md, or .gitignore, and this branch changes all five areas. The world map is therefore a weaker instrument on this change than on one from August, and the delta below should be read with that caveat.",
            "evidence": "inventory.yaml:1",
            "district": "docs",
            "suggestion": "Re-derive inventory.yaml against the split layout, and add a district for the rubric store and for tests/, which this branch touches and no district owns."
          }
        ],
        "boundary_checks": [
          {
            "rule": "Components never call HTTP clients directly. Data access goes through hooks or the feature's api.ts.",
            "source": "stacks/react-typescript.md",
            "result": "pass",
            "evidence": "grep -rn 'axios|fetch(' over plugins/artifact/viewer/src/components/ returns no hit. The pattern is live in this repo, so the empty result means something: fetch( appears in the changed viewer at plugins/artifact/viewer/src/data/bundle.ts:106, outside components/."
          },
          {
            "rule": "No cross-feature deep imports. Import a feature's index.ts, not its internals.",
            "source": "stacks/react-typescript.md",
            "result": "not-checkable",
            "evidence": "plugins/artifact/viewer/src/features/ does not exist, so the grep has no target. The viewer lays out as src/shell/, src/variations/, src/components/, src/data/, src/hooks/, and src/lib/, and it uses no feature folders. The rule describes a layer this codebase does not have."
          },
          {
            "rule": "Shared components/ never import from features/.",
            "source": "stacks/react-typescript.md",
            "result": "pass",
            "evidence": "grep -rn 'from.*features/' over plugins/artifact/viewer/src/components/ returns no hit."
          },
          {
            "rule": "Presentational components do not import global stores. State arrives through props or feature hooks.",
            "source": "stacks/react-typescript.md",
            "result": "pass",
            "evidence": "grep -rn 'useStore|useSelector|useAtom' over plugins/artifact/viewer/src/components/ returns no hit. No store library is declared either: plugins/artifact/viewer/package.json lists no zustand, redux, or jotai."
          },
          {
            "rule": "The dependency rule. Inner layers (domain, business logic) never import outer layers (HTTP, UI, DB drivers, framework code).",
            "source": "stacks/generic.md",
            "result": "pass",
            "evidence": "The rule ships no literal grep, so I ran the check it describes. grep -rn for @/components, @/shell, @/variations, react, and react-dom over plugins/artifact/viewer/src/data/ and over the changed shared/ modules returns no hit outside the data layer's own type imports, so the derived-data layer imports no UI and no framework. One caveat weakens the test: the changed Python files are flat CLI scripts with no declared inner layer, so the rule has little to test on that half. The four changed Python files import the standard library and their own siblings only."
          },
          {
            "rule": "Configuration crosses into code in one place, not scattered env reads.",
            "source": "stacks/generic.md",
            "result": "pass",
            "evidence": "grep -rn 'os.environ|import.meta.env|process.env' over the changed source returns four reads, and they sit in two files. Three are in shared/validate_decision_state.py:69, :78, and :433, all under one ARCHKIT prefix and all pre-existing. The fourth is plugins/artifact/viewer/src/data/bundle.ts:63, one read of Vite's own DEV switch, resolved while the build runs so the shipped file carries one path and drops the other. No read is scattered across a module boundary."
          }
        ],
        "delta": {
          "districts_added": [],
          "districts_changed": [
            {
              "id": "viewer",
              "files_before": 4,
              "files_after": 150
            },
            {
              "id": "docs",
              "files_before": 151,
              "files_after": 208
            },
            {
              "id": ".cobuilder-architect",
              "files_before": 101,
              "files_after": 106
            },
            {
              "id": "skills",
              "files_before": 340,
              "files_after": 340
            },
            {
              "id": "commands",
              "files_before": 13,
              "files_after": 13
            },
            {
              "id": "scripts",
              "files_before": 19,
              "files_after": 19
            }
          ],
          "edges_added": [
            "viewer -> .cobuilder-architect"
          ],
          "edges_removed": []
        },
        "regret_risk": "The cost the team carries is a swap that lands before the parity and the publish path that make it safe, and a bundle whose own viewer copy is the tripwire. Today the served bundle still holds the 249,710-byte legacy page, so serving and publishing both work, and the React application lives only in the plugin. The first person to run /artifact:view, /artifact:publish, /pr:baseline, /pr:review, or /pr:generate refreshes that copy from the plugin, and from then on every publish in this repository exits 1 with a message that blames a hand edit that never happened. That is the ordering risk ADR-0023 and the slice ladder both named, arriving from the one direction nobody wrote down. The second cost is the reader's. The committed viewer is now a compiled application that reads two of the bundle's seven globals, so the four narration levels, the diagrams, the scene art, the audio, the diff, and the intent and assessment sheet a reader met yesterday are gone from the file the bundle ships, replaced by three panels that say so. If slices 15 and 16 follow promptly the gap closes and the three panels are a truthful interim state. If they slip, the repository has shipped a viewer that shows less than the one it replaced, and the only record of that is a note inside the branch. The third cost is smaller and lasts longer: a Node 22 and npm toolchain requirement on a repository that needed none, held together by a guard test whose failure mode is a changed hash rather than a changed reason. The verdict is concerns rather than rework because every one of these gaps is recorded, dated, and owned by an epic, and the direction conforms to a decision the repo already made. The regret is the ordering and the tripwire, and both are cheap to settle before merge.",
        "drift": []
      }
    }
  ]
};
