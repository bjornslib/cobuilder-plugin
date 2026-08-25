# CLAUDE.md

Guidance for Claude Code instances working in this repo.

## What this repo is

This repository is a Claude Code marketplace (`.claude-plugin/marketplace.json`)
that ships five sibling plugins under `plugins/`, not an app with a
build/test/deploy cycle. `cobuilder-architect` covers design, review,
maintenance, decisions, describe, and debug. `cobuilder-pr` covers generate
and review: the pull-request narration and assessment lifecycle.
`cobuilder-artifact` serves and publishes the bundle. `cobuilder-implement`
builds a design's epics. `cobuilder-full-lifecycle` is an umbrella plugin
that depends on the other four. Together they narrate the merged PRs of a
locally checked-out git repo. The result is a four-level story with scene
art, voice narration, and retro-extracted ADRs, in a portable HTML viewer.
See ADR-0016 for why the plugin split into five, and ADR-0017 for how the
five share code through `shared/`. ADR-0018 decided one lifecycle surface
in the viewer with a derived record index, `data/index.json`, that
resolves joins between designs, ADRs, contexts, builds, and pull requests.
`shared/build_index.py` builds it, and it is implemented and in use. ADR-0019
decided an anchored-comments ledger for the viewer, computed from the live
DOM at annotation time and appended to a durable, append-only store
(`shared/ledger.py`). ADR-0020 narrows the build-free viewer rule from
ADR-0001, rather than reversing it. It decides that authoring moves to
parts under `viewer/src/`, compiled into the committed `viewer/index.html`
by a build step that runs only when an engineer changes the viewer, never
at `/plugin install` and never in the browser. ADR-0020 is **decided and
not executed**: no `viewer/src/` directory exists yet, and the viewer is
still the one committed file described below. Treat that ADR as a plan,
not as the current shape of the file.

The five Odyssey modes still take `--repo`. The six architecture modes are
self-only. They analyze the session's own repo and refuse a foreign target.

Generate mode, in `cobuilder-pr`, is the one Odyssey path that does not
narrate history. It runs before the history exists. It interviews the
author of a change, assesses that change against the bundle, and opens the
pull request.

It exists because the rest of the plugin family spends real effort
reconstructing intent that nobody wrote down. Capture the intent at
generate time, and review mode stops guessing. This branch extends the
family to capture intent before code exists. See Generate mode below, and
`plugins/cobuilder-pr/skills/odyssey/references/{interview-guide,review-mode}.md`.

Where the Odyssey bundle lands depends on the target. Analyzing your own
repo writes to `<target>/.cobuilder-architect/self/`. That is the case with
no `--repo`, or with `--repo` that resolves to the session's own checkout.
Analyzing a foreign repo writes instead to
`<hub>/.cobuilder-architect/<repo-slug>/`, where `<hub>` is the session's
own repo, never the foreign one. `--store local|central` overrides the
automatic choice. See `plugins/cobuilder-pr/skills/odyssey/SKILL.md`'s Hub
resolution section for the exact rule and slug derivation.

Install surface: `/plugin marketplace add bjornslib/cobuilder-architect` then
`/plugin install <plugin-name>@cobuilder-architect` for any one of the five
plugin names, or `/plugin install cobuilder-full-lifecycle@cobuilder-architect`
for all five at once. No agents, no hooks, no MCP servers, in any of the
five. That is deliberate, so no plugin ever touches another session's
permission surface.

That rule governs the five plugins only. `.claude/hooks/deny-git-stash.py`
and its entry in `.claude/settings.json` are local development tooling for
this repository's own Claude Code sessions. The hook ships to nobody and
installs nowhere else, so it does not violate the rule above. It denies the
command for subagents only, and never for the main agent.

Each plugin ships its own skills under its own `plugins/<name>/skills/`.
`cobuilder-pr` ships `odyssey`, which orchestrates the five history modes
this file describes. `cobuilder-architect` ships `architecture`, which runs
the six self-only modes. `mermaid` and `ste-writing` are shared skills,
vendored by symlink into every plugin that needs them (ADR-0017). `mermaid`
holds the authoring rules for the Mermaid diagrams below. The
diagram-authoring subagent that `odyssey` spawns invokes `mermaid` for
itself. The orchestrating Claude never invokes it directly.

See `README.md` for the user-facing install and usage doc, and for the
extraction manifest. That manifest records what Odyssey took from
`architecture-review-design-maintenance`. The architecture skill is now in
`cobuilder-architect`. Do not duplicate that content here. This file is for
orientation, and for the things a future coding session cannot get from
reading the files.

## Vocabulary

The same short words name different things in this plugin's two skill
families. Use the exact term a section below assigns to a concept, not a
synonym, and check this table before reusing a word from one family in the
other's context.

| Term | Meaning | Not to confuse with |
|---|---|---|
| **Design** (capital, mode) | `/cobuilder-architect:design`, the pre-code interview-and-challenge mode that produces an ADR plus `intent.json` | a *design* (lowercase), the artifact directory it produces (see below) |
| **a design** | One `docs/architecture/designs/<name>/` directory: `goal.json`, `intent.json`, `narrative.json`, `assessment.json`, `pr-draft.md` | an ADR, which a design also produces but which outlives it under `docs/architecture/adr/` |
| **backlog design** | A design at `stage: "backlog"`: a `goal.json` with planned epics only, and no `intent.json`, `narrative.json`, `assessment.json`, or diagrams. This is a legitimate, deliberately sparse state, because Design mode's stages 2 through 7 have not run yet. `maintainable-viewer/` and `inflight-record-store/` are both backlog designs today | an incomplete or abandoned design — a sparse directory here is the expected shape, not a sign that generation stopped partway |
| **Epic** | One unit inside a design's `goal.json.epics[]`. Maps to zero or one pull request through `epics[].branch`. Owned and decomposed by `cobuilder-implement`, not by design mode | an ADR, a design, or a PR — an epic is the join key between a design and a PR, not any of the three itself |
| **District** | A `world.districts` entry in `story.json` / `inventory.yaml`, derived by Odyssey's *describe-lite* procedure (`baseline-derivation.md`) for any repo, including a foreign `--repo` target. Inferred, not verified against import edges | a bounded context (below) — a district is the lightweight version of the same underlying concept, usable when nobody maintains the target repo |
| **Bounded context** | A `docs/architecture/contexts/<context-id>/` bundle: `canvas.md` + `boundary.yaml`, produced by the self-only Describe mode. Every claim is grep-verified against real import edges before it is written | a district — a bounded context is the heavyweight, verified version; it never covers a foreign repo |
| **Review** (Architecture skill) | `/cobuilder-architect:review`, the self-only security/architecture/quality audit that produces the paired Technical/Founder HTML reports under `docs/architecture/review/` | Odyssey's Review mode (below), or the assessment reference described in the next row, or the general-purpose `/code-review` Claude Code skill, which is unrelated to this plugin |
| **Review mode** (Odyssey) | The per-PR narration sweep, `/cobuilder-architect:review` (dispatches `Skill("odyssey", args="review ...")`), that narrates already-merged history into the bundle | the Architecture skill's Review mode (above) — different corpus, different output shape, no HTML report. Also not the PR-assessment step described in the next row |
| **review-mode.md** (Odyssey reference) | The PR-assessment step of `/cobuilder-architect:generate`, governed by `plugins/cobuilder-pr/skills/odyssey/references/review-mode.md`: three questions with evidence, verdicts, drift detection | Odyssey's Review mode (above), which is a different mode with a different job, despite the shared word |
| **Bundle** | The whole derived-output directory tree for one target repo: `.cobuilder-architect/self/` or `.cobuilder-architect/<repo-slug>/`, holding `data/`, `assets/`, `viewer/`, `exports/` | `docs/` (authored source, never derived) and `story.json` (one file inside the bundle, not the bundle itself) |
| **Self** vs **foreign** (repo) | *Self* is the session's own checkout — the only target the six Architecture modes accept. *Foreign* is a `--repo`-targeted checkout, only reachable through Odyssey | `<hub>`, which is always the *session's* repo even when analyzing a foreign target — the foreign repo is never the hub |
| **Gate 4a / 4b / 4c** | The three sub-steps of Gate 4 in `cobuilder-implement`, defined in `plugins/cobuilder-implement/skills/implement/SKILL.md`. 4a is the slice plan (`04-slices.md`). 4b is a technical solution design, required only for an epic that carries more than one slice, and marked `n/a` instead of pending for a single-slice epic. 4c is the blind rubrics. `verify_gate.py` checks all three | Gate 4 as a whole — `00-status.md` used to track Gate 4 as one line and now tracks 4a, 4b, and 4c as three, and the whole gate cannot read APPROVED while any sub-step still reads pending |
| **Assessment stage** | The `stage` field on `assessment.json`: `"design"` for an assessment written before the code exists, carrying `prediction` findings, or `"retrospective"` for one written after the design shipped, carrying `observation` or `drift` findings. `plugin-split` and `cobuilder-implement` are `"design"`. `design-mode` is `"retrospective"` | a verdict (`proceed`/`concerns`/`rework`, a separate field) — and note that nothing enforces `stage` today: `ASSESSMENT_FIELDS` in `shared/build_index.py` projects only `verdict` and `findings`, and `shared/verify_bundle.py` never checks `stage` |
| **Drift** (finding kind) | An `assessment.json` finding of `kind: "drift"`: a report that a shipped record no longer matches the tree. The correct response is sometimes to leave the record alone, as a true account of what was believed at the time | a bug — a drift finding is not a defect to fix, and also not `review-mode.md`'s per-PR `intent.drift` array, which Generate mode's `--stage post` populates by comparing a PR's stated intent against its merged diff. Same word, two different records: one on a design's assessment, one on a PR's intent block |

If a future term collides with one of these across the two skill families, resolve the collision here before it ships — do not let two modes silently mean different things by the same word.

## Layout

```
.claude-plugin/marketplace.json   the one marketplace manifest, listing all five plugins
shared/                symlinked into every plugin's own root as plugins/<name>/shared/
                       (ADR-0017). Vendored, not itself a plugin:
                       _bundle_meta.py, _manifest.py, build_index.py,
                       ledger.py, migrate_bundle.py, slice_table.py,
                       validate_decision_state.py, verify_bundle.py,
                       skills/{mermaid,ste-writing}/
plugins/
  cobuilder-architect/   design, review, maintenance, decisions, describe, debug. Self-only
    .claude-plugin/plugin.json
    commands/          design.md, review.md, maintenance.md, decisions.md,
                       describe.md, debug.md → Skill("architecture", args=...)
    skills/architecture/
      SKILL.md
      references/      includes design-mode, loaded on demand by Design mode
    scripts/           compute_scores.py, html_to_pdf.py
    shared/            -> ../../shared (symlink)
  cobuilder-pr/          the five Odyssey history modes, and generate mode
    .claude-plugin/plugin.json
    commands/          baseline.md, generate.md, review.md → Skill("odyssey", args=...)
    skills/odyssey/
      SKILL.md         orchestration: prereq gate → baseline → per-PR sweep →
                       generate → hand off to cobuilder-artifact's view/publish → verify
      references/      loaded on demand (story-mode, decision-records-lite,
                       baseline-derivation, review-mode,
                       interview-guide, adr-template,
                       pr-description-template, stacks/*)
    scripts/           extract_story.py, extract_diffs.py, build_diagrams.py,
                       generate_prompts.py, generate_audio.py, render_review.py
    shared/            -> ../../shared (symlink)
  cobuilder-artifact/    serve the bundle locally, publish a level as an Artifact
    .claude-plugin/plugin.json
    commands/          view.md, publish.md → Skill("artifact", args=...)
    skills/artifact/
    scripts/           export_artifact.py, export_index.py, record_publish.py
    viewer/index.html  the bundle viewer (4747 lines, single file, see below)
    shared/            -> ../../shared (symlink)
  cobuilder-implement/   build a design's epics, one vertical slice at a time
    .claude-plugin/plugin.json
    skills/implement/
    scripts/           verify_gate.py
    shared/            -> ../../shared (symlink)
  cobuilder-full-lifecycle/   umbrella plugin, depends on the other four
    .claude-plugin/plugin.json
    skills/orientation/
    shared/            -> ../../shared (symlink)
scripts/build_builds_view.py   NOT part of any plugin. A local tool for this
                       repository's own build-status page. Leave it at the
                       repository root. Do not move it into a plugin.
```

A shared skill (`mermaid`, `ste-writing`) resolves at `${CLAUDE_PLUGIN_ROOT}/shared/skills/<name>/`
from inside any plugin, because the symlink dereferences into the plugin's own
cache at install time. A shared script resolves the same way, at
`${CLAUDE_PLUGIN_ROOT}/shared/<script>.py`. No plugin's script or skill file
ever names another plugin's `plugins/<other-name>/...` path directly
(ADR-0016) — a cross-plugin need is either vendored into `shared/`, or
reached by naming the other plugin's mode and letting that plugin's own
skill resolve its own path.

Two roots hold output.

`docs/` holds authored, git-visible, self-only files:
`docs/architecture/adr/`, `docs/architecture/designs/`,
`docs/architecture/review/`, `docs/architecture/contexts/`,
`docs/pull-requests/`.

`.cobuilder-architect/` is the bundle: derived projections and binary
assets. Odyssey `--repo` still writes foreign bundles here under a slug.

Each plugin's `skills/` and `commands/` are auto-discovered — its
`plugin.json` does not declare them.

`shared/slice_table.py` is the one parser for the slice table in
`docs/plans/<slug>/04-slices.md`. It replaced three divergent regex sets in
`shared/build_index.py`, `plugins/cobuilder-implement/scripts/verify_gate.py`,
and `scripts/build_builds_view.py`. A future format change to that table
needs one edit, not three.

`plugins/cobuilder-implement/scripts/verify_gate.py` is that plugin's first
script. It checks Gate 4a, 4b, and 4c for a plan directory and exits
non-zero on any failure. It exits 1 today, because Gate 4b (an approved
technical solution design) is outstanding for five `plugin-split` epics.
That is the honest current state, not a broken script.

**A process step with no mechanical consumer gets skipped, however well it
is documented.** Gate 4b was the only Gate 4 sub-step nothing downstream
required, and it ran for zero of five multi-slice epics before this branch.
It is now enforced at three levels: sub-steps in
`docs/plans/cobuilder-family/00-status.md`, `verify_gate.py` above, and
`plugins/cobuilder-implement/skills/implement/workflows/slice-loop.js`,
which now stops the run instead of falling back silently when a design
document is missing. Apply the same lesson before adding a new documented
step anywhere else in this family: give it a mechanical consumer, or expect
it to be skipped.

## How generation actually runs

`SKILL.md` is the source of truth for the procedure. Skim it before you
change orchestration behavior. In short: a hard prereq gate runs before
anything generative, and it checks for a git repo, `uv` on PATH, and
`GEMINI_API_KEY`. `baseline` mode derives `<bundle-dir>/inventory.yaml` and
the world districts. `review` mode is per-PR and resumable.
`verify_bundle.py` decides which stages are already `"ok"`. A killed sweep
can therefore run again without regenerating completed narrative, art, or
audio. `--force` overrides this.

Narrative authoring and ADR extraction are **Claude judgment work**, never
delegated to a script. Claude writes the narrative into `data/story.json`. ADR
extraction writes `docs/architecture/adr/*.md` and then runs
`shared/build_index.py`, which compiles the markdown into the self-bundle
projection. Never write `data/adrs.json` by hand.

Scripts only move data: diffs, image prompts, audio, diagram compilation,
ADR compilation, and verification. Diagram authoring is also Claude judgment
work, but the orchestrating Claude never writes the `.mmd` files itself. It
spawns a per-PR subagent to do that. See Review mode in
`plugins/cobuilder-pr/skills/odyssey/SKILL.md`. It then runs
`plugins/cobuilder-pr/scripts/build_diagrams.py`, which compiles the
subagent's `.mmd` files into `data/diagrams.js` and validates them.

Scripts are PEP 723 (`uv run script.py` resolves `google-genai`, `pillow`,
`python-dotenv` inline — no venv, no `requirements.txt`).

## Generate mode — what is load-bearing about it

`/cobuilder-architect:generate` interviews a change's author, assesses the change, and
opens the pull request. Four things about it are easy to break by accident.

**The interview is the product.** `plugins/cobuilder-pr/skills/odyssey/references/interview-guide.md` §2 says
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
content stages in `docs/pull-requests/branch-<slug>/`. Do not "fix" this by
inventing a branch key.

**Pushing and opening a PR are the only actions outside `.cobuilder-architect/`,** and
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
`plugins/cobuilder-pr/scripts/render_review.py` lays the result out as markdown and judges none of
it. `verify_bundle.py` gained `intent` and `assessment` keys that are
**optional by default** — a bundle generated before this mode existed must
keep passing — and `--require-review` promotes them.

`shared/build_index.py` also projects a design's `pr-draft.md` into that
design's record. Before this branch it did not, so the viewer's
"Envisioned pull request" section could never populate.

**A known gap in the record index, left for `inflight-record-store` to
fix.** `collect_pull_requests()` in `shared/build_index.py` reads only
`data/story.json`, which holds narrated merged pull requests. An open pull
request is not an entity in the index at all. This repo's own pull request
11 is one such case: eight epics across the family point their `branch` at
it, and `refine_epic_status()` has nothing to refine against, so it leaves
a hardcoded `"open"` placeholder for every one of them instead of a real
state. `docs/architecture/designs/inflight-record-store/goal.json`'s first
epic is the planned fix. Do not read the placeholder as a bug to patch in
passing. It is a recorded, scoped gap.

## The viewer is not self-contained — this matters for anything artifact-related

`viewer/index.html` is a normal multi-file web page in disguise: one HTML
file, but it depends on three things that only exist *next to* it inside a
real `.cobuilder-architect/` bundle:

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
That root is the parent of `viewer/`, for example `.cobuilder-architect/self/`. Do not
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

That experiment is now a real, shipped mode: `/cobuilder-architect:publish`, which is
Publish mode in `SKILL.md`. Three scripts divide the work.
`plugins/cobuilder-artifact/scripts/export_artifact.py` does the transform above, per PR. It also
retries at lower compression tiers when the result exceeds the budget, and
drops audio as a last resort. `plugins/cobuilder-artifact/scripts/export_index.py` renders a small
standalone landing page. That page links to every PR artifact published so
far for the bundle. It carries no images or audio, so the budget does not
apply. `plugins/cobuilder-artifact/scripts/record_publish.py` writes the URL that the Artifact tool
returned back into `<bundle-dir>/exports/publish-manifest.json`. That last
script is the only part of the pipeline that must run after the publish
call, because no script can know the URL in advance.
`publish-manifest.json` is also the
staleness record. It holds a content hash, plus the PR's commit SHA when
that SHA is available. A second `/cobuilder-architect:publish` on an unchanged PR
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
refreshed by hand. `shared/migrate_bundle.py` now handles this. Every mode
runs it before it touches a bundle, so `export_artifact.py`'s verbatim guard
against the viewer copy should never fire in practice. See Bundle versioning
and migration below.

## Bundle output shape (what generation produces)

```
<bundle-dir>/       <target>/.cobuilder-architect/self/ for self-analysis, <hub>/.cobuilder-architect/<repo-slug>/ for a foreign repo
  bundle.json        bundle_format, schema_version, generator_version, migrated_at
  data/{story.json, story.js, adrs.json, adrs.js, manifest.js,
        diffs-pr{N}.js…, audio/pr{N}_{level}.wav,
        diagrams/pr{N}-level{1,2,3}.mmd, diagrams.js}
  assets/pr-{N}/level-{1..3}.png
  inventory.yaml
  viewer/index.html
  exports/{publish-manifest.json, pr-{N}.html…, index.html}   # written by /cobuilder-architect:publish
  exports/branch-{slug}/diff.json                             # generate-mode diff cache, gitignored
  .migration-backup/  # pre-migration story.json snapshots, written by migrate_bundle.py

<repo>/
  docs/architecture/adr/ADR-NNNN-<slug>.md                    # review writes these
  docs/architecture/designs/<name>/{goal,intent,narrative,assessment}.json, pr-draft.md
  docs/architecture/review/                                  # /review and /maintenance reports
  docs/architecture/contexts/
  docs/pull-requests/pr-<N>/{description,assessment}.md
  docs/pull-requests/branch-<slug>/{intent,assessment}.json, {description,assessment}.md
```

`data/diagrams/pr{N}-level{L}.mmd` files are the source of truth for the
Mermaid diagrams — level 1 (`C4Container`), level 2 (`sequenceDiagram`), and
level 3 (`classDiagram`); level 4 has none. `plugins/cobuilder-pr/scripts/build_diagrams.py`
compiles them into `data/diagrams.js` (`window.DIAGRAMS`), the same
sibling-script-tag pattern `story.js`/`manifest.js`/`adrs.js` already use.
Whether a given PR has diagrams, scene art, or both depends on the `--art`
flag it was generated with (see Review mode in `plugins/cobuilder-pr/skills/odyssey/SKILL.md`).

`exports/` appears only after `/cobuilder-architect:publish` runs at least once. It is
as committable as the rest of the bundle — see Publish mode notes below.

`story.json`'s `meta.schema_version` is currently `"1.2"`, and it is the
source of truth for a bundle's data shape. `bundle.json` only mirrors it.
`shared/_bundle_meta.py` holds the constant, and `shared/verify_bundle.py` gates
on it through `SCHEMA_VERSION_KNOWN`. That set also accepts `"1.0"` and `"1.1"`, so
migration can still read an older bundle.

This repo commits everything under `.cobuilder-architect/`. Only five bookkeeping
entries are gitignored:

- `.cobuilder-architect/.view-server.pid` and `.cobuilder-architect/.view-server.log`, which are
  process bookkeeping for a server that exists on one machine only.
- `.cobuilder-architect/active`, a symlink that holds an absolute path. Committing it
  breaks every other clone and churns the diff on each view switch.
- Each bundle's `.migration-backup/`, which holds pre-migration `story.json`
  snapshots. They are disposable once a migration proves sound.
- `exports/branch-*/diff.json`, generate mode's pre-PR diff cache. It is exactly
  reproducible from `git diff <merge-base>..<head>`, and it is
  self-referential — committing it into the branch it diffs rewrites it on
  every commit, and each version would then contain the last one. The authored
  `intent.json` and `assessment.json` live under `docs/pull-requests/` and are committed.

The self-bundle and the foreign-repo cache used to live under two separate
top-level directories. One `.cobuilder-architect/` root now holds both, and the
subdirectory tells them apart. `.cobuilder-architect/self/` is this repo's own
generated bundle. It is tracked so that engineers can review each other's
PRs as an odyssey instead of as a raw diff. A target repo that adopts the
plugin is meant to do the same.

The other two subdirectories are committed *test fixtures*:
`.cobuilder-architect/cobuilder-harness-a103a550/` and
`.cobuilder-architect/digital-curator-80f83abb/`. Both are bundles generated against
other local repos through `--repo`, and both are demo and dogfooding data,
not this repo's own PR history. Do not delete them as stale cache. They
exist deliberately, they are named by `<repo-slug>`, and they are otherwise
indistinguishable from a real foreign-repo cache. (`self` is reserved for
the self-bundle and is never a slug.) A hub that adopts the plugin may or
may not commit its own foreign-repo slug directories. The skill takes no
position on that. `plugins/cobuilder-pr/skills/odyssey/SKILL.md`'s
Hub resolution section suggests a `.gitignore` line for the four
bookkeeping entries only, and is explicit that `.cobuilder-architect/` as a whole must
never be suggested for ignoring.

## Bundle versioning and migration

A bundle drifts from what the plugin currently produces in three distinct
ways, and each way needs its own fix, not one migration framework:

1. **Files derived from the plugin.** `viewer/index.html` is the only case
   today. It is a build artifact with nothing authored to preserve, so
   `shared/migrate_bundle.py` refreshes it **unconditionally**, on every
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
data ladder. Every plugin that touches a bundle calls it at the start of its
own modes — `cobuilder-pr`'s Baseline, Review, and Generate, and
`cobuilder-artifact`'s View and Publish. A stale bundle therefore self-heals
before any other step reads it.

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
rebuilds that file wholesale on the next review sweep. If anything ever starts
to gate on that value, it has to join the ladder.

**Adding a migration.** Bump `SCHEMA_VERSION` or `CURRENT_BUNDLE_FORMAT` in
`shared/_bundle_meta.py`. That module is the single source for both
ladders, and for the five scripts that used to hardcode the literal. Then
append one entry to the matching ladder. Use `LAYOUT_MIGRATIONS` for a new
file or directory. Use `SCHEMA_MIGRATIONS` for a `story.json` shape change,
and give it a `touches` set. Never call
`extract_story.py` from inside a migration to "rebuild" a bundle — that
re-derives content from git and discards whatever a maintainer authored by
hand.

## Conventions worth preserving

- **Authored source lives in `docs/`.** Derived projections live in the
  bundle. `.cobuilder-architect/` is not a document store. `docs/` is a
  sanctioned write location for self-analysis. Architecture modes never
  take `--repo`. The five Odyssey commands still do.
- `extract_story.py` never overwrites an authored narrative field for a PR
  already in `story.json`. A new PR gets a minimal stub. A second run is
  safe.
- `--repo <path>` works on the five Odyssey commands, not on the architecture
  six. It targets any local checkout, not only the session's own working
  directory. The storage rule in Hub resolution decides where the bundle
  lands: `<target>/.cobuilder-architect/self/` for self-analysis, or
  `<hub>/.cobuilder-architect/<repo-slug>/` for a foreign repo. `--store
  local|central` overrides it.
- Everything judgment-shaped lives in `references/*.md` prose, loaded on
  demand, and never hardcoded in a script or in the skill body. That covers
  narrative voice, register, what counts as a decision worth an ADR, and
  what a diagram should show.
- `build_diagrams.py` only compiles and validates the `.mmd` files that a
  subagent already wrote. It never authors diagram content itself.
  `build_index.py` is the same rule for ADRs, designs, and every other
  record it indexes: full rebuild of the self-bundle projection, never a
  merge, never authoring. `extract_story.py` and the audio and prompt
  scripts follow the same rule for narrative and art.

## Writing standard

Prose and documentation in this repo follows plain-English rules distilled from ASD-STE100
Issue 9 Simplified Technical English (STE). It applies to every content
type produced here: `README.md`, this file, `plugins/cobuilder-pr/skills/odyssey/references/*.md`,
commit and PR bodies, code comments, error messages, ADRs, and the story
the plugin writes into `story.json`. `Skill("cobuilder-architect:ste-writing")`
holds the full rule set and its two modes (`strict` for procedures and
safety text, `flavored` for general prose). If that call gives `Unknown
skill`, read `${CLAUDE_PLUGIN_ROOT}/shared/skills/ste-writing/SKILL.md` directly
and obey that file instead. The condensed version below is what to hold in
mind without invoking it.

You must also use it in all of your responses interacting with the user.

**Words.** One name for one thing — do not call the same item by two
names. Pick the short common word: start, not begin or commence; use, not
utilize or leverage; help, not facilitate; show, not demonstrate; about,
not regarding. One meaning per word. Drop marketing adjectives — seamless,
robust, powerful, cutting-edge, effortless, world-class, next-generation,
revolutionary. Cap a noun cluster at three words; split a longer one with
"of" or a hyphen. Put an article (a, an, the) before every countable
singular noun.

**Verbs.** Active voice: "the script reads the file", not "the file is
read by the script". A verb for an action, not a noun for it: "verify the
bundle", not "perform verification of the bundle". Simple tenses: "the
migration found a stale field", not "the migration has found a stale
field".

**Sentences and structure.** One instruction per sentence, capped at
20-25 words. No contractions. No semicolons — write two sentences instead.
One topic per paragraph, six sentences or fewer. State a condition before
its command.

**Marketing and copy — reduced strictness, not exempt.** The `kleppmann`
narrative register, `story.json`'s default (`plugins/cobuilder-pr/skills/odyssey/references/story-mode.md`
§3), and README's own pitch language both need room for a voice that
controlled language strips out. They follow a lighter pass of the rules
above instead of the full set: active voice, plain verbs, no marketing
adjectives, one topic per paragraph. They are not held to the
sentence-length cap, the noun-cluster limit, or STE's restricted word
list. A passive sentence with a known actor, or a claim the diff does not
support, is still a defect there. The `--style ste` register
(`story-mode.md` §3) already opts a PR's narrative into the full,
unrelaxed rules, and this section changes nothing about that choice.

**Structured responses
- Group your responses logically, do not mix topics when responding to the user.
- Make use of bullet-points, numbered lists, and tables
- Use underlined and numbered headings for logical groups

Judge a draft by rereading it against the rules above. `ste-writing` also
ships `shared/skills/ste-writing/ste-lint.py`, a rules-only linter that scores
violations per 100 words, for a quick optional check. The linter checks
rules only. It does not certify ASD-STE100 dictionary compliance. The
install constraint is no agents, no hooks, and no MCP servers.

## Recent history

Plugin scaffold → viewer port → skill/references/commands → generation +
verification scripts → `--repo` external-checkout targeting → Hub
resolution / central storage (`--store`, `.cobuilder-architect/`, `view` command) →
unification of the two former bundle-storage roots, with the self-bundle
moved to `.cobuilder-architect/self/` → authored Mermaid diagrams as an `--art`
alternative to Gemini scene art, adding the `mermaid` skill and
`build_diagrams.py` (see `git log` for the WS-A/B/C/D workstream commits) →
`submit` mode, which reverses part of the review-mode exclusion recorded in
`README.md`'s extraction manifest and adds schema 1.2, the
`interview-guide`/`review-mode` references, `render_review.py`, and the
viewer's assessment sheet → merge of the architecture skill (corpus, books,
review / maintenance / decisions / describe / debug, `compute_scores.py`,
`html_to_pdf.py`) → rename from prodyssey to cobuilder-architect → ADR-store
unification (`docs/architecture/adr/` as source, `build_adrs.py` as the
self-bundle projection) → authored designs and PR docs moved into `docs/` →
design mode shipped and moved from the `odyssey` skill into the
`architecture` skill, leaving odyssey with five modes →
`commands/explore-design.md` deleted as a duplicate of `design.md` →
the two pull-request modes rotated names: the old `submit` (interview,
assess, open the PR) became `generate`, and the old `generate` (the
per-PR narration sweep) became `review` → the single plugin split into five
sibling plugins under `plugins/` (`cobuilder-architect`, `cobuilder-pr`,
`cobuilder-artifact`, `cobuilder-implement`, `cobuilder-full-lifecycle`),
with the former root `skills/`, `commands/`, and `scripts/` distributed
into each plugin's own root, and the code every plugin needs vendored into
a marketplace-root `shared/` directory, symlinked into each (ADR-0016,
ADR-0017) → design mode's stage 1 shipped for two backlog designs,
`maintainable-viewer` (ADR-0020) and `inflight-record-store` (ADR-0018),
each staged as a `goal.json`-only design → `shared/slice_table.py` replaced
three divergent slice-table parsers, and `plugins/cobuilder-implement/scripts/verify_gate.py`
shipped as that plugin's first script, checking Gates 4a, 4b, and 4c →
Gate 4b enforcement added at three levels after it ran for zero of five
`plugin-split` epics → `hindsight-routine.md` replaced `hindsight-recall.md`,
moving retain from once per feature to once per accepted slice → ADR-0018
(one lifecycle surface, a derived record index) and ADR-0019 (an anchored-comments
ledger) decided and implemented → ADR-0020 (viewer parts and an author-time
build) decided, not yet executed → the Designs sheet retired, its two
sections folded into the Designs tab, and `shared/build_index.py` gained a
`pr-draft.md` projection.
No CI config, no package manager — this is prose + Python scripts + one
HTML file, with a `tests/` suite of 255 tests that checks packaging
invariants across the five plugins, plus the slice-table parser, the
Gate 4 verifier, and the deny-git-stash hook.
