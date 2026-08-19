---
name: odyssey
title: "Codebase Odyssey Generator"
status: active
version: 0.3.0
description: >
  Generate a narrated four-level codebase story bundle (landscape, problem/solution,
  architecture, file-changes) with scene art, voice narration, and retro-extracted
  architecture decision records for any locally checked-out git repo. Also interviews
  a change's author before the PR opens, assesses the change against the bundle, and
  serves the bundle locally for viewing. Also designs a change before any code exists.
  Use when the user asks to "generate codebase
  odyssey", "generate story for PR", "odyssey baseline", "prodyssey", "narrated PR
  story", "tell the story of this PR as scene art", "explain this PR as a story",
  "build the odyssey bundle", "refresh odyssey baseline", "view the odyssey bundle",
  "serve the bundle", "open the viewer", "start the odyssey server", "stop the
  odyssey server", "publish the odyssey", "submit this PR", "review my PR", "review
  this branch before I open a PR", "architecture review", "should we merge this",
  "will we regret this change", "interview me about this change", "design this change",
  "design mode", or invokes
  `/cobuilder-architect:baseline`, `/cobuilder-architect:generate`, `/cobuilder-architect:view`,
  `/cobuilder-architect:publish`, `/cobuilder-architect:submit`, or `/cobuilder-architect:design`.
---

# Codebase Odyssey Generator

This is the orchestration procedure for turning merged PRs of **any locally
checked-out git repo** into a portable bundle. The repo can be the session's
own repo, or any other checkout reached through `--repo`. The bundle holds a
four-level narrated story, scene art, TTS narration, and ADR retro-extraction.
This procedure also runs Submit mode. Submit mode interviews the author of a
change, assesses the change against that bundle, and opens the pull request.
It also runs Design mode, which designs a change before any code exists.

**This skill never edits application source.** The sanctioned writes are the
bundle directory (`<bundle-dir>`, see Hub resolution below), `docs/`
(self-only: ADRs, designs, reviews, pull-request files), and the confirmed
`git push` / `gh pr create` of Submit mode. Baseline, Generate, View, and
Publish read the target, and write only inside the bundle. Design mode
writes `docs/` in the session's own repo. Submit mode takes the one action
outside the bundle. That action is narrow. After an explicit confirmation,
it pushes the branch and runs `gh pr create`. It still writes no
application source, and it takes no other outward action. It posts no
comments, edits no existing PR body, sets no labels, adds no reviewers, and
performs no merges. See Submit mode and Design mode.

Where the bundle lands depends on whether the target is the session's own
repo, or a foreign one. Every bundle lives under one parent,
`<hub>/.cobuilder-architect/`. Self-analysis bundles land at
`<hub>/.cobuilder-architect/self/`. In that case the target and the hub are
the same repo. This location then sits inside the analyzed repo, and gets
committed alongside its code. Foreign-repo bundles land at
`<hub>/.cobuilder-architect/<repo-slug>/`. See Hub resolution below for the
exact rule.

Reference material lives in `references/` and loads on demand. It is not
inlined here. Scripts live in `scripts/` and run through `uv run`. The
skill never edits them.

## Target resolution

`<target>` is the repo under analysis. Resolve it in this order:

1. An explicit `--repo <path>` argument forwarded by the command. This can
   name ANY local checkout, not only the repo the session is running in
   (for example `/cobuilder-architect:generate --repo ~/code/other-project --prs 12`).

2. Otherwise, use the git toplevel of the session's own working directory.

When `--repo` points outside the session's own working directory, narrative
authoring needs read access to that path. If reads are denied, tell the
user to run `/add-dir <path>` (or add the path to their permissions), then
retry. Do not work around it by guessing at file contents. If `--store
local` is also in effect for that path, it also needs write access
(`/add-dir` grants both read and write, so one request covers it). Every
script invocation below passes the resolved path as `--repo <target>`. The
storage rule in Hub resolution below decides where the bundle actually
lands (`<bundle-dir>`). `--store local|central` can override it.

## Hub resolution

`<hub>` is the local scratch root for bookkeeping and for centrally-stored
bundles. It resolves the same way `<target>` falls back in step 2 above: the
git toplevel of the session's own working directory. `--repo` never affects
`<hub>`. `<hub>` always names the session's own checkout, not the repo
under analysis. Before any mode assigns `<bundle-dir>`, it migrates a
leftover `.prodyssey/` store to `.cobuilder-architect/`, if one is still on
disk. See Consumer store rename below. The check runs against `<hub>`, and
also against `<target>` when the two differ.

**Storage rule.** This decides where a given invocation's bundle actually
lives:

- **Self-analysis** (no `--repo` given, or `--repo` resolves to the same
  repo as `<hub>`, meaning the git toplevel of `<target>` equals `<hub>`):
  the bundle lives at `<hub>/.cobuilder-architect/self/`. `self` is a
  **fixed literal, never a computed slug**. Do not "fix" this into a
  hashed slug. The slug hash (below) is a `shasum` of the resolved
  absolute target path. A self-bundle committed under a hashed name would
  be undiscoverable from any other clone location. A teammate who clones
  the repo to a different path computes a different hash, and lands
  silently on a new, empty bundle instead of the one already committed.
  `self` stays portable across clones. Slugs never leave the hub where the
  invocation computed them, so their path-dependence causes no harm.
- **Foreign repo** (`--repo <other-path>` resolves to a DIFFERENT repo than
  `<hub>`): the bundle lives at `<hub>/.cobuilder-architect/<repo-slug>/`,
  unchanged.

An optional `--store local|central` flag overrides the automatic rule,
regardless of the self/foreign check. `--store local` forces
`<target>/.cobuilder-architect/self/`. `--store central` forces
`<hub>/.cobuilder-architect/<repo-slug>/`. This preserves the current
meaning of `local` (it writes into the target repo itself). For
self-analysis the two branches converge, because `<target>` and `<hub>`
are the same repo. So `--store local` is a no-op there. Do not read
`local` as "`<hub>/.cobuilder-architect/self`" instead. That reading would
put a *foreign* repo's bundle under `self/` whenever a user passes
`--store local` for it. It would also break the invariant that makes the
fixed literal safe to leave un-slugged.

Compute `<repo-slug>` once per invocation, whenever the foreign path
applies:

```bash
REMOTE=$(git -C "<target>" remote get-url origin 2>/dev/null)
NAME=$(basename "${REMOTE:-<target>}" .git)
NAME=$(printf '%s' "$NAME" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9' '-' | sed 's/-\{1,\}/-/g; s/^-//; s/-$//')  # POSIX \{1,\} is deliberate: \+ is GNU-only and a silent no-op on macOS/BSD sed
HASH=$(printf '%s' "<resolved-abs-target-path>" | shasum | cut -c1-8)
SLUG="${NAME}-${HASH}"
```

Every odyssey mode (Baseline, Generate, Submit, View, Publish, and Design)
runs the consumer store rename below **before** it assigns `BUNDLE_DIR`.
This is not a `LAYOUT_MIGRATIONS` step. That ladder runs inside one
`--bundle-dir` and cannot rename its own parent.

**Consumer store rename.** After you have the `<hub>` and `<target>`
toplevels, and before you assign `BUNDLE_DIR`, migrate a leftover
`.prodyssey/` store, if one is still on disk. Run the check against
`<hub>`. If `<target>` differs from `<hub>`, run it against `<target>` as
well, because a `--store local` write lands there.

For each of those repo roots:

- If `<repo>/.prodyssey/` exists and `<repo>/.cobuilder-architect/` does
  not, move it. Use `git mv` when git tracks the directory. Use `mv`
  otherwise. Report the move.
- If both exist, STOP. Tell the user both directories are present, and
  that this skill will not merge them. Do not continue.
- If only `.cobuilder-architect/` exists, do nothing.

The step is idempotent. A new install that never had `.prodyssey/` is a
no-op. Unlike the `.odyssey/` detect block below, this step **does**
perform the move.

Then set `<bundle-dir>` once, at the top of every mode:

```bash
STORE_MODE="<local|central, from --store if the user passed it, else empty>"
HUB_TOPLEVEL=$(git -C "<hub>" rev-parse --show-toplevel)
TARGET_TOPLEVEL=$(git -C "<target>" rev-parse --show-toplevel)

migrate_store() {
  REPO="$1"
  OLD="$REPO/.prodyssey"
  NEW="$REPO/.cobuilder-architect"
  if [ -d "$OLD" ] && [ ! -e "$NEW" ]; then
    if git -C "$REPO" ls-files --error-unmatch .prodyssey >/dev/null 2>&1; then
      git -C "$REPO" mv .prodyssey .cobuilder-architect
    else
      mv "$OLD" "$NEW"
    fi
    echo "moved $OLD -> $NEW"
  elif [ -d "$OLD" ] && [ -e "$NEW" ]; then
    echo "STOP: both $OLD and $NEW exist. Do not merge them. Move or remove one, then retry."
    exit 1
  fi
}

migrate_store "$HUB_TOPLEVEL"
if [ "$HUB_TOPLEVEL" != "$TARGET_TOPLEVEL" ]; then
  migrate_store "$TARGET_TOPLEVEL"
fi

if [ "$STORE_MODE" = "central" ] || { [ "$STORE_MODE" != "local" ] && [ "$HUB_TOPLEVEL" != "$TARGET_TOPLEVEL" ]; }; then
  BUNDLE_DIR="$HUB_TOPLEVEL/.cobuilder-architect/$SLUG"
else
  BUNDLE_DIR="$TARGET_TOPLEVEL/.cobuilder-architect/self"
fi
```

(`<repo-slug>`/`$SLUG` is computed only when the foreign path applies, see
above.) `<bundle-dir>` is the only path Baseline, Generate, and Publish
modes ever write to. No mode references a literal bundle path directly.
Submit mode writes there too. Design mode writes `docs/` in the session's
own repo. Submit mode's `git push` / `gh pr create` are the only actions
that reach a remote.

**Legacy layout detection.** Compute `BUNDLE_DIR` above, then check this
immediately. All six modes reach this check, because Step 0's prereq gate
skips View, Publish, Submit, and Design. If `$BUNDLE_DIR` does not exist
but a legacy `<target>/.odyssey/` does, STOP. Tell the user their bundle
predates the `.cobuilder-architect/self` layout, and print the exact
command:
```
git -C <target> mv .odyssey .cobuilder-architect/self
```
Do not perform the move yourself, and do not fall through to "no baseline
found". Two reasons make this detect-but-not-migrate rather than an
automatic fix. First, auto-running `git mv` inside a user's repo
contradicts this skill's own rule to never edit the target repo's source.
Second, without this check, Generate mode's auto-baseline check (below)
would find nothing at the new path, announce "No baseline found", and
silently regenerate over hand-authored narrative at real Gemini API cost.
Remove this block once legacy `.odyssey/` layouts are no longer expected
in the wild.

Whenever `<bundle-dir>` resolves under `<hub>/.cobuilder-architect/` and
`<hub>/.cobuilder-architect/` does not exist yet, create it (`mkdir -p`) and
check whether the hub's `.gitignore` already covers its four bookkeeping
entries. If not, print exactly these four lines for the user to add
manually:
```
.cobuilder-architect/.view-server.pid
.cobuilder-architect/.view-server.log
.cobuilder-architect/active
.cobuilder-architect/*/.migration-backup/
```
Do NOT edit `.gitignore` yourself, and **never suggest ignoring
`.cobuilder-architect/` as a whole**. Bundles are meant to be committed
alongside the code they narrate. A narrative that is not in the repo does
not do its job. Only these four entries are exceptions:

- `.view-server.pid` and `.view-server.log` are process bookkeeping for a
  server that only ever runs on one machine.
- `active` is a symlink holding an ABSOLUTE path. Committing it breaks in
  every other clone, because the path does not exist there, and it churns
  the diff on every view switch.
- `<bundle-dir>/.migration-backup/` holds the pre-migration backup of
  `story.json` that `migrate_bundle.py` writes. Keep it only until the
  next successful migration proves the bundle sound. It is not a durable
  record worth committing.

This applies the first time *any* mode (Baseline, Generate, or View)
creates the directory, not only View mode. It is also a one-time notice,
not a durable reminder. Once `<hub>/.cobuilder-architect/` exists, later
invocations skip the check, even when the user never added the suggested
lines.

## Step 0 — Prereq gate (hard, before ANYTHING generative)

This gate applies to **baseline** and **generate** modes. **View, Publish,
Submit, and Design modes are exempt**:

- View only serves static files already on disk. It needs neither `uv` nor
  `GEMINI_API_KEY`.
- Publish only flattens and publishes what is already generated. It needs
  `uv` for its export scripts, but not `GEMINI_API_KEY`.
- Submit reads git and writes markdown. It needs `uv` and a git repo, but
  it never calls Gemini, because its narrative work is Claude judgment
  work, and it generates no art or audio.
- Design writes `docs/` and a proposed ADR. It needs `uv` and a git repo,
  but never calls Gemini.

See each mode's own section below.

Run this before any other step, on every baseline or generate invocation:

1. Confirm `<target>` is a git repo: `git -C <target> rev-parse --is-inside-work-tree`.
   If it fails, STOP. This is not a git checkout.

2. Confirm `uv` is on PATH (`which uv`). If it is missing, STOP and tell the
   user to install `uv` (https://docs.astral.sh/uv/getting-started/installation/).

3. Confirm `GEMINI_API_KEY` is available. Check the environment, then check
   for a `.env` file in `<hub>` containing `GEMINI_API_KEY=`. Never check
   `<target>` for this, because `<target>` is an untrusted repo, and its
   `.env` must never load into this process. The scripts resolve `.env`
   from the working directory, not from the script's own path. Always run
   them from inside `<hub>`, the same directory this gate checks. If
   **neither** is present, STOP before running any script and print:

   ```
   GEMINI_API_KEY is required for voice narration (and scene art, unless
   --art diagram is in effect).
   Get one at https://aistudio.google.com/apikey, then either:
     export GEMINI_API_KEY=<key>
   or add it to <hub>/.env:
     GEMINI_API_KEY=<key>
   ```

   Voice narration always calls Gemini, so this gate stands regardless of
   `--art`. Do not run `generate_prompts.py --generate` or
   `generate_audio.py` without a confirmed key. Narrative authoring, ADR
   extraction, and diagram authoring call no Gemini API, and may still
   proceed if the user explicitly asks for text-only or diagram-only
   output. But the default `generate` sweep always needs the key for
   narration, and must stop here if the key is absent.

Only after all three checks pass does mode dispatch begin.

## Mode dispatch

The invoking command passes a mode (`baseline`, `generate`, `view`,
`publish`, `submit`, or `design`) plus forwarded args (`--repo`, `--store`,
`--prs`, `--force`, `--voice`, `--art`, `--dry-run`, `--port`, `--stop`,
`--list`, `--format`, `--style`, `--stage`, `--branch`, `--base`,
`--draft`, `--no-create`, `--non-interactive`).
If invoked with no mode, ask the user whether they want `baseline`,
`generate`, `view`, `publish`, `submit`, or `design`.

## Baseline mode

This mode derives the architecture baseline of the repo into `<bundle-dir>`
(computed per Hub resolution above). Follow
`references/baseline-derivation.md` for the full procedure. Summary:

1. Run the seed extraction:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/scripts/extract_story.py" --repo <target> --bundle-dir <bundle-dir> --dry-run
   ```
   (drop `--dry-run` once ready to write). This creates `data/story.json`
   from `inventory.yaml` if `story.json` does not exist yet, and writes
   `data/story.js` and `data/manifest.js`.

2. Detect the stack (or stacks) per `references/stacks/README.md`
   detection precedence (most-specific card first, `generic.md` fallback).
   A polyglot repo loads one card per matched sub-tree.

3. Derive the district map and per-district summaries per
   `references/baseline-derivation.md`. Author labels, kinds, and blurbs
   directly into `world.districts` in `story.json`, and write
   `<bundle-dir>/inventory.yaml`.

4. Migrate the bundle. This refreshes the viewer copy, and it steps the
   layout and the data shape forward when the plugin defines a newer
   version of either:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/scripts/migrate_bundle.py" --bundle-dir <bundle-dir>
   ```
   This replaces the old bare `cp` of `viewer/index.html`. Migration owns
   the viewer refresh now, so there is one mechanism, not two.

5. Verify:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/scripts/verify_bundle.py" --bundle-dir <bundle-dir> --json
   ```
   Report the `baseline` section of the result to the user.

Baseline mode is re-runnable at any time, and it refreshes in place. It
never overwrites human-authored narrative fields already present in
`story.json`. That discipline lives in `extract_story.py`, and in how you
write district blurbs. Treat existing text as authored, not as scratch.

## Generate mode

This mode runs the per-PR narrative, ADR, art, and audio sweep. Steps:

1. **Auto-baseline check.** If `<bundle-dir>/data/story.json` or
   `<bundle-dir>/inventory.yaml` is missing, announce "No baseline found,
   running baseline first" and run the full Baseline mode above before
   continuing.

2. **Migrate the bundle**, so the sweep below never runs against a stale
   viewer copy or an outdated data shape:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/scripts/migrate_bundle.py" --bundle-dir <bundle-dir>
   ```

3. **Resolve the PR list.** Use `--prs` if given (comma list, range
   `N..M`, or `--latest`). Otherwise let `extract_story.py`'s discovery
   surface the most recent PRs (merge commits, then squash `(#N)`, then a
   `gh` fallback). Confirm the last 10 with the user before proceeding.

   `--prs N` can resolve to either a merged commit or a currently-open PR.
   The `gh` fallback checks `mergedAt` and `mergeCommit`. If both are
   empty, it treats N as open, and diffs against the local merge-base of
   its head and base branches instead of a merge or squash commit.
   Open-PR entries carry `"status": "open"` in `story.json`. They reflect
   the PR's diff as of generation time, not settled history. Re-running
   generate mode with `--force` for that PR, after new commits land on its
   branch, refreshes the size, touched files, diff, and narrative for the
   new tip. It does not treat the original snapshot as immutable the way a
   merged PR's snapshot is.

4. **Per PR**, run the resumability check first, and execute only the
   stages whose artifacts are missing (or all stages if `--force`):
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/scripts/verify_bundle.py" --bundle-dir <bundle-dir> --prs <N> --art <mode> --json
   ```
   (`<mode>` is this invocation's `--art` value, below, default `both`.)
   The result's `prs.<N>` map shows, per artifact key, `"ok"` or
   `"missing"`. Execute only the missing stages, **in this order**:

   1. **Narrative authoring** (Claude work, not a script). Follow
      `references/story-mode.md`. The register comes from `--style
      kleppmann|ste` (default `kleppmann`). See `references/story-mode.md`
      §3 for both. Ground every claim in three sources: the diff, the
      touched files in `<target>`, and `<bundle-dir>/inventory.yaml`. Get
      the diff from `extract_diffs.py`'s output. Run that script first if
      the diff is not extracted yet.
      **Read this PR's `intent` block first, when it has one.** Submit
      mode captured the author's stated problem, approach, and rejected
      alternatives. Do not re-derive them from the diff. See the opening
      of `references/story-mode.md` for what carries over and what does
      not.
      Author the four levels (`landscape`, `problem_solution`,
      `architecture`, `file_changes`), plus the tagline and the `voice`
      scripts. Write all of it directly into `data/story.json` for this
      PR. **`problem_solution` and `architecture` also each need a
      `beats` array** (`{"kind": ..., "text": ...}` items). The viewer's
      Background/Intuition and Forces/Contract/Boundary cards render this
      array, not the plain fields. `problem`, `solution`, `forces`, and
      `decision` alone are not enough. See `references/story-mode.md` §2a
      for the exact `kind` values per level, and worked guidance.

   2. **ADR retro-extraction.** Follow
      `references/decision-records-lite.md`. Write the markdown record
      under `docs/architecture/adr/`, then run
      `uv run "${CLAUDE_PLUGIN_ROOT}/scripts/build_adrs.py"`. Never write
      `data/adrs.json` by hand. Set this PR's `adrs[]` array in
      `story.json` to the resulting record ids. When the PR carries an
      `intent` block, take `alternatives` from the author instead of
      hunting for traces of them, and mark the record `provenance:
      authored`. A retro-created record is `state: decided`, never
      `approved`.

   3. **Diff extraction:**
      ```bash
      uv run "${CLAUDE_PLUGIN_ROOT}/scripts/extract_diffs.py" --repo <target> --bundle-dir <bundle-dir> --prs <N>
      ```

   4. **Diagram authoring**, skipped when `--art image` is in effect (see
      below). The orchestrating Claude does **not** write the `.mmd`
      files itself. For each PR in this stage, spawn one subagent. Its
      prompt must:
      - tell it to invoke `Skill("cobuilder-architect:mermaid")` first. If
        that call gives `Unknown skill`, tell it to read
        `${CLAUDE_PLUGIN_ROOT}/skills/mermaid/SKILL.md` directly, and obey
        that file instead. The skill resolves by name only in a session
        that has an installed plugin version containing it. A session
        that runs from a development checkout, or from an installed
        version older than the skill, does not find it. The path always
        resolves, because `${CLAUDE_PLUGIN_ROOT}` points at the copy in
        use.

      - then tell it to read
        `${CLAUDE_PLUGIN_ROOT}/skills/odyssey/references/diagram-mode.md`.

      - hand it the grounding inputs: this PR's timeline entry in
        `<bundle-dir>/data/story.json`, its extracted diff
        (`<bundle-dir>/data/diffs-pr{N}.js`), and
        `<bundle-dir>/inventory.yaml`.

      - state the three output paths and the diagram type each one needs:
        `<bundle-dir>/data/diagrams/pr{N}-level1.mmd` (`C4Container`, PR
        landscape), `<bundle-dir>/data/diagrams/pr{N}-level2.mmd`
        (`sequenceDiagram`, problem and solution), and
        `<bundle-dir>/data/diagrams/pr{N}-level3.mmd` (`classDiagram`,
        architecture). Level 4 has no diagram.

      - require the subagent to return only the paths it wrote.

      Then compile and validate:
      ```bash
      uv run "${CLAUDE_PLUGIN_ROOT}/scripts/build_diagrams.py" --repo <target> --bundle-dir <bundle-dir> --prs <N>
      ```
      This writes `<bundle-dir>/data/diagrams.js` from the `.mmd` sources.
      It checks each file for the right diagram type per level, and for
      balanced brackets (`--strict` adds a mermaid-cli parse check). If
      validation fails, send the failure back to the **same** subagent to
      fix the source file. Do not hand-patch the `.mmd` files yourself.

   5. **Scene-art prompts and generation**, skipped when `--art diagram`
      is in effect (see below):
      ```bash
      uv run "${CLAUDE_PLUGIN_ROOT}/scripts/generate_prompts.py" --repo <target> --bundle-dir <bundle-dir> --prs <N> --generate
      ```

   6. **Voice narration:**
      ```bash
      uv run "${CLAUDE_PLUGIN_ROOT}/scripts/generate_audio.py" --repo <target> --bundle-dir <bundle-dir> --prs <N>
      ```
      Pass `--voice <V>` if the user specified one.

   `--force` regenerates every stage, regardless of `verify_bundle.py`'s
   result.

5. **Final verify.** Re-run `verify_bundle.py --prs <all-selected> --art
   <mode> --json` (`<mode>` is this invocation's `--art` value) and report
   a per-PR artifact table: which stages ran, which were skipped as
   already complete, and which failed.

### `--art` flag

`--art both|diagram|image` selects which visual family generate mode
produces for levels 1 through 3 (level 4 has neither). The default is
`both`.

- `both` runs diagram authoring (step 4) and scene art (step 5). This
  matches current behavior, plus diagrams.
- `diagram` runs diagram authoring and skips scene art entirely. This
  makes no Gemini image calls for this sweep.
- `image` skips diagram authoring and runs scene art. This matches the
  pre-diagram behavior exactly.

Pass the same `--art <mode>` value to `verify_bundle.py`, in both the
resumability check (step 4's preamble) and the final verify (step 5).
This way resumability tracks whichever family this invocation actually
asked for, instead of reporting the untouched family as missing.

## View mode

This mode serves the `viewer/` folder of the currently selected bundle as
a static site in the background. The session keeps going, and the user
gets a URL to open. It makes no Gemini call, and needs no `uv`. It needs
only `python3`'s stdlib `http.server`, bound to localhost only.

One long-lived server process runs per hub, rooted at
`<hub>/.cobuilder-architect/` itself (never directly at a bundle's
`viewer/` subfolder, see below). It always serves
`http://localhost:<port>/active/viewer/`. Switching which bundle is being
viewed just repoints a symlink. It never requires a server restart.

**Why the server is rooted one level up.** `viewer/index.html` requests
`../data/story.js`, `../data/manifest.js`, and so on. `data/` is a SIBLING
of `viewer/`, not a child of it. A server rooted directly at
`<bundle-dir>/viewer/` returns a 404 error on every one of those requests.
The server must sit at the bundle ROOT (the parent of `viewer/` and
`data/`), and the reported and requested URL must include the `/viewer/`
path segment. (Confirmed with curl this session: a 404 error from the
`<bundle-dir>/viewer/` root, and a 200 result once served from
`<bundle-dir>`, the bundle root, with `/viewer/index.html` requested.)

`python3 -m http.server` also follows symlinks correctly. Both the
symlink itself, and the relative `../data/...` requests made through
pages served through the symlink, resolve correctly (confirmed with curl
this session). This is what makes the one-server-plus-symlink design
below work.

### Layout

`<hub>/.cobuilder-architect/` holds:
- `self/`, the hub's own self-analysis bundle (the repo that contains this
  `.cobuilder-architect/`), and one subfolder per foreign-repo bundle
  (`<repo-slug>/`). Each is a peer full bundle root (`data/`, `viewer/`,
  `assets/`), created by Baseline or Generate mode per the storage rule in
  Hub resolution above. This has a harmless side effect worth knowing, so
  nobody "fixes" it later: `self/` is therefore also directly reachable
  at `http://localhost:<port>/self/viewer/`, in addition to the usual
  `/active/viewer/`.
- `active`, a symlink to the ABSOLUTE path of whichever bundle root is
  currently selected for viewing. It usually points at a
  `<hub>/.cobuilder-architect/self/` or
  `<hub>/.cobuilder-architect/<slug>/` entry, but for a foreign bundle
  stored with `--store local` it points outside the hub entirely, at
  `<other-target>/.cobuilder-architect/self/`. That is fine, because
  `http.server` follows symlinks (see below).
- `.view-server.pid` and `.view-server.log`, the one long-lived server
  process for this hub.

Compute `<hub>` per Hub resolution above. `<hub>/.cobuilder-architect/`
may already exist from a prior Baseline or Generate run (the same
`mkdir -p` and `.gitignore` check applies, see Hub resolution).

### Steps

1. **Lightweight check.** Confirm `python3` is on PATH.

2. **Discover known bundles**, needed for selection, `--list`, and the
   auto-select case:
   - Entries: the immediate children of `<hub>/.cobuilder-architect/` that
     are real directories, NOT symlinks, for example
     `find <hub>/.cobuilder-architect -mindepth 1 -maxdepth 1 -type d`
     (`-type d` without `-L` naturally excludes the `active` symlink even
     though it points at a directory. Do not use a glob like `*/`, which
     follows symlinks and would wrongly include `active` as if it were its
     own bundle). This also excludes `.view-server.pid` and
     `.view-server.log`, since those are files, not directories.
   - For each, read the `meta.repo` and `meta.generated` fields of
     `data/story.json` to build a human-readable label (repo name plus
     generation date). Skip an entry whose `story.json` is missing or
     unreadable, rather than failing discovery outright. Note it as
     incomplete if listing. When an entry's directory name is `self`,
     label it "(this repo)", so it stands apart from a slug entry in the
     picker.

3. **`--list`.** Print the discovered list from step 2 (label and path
   per entry) and STOP. Do not start or switch anything.

4. **`--stop`.** Kill this hub's server and STOP. Do not start a new one:
   ```bash
   PIDFILE="<hub>/.cobuilder-architect/.view-server.pid"
   LOGFILE="<hub>/.cobuilder-architect/.view-server.log"
   if [ -f "$PIDFILE" ] && ps -p "$(cat "$PIDFILE")" -o command= | grep -q "http.server"; then
     kill "$(cat "$PIDFILE")"
     echo "stopped"
   else
     echo "no server running for this hub"
   fi
   rm -f "$PIDFILE" "$LOGFILE"
   ```
   (The PID and log files live under `<hub>/.cobuilder-architect/` rather
   than `/tmp`, so they stay scoped per hub. They, and `active`, are the
   only three entries under `.cobuilder-architect/` that should be
   gitignored. See the gitignore-suggestion paragraph in Hub resolution
   above. Everything else under `.cobuilder-architect/` is a committed
   bundle, not scratch.)

5. **Select which bundle to view:**
   1. `--repo <path>` given. Resolve the storage rule in Hub resolution
      above to a primary candidate bundle-dir. If `data/story.json` is
      missing there, probe the OTHER candidate before giving up. That is,
      if the primary was `<target>/.cobuilder-architect/self`, try
      `<hub>/.cobuilder-architect/<repo-slug>`, and vice versa. Report
      which of the two was actually found. This is what makes bundles
      stored with `--store local` findable, even though the default
      guess of the storage rule would otherwise miss them. Only if BOTH
      candidates lack `data/story.json` does this fall through to the "no
      baseline found" handling below. No prompt either way.

   2. No `--repo`, and step 2's discovery found exactly one bundle total.
      Auto-select it. No prompt.

   3. No `--repo`, and discovery found multiple bundles. Present the list
      from step 2 (label and date per entry) and use the
      `AskUserQuestion` tool to ask the user which one to view.

   4. No `--repo`, and discovery found zero bundles. Tell the user to run
      `/cobuilder-architect:baseline` first and STOP.

   Whichever bundle-dir is selected, confirm `data/story.json` and
   `viewer/index.html` exist under it before proceeding. If not, STOP,
   and tell the user to run `/cobuilder-architect:baseline` for that repo
   first (the same remediation as 5.4). This also covers the case where
   `--repo` pointed at a real repo that has simply not been baselined
   yet, or that was baselined with a different `--store` mode than the
   one this resolution assumed.

6. **Migrate the bundle**, so a stale viewer copy or an outdated data
   shape never reaches the browser:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/scripts/migrate_bundle.py" --bundle-dir <absolute-selected-bundle-dir>
   ```

7. **Point `active` at the selection:**
   ```bash
   ln -sfn "<absolute-selected-bundle-dir>" "<hub>/.cobuilder-architect/active"
   ```

8. **Reuse or start the server:**
   ```bash
   PIDFILE="<hub>/.cobuilder-architect/.view-server.pid"
   LOGFILE="<hub>/.cobuilder-architect/.view-server.log"
   REQUESTED_PORT="<value of --port if the user passed it, else 0 for an OS-assigned port>"
   if [ -f "$PIDFILE" ] && ps -p "$(cat "$PIDFILE")" -o command= | grep -q "http.server"; then
     RUNNING_PORT=$(grep -o "port [0-9]*" "$LOGFILE" | tail -1 | grep -o "[0-9]*")
     echo "already running on port $RUNNING_PORT — active bundle switched, just refresh the browser tab"
   else
     nohup python3 -u -m http.server "$REQUESTED_PORT" --bind 127.0.0.1 --directory "<hub>/.cobuilder-architect" > "$LOGFILE" 2>&1 &
     echo $! > "$PIDFILE"
   fi
   ```
   If a server is already running for this hub, do NOT start a second
   one. Repointing `active` (step 7) is enough. The running server picks
   up the new symlink target on its next request, so it needs no
   restart. Just report the existing port and URL, and tell the user to
   refresh. Note that `--port` has no effect in this branch, since it
   applies only to a fresh start. If the user explicitly passed `--port`
   while a server is already running on a different port, tell them so,
   rather than silently ignoring it. Run the start branch as a normal
   (non-backgrounded-tool-call) Bash invocation. The trailing shell `&`
   detaches the server process itself, so the tool call returns
   immediately, with nothing left running in its own foreground. Do not
   use the Bash tool's own `run_in_background` option here. That option
   is for commands that eventually finish, and this one never does.

9. **Confirm a fresh start actually came up** (skip this if step 8 reused
   an existing server). Poll the log briefly rather than a single fixed
   sleep, because `http.server` startup time varies under load:
   ```bash
   for i in 1 2 3 4 5 6 7 8 9 10; do
     grep -q "Serving HTTP" "$LOGFILE" 2>/dev/null && break
     sleep 0.3
   done
   cat "$LOGFILE"
   ```
   If a `Serving HTTP on ... port NNNNN ...` line appears, parse the port
   out of it. If it does not appear within the poll window, treat it as a
   failed start. The cause may be a port collision (`--port <N>` pointed
   at something already listening), a permission error, or something
   else. Show the log contents to the user verbatim, and STOP. Never
   report a URL that has not been confirmed live.

10. **Report the URL:** `http://localhost:<port>/active/viewer/`. Tell
    the user the server keeps running in the background, so the session
    stays free to continue. Tell them that switching bundles later just
    means re-running `/cobuilder-architect:view --repo <other>` (or
    answering the picker) and refreshing the tab. Tell them that
    `/cobuilder-architect:view --stop` shuts the server down entirely.

## Publish mode

This mode flattens already-generated PRs into self-contained Claude
Artifacts, one per PR, plus an index artifact linking to all of them.
Publish mode is a consumer of an existing bundle, not a generator. It
needs `uv` to run the export scripts, but not `GEMINI_API_KEY`, and it
does not touch `<target>` at all.

1. **Resolve `<bundle-dir>`** per Hub resolution above (the same
   `--repo`/`--store` rules as every other mode, nothing new here).

2. **Resolve `--format`** (default `artifact`). Anything other than
   `artifact`, right now that is just `notion`, is a recognized, reserved
   value with no implementation yet. Report that clearly ("`--format
   notion` is not implemented yet") and STOP rather than falling through
   to the artifact path silently.

3. **Resolve the PR list** from `--prs` (comma list or `N..M` range, the
   same parsing as Generate mode). For each requested PR, confirm it
   exists in the timeline of `<bundle-dir>/data/story.json`. If any do
   not, tell the user to run `/cobuilder-architect:generate --prs <N>`
   first, and STOP before publishing any of the others. A partial
   publish from a partly-valid PR list confuses more than an upfront
   refusal does.

4. **Migrate the bundle**, before any export runs. This makes the
   stale-viewer export error self-healing:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/scripts/migrate_bundle.py" --bundle-dir <bundle-dir>
   ```
   `export_artifact.py`'s own verbatim guard against the viewer copy stays
   in place regardless, as a backstop. It should now never fire.

5. **Per PR**, in order:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/scripts/export_artifact.py" --bundle-dir <bundle-dir> --prs <N>
   ```
   This writes `<bundle-dir>/exports/pr-<N>.html`, updates that PR's
   entry in `<bundle-dir>/exports/publish-manifest.json`, and prints
   whether the commit or narrative content changed since the last
   export. Read `publish-manifest.json` after the script runs (it prints
   the path) to get this PR's current `artifact_url`, if any:
   - If there is no recorded `artifact_url` yet, or the script reported a
     commit or content change, or the user passed `--force`: call the
     `Artifact` tool on `exports/pr-<N>.html` (`title`: `"<repo> — PR
     #<N>: <title>"`, `description`: the PR's tagline, `favicon`: an
     emoji fitting the PR). Pass the existing `artifact_url` as `url:`
     when there is one, so republishing updates the same link instead of
     minting a new one. Then record the result:
     ```bash
     uv run "${CLAUDE_PLUGIN_ROOT}/scripts/record_publish.py" --bundle-dir <bundle-dir> --target pr-<N> --url <returned-url>
     ```
   - Otherwise, report "already up to date" with the existing URL and
     move on. Do not call the Artifact tool for a PR that has not
     changed.

6. **Always rebuild and republish the index**, regardless of which PRs (if
   any) actually changed this run. It reflects every PR ever recorded in
   `publish-manifest.json`, not only this invocation's:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/scripts/export_index.py" --bundle-dir <bundle-dir>
   ```
   Call the `Artifact` tool on the resulting `exports/index.html`,
   passing `publish-manifest.json`'s `index.artifact_url` as `url:` when
   present, so it updates in place across sessions the same way per-PR
   artifacts do. Record it the same way: `--target index`.

7. **Report a summary table**: PR, status (published, updated, or
   unchanged), and artifact URL, plus the index URL.

The `Artifact` tool may not be available. Per the Anthropic documentation,
publishing artifacts needs a `/login` session on a paid plan. API-key and
cloud-provider-credential sessions cannot publish. Even then, the export
files this mode produces stay valid deliverables. Tell the user where
they landed (`<bundle-dir>/exports/`), so they can open or share them
another way, instead of letting the run look like a silent failure.

## Submit mode

This mode interviews the author of a change, assesses that change against
the bundle, and opens the pull request. Submit mode covers both the
author's side of the plugin and the reviewer's side. Every other mode
narrates history. This one runs before the history exists. It needs `uv`
and a git repo, never `GEMINI_API_KEY`, and it generates no art and no
audio.

Two references govern it, both loaded on demand:
`references/interview-guide.md` for what to ask and how, and
`references/review-mode.md` for the rubric, the verdicts, and the risk
tiers.

`--stage pre|post` selects the stage (default `pre`).

### Pre stage

1. **Resolve `<bundle-dir>`** per Hub resolution above, then **migrate the
   bundle**:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/scripts/migrate_bundle.py" --bundle-dir <bundle-dir>
   ```

2. **Resolve the target**, in this order:
   - `--prs <N>`. The PR already exists. Use the existing open-PR path
     (see Generate mode step 3). Nothing gets created.
   - no `--prs`. Use the current branch. Ask `gh pr view --json number`
     for it first. If a PR already exists for this branch, adopt its
     number and continue as in the case above. This is the
     re-run-after-review-feedback path. If not, this is a pre-submit run,
     and step 8 opens the PR.

3. **Extract the diff.** For a PR:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/scripts/extract_diffs.py" --repo <target> --bundle-dir <bundle-dir> --prs <N>
   ```
   For a branch with no PR yet (`--base` defaults to the detected default
   branch):
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/scripts/extract_diffs.py" --repo <target> --bundle-dir <bundle-dir> --branch [<ref>] [--base <branch>]
   ```
   The branch form writes `<bundle-dir>/exports/branch-<slug>/diff.json`
   and touches nothing under `data/`.

4. **Gather the rest of the evidence before asking the author anything.**
   Read, in this order:
   1. The touched districts in `<bundle-dir>/inventory.yaml`.

   2. Every record in `<bundle-dir>/data/adrs.json` whose `problem` or
      `decision` covers those districts.

   3. The matching stack card per `references/stacks/README.md`.

   4. The timeline entries for earlier PRs in the same districts.

   This order is not optional. `references/interview-guide.md` §2 depends
   on it.

5. **Resolve the design.** Take the current branch name (or `--branch`).
   If it starts with `design/`, strip that prefix. The first path
   segment is the design name. The rest, if any, is the epic slug.
   - `design/design-mode` gives name `design-mode`, epic none (single-epic
     form)
   - `design/checkout/guest-checkout` gives name `checkout`, epic
     `guest-checkout`

   Look for `docs/architecture/designs/<name>/goal.json`. If that misses,
   scan every `docs/architecture/designs/*/goal.json` for a matching
   `epics[].branch`. That scan is the authoritative fallback, and it
   handles a renamed branch.

   When you compare slugs (the remaining path against `epics[].slug`),
   reuse the `slugify()` rule from `scripts/extract_diffs.py`: lowercase,
   every non-alphanumeric run collapsed to one hyphen, no leading or
   trailing hyphen. Do not invent a second slugger.

   A branch that does not start with `design/`, and matches no
   `epics[].branch`, is a miss. `feature/foo` is a miss. Stay on the cold
   interview.

   A branch can carry more than one design. Submit mode never picks
   between them on its own.

   After the lookup above finds a design, do not stop there. Collect
   every design whose `epics[].branch` matches the current branch. Add
   any design whose `goal.stage` is not `delivered` and whose declared
   modules the diff touches. This gives the full candidate set.

   If exactly one design results, behave exactly as today. Nothing
   changes for the single-design case.

   If more than one design results, stop and ask the author with
   `AskUserQuestion` which designs this pull request delivers. Offer
   each candidate design by name, with its `goal.outcome`, and allow
   more than one selection (`multiSelect`). Never choose silently.

   **On a single-design hit:** load that design's `intent.json` as the
   starting hypothesis for step 6. Ask only what changed since the
   design. Do not re-interview cold. The five-topic design interview
   already happened. Still run the self-consistency check against the
   diff (`interview-guide.md` §3a), because the design can have
   drifted. Carry `intent.design = {name, epic}` forward (`epic` is
   null for the single-epic form). Write that object onto the timeline
   entry in step 9, and onto
   `docs/pull-requests/branch-<slug>/intent.json` at the pre-PR stage
   in step 8.

   **On a multi-design hit:** load every named design's `intent.json`
   as starting hypotheses for step 6. Carry `intent.design` forward as
   an array of `{name, epic}` objects, one per design the author
   named. Write that array onto the timeline entry in step 9, and onto
   `docs/pull-requests/branch-<slug>/intent.json` at the pre-PR stage
   in step 8, in place of the single-object shape. Then fill the `pr`
   and `state` fields for the matching epic in every named design's
   `goal.json`, not only the first, and run
   `uv run "${CLAUDE_PLUGIN_ROOT}/scripts/build_designs.py"` once at
   the end.

   **On a miss:** behave exactly as today. Stay additive. Step 6 runs the
   cold interview.

6. **Interview the author** (Claude work, not a script). Follow
   `references/interview-guide.md`. If step 5 found a design, that
   `intent.json` is the hypothesis. Ask what changed since the design.
   Still run the self-consistency check against the diff (§3a). If step 5
   missed, draft a hypothesis from step 4, but hold it back. Ask the
   problem and approach questions blind, then compare both against each
   other and against the hypothesis (§3a). Ask only what the evidence
   still cannot settle, then play the drafted `intent` back for
   confirmation. `--non-interactive`, or a session with no author
   present, takes the fallback in §6 of that file, and sets
   `intent.source: "inferred"`.

7. **Assess** (Claude work, not a script). Follow
   `references/review-mode.md`: the three questions with evidence, the
   stack card's boundary greps, the district delta, the risk tier,
   `regret_risk`, and the verdict.

8. **Render, then open the PR.** Write `intent.json` and
   `assessment.json` into `docs/pull-requests/branch-<slug>/` (branch
   target), or write the two blocks onto the timeline entry (PR target).
   If step 5 found a design, the staged `intent.json` includes `design:
   {name, epic}`. Then:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/scripts/render_review.py" --repo <target> --bundle-dir <bundle-dir> {--prs <N> | --branch [<ref>]}
   ```
   If step 2 found no PR, open one. See **Submitting the PR** below. If a
   PR already exists, skip to step 9.

9. **File the results under the PR number.** Write `intent` and
   `assessment` onto that PR's timeline entry in
   `<bundle-dir>/data/story.json`, regenerate `data/story.js`, then
   re-render so the deliverables carry the number:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/scripts/render_review.py" --repo <target> --bundle-dir <bundle-dir> --prs <N>
   ```
   If step 5 found a design, write `intent.design = {name, epic}` onto
   that entry (`epic` is null for the single-epic form). Then fill that
   epic's `pr` and `state` in the `goal.json` of the design (`state:
   "open"` until merge). If the design has one epic and no slug, update
   that one epic. Then run
   `uv run "${CLAUDE_PLUGIN_ROOT}/scripts/build_designs.py"`.

10. **Verify:**
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/scripts/verify_bundle.py" --bundle-dir <bundle-dir> --prs <N> --require-review --json
   ```
   Report the verdict, the risk tier, the finding count, the PR URL, and
   the paths of the two markdown files.

11. **Offer to continue into narrative generation.** Ask the author
    (`AskUserQuestion`) whether to move straight into the per-PR sweep of
    Generate mode for this PR, now that `intent` and `assessment` are
    captured. Frame it as optional. Declining just stops here, the same
    as before this step existed. If declined, tell the author the same
    PR can be narrated later with
    `/cobuilder-architect:generate --prs <N>`.

    If the author says yes, ask (the same or a follow-up
    `AskUserQuestion`):
    - `--art image` (Gemini-generated scene art) or `--art diagram`
      (authored Mermaid, see the subagent-authoring rule in Generate mode
      step 4).
    - Whether to include audio narration (`--voice <V>`, or a specific
      voice), or skip audio entirely.

    Then run the per-PR steps of Generate mode above (steps 1 through 4)
    for this PR with the chosen flags. The resumability check of Generate
    mode itself (`verify_bundle.py --prs <N> --json`) already shows this
    PR's `diffs` as `ok` from step 3 above, so diff extraction does not
    repeat. Only `narrative.*`, the ADR pass, `asset.*`/`diagram.*`, and
    audio (if requested) run. This step applies whether the target came
    from step 2's `--prs <N>` branch, or from opening a new PR in
    **Submitting the PR** below (where step 9's render and step 10's
    verify have already run, and this step follows right after it).

### Submitting the PR

Assess first, create second. The assessment is part of the author's
decision about whether to open the PR at all.

1. **Make sure the branch is pushed.** If `git rev-parse --abbrev-ref
   --symbolic-full-name @{u}` finds no upstream, the branch needs
   `git push -u origin <branch>` before `gh pr create` can work.

2. **Confirm once, covering both outward actions.** Show the author the
   rendered description, the base branch, the verdict, and the risk
   tier. Then ask to "push `<branch>` and open a PR against `<base>`".
   Pushing a branch and opening a PR are public actions, and they are
   hard to walk back. **Nothing fires without this confirmation**, not
   with `--force`, and not in `--non-interactive`, which takes the
   `--no-create` path instead.
   - A `rework` verdict does not block anything. Offer three ways
     forward: open it, open it as a draft, or stop and fix first. Let the
     author pick. This mode reports. It never gates.

3. **Create it:**
   ```bash
   gh pr create --base <base> --head <branch> --title "<title>" --body-file docs/pull-requests/branch-<slug>/description.md [--draft]
   ```
   Then read the number back with `gh pr view --json number`.

4. **Continue at pre-stage step 9** with that number.

**Three cases end at the staging directory instead**, and all three are
normal: `--no-create`, `gh` missing or unauthenticated, and the author
declining at step 2. In each case, tell the user where the files landed
(`docs/pull-requests/branch-<slug>/`), print the exact `gh pr create`
line above so nothing gets lost, and say that re-running
`/cobuilder-architect:submit`, once the PR exists, files the content
into `story.json`.

### Post stage

This stage runs after the PR merges. Run the same steps 1 through 4, then:

5. **Compare the merged diff against the `intent` captured pre-merge**,
   and write a second `assessment` with `stage: "post"` and a populated
   `drift` array. `references/review-mode.md` §7 holds the four drift
   kinds, and the rule that matters most: **never rewrite the pre-stage
   `intent`.** Its value comes from being what the author said before the
   change shipped.

   If `intent.design` is set, or the same lookup as pre-stage step 5
   hits, measure `drift` per epic against that epic's slice of the
   design (the epic's outcome, or the design intent as it applies to
   this PR). When `intent.design` is an array, measure drift per epic
   against every named design in turn. Do not measure against the
   whole ADR. No single PR was going to satisfy all of a multi-epic
   design.

   If this merge completes the last epic, roll `goal.stage` to
   `delivered`. If some epics remain, set `goal.stage` to
   `partially-delivered`. Fill that epic's `state` to `merged`. Then run
   `uv run "${CLAUDE_PLUGIN_ROOT}/scripts/build_designs.py"`.

   Stamp `approved_by` on the ADR this design wrote (the proposed record
   in `docs/architecture/adr/`), now that a human has merged it. Then run
   `build_adrs.py`. An agent still must not set `approved` on its own
   initiative at generate time. This post-stage stamp is the human-merge
   signal.

6. Render and verify as in pre-stage steps 9 and 10.

7. **Offer to continue into narrative generation**, the same as
   pre-stage step 11. A PR can reach post stage without ever having been
   narrated (this is exactly the case that motivated adding step 11).
   Check whether the `narrative.*`/`asset.*` keys of `verify_bundle.py`
   are still `missing` for this PR. If so, make the same offer, and ask
   the same two questions (`--art` mode, audio or not), then run the
   per-PR steps of Generate mode as pre-stage step 11 describes.

## Design mode

This mode designs a change before any code exists. It interviews the
engineer, explores options, challenges the approach, and drafts an ADR.
Load `references/design-mode.md` on demand. That file is the source of
truth for what each stage produces. This section is the run order.

This mode is self-only. It needs `uv` and a git repo, never
`GEMINI_API_KEY`. It generates no art and no audio. It writes
`docs/architecture/designs/<name>/` and one proposed ADR. It never enters
`data/story.json`. A design has no PR number. Submit mode later files it
under the number that `gh pr create` returns. Do not implement that join
here.

`--non-interactive` runs stages 0 through 6 and stops before stage 7.

1. **Self-only.** Refuse `--repo` and `--store`. If the user asks to
   design against a foreign checkout, refuse. Normalize the repo with
   `git rev-parse --show-toplevel`. There is no foreign target.

2. **Resolve `<bundle-dir>`** per Hub resolution above, including the
   consumer `.prodyssey` to `.cobuilder-architect` pre-step, then
   **migrate the bundle**:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/scripts/migrate_bundle.py" --bundle-dir <bundle-dir>
   ```

3. **Stage 0 — Name and outcome.** The engineer states the outcome and
   names the design **before** you read a file. The outcome names a
   state, not an activity. Write it into `goal.outcome` and
   `goal.done_when`.

   Then search existing designs for a semantic duplicate. Follow
   `references/design-mode.md` §3. For each candidate under
   `docs/architecture/designs/*/`, read `goal.outcome`, `intent.problem`,
   and the ADR draft. Judge whether the candidate addresses the same
   problem. **Report what you searched and how many designs exist.**
   Never give a bare "none found". If the tree is empty, say so, and say
   this is the first design. If you searched N designs and none match,
   say so. On a hit, show the match and its `goal.stage`. Let the
   engineer choose with `AskUserQuestion`: resume it, supersede it, or
   proceed because it is genuinely different. A superseded design gets
   `stage: "superseded"`, and a pointer to the new name.

4. **Stage 1 — Ground.** **Auto-baseline check.** If
   `<bundle-dir>/data/story.json` or `<bundle-dir>/inventory.yaml` is
   missing, announce "No baseline found, running baseline first" and run
   the full Baseline mode above before continuing. If a baseline exists,
   do not re-run it. Say that baseline will run, then report the elapsed
   time. Do not run it in silence.

   Only read now. Load the districts in `inventory.yaml` that the
   outcome touches. Load the ADRs that cover those districts. Load the
   matching stack card, and earlier timeline entries in the same
   districts. Draft a private hypothesis and a gap list. Keep both
   hidden until stage 2 asks the problem and the approach. See
   `references/interview-guide.md` §2.

5. **Stage 2 — Interview.** Follow `references/design-mode.md` §5 and
   `references/interview-guide.md`. Cover five topics only: problem,
   approach, boundaries, assumptions and unknowns, and stop condition.
   **Do not ask which options they rejected.** A rejected option is an
   outcome of stages 3 and 4, not an input. Never ask a question the
   evidence already answers. Rank the gaps. Drop a topic the ground step
   already closed. Ask the problem first, then the approach, before you
   show the hypothesis from stage 1. Ask authorship as a closed
   question. Play the interview draft back before you move on.
   `alternatives` stays empty. That is correct.

6. **Stage 3 — Explore.** Invoke divergent exploration from the
   architecture skill, with the design frame set. Use the same dual-path
   guard as mermaid authoring (Generate mode step 4) and
   `decision-records-lite.md`:

   1. Invoke `Skill("cobuilder-architect:architecture")` and tell it to
      run divergent exploration with the design frame set. Return
      survivors and risks. Do not write the ADR here.

   2. If that call gives `Unknown skill`, read
      `${CLAUDE_PLUGIN_ROOT}/skills/architecture/SKILL.md` and
      `${CLAUDE_PLUGIN_ROOT}/skills/architecture/references/divergent-exploration.md`
      and obey those files instead. The skill resolves by name only in a
      session that has an installed plugin version which contains it. A
      session that runs from a development checkout, or from an
      installed version older than the skill, does not find it. The path
      always resolves, because `${CLAUDE_PLUGIN_ROOT}` points at the copy
      in use.

   State the pre-flight gate result before you proceed either way. The
   approach the engineer stated is one candidate, not the given one.
   Seed the frames with the interview answers. Survivors and the risk
   list feed stage 4.

7. **Stage 4 — Challenge gate.** Follow `references/design-mode.md` §7 in
   full. This stage is the product. It is the only producer of
   `intent.alternatives`. A skipped or toothless challenge is a defect.

   Confront unconsidered risks. Contest the approach where a survivor
   beats it on a stated criterion. **No citation, no challenge.** A
   challenge must cite an ADR id, a district id from `inventory.yaml`, or
   a stack-card boundary rule. Never cite a `path:line` location, because
   no line exists yet.

   State an empty result in plain words. Write the sentence the engineer
   should read: exploration surfaced no risk outside what they already
   named, and no survivor beat the stated approach. That sentence proves
   the stage ran. **Do not continue to stage 5 if `alternatives` is
   still empty and the challenge was silent.**
   `goal.min_work.challenge_stage_run` must be true before the design
   can complete.

8. **Stage 5 — Draft.** Write the assessment first (`stage: "design"`,
   every finding `kind: "prediction"`). Follow
   `references/design-mode.md` §8. Show `intent` and `assessment` to the
   engineer before you write them to disk.

   Then write four artifacts. Run each prose pass through
   `Skill("cobuilder-architect:ste-writing")` in flavored mode. If that
   call gives `Unknown skill`, read
   `${CLAUDE_PLUGIN_ROOT}/skills/ste-writing/SKILL.md` directly and obey
   that file instead. Use strict mode for ADR procedural text: the
   constraint introduced, and the boundary rules. The plugin ships no
   hooks, so "automatic" means this section instructs the step.

   1. **ADR.** Write `docs/architecture/adr/ADR-NNNN-<slug>.md` from
      `skills/architecture/references/templates/adr-template.md`. Set
      `state: decided` and `source_pr: null`. Copy `alternatives` from
      `intent`. Then run:
      ```bash
      uv run "${CLAUDE_PLUGIN_ROOT}/scripts/build_adrs.py"
      ```
      Never write `data/adrs.json` by hand.

   2. **Diagrams.** The orchestrating Claude does **not** write the
      `.mmd` files itself. Spawn one subagent. Its prompt must:
      - tell it to invoke `Skill("cobuilder-architect:mermaid")` first.
        If that call gives `Unknown skill`, tell it to read
        `${CLAUDE_PLUGIN_ROOT}/skills/mermaid/SKILL.md` directly, and
        obey that file instead. The skill resolves by name only in a
        session that has an installed plugin version containing it. A
        session that runs from a development checkout, or from an
        installed version older than the skill, does not find it. The
        path always resolves, because `${CLAUDE_PLUGIN_ROOT}` points at
        the copy in use.

      - then tell it to read
        `${CLAUDE_PLUGIN_ROOT}/skills/odyssey/references/diagram-mode.md`.

      - hand it the grounding inputs: this design's `intent`, the ADR
        draft, and `<bundle-dir>/inventory.yaml`. Ground each diagram in
        the proposal, not a diff, because there is no PR number yet.

      - state the three output paths and the diagram type each one
        needs: `docs/architecture/designs/<name>/diagrams/level-1.mmd`
        (`C4Container`),
        `docs/architecture/designs/<name>/diagrams/level-2.mmd`
        (`sequenceDiagram`), and
        `docs/architecture/designs/<name>/diagrams/level-3.mmd`
        (`classDiagram`). Level 4 has no diagram.

      - require the subagent to return only the paths it wrote.

      Do not write `data/diagrams/pr{N}-*.mmd`. Do not run
      `build_diagrams.py`, because that script keys on a PR number. If
      validation of a source file fails, send the failure back to the
      **same** subagent to fix it. Do not hand-patch the `.mmd` files
      yourself.

   3. **Envisioned pull request.** Write
      `docs/architecture/designs/<name>/pr-draft.md` from
      `pr-description-template.md`.

   4. **Intent, assessment, and goal.** Write `intent.json`,
      `assessment.json` (`stage: "design"`), and `goal.json` under
      `docs/architecture/designs/<name>/`. Then run
      `uv run "${CLAUDE_PLUGIN_ROOT}/scripts/build_designs.py"`.

9. **Stage 6 — Review routing.** Follow `references/design-mode.md` §10.
   The engineer reads the draft and answers in the session. Material
   feedback returns to stage 3. Cosmetic feedback returns to stage 5.
   Wording, diagram layout, and ADR order are cosmetic. **State the
   classification. Let the engineer overrule it.**

   Detect churn. Each round, hash the ADR draft plus the option set. Two
   consecutive rounds with no material change mean the loop circles. Say
   so, name the unresolved disagreement, and ask the engineer to decide.
   Do not run a third unchanged round. Re-read `goal.json` at the top of
   every round, and restate the outcome. `goal.limits` defaults to warn
   after three rounds, and it cuts off at six. Do not ask for a budget.

10. **Stage 7 — Branch.** Unreachable under `--non-interactive`, because
    nobody is there to confirm. Ask **one question only**, with
    `AskUserQuestion`: is this one pull request or several? If several,
    capture the epic slugs the engineer names. **Do not decompose the
    work.** Decomposition is cobuilder-factory G1 work.

    Then confirm the first branch name with `AskUserQuestion`. Create the
    **first local branch only**:
    - One epic: `design/<name>`

    - Several epics: `design/<name>/<first-epic-slug>`

    Record it in `goal.json.epics[].branch`. No push. No `gh pr create`.
    No other remote action.

## Notes

- Narrative authoring and ADR extraction are Claude judgment work. Never
  delegate their content to a script. Scripts only move data (diffs,
  prompts, audio, bundle verification). Diagram authoring is also Claude
  judgment work, but it runs one step further removed. The orchestrating
  Claude never writes `.mmd` files itself. It delegates that to a per-PR
  subagent (see Generate mode, step 4), and only calls a script
  (`build_diagrams.py`) to compile and validate the subagent's output
  into `data/diagrams.js`. The author interview and the architecture
  assessment are the same kind of work. `render_review.py` lays out the
  result and judges none of it.

- Never touch application source in `<target>`. The sanctioned writes
  are `<target>/.cobuilder-architect/` (the self-bundle),
  `<hub>/.cobuilder-architect/` (centrally-stored bundles and
  view-server bookkeeping), and `docs/` (self-only: ADRs, designs,
  reviews, pull-request files). `<target>/.env` is a read-only check,
  never written by this skill. `git push` and `gh pr create` in Submit
  mode are the only actions that reach past this line. They never write
  a source file, and they run only after the explicit confirmation in
  Submit mode. Design mode writes `docs/`, and creates the first local
  branch after confirmation. It never pushes, and never opens a pull
  request.

- `meta.schema_version` in `story.json` is `"1.2"`. `verify_bundle.py`
  gates on it. `scripts/_bundle_meta.py` is the single source for that
  constant.

- The `intent` and `assessment` fields of Submit mode live on the
  timeline entry, not in a file of their own. That is what puts them
  under the authored-field guard of `migrate_bundle.py`, and it is why
  the viewer needs no new global to render them.

- The PID and log files of View mode, and the `active` symlink, live
  under `<hub>/.cobuilder-architect/`, never inside a bundle directory.
  Those two files, plus `active`, are the only entries meant to stay out
  of the commit.

- The `exports/` folder of Publish mode (per-PR HTML, `index.html`,
  `publish-manifest.json`) lives inside `<bundle-dir>`. It is
  committable the same way `data/` and `assets/` are, because it is the
  durable record of what has been published, and from what version, not
  disposable build output.
