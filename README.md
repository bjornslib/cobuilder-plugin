# Prodyssey — Codebase Odyssey Generator

Prodyssey turns a merged pull request into a four-level narrated story: PR
Landscape, Problem and Solution, Architecture, and File Changes. The story
includes generated scene art, voice narration, and extracted architecture
decision records. Prodyssey runs inside your own Claude Code session against
your own checkout. Your repo never leaves your machine. Your API keys pay
only for what you generate.

---

## Install

The plugin lives in its own repository, `bjornslib/prodyssey`, with a
one-plugin marketplace. Installation takes two commands in a Claude Code
session:

```
/plugin marketplace add bjornslib/prodyssey
/plugin install prodyssey@prodyssey
```

Restart the session, or enable the plugin from `/plugin`. After that, the
`/prodyssey:*` commands are available in every project.

### Prerequisites

| Requirement | Why | Checked when |
|---|---|---|
| `GEMINI_API_KEY` (env or `.env` in the target repo) | Generates scene art with Gemini and generates TTS narration | Checked on every invocation. If the key is absent, the skill stops and prints a message that tells you what to do (AC G2) |
| A git checkout of the target repo | All analysis runs locally: `git log`, grep, and file reads | Checked on invocation |
| `python3` version 3.10 or later, with `uv` | Bundled scripts run through [PEP 723](https://peps.python.org/pep-0723/) inline metadata. `uv run` resolves `google-genai`, `pillow`, and `python-dotenv` for each script, with no venv setup needed | Checked at the first script call |

Prodyssey needs no GitHub token, no server, and no database. If you can open
the repo in Claude Code, you can generate its story.

---

## Usage

### One command, full sweep

```
/prodyssey:generate --prs 73,75
```

For each PR, Prodyssey runs these steps in order: it writes the story
narrative (4 levels plus voice scripts), extracts ADRs in retrospect, and
merges the result into `story.json`. It then generates scene-art prompts and
Gemini images for levels 1 through 3, and generates TTS narration. If no
baseline exists yet, the skill runs `baseline` first, on its own (AC G3).
You do not need to know that this is a separate step.

```
/prodyssey:generate --latest        # the most recent merged PR
/prodyssey:generate --prs 12..18   # a range
```

### Baseline (explicit)

```
/prodyssey:baseline
```

This command derives the architecture baseline of the repo into
`.prodyssey/self/`:

1. **Stack detection** — matches the repo against bundled stack cards
   (`nextjs`, `react-typescript`, `python-fastapi`, with `generic` as the
   fallback).
2. **District map** — groups the repo with heuristic clustering. The
   clustering weighs top-level directories by file count and size, adds
   commit-frequency heat from `git log`, and merges by import edge. Claude
   names the resulting districts. The map degrades in a clear, predictable
   way. A monorepo clusters at its package manifests (12 districts or
   fewer). A repo under 20 files becomes a single district. A docs-only
   repo falls back to file-type buckets flagged `map_quality: low`.
3. **Context inventory** — for each district, records `{name, root_paths,
   purpose}`. Prodyssey verifies each entry against real import edges, using
   grep in both directions, and flags the entry `provenance: inferred`. ADR
   extraction anchors its `maps_to` field to this inventory when the repo
   has no architecture docs of its own.

Run the command again at any time to refresh the baseline in place. The
`generate` command warns when the baseline falls more than 200 commits
behind `HEAD`.

### Targeting another local checkout

You do not need to open a session inside the target repo. The `--repo` flag
points the whole sweep at any local checkout:

```
/prodyssey:generate --repo ~/code/other-project --prs 42,43
/prodyssey:baseline --repo ~/code/other-project
```

Prodyssey looks up `GEMINI_API_KEY` in that repo's `.env` file, or in your
environment. If Claude lacks read access to the path, grant it once with
`/add-dir ~/code/other-project`. The bundle itself does not land inside that
repo. See [Multiple repos](#multiple-repos) below for where it goes.

## Viewing the result

- **Bundled viewer**: `/prodyssey:view` starts one long-lived `python3 -m
  http.server` per hub in the background, and prints a URL. The session
  keeps running while the server runs. The command finds every bundle you
  generated (see [Multiple repos](#multiple-repos)) and points an internal
  `active` symlink at the one you view. Because of this, switching bundles
  never restarts the server or changes the port. Refresh the browser tab
  instead. `/prodyssey:view --stop` shuts down the server.
  (Manual equivalent for a single bundle: run `cd .prodyssey/self &&
  python3 -m http.server`, then open `http://localhost:8000/viewer/`. Root
  the server at the bundle root, the parent of `viewer/`, not at `viewer/`
  itself. `viewer/index.html` requests sibling files such as
  `../data/story.js`. A server rooted inside `viewer/` returns a 404 error
  for every data file.)
- **Production app** (future): sign in, then use *Import bundle* to upload
  `.prodyssey/` or paste the raw GitHub URL of a committed bundle. The
  review workflow, with approve, request changes, and per-level comments,
  works on imported stories.

## Publishing the result

```
/prodyssey:publish --prs 73
```

This command flattens PR #73 into one self-contained HTML file. The file
inlines the story, the ADRs, the diff, and the scene art and narration. It
recompresses them to fit under the 16 MiB cap of Claude Artifacts. Prodyssey
publishes the file as an Artifact and prints the URL. It also rebuilds and
publishes a small index artifact that links to every PR published so far
for this bundle, not only the PR or PRs in the current run. The index
always shows the full set. If a PR has not changed since its last publish,
a re-run reports "already up to date" instead of publishing again. The
`--force` flag overrides this check.

```
/prodyssey:publish --prs 73,75
/prodyssey:publish --prs 73 --force
```

`--format artifact` is the default, and the only target Prodyssey
implements today. `--format notion` is reserved for later use. Publishing
needs the `Artifact` tool, available in a `/login` session on a paid plan.
Without it, Prodyssey still writes the flattened files to
`<bundle-dir>/exports/` for manual use.

## Multiple repos

Analyzing your own repo, with no `--repo` flag, works as before. The bundle
still lands at `.prodyssey/self/`, portable and ready to commit. Point
`--repo <path>` at a different local checkout, and by default Prodyssey
writes nothing into that repo. Instead, it caches the bundle locally, under
the hub's `.prodyssey/<repo-slug>/` directory. The hub is the repo you run
Claude Code from. This scoping makes it safe to generate stories for a repo
you do not own or do not want to change. Use `--store local` to opt into
writing the bundle into the foreign repo instead, at
`<target>/.prodyssey/self/`. Use `--store central` to force the hub-cached
location even when the automatic choice would pick local.

```
/prodyssey:generate --repo ~/code/other-project --prs 42,43
```

`/prodyssey:view` finds every bundle a hub holds under its `.prodyssey/`
directory: its own `self/` bundle, plus anything cached for a foreign repo.
When more than one bundle exists, the command lists them and asks which to
view. `/prodyssey:view --list` shows what is stored. Switching between
bundles does not restart the server. It only repoints what the server
serves.

---

## Output: the bundle

For self-analysis, everything lands in `.prodyssey/self/` in that repo.
This is the common case, with no `--repo` flag or with `--repo` pointing at
the repo you are already in. The result is a portable, versioned bundle
that any Odyssey viewer renders. Analyzing a different repo through
`--repo` stores the same tree elsewhere instead. See [Multiple
repos](#multiple-repos) below.

```
<target>/.prodyssey/self/
  data/{story.json, story.js, adrs.json, adrs.js, manifest.js, diffs-pr{N}.js…, audio/pr{N}_{level}.wav}
  assets/pr-{N}/level-{1..3}.png
  inventory.yaml
  viewer/index.html
  exports/{publish-manifest.json, pr-{N}.html…, index.html}   # written by /prodyssey:publish
```

Commit the bundle, and a share link is only the raw GitHub URL. You can
also import the bundle into the viewer directly, by upload or by local
path. The `schema_version` field gates compatibility (AC G5).

---

## Plugin structure

```
prodyssey/
├── .claude-plugin/
│   ├── plugin.json           # manifest: name "prodyssey", version, keywords
│   └── marketplace.json      # one-plugin marketplace: name "prodyssey", plugins: [{source: "."}]
├── commands/
│   ├── baseline.md           # thin: invokes the skill with args="baseline"
│   ├── generate.md           # thin: invokes the skill with args="generate --prs ..."
│   ├── view.md                # thin: invokes the skill with args="view ..."
│   └── publish.md             # thin: invokes the skill with args="publish --prs ..."
├── skills/
│   └── odyssey/
│       ├── SKILL.md          # orchestration: prereq gate → baseline → per-PR sweep → view → publish → verify
│       └── references/       # extracted from architecture-review-design-maintenance (see below)
│           ├── story-mode.md
│           ├── decision-records-lite.md
│           ├── baseline-derivation.md      # describe-lite: district + inventory procedure
│           ├── adr-template.md
│           └── stacks/{README,nextjs,react-typescript,python-fastapi,generic}.md
├── scripts/                   # top-level, not nested under skills/ — called via ${CLAUDE_PLUGIN_ROOT}/scripts/...
│   ├── extract_story.py       # generalized: any repo path, writes <bundle-dir>/story.json
│   ├── generate_prompts.py    # nanobanana scene-art prompts
│   ├── generate_audio.py      # TTS narration (Gemini voices)
│   ├── extract_diffs.py       # per-PR diff extraction into the bundle
│   ├── verify_bundle.py       # schema_version + completeness check (drives resumability)
│   ├── export_artifact.py     # flattens one PR into a self-contained artifact-safe HTML
│   ├── export_index.py        # renders the cross-PR index artifact from publish-manifest.json
│   └── record_publish.py      # records a published Artifact URL back into publish-manifest.json
├── viewer/
│   └── index.html            # portable bundle viewer
└── README.md                 # this file
```

Key manifest fields (`plugin.json`):

```json
{
  "name": "prodyssey",
  "version": "0.1.0"
}
```

The plugin ships no agents, no hooks, no MCP servers, and no output styles.
This is deliberate: the plugin must work in any session without touching
that session's permission or hook surface. Claude Code auto-discovers
`skills/` and `commands/` from their default directory locations, so the
manifest does not need to declare them.

---

## Extraction manifest — what we took from the larger `architecture-review-design-maintenance` skill

The original skill was a six-mode instrument for architecture governance.
Contact the author for more information.

### Extracted (adapted)

| Source (cobuilder-harness) | Becomes | Adaptation |
|---|---|---|
| `references/story-mode.md` | `references/story-mode.md` | Keeps the framework, the four-level mapping, and the register and style rules verbatim. Rewires the output target to `<bundle-dir>/story.json` instead of `docs/prototypes/.../story.json`. When no ADR carries a matching `source_pr`, the process falls back to ADRs extracted in the same sweep. §3 now splits into two registers, selected with `--style kleppmann\|ste` (default `kleppmann`). The `ste` register defers to the `ste-writing` skill |
| `references/decision-records.md` | `references/decision-records-lite.md` | Keeps the record shape: context, forces, decision, consequences, plus `delivers` and `maps_to`. Drops the state machine, the transition rules, viewpoint regeneration, and ADR numbering governance, since those govern a maintained doc set, not a generated bundle. `maps_to` targets `inventory.yaml`, and each record carries `provenance: inferred` |
| `references/architecture-documentation.md` | `references/baseline-derivation.md` | Keeps describe-mode's verification discipline as the inventory procedure: enumerate modules, grep import edges in both directions, and never assert a boundary that is not verified. Drops the 8-section canvas, `boundary.yaml` authoring, and INVENTORY.md bookkeeping, replaced by one flat `inventory.yaml` file |
| `references/stacks/*` (4 cards + README) | `references/stacks/*` | Kept verbatim. Detection precedence and ADR-topic checklists drive stack detection and extraction prompts |
| `references/templates/adr-template.md` | `references/adr-template.md` | Trimmed frontmatter (no state machine fields) |
| `docs/prototypes/codebase-evolution/data/extract_story.py` | `scripts/extract_story.py` | Generalized. Takes a repo path as a parameter, selects a PR by number through merge-commit lookup, writes to `<bundle-dir>/`, and never overwrites an authored or generated narrative field |
| `docs/prototypes/codebase-evolution/nanobanana/generate_prompts.py` | `scripts/generate_prompts.py` | Reads district and world data from the bundle instead of hand-authored `story.json` fields |
| `utils/generate_audio.py` | `scripts/generate_audio.py` | Keeps the same flow: voice scripts feed Gemini TTS. The output path changes to `<bundle-dir>/data/audio/` |

### Excluded from PR Odyssey but in architecture skill

| Not extracted | Why |
|---|---|
| **review / maintenance modes** + `saas-checklist.md`, `harness-security.md`, report templates, `compute_scores.py` | An audit instrument for maintainers, out of scope for Prodyssey (consensus 7/7) |
| **corpus/** (~170 principle YAMLs) + **books/** (14 vendored volumes) | Grounding for audit depth. Story generation needs the style rules and the record shapes, not the review corpus, and dropping it keeps the plugin download small |
| **decisions-mode governance** (state machine, viewpoints, ADR numbering) | Governs a living doc set in a repo you own. Prodyssey generates immutable bundle records instead |
| **describe-mode full canvas** | The flat inventory serves as the `maps_to` anchor. The full canvas adds documentation-program overhead that a foreign repo cannot sustain |
| `sync-books.sh`, `sync-corpus.sh`, `html_to_pdf.py` | Corpus maintenance tooling for the parent skill |

---

## Generation Cost

You pay your own way. Narrative and ADR extraction run on your Claude Code
subscription. Images and TTS run on your `GEMINI_API_KEY`. A typical PR
uses 3 images and 3 narration clips, and costs roughly single-digit cents
to low single-digit dollars, depending on the Gemini tier. The prerequisite
gate exists so that you never discover a missing key three stages into a
sweep.
