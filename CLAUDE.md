# CLAUDE.md

Guidance for Claude Code instances working in this repo.

## What this repo is

**prodyssey** is a Claude Code plugin (`.claude-plugin/`), not an app with a
build/test/deploy cycle. It has one job: turn merged PRs of *any* locally
checked-out git repo — the session's own repo, or any other checkout reached
via `--repo` — into a four-level narrated "codebase odyssey" — scene art,
voice narration, retro-extracted ADRs — viewable in a portable HTML viewer.

Where the bundle lands depends on the target: analyzing your own repo
(no `--repo`, or `--repo` resolving to the session's own checkout) writes to
`<target>/.prodyssey/self/`; analyzing a foreign repo writes instead to
`<hub>/.prodyssey/<repo-slug>/`, where `<hub>` is the session's own repo —
never the foreign one. `--store local|central` overrides the automatic
choice. See `skills/odyssey/SKILL.md`'s Hub resolution section for the exact
rule and slug derivation.

Install surface: `/plugin marketplace add bjornslib/prodyssey` then
`/plugin install prodyssey@prodyssey`. No agents, no hooks, no MCP servers —
deliberate, so the plugin never touches another session's permission surface.
The plugin ships two skills, `odyssey` (the orchestration skill described in
this file) and `mermaid` (authoring rules for the Mermaid diagrams described
below) — the diagram-authoring subagent that `odyssey` spawns invokes
`mermaid` for itself; the orchestrating Claude never invokes it directly.

See `README.md` for the user-facing install/usage doc and the extraction
manifest (what was ported from `architecture-review-design-maintenance` and
what was deliberately left behind). Don't duplicate that content here —
this file is for orientation and things a future coding session needs to
know that aren't obvious from reading the files.

## Layout

```
.claude-plugin/       plugin.json (manifest) + marketplace.json
commands/              thin dispatchers: baseline.md, generate.md, view.md,
                       publish.md, view.md → Skill("odyssey", args=...)
skills/
  odyssey/
    SKILL.md          orchestration: prereq gate → baseline → per-PR sweep →
                       view → publish → verify
    references/       loaded on demand (story-mode, decision-records-lite,
                       baseline-derivation, diagram-mode, adr-template, stacks/*)
  mermaid/            authoring rules for the Mermaid diagrams below; not
                       invoked by the orchestrating Claude directly — the
                       per-PR diagram-authoring subagent invokes it as
                       Skill("prodyssey:mermaid")
scripts/               9 PEP-723 uv scripts, called by the skill, never edited by it:
                       extract_story.py, generate_prompts.py, generate_audio.py,
                       extract_diffs.py, build_diagrams.py, verify_bundle.py,
                       export_artifact.py, export_index.py, record_publish.py
viewer/index.html      the bundle viewer (~2000 lines, single file, see below)
```

(`scripts/` is top-level, a sibling of `skills/`, not nested under
`skills/odyssey/` — `SKILL.md` calls it via `${CLAUDE_PLUGIN_ROOT}/scripts/...`.)

`skills/` and `commands/` are auto-discovered — the manifest doesn't
declare them.

## How generation actually runs

`SKILL.md` is the source of truth for the procedure; skim it before changing
orchestration behavior. In short: a hard prereq gate (git repo, `uv` on PATH,
`GEMINI_API_KEY`) runs before anything generative; `baseline` mode derives
`<bundle-dir>/inventory.yaml` + world districts; `generate` mode is per-PR and
resumable — `verify_bundle.py` decides which stages are already `"ok"` so a
killed sweep can be re-invoked without regenerating completed narrative,
art, or audio (`--force` overrides).

Narrative authoring and ADR extraction are **Claude judgment work** done
directly against `data/story.json` / `data/adrs.json` — never delegated to a
script. Scripts only move data: diffs, image prompts, audio, diagram
compilation, verification. Diagram authoring is also Claude judgment work,
but the orchestrating Claude never writes the `.mmd` files itself — it
spawns a per-PR subagent to do that (see Generate mode in
`skills/odyssey/SKILL.md`), then runs `scripts/build_diagrams.py` to compile
the subagent's `.mmd` files into `data/diagrams.js` and validate them.

Scripts are PEP 723 (`uv run script.py` resolves `google-genai`, `pillow`,
`python-dotenv` inline — no venv, no `requirements.txt`).

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
3. **Three external CDN requests** — Google Fonts (JetBrains Mono),
   `cdn.jsdelivr.net/npm/motion` for the UI's micro-animations, and a
   version-pinned Mermaid 11 script that renders `<pre class="mermaid">`
   blocks for levels 1 through 3. Each falls back gracefully if the CDN is
   unreachable: Mermaid falls back to showing the plain diagram source,
   Motion falls back to a no-op, and the fonts fall back to the existing
   `monospace`/`sans-serif` stack.

Intended viewing is `python3 -m http.server` rooted at the bundle root (the
parent of `viewer/` — e.g. `.prodyssey/self/`), not inside `viewer/` itself:
`viewer/index.html` requests sibling files like `../data/story.js`, so
serving from inside `viewer/` 404s every data file. The (future) production
app's *Import bundle* flow preserves the same relative file layout the
viewer expects.

**This means the viewer cannot be published as a Claude Artifact as-is.**
Artifacts are a single self-contained file with no sibling files and a CSP
that blocks all external requests (fonts, scripts, fetch/XHR). Verified
2026-07-22 by building a throwaway artifact-safe export (inlined
`window.STORY`/`ODYSSEY`/`DIFFS`/`ADRS` as literal JSON, asset/audio paths
rewritten to look up a `window.ODYSSEY_ASSETS` / `window.ODYSSEY_AUDIO`
data-URI map instead of relative paths, both CDN tags dropped) and
publishing it — **it rendered correctly**, PR nav/levels/hero
image/audio dialog all worked. Two things fell out of that experiment worth
knowing if this gets revisited:

- The Motion CDN script already has a graceful no-op fallback
  (`if (!el || !window.Motion) return {finished: Promise.resolve()}` in
  `anim()`) — dropping it costs micro-animations, not correctness. Google
  Fonts failing just falls back to the existing `monospace`/`sans-serif`
  stack in the font declarations.
- The 16 MiB artifact size cap is the real constraint for a multi-PR bundle,
  and audio is what blows it — uncompressed WAV narration inflates ~33%
  again as base64. An artifact-export mode would need to either drop audio,
  transcode to a compressed format, or cap it to one PR/level at a time.

That experiment is now a real, shipped mode: `/prodyssey:publish` (Publish
mode in `SKILL.md`). `scripts/export_artifact.py` does exactly the transform
above per PR (plus a compression-tier retry loop if the result would exceed
the budget, dropping audio as a last resort); `scripts/export_index.py`
renders a small standalone landing page (no images/audio, so no budget
concerns) linking to every PR artifact published so far for the bundle;
`scripts/record_publish.py` writes the Artifact tool's returned URL back into
`<bundle-dir>/exports/publish-manifest.json` once Claude has it — the only
piece of the pipeline that has to run after the actual publish call, since no
script can know the URL in advance. `publish-manifest.json` is also the
staleness record: a content hash plus (when available) the PR's commit SHA,
so re-running `/prodyssey:publish` on an unchanged PR reports "already up to
date" instead of re-publishing.

`--format artifact` is the only implemented target; `--format notion` is a
recognized, reserved flag value with no implementation behind it yet.

Diagrams reuse this pipeline rather than replicating it: `export_artifact.py`
inlines `window.DIAGRAMS` as literal JSON, the same way it inlines `STORY`/
`ODYSSEY`/`DIFFS`/`ADRS`, and strips the Mermaid CDN tag rather than
inlining a runtime — the Claude Artifact platform renders
`<pre class="mermaid">` blocks natively, so no bundled script is needed. An
`--inline-mermaid` flag is the escape hatch for if native rendering turns
out not to handle blocks injected after page load: it inlines a vendored
`mermaid.min.js` instead of relying on native support. A PR published with
`--art diagram` carries no PNGs at all, which relieves the 16 MiB budget
pressure described above — diagrams are plain text, not base64 image data.

A bundle written before the diagram change once needed its viewer copy
refreshed by hand. `scripts/migrate_bundle.py` now handles this: every mode
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
  .migration-backup/  # pre-migration story.json snapshots, written by migrate_bundle.py
```

`data/diagrams/pr{N}-level{L}.mmd` files are the source of truth for the
Mermaid diagrams — level 1 (`C4Container`), level 2 (`sequenceDiagram`), and
level 3 (`classDiagram`); level 4 has none. `scripts/build_diagrams.py`
compiles them into `data/diagrams.js` (`window.DIAGRAMS`), the same
sibling-script-tag pattern `story.js`/`manifest.js`/`adrs.js` already use.
Whether a given PR has diagrams, scene art, or both depends on the `--art`
flag it was generated with (see Generate mode in `skills/odyssey/SKILL.md`).

`exports/` only appears once `/prodyssey:publish` has run at least once; it's
as committable as the rest of the bundle — see Publish mode notes below.

`story.json`'s `meta.schema_version` is currently `"1.1"`, and it is the
source of truth for a bundle's data shape — `bundle.json` only mirrors it.
`scripts/_bundle_meta.py` holds the constant, and `verify_bundle.py` gates on
it (`SCHEMA_VERSION_KNOWN`, which also accepts `"1.0"` so that migration can
read an older bundle). Everything under
`.prodyssey/` is committed in *this* repo (not gitignored — only four
bookkeeping entries are: `.prodyssey/.view-server.pid`,
`.prodyssey/.view-server.log`, `.prodyssey/active` (a symlink holding an
absolute path that would break in clones and churn the diff on every view
switch), and each bundle's `.migration-backup/` (pre-migration `story.json`
snapshots, disposable once a migration proves sound). The self-bundle and
the foreign-repo cache used to live under two
separate top-level directories; they're now unified under one `.prodyssey/`
root, distinguished by subdirectory: `.prodyssey/self/` is
this repo's own generated bundle, tracked so engineers can review each
other's PRs as an odyssey instead of only a raw diff, same as it's meant to
be committed in target repos that adopt the plugin. The other two
subdirectories — `.prodyssey/cobuilder-harness-a103a550/` and
`.prodyssey/digital-curator-80f83abb/` — are committed *test fixtures*:
bundles generated against other local repos via `--repo`, kept as
demo/dogfooding data rather than as this repo's own PR history. Do not
delete them as stale cache — they exist deliberately, are named by
`<repo-slug>` (never `self`, which is reserved for the self-bundle), and are
otherwise indistinguishable from real foreign-repo caches. Whether a hub
adopting the plugin also commits its foreign-repo slug directories is that
team's call — the skill takes no position on it. `skills/odyssey/SKILL.md`'s
Hub resolution section suggests a `.gitignore` line for the four
bookkeeping entries only, and is explicit that `.prodyssey/` as a whole must
never be suggested for ignoring.

## Bundle versioning and migration

A bundle drifts from what the plugin currently produces in three distinct
ways, and each way needs its own fix, not one migration framework:

1. **Files derived from the plugin.** `viewer/index.html` is the only case
   today. It is a build artifact with nothing authored to preserve, so
   `scripts/migrate_bundle.py` refreshes it **unconditionally**, on every
   run, never gated on a version check. This is the important rule: gating
   the viewer refresh on a version number is exactly the bug that motivated
   this whole mechanism — a bundle's viewer went stale and silently dropped
   diagram support because nothing forced a refresh once the viewer changed
   without a version bump.
2. **Directory layout** — which files and directories exist. Tracked by
   `bundle_format`, an integer in `bundle.json`, and stepped forward by an
   ordered `LAYOUT_MIGRATIONS` list in `migrate_bundle.py`.
3. **Data shape** — the structure of `story.json`. Tracked by
   `schema_version`. `story.json`'s `meta.schema_version` is the source of
   truth, and `bundle.json` only mirrors it — `migrate_bundle.py` reads the
   data, never the mirror. A mirror that runs ahead of the data would
   otherwise deadlock the bundle: the ladder skips every step as "already
   current" while `verify_bundle.py` keeps failing `bundle.schema`, and no
   command can repair it. An ordered `SCHEMA_MIGRATIONS` list steps the
   shape forward.

`migrate_bundle.py` runs all three phases, in this order, against
`--bundle-dir`: the unconditional viewer refresh, then the layout ladder,
then the data ladder. `skills/odyssey/SKILL.md` calls it at the start of
every mode — Baseline, Generate, View, and Publish — so a stale bundle
self-heals before any other step reads it.

A data migration must never regenerate content. `story.json` holds
authored, irreplaceable text next to derived fields a script can
recompute, and a migration is only safe to run unattended if it cannot
touch the authored half by accident. Each migration in `SCHEMA_MIGRATIONS`
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
of its own that migration deliberately leaves alone: nothing reads it (the
viewer never reads `schema_version` at all), and `rewrite_manifest()`
rebuilds that file wholesale on the next generate. If anything ever starts
gating on that value, it has to join the ladder.

**Adding a migration.** Bump `SCHEMA_VERSION` (or `CURRENT_BUNDLE_FORMAT`)
in `scripts/_bundle_meta.py`, the single source both ladders and the five
scripts that used to hardcode the literal now import from. Then append one
entry to the matching ladder — `LAYOUT_MIGRATIONS` for a new file or
directory, `SCHEMA_MIGRATIONS` for a `story.json` shape change, with its
`touches` set if it is a data migration. Never call
`extract_story.py` from inside a migration to "rebuild" a bundle — that
re-derives content from git and discards whatever a maintainer authored by
hand.

## Conventions worth preserving

- Never touch anything in `<target>` outside `<target>/.prodyssey/self/` and
  a read-only check of `<target>/.env`; `<hub>/.prodyssey/` is also a
  sanctioned write location, for centrally-stored foreign-repo bundles and
  view-server bookkeeping.
- `extract_story.py` never overwrites authored narrative fields for PRs
  already in `story.json` — new PRs get a minimal stub; re-running is safe.
- `--repo <path>` (skill + all three commands) targets any local checkout,
  not just the session's own working directory; where the bundle lands is
  the Hub resolution storage rule — `<target>/.prodyssey/self/` for
  self-analysis, `<hub>/.prodyssey/<repo-slug>/` for a foreign repo,
  overridable with `--store local|central`.
- Everything judgment-shaped (narrative voice, register, what counts as a
  decision worth an ADR, what a diagram should show) lives in
  `references/*.md` prose, loaded on demand — not hardcoded in scripts or
  the skill body.
- `build_diagrams.py` only compiles and validates `.mmd` files a subagent
  already wrote — it never authors diagram content itself, the same rule
  `extract_story.py` and the audio/prompt scripts already follow for
  narrative and art.

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

The `ste-writing` skill lives under `.claude/skills/` on purpose and does not
ship with the plugin — an install of `prodyssey@prodyssey` gets exactly the
two skills under `skills/` in this repo, `odyssey` and `mermaid`, never a
third, matching the minimal install surface above. `ste-writing` stays a
repo-local dev tool instead. The linter checks rules only. It does not
certify ASD-STE100 dictionary compliance.

## Recent history

Plugin scaffold → viewer port → skill/references/commands → generation +
verification scripts → `--repo` external-checkout targeting → Hub
resolution / central storage (`--store`, `.prodyssey/`, `view` command) →
unification of the two former bundle-storage roots, with the self-bundle
moved to `.prodyssey/self/` → authored Mermaid diagrams as an `--art`
alternative to Gemini scene art, adding the `mermaid` skill and
`build_diagrams.py` (see `git log` for the WS-A/B/C/D workstream commits).
No test suite, no CI config, no package manager — this is prose + Python
scripts + one HTML file.
