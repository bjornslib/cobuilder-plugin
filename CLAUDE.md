# CLAUDE.md

Guidance for Claude Code instances working in this repo.

## What this repo is

**prodyssey** is a Claude Code plugin (`.claude-plugin/`), not an app with a
build/test/deploy cycle. It has one job. It turns the merged PRs of *any*
locally checked-out git repo into a four-level narrated "codebase odyssey":
scene art, voice narration, and retro-extracted ADRs, in a portable HTML
viewer. The target is the session's own repo, or any other checkout reached
through `--repo`.

Submit mode is the one part that does not narrate history. It runs before the
history exists — it interviews the author of a change, assesses that change
against the bundle, and opens the pull request. It exists because the rest of
the plugin spends real effort reconstructing intent that nobody wrote down.
Capture the intent at submit time, and generate mode stops guessing. See
Submit mode below, and `skills/odyssey/references/{interview-guide,review-mode}.md`.

Where the bundle lands depends on the target. Analyzing your own repo writes
to `<target>/.prodyssey/self/` — that is the case with no `--repo`, or with
`--repo` that resolves to the session's own checkout. Analyzing a foreign
repo writes instead to `<hub>/.prodyssey/<repo-slug>/`, where `<hub>` is the
session's own repo, never the foreign one. `--store local|central` overrides
the automatic choice. See `skills/odyssey/SKILL.md`'s Hub resolution section
for the exact rule and slug derivation.

Install surface: `/plugin marketplace add bjornslib/prodyssey` then
`/plugin install prodyssey@prodyssey`. No agents, no hooks, no MCP servers —
deliberate, so the plugin never touches another session's permission surface.
The plugin ships two skills. `odyssey` is the orchestration skill this file
describes. `mermaid` holds the authoring rules for the Mermaid diagrams
below. The diagram-authoring subagent that `odyssey` spawns invokes
`mermaid` for itself. The orchestrating Claude never invokes it directly.

See `README.md` for the user-facing install and usage doc, and for the
extraction manifest. That manifest records what was ported from
`architecture-review-design-maintenance`, and what was deliberately left
behind. Do not duplicate that content here. This file is for orientation,
and for the things a future coding session cannot get from reading the
files.

## Layout

```
.claude-plugin/       plugin.json (manifest) + marketplace.json
commands/              thin dispatchers: baseline.md, generate.md, view.md,
                       publish.md, submit.md → Skill("odyssey", args=...)
skills/
  odyssey/
    SKILL.md          orchestration: prereq gate → baseline → per-PR sweep →
                       submit → view → publish → verify
    references/       loaded on demand (story-mode, decision-records-lite,
                       baseline-derivation, diagram-mode, review-mode,
                       interview-guide, adr-template, pr-description-template,
                       stacks/*)
  mermaid/            authoring rules for the Mermaid diagrams below; not
                       invoked by the orchestrating Claude directly — the
                       per-PR diagram-authoring subagent invokes it as
                       Skill("prodyssey:mermaid")
scripts/              11 PEP-723 uv scripts, called by the skill, never edited by it:
                       extract_story.py, generate_prompts.py, generate_audio.py,
                       extract_diffs.py, build_diagrams.py, verify_bundle.py,
                       export_artifact.py, export_index.py, record_publish.py,
                       migrate_bundle.py, render_review.py
viewer/index.html      the bundle viewer (~2000 lines, single file, see below)
```

(`scripts/` is top-level, a sibling of `skills/`, not nested under
`skills/odyssey/` — `SKILL.md` calls it via `${CLAUDE_PLUGIN_ROOT}/scripts/...`.)

`skills/` and `commands/` are auto-discovered — the manifest does not
declare them.

## How generation actually runs

`SKILL.md` is the source of truth for the procedure. Skim it before you
change orchestration behavior. In short: a hard prereq gate runs before
anything generative, and it checks for a git repo, `uv` on PATH, and
`GEMINI_API_KEY`. `baseline` mode derives `<bundle-dir>/inventory.yaml` and
the world districts. `generate` mode is per-PR and resumable.
`verify_bundle.py` decides which stages are already `"ok"`. A killed sweep
can therefore run again without regenerating completed narrative, art, or
audio. `--force` overrides this.

Narrative authoring and ADR extraction are **Claude judgment work**, done
directly against `data/story.json` and `data/adrs.json`, and never delegated
to a script. Scripts only move data: diffs, image prompts, audio, diagram
compilation, and verification. Diagram authoring is also Claude judgment
work, but the orchestrating Claude never writes the `.mmd` files itself. It
spawns a per-PR subagent to do that — see Generate mode in
`skills/odyssey/SKILL.md`. It then runs `scripts/build_diagrams.py`, which
compiles the subagent's `.mmd` files into `data/diagrams.js` and validates
them.

Scripts are PEP 723 (`uv run script.py` resolves `google-genai`, `pillow`,
`python-dotenv` inline — no venv, no `requirements.txt`).

## Submit mode — what is load-bearing about it

`/prodyssey:submit` interviews a change's author, assesses the change, and
opens the pull request. Four things about it are easy to break by accident.

**The interview is the product.** `references/interview-guide.md` §2 says
never ask a question the evidence already answers, and §3 caps the count at
six. A future session that turns this into a fixed questionnaire has removed
the only thing that separates it from a generic diff-reading reviewer. The
mode reads the diff, the districts, the ADRs, and the stack card *before* it
asks anything.

**The PR number comes from opening the PR.** `story.json` keys on an integer
`pr`, and `verify_bundle.py`, `record_publish.py`, `manifest.js`, and the
viewer all depend on that. A working branch therefore cannot enter the
timeline. Rather than mint a synthetic key, the pre stage ends with
`gh pr create` and files the result under the real number. Before that, the
content stages in `<bundle-dir>/exports/branch-<slug>/`. Do not "fix" this by
inventing a branch key.

**Pushing and opening a PR are the only actions outside `.prodyssey/`,** and
they only run after an explicit confirmation. Nothing else on GitHub is in
scope: no comments, no edits to an existing PR body, no labels, no reviewers,
no merges. `--non-interactive` cannot open a PR at all, because there is
nobody there to confirm.

**`intent` and `assessment` live on the timeline entry, not in a file of
their own.** That is what puts them under `migrate_bundle.py`'s
authored-field guard — both names are in `AUTHORED_TIMELINE_FIELDS` — and it
is why the viewer reads them off `window.STORY` with no new global and no new
`<script src>` tag. A separate `reviews.json` would repeat the `adrs.json`
debt described under Bundle versioning below.

Assessment is Claude judgment work, like narrative and ADRs.
`scripts/render_review.py` lays the result out as markdown and judges none of
it. `verify_bundle.py` gained `intent` and `assessment` keys that are
**optional by default** — a bundle generated before this mode existed must
keep passing — and `--require-review` promotes them.

## The viewer is not self-contained — this matters for anything artifact-related

`viewer/index.html` is a normal multi-file web page in disguise: one HTML
file, but it depends on three things that only exist *next to* it inside a
real `.prodyssey/` bundle:

1. **Sibling `<script src="../data/*.js">` tags** (`story.js`, `manifest.js`,
   per-PR `diffs-pr{N}.js` via `document.write`, `adrs.js`) — this is how
   `window.STORY` / `window.ODYSSEY` / `window.DIFFS` / `window.ADRS` get
   populated. No inline data anywhere.
2. **Relative asset paths** — hero images at `../assets/pr-{N}/level-{L}.png`
   (built in `heroFrame()` and the audio-dialog image, both in
   `viewer/index.html`), narration audio at `../data/audio/pr{N}_{level}.wav`
   (`toggleAudio()`).
3. **Three external CDN requests.** Google Fonts supplies JetBrains Mono.
   `cdn.jsdelivr.net/npm/motion` drives the micro-animations. A
   version-pinned Mermaid 11 script renders the `<pre class="mermaid">`
   blocks for levels 1 through 3. Each one degrades gracefully when the CDN
   is unreachable. Mermaid shows the plain diagram source, Motion becomes a
   no-op, and the fonts fall back to the existing `monospace` and
   `sans-serif` stack.

Serve the bundle with `python3 -m http.server`, rooted at the bundle root.
That root is the parent of `viewer/`, for example `.prodyssey/self/`. Do not
root it inside `viewer/` itself. `viewer/index.html` requests sibling files
such as `../data/story.js`, so a server rooted inside `viewer/` returns a
404 error for every data file. The future production app keeps the same
relative file layout in its *Import bundle* flow.

**This means the viewer cannot be published as a Claude Artifact as-is.**
An Artifact is a single self-contained file with no sibling files. Its CSP
also blocks every external request: fonts, scripts, and fetch or XHR. A
throwaway artifact-safe export proved this on 2026-07-22. That export
inlined `window.STORY`/`ODYSSEY`/`DIFFS`/`ADRS` as literal JSON, dropped
both CDN tags, and rewrote the asset and audio paths to read a
`window.ODYSSEY_ASSETS` / `window.ODYSSEY_AUDIO` data-URI map. Publishing it
**rendered correctly** — PR navigation, levels, the hero image, and the
audio dialog all worked. Two things came out of that experiment that matter
if anybody revisits it:

- The Motion CDN script already has a graceful no-op fallback in `anim()`:
  `if (!el || !window.Motion) return {finished: Promise.resolve()}`.
  Dropping it costs micro-animations, not correctness. A Google Fonts
  failure falls back to the `monospace` and `sans-serif` stack in the font
  declarations.
- The 16 MiB artifact size cap is the real constraint for a multi-PR bundle,
  and audio is what breaks it. Uncompressed WAV narration grows about 33%
  again as base64. An artifact-export mode must drop audio, transcode it to
  a compressed format, or cap it to one PR level at a time.

That experiment is now a real, shipped mode: `/prodyssey:publish`, which is
Publish mode in `SKILL.md`. Three scripts divide the work.
`scripts/export_artifact.py` does the transform above, per PR. It also
retries at lower compression tiers when the result exceeds the budget, and
drops audio as a last resort. `scripts/export_index.py` renders a small
standalone landing page. That page links to every PR artifact published so
far for the bundle. It carries no images or audio, so the budget does not
apply. `scripts/record_publish.py` writes the URL that the Artifact tool
returned back into `<bundle-dir>/exports/publish-manifest.json`. That last
script is the only part of the pipeline that must run after the publish
call, because no script can know the URL in advance.
`publish-manifest.json` is also the
staleness record. It holds a content hash, plus the PR's commit SHA when
that SHA is available. A second `/prodyssey:publish` on an unchanged PR
therefore reports "already up to date" instead of publishing again.

`--format artifact` is the only implemented target. `--format notion` is a
recognized, reserved flag value with no implementation behind it yet.

Diagrams reuse this pipeline rather than replicate it. `export_artifact.py`
inlines `window.DIAGRAMS` as literal JSON, the same way it inlines `STORY`,
`ODYSSEY`, `DIFFS`, and `ADRS`. It strips the Mermaid CDN tag instead of
inlining a runtime, because the Claude Artifact platform renders
`<pre class="mermaid">` blocks natively. An `--inline-mermaid` flag is the
escape hatch if native rendering cannot handle blocks injected after page
load. That flag inlines a vendored `mermaid.min.js` instead. A PR published
with `--art diagram` carries no PNGs at all, which relieves the 16 MiB
budget pressure above — a diagram is plain text, not base64 image data.

A bundle written before the diagram change once needed its viewer copy
refreshed by hand. `scripts/migrate_bundle.py` now handles this. Every mode
runs it before it touches a bundle, so `export_artifact.py`'s verbatim guard
against the viewer copy should never fire in practice. See Bundle versioning
and migration below.

## Bundle output shape (what generation produces)

```
<bundle-dir>/       <target>/.prodyssey/self/ for self-analysis, <hub>/.prodyssey/<repo-slug>/ for a foreign repo
  bundle.json        bundle_format, schema_version, generator_version, migrated_at
  data/{story.json, story.js, adrs.json, adrs.js, manifest.js,
        diffs-pr{N}.js…, audio/pr{N}_{level}.wav,
        diagrams/pr{N}-level{1,2,3}.mmd, diagrams.js}
  assets/pr-{N}/level-{1..3}.png
  inventory.yaml
  viewer/index.html
  exports/{publish-manifest.json, pr-{N}.html…, index.html}   # written by /prodyssey:publish
  exports/pr-{N}-{description,assessment}.md                  # written by /prodyssey:submit
  exports/branch-{slug}/{diff,intent,assessment}.json         # /prodyssey:submit, pre-PR staging
  exports/branch-{slug}/{description,assessment}.md
  .migration-backup/  # pre-migration story.json snapshots, written by migrate_bundle.py
```

`data/diagrams/pr{N}-level{L}.mmd` files are the source of truth for the
Mermaid diagrams — level 1 (`C4Container`), level 2 (`sequenceDiagram`), and
level 3 (`classDiagram`); level 4 has none. `scripts/build_diagrams.py`
compiles them into `data/diagrams.js` (`window.DIAGRAMS`), the same
sibling-script-tag pattern `story.js`/`manifest.js`/`adrs.js` already use.
Whether a given PR has diagrams, scene art, or both depends on the `--art`
flag it was generated with (see Generate mode in `skills/odyssey/SKILL.md`).

`exports/` appears only after `/prodyssey:publish` runs at least once. It is
as committable as the rest of the bundle — see Publish mode notes below.

`story.json`'s `meta.schema_version` is currently `"1.2"`, and it is the
source of truth for a bundle's data shape. `bundle.json` only mirrors it.
`scripts/_bundle_meta.py` holds the constant, and `verify_bundle.py` gates
on it through `SCHEMA_VERSION_KNOWN`. That set also accepts `"1.0"` and `"1.1"`, so
migration can still read an older bundle.

This repo commits everything under `.prodyssey/`. Only five bookkeeping
entries are gitignored:

- `.prodyssey/.view-server.pid` and `.prodyssey/.view-server.log`, which are
  process bookkeeping for a server that exists on one machine only.
- `.prodyssey/active`, a symlink that holds an absolute path. Committing it
  breaks every other clone and churns the diff on each view switch.
- Each bundle's `.migration-backup/`, which holds pre-migration `story.json`
  snapshots. They are disposable once a migration proves sound.
- `exports/branch-*/diff.json`, submit mode's pre-PR diff cache. It is exactly
  reproducible from `git diff <merge-base>..<head>`, and it is
  self-referential — committing it into the branch it diffs rewrites it on
  every commit, and each version would then contain the last one. The authored
  `intent.json` and `assessment.json` beside it are committed.

The self-bundle and the foreign-repo cache used to live under two separate
top-level directories. One `.prodyssey/` root now holds both, and the
subdirectory tells them apart. `.prodyssey/self/` is this repo's own
generated bundle. It is tracked so that engineers can review each other's
PRs as an odyssey instead of as a raw diff. A target repo that adopts the
plugin is meant to do the same.

The other two subdirectories are committed *test fixtures*:
`.prodyssey/cobuilder-harness-a103a550/` and
`.prodyssey/digital-curator-80f83abb/`. Both are bundles generated against
other local repos through `--repo`, and both are demo and dogfooding data,
not this repo's own PR history. Do not delete them as stale cache. They
exist deliberately, they are named by `<repo-slug>`, and they are otherwise
indistinguishable from a real foreign-repo cache. (`self` is reserved for
the self-bundle and is never a slug.) A hub that adopts the plugin may or
may not commit its own foreign-repo slug directories. The skill takes no
position on that. `skills/odyssey/SKILL.md`'s
Hub resolution section suggests a `.gitignore` line for the four
bookkeeping entries only, and is explicit that `.prodyssey/` as a whole must
never be suggested for ignoring.

## Bundle versioning and migration

A bundle drifts from what the plugin currently produces in three distinct
ways, and each way needs its own fix, not one migration framework:

1. **Files derived from the plugin.** `viewer/index.html` is the only case
   today. It is a build artifact with nothing authored to preserve, so
   `scripts/migrate_bundle.py` refreshes it **unconditionally**, on every
   run, and never gates it on a version check. This is the important rule.
   A version gate on the viewer refresh is the exact bug that motivated this
   mechanism. A bundle's viewer went stale and silently dropped diagram
   support, because nothing forced a refresh after the viewer changed
   without a version bump.
2. **Directory layout** — which files and directories exist. Tracked by
   `bundle_format`, an integer in `bundle.json`, and stepped forward by an
   ordered `LAYOUT_MIGRATIONS` list in `migrate_bundle.py`.
3. **Data shape** — the structure of `story.json`. Tracked by
   `schema_version`. `story.json`'s `meta.schema_version` is the source of
   truth, and `bundle.json` only mirrors it — `migrate_bundle.py` reads the
   data, never the mirror. A mirror that runs ahead of the data would
   otherwise deadlock the bundle. The ladder would skip every step as
   "already current", `verify_bundle.py` would keep failing
   `bundle.schema`, and no command could repair it. An ordered
   `SCHEMA_MIGRATIONS` list steps the shape forward.

`migrate_bundle.py` runs all three phases against `--bundle-dir`, in this
order: the unconditional viewer refresh, then the layout ladder, then the
data ladder. `skills/odyssey/SKILL.md` calls it at the start of all five
modes — Baseline, Generate, Submit, View, and Publish. A stale bundle therefore
self-heals before any other step reads it.

A data migration must never regenerate content. `story.json` holds
authored, irreplaceable text next to derived fields that a script can
recompute. A migration is safe to run unattended only if it cannot touch
the authored half by accident. Each migration in `SCHEMA_MIGRATIONS`
declares a `touches` set of the dotted field paths it changes.
`migrate_bundle.py` runs the whole ladder in memory, over a deepcopy, and
compares every authored field before and after each step. Any authored
field outside `touches` that changed stops the run. Nothing reaches disk in
that case, so there is no restore step — the failure mode is "no write",
not "write then undo". A successful run copies `story.json` to
`<bundle-dir>/.migration-backup/` before it writes the new one. This is the
guard that makes an in-place migration trustworthy with paid Gemini art and
TTS content in the same file.

**What the data ladder does not cover.** `SCHEMA_MIGRATIONS` steps are
`story.json` transforms — the step signature takes and returns the story
dict. `adrs.json` has no ladder and no guard yet, and a shape change there
needs the interface widened first. `manifest.js` carries a `schema_version`
of its own, and migration deliberately leaves it alone. Nothing reads it —
the viewer never reads `schema_version` at all — and `rewrite_manifest()`
rebuilds that file wholesale on the next generate. If anything ever starts
to gate on that value, it has to join the ladder.

**Adding a migration.** Bump `SCHEMA_VERSION` or `CURRENT_BUNDLE_FORMAT` in
`scripts/_bundle_meta.py`. That module is the single source for both
ladders, and for the five scripts that used to hardcode the literal. Then
append one entry to the matching ladder. Use `LAYOUT_MIGRATIONS` for a new
file or directory. Use `SCHEMA_MIGRATIONS` for a `story.json` shape change,
and give it a `touches` set. Never call
`extract_story.py` from inside a migration to "rebuild" a bundle — that
re-derives content from git and discards whatever a maintainer authored by
hand.

## Conventions worth preserving

- Never touch anything in `<target>` outside `<target>/.prodyssey/self/`,
  and a read-only check of `<target>/.env`. `<hub>/.prodyssey/` is also a
  sanctioned write location, for centrally-stored foreign-repo bundles and
  for view-server bookkeeping.
- `extract_story.py` never overwrites an authored narrative field for a PR
  already in `story.json`. A new PR gets a minimal stub. A second run is
  safe.
- `--repo <path>` works on the skill and on all five commands. It targets
  any local checkout, not only the session's own working directory. The Hub
  resolution storage rule decides where the bundle lands:
  `<target>/.prodyssey/self/` for self-analysis, or
  `<hub>/.prodyssey/<repo-slug>/` for a foreign repo. `--store
  local|central` overrides it.
- Everything judgment-shaped lives in `references/*.md` prose, loaded on
  demand, and never hardcoded in a script or in the skill body. That covers
  narrative voice, register, what counts as a decision worth an ADR, and
  what a diagram should show.
- `build_diagrams.py` only compiles and validates the `.mmd` files that a
  subagent already wrote. It never authors diagram content itself.
  `extract_story.py` and the audio and prompt scripts follow the same rule
  for narrative and art.

## Writing standard

Technical prose in this repo defaults to ASD-STE100 Issue 9 Simplified
Technical English (STE): `README.md`, this file, `skills/odyssey/references/*.md`,
and commit and PR bodies. Invoke `Skill("ste-writing")` for the rules. Check a
draft with `python3 .claude/skills/ste-writing/ste-lint.py <file>` — the
score counts violations per 100 words, and a lower score reads cleaner.

**Carve-out**: the authored PR narrative inside `story.json` does not follow
this default. Its register comes from `--style kleppmann|ste` (default
`kleppmann`) — see `skills/odyssey/references/story-mode.md` §3 for both
registers.

The `ste-writing` skill lives under `.claude/skills/` on purpose, and it
does not ship with the plugin. An install of `prodyssey@prodyssey` gets
exactly the two skills under `skills/` in this repo, `odyssey` and
`mermaid`, and never a third. That matches the minimal install surface
above. `ste-writing` stays a repo-local dev tool instead. The linter checks
rules only. It does not certify ASD-STE100 dictionary compliance.

## Recent history

Plugin scaffold → viewer port → skill/references/commands → generation +
verification scripts → `--repo` external-checkout targeting → Hub
resolution / central storage (`--store`, `.prodyssey/`, `view` command) →
unification of the two former bundle-storage roots, with the self-bundle
moved to `.prodyssey/self/` → authored Mermaid diagrams as an `--art`
alternative to Gemini scene art, adding the `mermaid` skill and
`build_diagrams.py` (see `git log` for the WS-A/B/C/D workstream commits) →
`submit` mode, which reverses part of the review-mode exclusion recorded in
`README.md`'s extraction manifest and adds schema 1.2, the
`interview-guide`/`review-mode` references, `render_review.py`, and the
viewer's assessment sheet.
No test suite, no CI config, no package manager — this is prose + Python
scripts + one HTML file.
