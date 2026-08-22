# cobuilder-architect

cobuilder-architect is a Claude Code plugin for design, generate, and review
(the architecture lifecycle except build), plus narrated history. Odyssey
turns a merged pull request into a four-level narrated story: PR Landscape,
Problem and Solution, Architecture, and File Changes. The story includes
voice narration and extracted architecture decision records. For levels 1
through 3, Odyssey also adds a visual: Gemini-generated scene art, an
authored Mermaid diagram, or both. The `--art` flag below picks the form.
The plugin runs inside your own Claude Code session, against your own
checkout. Your repo never leaves your machine, and your API keys pay only
for what you generate. This branch extends the plugin to capture intent
before code exists.

---

## Install

The plugin lives in its own repository, `bjornslib/cobuilder-architect`, with a
one-plugin marketplace. Installation takes two commands in a Claude Code
session:

```
/plugin marketplace add bjornslib/cobuilder-architect
/plugin install cobuilder-architect@cobuilder-architect
```

GitHub redirects a renamed repository, so an existing
`/plugin marketplace add bjornslib/prodyssey` install should keep resolving.

Restart the session, or enable the plugin from `/plugin`. After that, the
`/cobuilder-architect:*` commands are available in every project.

### Prerequisites

| Requirement | Why | Checked when |
|---|---|---|
| `GEMINI_API_KEY` (env or `.env` in your own repo, never the target repo) | Generates TTS narration, always. Also generates level 1 through 3 scene art, under `--art both` (the default) or `--art image`. Not needed for scene art under `--art diagram` | Checked on every invocation. If the key is absent, the skill stops and prints a message that tells you what to do (AC G2) |
| A git checkout of the target repo | All analysis runs locally: `git log`, grep, and file reads | Checked on invocation |
| `python3` version 3.10 or later, with `uv` | Bundled scripts run through [PEP 723](https://peps.python.org/pep-0723/) inline metadata. `uv run` resolves `google-genai`, `pillow`, and `python-dotenv` for each script, with no venv setup needed | Checked at the first script call |

The plugin needs no GitHub token, no server, and no database. If you can open
the repo in Claude Code, you can generate its story.

---

## Usage

### One command, full sweep

```
/cobuilder-architect:review --prs 73,75
```

For each PR, Odyssey runs these steps in order: it writes the story
narrative (4 levels plus voice scripts), extracts ADRs in retrospect, and
merges the result into `story.json`. It then produces the level 1 through 3
visuals and generates TTS narration. If no baseline exists yet, the skill
runs `baseline` first, on its own (AC G3). You do not need to know that this
is a separate step.

```
/cobuilder-architect:review --latest        # the most recent merged PR
/cobuilder-architect:review --prs 12..18   # a range
```

### Visual form: `--art`

`--art both|diagram|image` picks the level 1 through 3 visual form. Default:
`both`.

- `both` — authors a Mermaid diagram for each level and generates a Gemini
  scene-art image for each level. The viewer shows the image by default and
  lets you toggle to the diagram.
- `diagram` — authors Mermaid diagrams only. Odyssey skips the Gemini
  image calls, so this mode needs no image generation cost and works even
  without a scene-art budget.
- `image` — generates Gemini scene art only, the behavior before diagrams
  existed.

```
/cobuilder-architect:review --prs 79 --art diagram
```

### Baseline (explicit)

```
/cobuilder-architect:baseline
```

This command derives the architecture baseline of the repo into
`.cobuilder-architect/self/`:

1. **Stack detection** — matches the repo against bundled stack cards
   (`nextjs`, `react-typescript`, `python-fastapi`, `swift`, `swiftui-app`,
   `vapor`, with `generic` as the fallback).
2. **District map** — groups the repo with heuristic clustering. The
   clustering weighs top-level directories by file count and size, adds
   commit-frequency heat from `git log`, and merges by import edge. Claude
   names the resulting districts. The map degrades in a clear, predictable
   way. A monorepo clusters at its package manifests (12 districts or
   fewer). A repo under 20 files becomes a single district. A docs-only
   repo falls back to file-type buckets flagged `map_quality: low`.
3. **Context inventory** — for each district, records `{name, root_paths,
   purpose}`. Odyssey verifies each entry against real import edges, using
   grep in both directions, and flags the entry `provenance: inferred`. ADR
   extraction anchors its `maps_to` field to this inventory when the repo
   has no architecture docs of its own.

Run the command again at any time to refresh the baseline in place. The
`review` command warns when the baseline falls more than 200 commits
behind `HEAD`.

### Targeting another local checkout

You do not need to open a session inside the target repo. The `--repo` flag
points the whole sweep at any local checkout:

```
/cobuilder-architect:review --repo ~/code/other-project --prs 42,43
/cobuilder-architect:baseline --repo ~/code/other-project
```

Odyssey looks up `GEMINI_API_KEY` in your environment, or in your own
repo's `.env` file. It never reads `.env` from the target repo — that repo
is untrusted, and its `.env` must never load into this process. If Claude
lacks read access to the path, grant it once with
`/add-dir ~/code/other-project`. The bundle itself does not land inside that
repo. See [Multiple repos](#multiple-repos) below for where it goes.

---

## Generating and opening a PR

The four commands above narrate history. This one runs before the history
exists.

```
/cobuilder-architect:generate
```

Run it on a branch that has no pull request. Odyssey reads the diff, the
district map, and every architecture decision the repo already recorded. It
then asks you only what that evidence cannot answer, usually four to six
questions. It writes your answers down, assesses the change, and opens the
pull request with a description built from what you said.

The assessment answers three questions that a diff cannot:

1. **Is this sensible?** Does the change solve the problem you state, and does
   that problem belong here?
2. **Does it help or hurt maintainability?** It names the invariant the change
   establishes, in the same words an ADR uses.
3. **New pattern, duplicate, or reinvention?** This is the question the bundle
   exists to answer. A `duplicate` or `reinvention` verdict must cite the ADR
   or the district it duplicates. Without a citation, there is no verdict.

Then it answers the one a senior reviewer actually asks: **will we regret
this?**

The verdict is `sound`, `concerns`, or `rework`. **It never blocks a merge.**
A `rework` verdict gives you three options. Open the PR, open it as a draft,
or fix the change first. You choose.

### It asks who wrote the code

Odyssey records whether the change is `human`, `agent-assisted`, or
`agent-generated`. It also records the parts you cannot explain. "The agent
wrote that, and I am not sure why" is a useful answer, not a failed interview.
Those notes raise the risk tier and go in the PR description where a reviewer
reads them. Code that nobody can explain costs a team more than the same code
with an author who can.

### What it writes, and what it opens

The PR description and the assessment go to
`docs/pull-requests/` as markdown. The two structured blocks go onto the
PR's timeline entry in `story.json`. The viewer shows the assessment on level
3, behind a badge next to the ADR chips.

Opening the pull request is the only thing Odyssey does outside
`.cobuilder-architect/`. It shows you the description and asks first. It does nothing
else on GitHub. Use `--no-create` to stop before that and keep the files.

```
/cobuilder-architect:generate --no-create          # write the files, open nothing
/cobuilder-architect:generate --draft              # open it as a draft
/cobuilder-architect:generate --base develop       # a base branch other than the default
/cobuilder-architect:generate --prs 73             # assess an open PR instead of creating one
/cobuilder-architect:generate --prs 73 --stage post
```

`--stage post` runs after the merge. It compares what shipped against what
you said before it shipped. Scope you declared out of bounds and touched
anyway. Risks that never got a guard. Options you rejected that the code
adopted. It never rewrites what you said earlier.

### It makes the story better

The intent captured here stays in the bundle. When `/cobuilder-architect:review` runs
on that PR later, it reads your stated problem and your rejected alternatives
instead of inferring them from the diff. The ADR it extracts is marked
`provenance: authored`, not `inferred`.

## Viewing the result

- **Bundled viewer**: `/cobuilder-architect:view` starts one long-lived `python3 -m
  http.server` per hub in the background, and prints a URL. The session
  keeps running while the server runs. The command finds every bundle you
  generated (see [Multiple repos](#multiple-repos)) and points an internal
  `active` symlink at the one you view. Because of this, switching bundles
  never restarts the server or changes the port. Refresh the browser tab
  instead. `/cobuilder-architect:view --stop` shuts down the server.
  (Manual equivalent for a single bundle: run `cd .cobuilder-architect/self &&
  python3 -m http.server`, then open `http://localhost:8000/viewer/`. Root
  the server at the bundle root, the parent of `viewer/`, not at `viewer/`
  itself. `viewer/index.html` requests sibling files such as
  `../data/story.js`. A server rooted inside `viewer/` returns a 404 error
  for every data file.)
- **Image and diagram views**: on a level with both a scene-art image and a
  Mermaid diagram, the viewer shows the image first and adds a toggle to
  switch to the diagram. A level with only one form shows it directly, with
  no toggle. The diagram view supports wheel-to-zoom about the cursor and
  drag-to-pan. If the Mermaid CDN script cannot load, the viewer falls back
  to showing the plain diagram source, and the rest of the page still works.
- **Production app** (future): sign in, then use *Import bundle* to upload
  `.cobuilder-architect/` or paste the raw GitHub URL of a committed bundle. The
  review workflow, with approve, request changes, and per-level comments,
  works on imported stories.

## Publishing the result

```
/cobuilder-architect:publish --prs 73
```

This command flattens PR #73 into one self-contained HTML file. The file
inlines the story, the ADRs, the diff, and whichever level 1 through 3
visuals the PR has: scene art, Mermaid diagrams, or both. Odyssey
recompresses the result to fit under the 16 MiB cap of Claude Artifacts.
Mermaid diagrams render natively on the Artifact platform, so a published
diagram needs no bundled runtime. A PR published with `--art diagram`
carries no image data, so it stays well under the cap.

Odyssey publishes the file as an Artifact and prints the URL. It also
rebuilds and publishes a small index artifact. That artifact links to every
PR published so far for this bundle, not only the PRs in the current run.
The index always shows the full set. If a PR has not changed since its last
publish, a re-run reports "already up to date" instead of publishing again.
The `--force` flag overrides this check.

```
/cobuilder-architect:publish --prs 73,75
/cobuilder-architect:publish --prs 73 --force
```

`--format artifact` is the default, and the only target Odyssey
implements today. `--format notion` is reserved for later use. Publishing
needs the `Artifact` tool, available in a `/login` session on a paid plan.
Without it, Odyssey still writes the flattened files to
`<bundle-dir>/exports/` for manual use.

An older bundle needs no manual fix. Every command upgrades the bundle it
touches first. A bundle generated before diagram support gets a current
viewer copy the first time any `/cobuilder-architect:*` command runs against it.

## Multiple repos

Analyzing your own repo, with no `--repo` flag, works as before. The bundle
still lands at `.cobuilder-architect/self/`, portable and ready to commit. Point
`--repo <path>` at a different local checkout, and by default Odyssey
writes nothing into that repo. Instead, it caches the bundle locally, under
the hub's `.cobuilder-architect/<repo-slug>/` directory. The hub is the repo you run
Claude Code from. This scoping makes it safe to narrate stories for a repo
you do not own or do not want to change. Use `--store local` to opt into
writing the bundle into the foreign repo instead, at
`<target>/.cobuilder-architect/self/`. Use `--store central` to force the hub-cached
location even when the automatic choice would pick local.

```
/cobuilder-architect:review --repo ~/code/other-project --prs 42,43
```

`/cobuilder-architect:view` finds every bundle a hub holds under its `.cobuilder-architect/`
directory: its own `self/` bundle, plus anything cached for a foreign repo.
When more than one bundle exists, the command lists them and asks which to
view. `/cobuilder-architect:view --list` shows what is stored. Switching between
bundles does not restart the server. It only repoints what the server
serves.

---

## Output: the bundle

For self-analysis, everything lands in `.cobuilder-architect/self/` in that repo.
This is the common case, with no `--repo` flag or with `--repo` pointing at
the repo you are already in. The result is a portable, versioned bundle
that any Odyssey viewer renders. Analyzing a different repo through
`--repo` stores the same tree elsewhere instead. See [Multiple
repos](#multiple-repos) below.

```
<target>/.cobuilder-architect/self/
  bundle.json         # format and schema version, checked and refreshed on every run
  data/{story.json, story.js, adrs.json, adrs.js, manifest.js, diffs-pr{N}.js…,
        audio/pr{N}_{level}.wav, diagrams/pr{N}-level{1,2,3}.mmd, diagrams.js}
  assets/pr-{N}/level-{1..3}.png
  inventory.yaml
  viewer/index.html
  exports/{publish-manifest.json, pr-{N}.html…, index.html}   # written by /cobuilder-architect:publish
  exports/branch-{slug}/diff.json                             # generate-mode diff cache, gitignored

<repo>/
  docs/architecture/designs/<name>/{goal,intent,assessment}.json, adr-draft.md, pr-draft.md
  docs/pull-requests/pr-<N>/{description,assessment}.md
  docs/pull-requests/branch-<slug>/{intent,assessment}.json, {description,assessment}.md
```

The `diagrams/` and `assets/` entries depend on the `--art` mode that
generated the PR. `--art diagram` writes only `.mmd` files and no PNGs.
`--art image` writes only PNGs. `--art both`, the default, writes both.

`/cobuilder-architect:generate` also writes two blocks onto the PR's own timeline entry
in `story.json`: `intent`, which holds what the author said, and
`assessment`, which holds the judgment written against it. They live there,
and not in a file of their own, so the migration guard protects them the way
it protects the narrative.

A `branch-{slug}/` directory is the staging area for a branch that has no
pull request yet. Once the PR opens, the same content moves into
`story.json` under the real PR number, and the staging directory is a
leftover you can delete.

Commit the bundle, and a share link is only the raw GitHub URL. You can
also import the bundle into the viewer directly, by upload or by local
path. The `schema_version` field gates compatibility (AC G5). A bundle
from an older plugin version is not a dead end, though. Every command
upgrades the layout and the data shape of the bundle it touches, in place,
before doing anything else. An older bundle catches up to the current
format on its first use. It never needs a fresh `/cobuilder-architect:baseline` run
just to modernize.

---

## Plugin structure

```
cobuilder-architect/
├── .claude-plugin/
│   ├── plugin.json           # manifest: name "cobuilder-architect", version, keywords
│   └── marketplace.json      # one-plugin marketplace: name "cobuilder-architect", plugins: [{source: "."}]
├── commands/
│   ├── baseline.md           # odyssey: Skill("odyssey", args="baseline")
│   ├── review.md     # odyssey: Skill("odyssey", args="review --prs ...")
│   ├── view.md                # odyssey: Skill("odyssey", args="view ...")
│   ├── publish.md             # odyssey: Skill("odyssey", args="publish --prs ...")
│   ├── generate.md            # odyssey: Skill("odyssey", args="generate ...")
│   ├── design.md              # architecture: Skill("architecture", args="design")
│   ├── review.md              # architecture: Skill("architecture", args="review")
│   ├── maintenance.md         # architecture: Skill("architecture", args="maintenance")
│   ├── decisions.md           # architecture: Skill("architecture", args="decisions")
│   ├── describe.md            # architecture: Skill("architecture", args="describe")
│   └── debug.md               # architecture: Skill("architecture", args="debug")
├── skills/
│   ├── odyssey/
│   │   ├── SKILL.md          # orchestration: prereq gate → baseline → per-PR sweep → generate → view → publish → verify
│   │   └── references/       # Odyssey path onto the architecture skill (see below)
│   │       ├── story-mode.md
│   │       ├── decision-records-lite.md
│   │       ├── baseline-derivation.md      # describe-lite: district + inventory procedure
│   │       ├── review-mode.md              # generate mode: the three questions, verdicts, risk tiers
│   │       ├── interview-guide.md          # generate mode: what to ask the author, and what not to
│   │       ├── pr-description-template.md  # the PR body skeleton render_review.py fills
│   │       ├── adr-template.md             # pointer to the architecture template
│   │       └── stacks/{README,nextjs,react-typescript,python-fastapi,swift,swiftui-app,vapor,generic}.md
│   ├── architecture/          # six self-only modes: design, review, maintenance, decisions, describe, debug
│   ├── mermaid/               # authoring rules for Mermaid diagrams, invoked by the
│                               # diagram-authoring subagent, not the orchestrator directly.
│                               # references/diagram-mode.md holds the per-PR and per-design
│                               # diagram contract, vendored here because both odyssey and
│                               # architecture need it (ADR-0017)
│   └── ste-writing/           # STE writing rules and ste-lint.py
├── scripts/                   # top-level, not nested under skills/. Called via ${CLAUDE_PLUGIN_ROOT}/scripts/...
│   ├── extract_story.py       # generalized: any repo path, writes <bundle-dir>/story.json
│   ├── generate_prompts.py    # nanobanana scene-art prompts
│   ├── generate_audio.py      # TTS narration (Gemini voices)
│   ├── extract_diffs.py       # per-PR diff extraction into the bundle
│   ├── build_diagrams.py      # compiles authored .mmd files into data/diagrams.js, and validates them
│   ├── build_index.py         # full rebuild of the self-bundle record index from docs/, plus the legacy adrs.js/designs.js projections
│   ├── validate_decision_state.py
│   ├── compute_scores.py      # review and maintenance health scores
│   ├── html_to_pdf.py         # review and maintenance report export
│   ├── migrate_bundle.py      # refreshes the viewer, and steps bundle layout + data shape forward
│   ├── _bundle_meta.py        # the version constants that the other scripts import
│   ├── verify_bundle.py       # schema_version + completeness check (drives resumability)
│   ├── export_artifact.py     # flattens one PR into a self-contained artifact-safe HTML
│   ├── export_index.py        # renders the cross-PR index artifact from publish-manifest.json
│   ├── record_publish.py      # records a published Artifact URL back into publish-manifest.json
│   └── render_review.py       # lays out the captured intent + assessment as two markdown files
├── viewer/
│   └── index.html            # portable bundle viewer
└── README.md                 # this file
```

Key manifest fields (`plugin.json`):

```json
{
  "name": "cobuilder-architect",
  "version": "0.4.0"
}
```

The plugin ships no agents, no hooks, no MCP servers, and no output styles.
This is deliberate: the plugin must work in any session without touching
that session's permission or hook surface. Claude Code auto-discovers
`skills/` and `commands/` from their default directory locations, so the
manifest does not need to declare them.

The plugin ships four skills. `odyssey` runs the history modes this README
describes. `architecture` runs the six self-only modes.

`mermaid` holds authoring rules for the level 1 through 3 diagrams that the
`--art` flag can generate (see Visual form above). The per-PR
diagram-authoring subagent invokes `mermaid` for itself. You never invoke
it directly. `ste-writing` holds the writing rules and `ste-lint.py`.

---

## Extraction manifest — what we took from the larger `architecture-review-design-maintenance` skill

The original skill was a six-mode instrument for architecture governance.
Contact the author for more information.

### Extracted (adapted)

| Source (cobuilder-harness) | Becomes | Adaptation |
|---|---|---|
| `references/story-mode.md` | `references/story-mode.md` | Keeps the framework, the four-level mapping, and the register and style rules verbatim. Rewires the output target to `<bundle-dir>/story.json` instead of `docs/prototypes/.../story.json`. When no ADR carries a matching `source_pr`, the process falls back to ADRs extracted in the same sweep. §3 now splits into two registers, selected with `--style kleppmann\|ste` (default `kleppmann`). The `ste` register defers to the `ste-writing` skill |
| `references/decision-records.md` | `references/decision-records-lite.md` | Short Odyssey path onto the full 42010 schema in the architecture skill. Not a second record shape. |
| `references/architecture-documentation.md` | `references/baseline-derivation.md` | Keeps describe-mode's verification discipline as the inventory procedure: enumerate modules, grep import edges in both directions, and never assert a boundary that is not verified. Drops the 8-section canvas, `boundary.yaml` authoring, and INVENTORY.md bookkeeping, replaced by one flat `inventory.yaml` file |
| `references/stacks/*` (4 cards + README) | `references/stacks/*` | Kept verbatim. Detection precedence and ADR-topic checklists drive stack detection and extraction prompts. The `swift`, `swiftui-app`, and `vapor` cards were authored in this repo, not extracted |
| `references/templates/adr-template.md` | `references/adr-template.md` | Pointer to the architecture template. |
| `references/stacks/*`'s `## Boundary Rules` and `## Review Checks` | `references/review-mode.md` | Generate mode runs the grep commands in `Boundary Rules`. It never reads `## Corpus Load`. Review mode loads those paths from the architecture skill. |
| `docs/prototypes/codebase-evolution/data/extract_story.py` | `scripts/extract_story.py` | Generalized. Takes a repo path as a parameter, selects a PR by number through merge-commit lookup, writes to `<bundle-dir>/`, and never overwrites an authored or generated narrative field |
| `docs/prototypes/codebase-evolution/nanobanana/generate_prompts.py` | `scripts/generate_prompts.py` | Reads district and world data from the bundle instead of hand-authored `story.json` fields |
| `utils/generate_audio.py` | `scripts/generate_audio.py` | Keeps the same flow: voice scripts feed Gemini TTS. The output path changes to `<bundle-dir>/data/audio/` |

### Excluded from Odyssey. Now in this plugin as the architecture skill

| Not extracted into Odyssey | Where it lives now |
|---|---|
| **review** and **maintenance** modes, `saas-checklist.md`, `harness-security.md`, report templates, `compute_scores.py`, `html_to_pdf.py` | `/cobuilder-architect:review` and `/cobuilder-architect:maintenance`. Self-only. Generate mode already reversed part of this exclusion. The full audit (scores, checklists, dual HTML reports) ships as `/cobuilder-architect:review`. |
| **corpus/** (~170 principle YAMLs) + **books/** (14 vendored volumes) | `skills/architecture/references/{corpus,books}/` |
| **decisions-mode governance** (state machine, viewpoints, ADR numbering) | The architecture skill. `decision-records-lite.md` is a short Odyssey path onto that schema. |
| **describe-mode full canvas** | `/cobuilder-architect:describe`. Self-only. Odyssey still uses the flat inventory. |
| `sync-books.sh`, `sync-corpus.sh` | Still excluded. |

---

## Upgrading a bundle from an older version

A bundle keeps its own copy of the viewer, and it records the layout and the
data shape it was written with. A newer plugin can therefore find an older
bundle on disk. You do not upgrade it by hand.

`scripts/migrate_bundle.py` does the work, and every `/cobuilder-architect:*` command
runs it against the bundle before it does anything else. An older bundle
catches up on its first use. The script does three things, in this order:

1. It refreshes `viewer/index.html` from the plugin. This is unconditional,
   because the viewer is a build artifact with no authored content in it.
2. It steps the directory layout forward, tracked by `bundle_format`.
3. It steps the data shape forward, tracked by `schema_version`.

Step 3 never rewrites your content. Each data migration declares the fields
it changes. The script collects every authored value before and after the
migration, and it compares the two sets. If a value changed that the
migration did not declare, the script writes nothing and stops with the
field name. It also copies `story.json` to `<bundle-dir>/.migration-backup/`
before it writes. Add that path to `.gitignore`, because the backup is
disposable.

Run the script directly to inspect an upgrade before it happens:

```
uv run scripts/migrate_bundle.py --bundle-dir .cobuilder-architect/self --dry-run
```

`--dry-run` reports the three phases and prints a diff of `story.json`. It
writes nothing.

Two limits are worth knowing. An upgrade is one way. An older plugin reports
`unknown-schema-version` for a bundle that a newer plugin migrated. Update
the plugin on every machine that reads the bundle. The script also refuses a
bundle from a plugin newer than itself. It tells you to update the plugin
rather than guess the format.

---

## Generation Cost

You pay your own way. Narrative, ADR extraction, and diagram authoring run
on your Claude Code subscription. Scene art and TTS narration run on your
`GEMINI_API_KEY`. A typical PR generates 3 narration clips under every
`--art` mode. It also generates 3 images under `--art both`, the default,
or under `--art image`, and no images under `--art diagram`. Cost runs from
single-digit cents to low single-digit dollars, and depends on the Gemini
tier. `--art diagram` costs less. The prerequisite gate exists so that you
never discover a missing key three stages into a sweep.
