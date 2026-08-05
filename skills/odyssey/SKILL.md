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
  serves the bundle locally for viewing. Use when the user asks to "generate codebase
  odyssey", "generate story for PR", "odyssey baseline", "prodyssey", "narrated PR
  story", "tell the story of this PR as scene art", "explain this PR as a story",
  "build the odyssey bundle", "refresh odyssey baseline", "view the odyssey bundle",
  "serve the bundle", "open the viewer", "start the odyssey server", "stop the
  odyssey server", "publish the odyssey", "submit this PR", "review my PR", "review
  this branch before I open a PR", "architecture review", "should we merge this",
  "will we regret this change", "interview me about this change", or invokes
  `/prodyssey:baseline`, `/prodyssey:generate`, `/prodyssey:view`,
  `/prodyssey:publish`, or `/prodyssey:submit`.
---

# Codebase Odyssey Generator

Orchestration procedure for turning merged PRs of **any locally checked-out git
repo** — the session's own repo, or any other checkout reached via `--repo` — into
a portable bundle: four-level narrated story, scene art, TTS narration, and ADR
retro-extraction. It also runs Submit mode, which interviews a change's author,
assesses the change against that bundle, and opens the pull request.

**This skill never edits the target repo's source.** It only writes into the
bundle directory (`<bundle-dir>`, see Hub resolution below). Baseline, Generate,
View, and Publish are read-only against the target beyond that. Submit mode is
the one exception, and it is narrow: after an explicit confirmation, it pushes
the branch and runs `gh pr create`. It still writes no source file, and it takes
no other outward action — no comments, no edits to an existing PR body, no
labels, no reviewers, no merges. See Submit mode.

Where that bundle actually lands depends on whether the target is the
session's own repo or a foreign one. Every bundle lives under one parent,
`<hub>/.prodyssey/`. Self-analysis bundles land at
`<hub>/.prodyssey/self/` — because target and hub are the same repo in
that case, this sits inside the analyzed repo and is committed alongside
its code. Foreign-repo bundles land at `<hub>/.prodyssey/<repo-slug>/`.
See Hub resolution below for the exact rule.

Reference material lives in `references/` and is loaded on demand, not inlined here.
Scripts live in `scripts/` and are called via `uv run`, never edited by the skill.

## Target resolution

`<target>` — the repo being analyzed — is resolved in this order:

1. An explicit `--repo <path>` argument forwarded by the command. This may be ANY
   local checkout, not just the repo the session is running in (e.g.
   `/prodyssey:generate --repo ~/code/other-project --prs 12`).
2. Otherwise: the git toplevel of the session's working directory.

When `--repo` points outside the session's working directory, narrative authoring
requires read access to that path. If reads are being denied, tell the user to run
`/add-dir <path>` (or add the path to their permissions) and retry — do not work
around it by guessing at file contents. If `--store local` is also in effect for
that path, write access is needed too (`/add-dir` grants both read and write, so
one ask covers it). All script invocations below pass the resolved path as
`--repo <target>`. The storage rule in Hub resolution below determines
where the bundle actually lands (`<bundle-dir>`), overridable with
`--store local|central`.

## Hub resolution

`<hub>` — the local scratch root for bookkeeping and for centrally-stored
bundles — resolves the same way `<target>` falls back in step 2 above: the
git toplevel of the session's own working directory. `--repo` never
affects `<hub>`. It is always about the session's own checkout, not the
repo being analyzed.

**Storage rule** — where a given invocation's bundle actually lives:

- **Self-analysis** (no `--repo` given, or `--repo` resolves to the same repo
  as `<hub>` — i.e. `<target>`'s git toplevel equals `<hub>`): the bundle lives
  at `<hub>/.prodyssey/self/`. `self` is a **fixed literal, never a computed
  slug** — do not "fix" this into a hashed slug. The slug hash (below) is a
  `shasum` of the resolved absolute target path. A self-bundle committed
  under a hashed name would be undiscoverable from any other clone
  location. A teammate who clones the repo to a different path computes a
  different hash, and silently lands on a new, empty bundle instead of the
  one already committed. `self` is clone-portable. Slugs never leave the
  hub where the invocation computed them, so their path-dependence is
  harmless.
- **Foreign repo** (`--repo <other-path>` resolves to a DIFFERENT repo than
  `<hub>`): the bundle lives at `<hub>/.prodyssey/<repo-slug>/`, unchanged.

An optional `--store local|central` flag overrides the automatic rule
regardless of the self/foreign check: `--store local` forces
`<target>/.prodyssey/self/`, `--store central` forces
`<hub>/.prodyssey/<repo-slug>/`. This preserves today's meaning of `local`
(writing into the target repo itself). Note that for self-analysis the two
branches converge — `<target>` and `<hub>` are the same repo, so
`--store local` is a no-op there. Do not read `local` as
"`<hub>/.prodyssey/self`" instead. That reading would put a *foreign*
repo's bundle under `self/` whenever a user passes `--store local` for it,
breaking the invariant that makes the fixed literal safe to leave
un-slugged.

Compute `<repo-slug>` once per invocation whenever the foreign path applies:

```bash
REMOTE=$(git -C "<target>" remote get-url origin 2>/dev/null)
NAME=$(basename "${REMOTE:-<target>}" .git)
NAME=$(printf '%s' "$NAME" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9' '-' | sed 's/-\{1,\}/-/g; s/^-//; s/-$//')  # POSIX \{1,\} is deliberate: \+ is GNU-only and a silent no-op on macOS/BSD sed
HASH=$(printf '%s' "<resolved-abs-target-path>" | shasum | cut -c1-8)
SLUG="${NAME}-${HASH}"
```

Then set `<bundle-dir>` once, at the top of every baseline/generate invocation:

```bash
STORE_MODE="<local|central, from --store if the user passed it, else empty>"
HUB_TOPLEVEL=$(git -C "<hub>" rev-parse --show-toplevel)
TARGET_TOPLEVEL=$(git -C "<target>" rev-parse --show-toplevel)

if [ "$STORE_MODE" = "central" ] || { [ "$STORE_MODE" != "local" ] && [ "$HUB_TOPLEVEL" != "$TARGET_TOPLEVEL" ]; }; then
  BUNDLE_DIR="$HUB_TOPLEVEL/.prodyssey/$SLUG"
else
  BUNDLE_DIR="$TARGET_TOPLEVEL/.prodyssey/self"
fi
```

(`<repo-slug>`/`$SLUG` is computed only when the foreign path applies — see
above.) `<bundle-dir>` is the only path Baseline, Generate, and Publish modes
ever write to. No mode references a literal bundle path directly. Submit mode
writes there too, and its `git push` / `gh pr create` are the only actions that
reach outside it.

**Legacy layout detection.** Compute `BUNDLE_DIR` above, then check this
immediately — reached by all five modes, since Step 0's prereq gate is
skipped by View, Publish, and Submit. If `$BUNDLE_DIR` does not exist but
a legacy `<target>/.odyssey/` does, STOP. Tell the user their bundle
predates the `.prodyssey/self` layout, and print the exact command:
```
git -C <target> mv .odyssey .prodyssey/self
```
Do not perform the move yourself, and do not fall through to "no baseline
found". Two reasons make this detect-but-not-migrate rather than an
automatic fix. First, auto-running `git mv` inside a user's repo
contradicts this skill's own "never edits the target repo's source"
posture. Second, without this check, Generate mode's auto-baseline check
(below) would find nothing at the new path, announce "No baseline
found", and silently regenerate over hand-authored narrative at real
Gemini API cost. This block is removable once legacy `.odyssey/` layouts
are no longer expected in the wild.

Whenever `<bundle-dir>` resolves under `<hub>/.prodyssey/` and
`<hub>/.prodyssey/` does not exist yet, create it (`mkdir -p`) and check
whether the hub's `.gitignore` already covers its four bookkeeping entries.
If not, print exactly these four lines for the user to add manually:
```
.prodyssey/.view-server.pid
.prodyssey/.view-server.log
.prodyssey/active
.prodyssey/*/.migration-backup/
```
Do NOT edit `.gitignore` yourself, and **never suggest ignoring `.prodyssey/`
as a whole** — bundles are meant to be committed alongside the code they
narrate. A narrative that is not in the repo is not doing its job. Only
these four entries are exceptions:

- `.view-server.pid` and `.view-server.log` are process bookkeeping for a
  server that only ever exists on one machine.
- `active` is a symlink holding an ABSOLUTE path. Committing it both
  breaks in every other clone (the path will not exist there) and churns
  the diff on every view switch.
- `<bundle-dir>/.migration-backup/` holds `migrate_bundle.py`'s
  pre-migration backup of `story.json`, kept only until the next
  successful migration proves the bundle sound, not a durable record
  worth committing.

This applies the first time *any* mode (Baseline, Generate, or View)
creates the directory, not just View mode. It is also a one-time notice,
not a durable reminder: once `<hub>/.prodyssey/` exists, later invocations
skip the check even if the user never actually added the suggested
lines.

## Step 0 — Prereq gate (hard, before ANYTHING generative)

Applies to **baseline** and **generate** modes. **View, Publish, and Submit
modes are exempt**:

- View only serves static files already on disk (needs neither `uv` nor
  `GEMINI_API_KEY`).
- Publish only flattens/publishes what is already generated (needs `uv`
  for its export scripts, but not `GEMINI_API_KEY`).
- Submit reads git and writes markdown (needs `uv` and a git repo, but
  never calls Gemini — its narrative work is Claude's judgment, and it
  generates no art or audio).

See each mode's own section below.

Run this before any other step, every baseline/generate invocation:

1. Confirm `<target>` is a git repo: `git -C <target> rev-parse --is-inside-work-tree`.
   If it fails, STOP — this is not a git checkout.
2. Confirm `uv` is on PATH (`which uv`). If missing, STOP and tell the user to install
   `uv` (https://docs.astral.sh/uv/getting-started/installation/).
3. Confirm `GEMINI_API_KEY` is available: check the environment, then check for a
   `.env` file in `<hub>` containing `GEMINI_API_KEY=`. Never check `<target>`
   for this — `<target>` is an untrusted repo, and its `.env` must never load
   into this process. The scripts resolve `.env` from the working directory,
   not from either script's own path. Always run them from inside `<hub>` —
   the same directory this gate checks. If **neither** is present, STOP before
   running any script and print:

   ```
   GEMINI_API_KEY is required for voice narration (and scene art, unless
   --art diagram is in effect).
   Get one at https://aistudio.google.com/apikey, then either:
     export GEMINI_API_KEY=<key>
   or add it to <hub>/.env:
     GEMINI_API_KEY=<key>
   ```

   Voice narration always calls Gemini, so this gate stands regardless of
   `--art`. Do not run `generate_prompts.py --generate` or `generate_audio.py`
   without a confirmed key. Narrative authoring, ADR extraction, and diagram
   authoring (none of which call Gemini) may still proceed if the user
   explicitly asks for text-only or diagram-only output. But the default
   `generate` sweep always needs the key for narration, and must stop here if
   the key is absent.

Only after all three checks pass does mode dispatch begin.

## Mode dispatch

The invoking command passes a mode (`baseline`, `generate`, `view`, `publish`,
or `submit`) plus forwarded args (`--repo`, `--store`, `--prs`, `--force`,
`--voice`, `--art`, `--dry-run`, `--port`, `--stop`, `--list`, `--format`,
`--style`, `--stage`, `--branch`, `--base`, `--draft`, `--no-create`,
`--non-interactive`).
If invoked with no mode, ask the user whether they want `baseline`,
`generate`, `view`, `publish`, or `submit`.

## Baseline mode

Derives the repo's architecture baseline into `<bundle-dir>` (computed per Hub
resolution above). Follow `references/baseline-derivation.md` for the full
procedure. Summary:

1. Run the seed extraction:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/scripts/extract_story.py" --repo <target> --bundle-dir <bundle-dir> --dry-run
   ```
   (drop `--dry-run` once ready to write) — this creates `data/story.json` from
   `inventory.yaml` if `story.json` does not exist yet, and writes `data/story.js` +
   `data/manifest.js`.
2. Detect the stack(s) per `references/stacks/README.md` detection precedence
   (most-specific card first, `generic.md` fallback). Polyglot repos load one card
   per matched sub-tree.
3. Derive the district map and per-district summaries per
   `references/baseline-derivation.md`. Author labels/kinds/blurbs directly into
   `world.districts` in `story.json`, and write `<bundle-dir>/inventory.yaml`.
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

Re-runnable any time, and refreshes in place. Never overwrites human-authored narrative
fields already present in `story.json` (that discipline lives in `extract_story.py`
and in how you write district blurbs — treat existing text as authored, not
scratch).

## Generate mode

Per-PR narrative + ADR + art + audio sweep. Steps:

1. **Auto-baseline check**: if `<bundle-dir>/data/story.json` or
   `<bundle-dir>/inventory.yaml` is missing, announce "No baseline found —
   running baseline first" and execute the full Baseline mode above before
   continuing.
2. **Migrate the bundle**, so the sweep below never runs against a stale
   viewer copy or an outdated data shape:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/scripts/migrate_bundle.py" --bundle-dir <bundle-dir>
   ```
3. **Resolve the PR list**: use `--prs` if given (comma list, range `N..M`, or
   `--latest`). Otherwise let `extract_story.py`'s discovery surface the most
   recent PRs (merge commits → squash `(#N)` → `gh` fallback) and confirm the last
   10 with the user before proceeding.

   `--prs N` can resolve to either a merged commit or a currently-open PR.
   The `gh` fallback checks `mergedAt`/`mergeCommit` and, if both are empty,
   treats N as open — diffing against the local merge-base of its head and
   base branches instead of a merge/squash commit. Open-PR entries are tagged
   `"status": "open"` in `story.json` and reflect the PR's diff as of
   generation time, not settled history. Re-running generate mode with
   `--force` for that PR after new commits land on its branch refreshes the
   size/touched/diff/narrative for the new tip. It does not treat the
   original snapshot as immutable the way a merged PR's snapshot is.


4. **Per PR**, run the resumability check first and only execute stages which
   artifacts are missing (or all stages if `--force`):
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/scripts/verify_bundle.py" --bundle-dir <bundle-dir> --prs <N> --art <mode> --json
   ```
   (`<mode>` is this invocation's `--art` value, below — default `both`.)
   The result's `prs.<N>` map tells you, per artifact key, `"ok"` or `"missing"`.
   Execute only the missing stages, **in this order**:

   1. **Narrative authoring** (Claude work, not a script). Follow
      `references/story-mode.md`. The register is selected by `--style
      kleppmann|ste` (default `kleppmann`) — see `references/story-mode.md`
      §3 for both. Ground every claim in three sources: the diff, the touched
      files in `<target>`, and `<bundle-dir>/inventory.yaml`. Get the diff
      from `extract_diffs.py`'s output, and run that script first if the
      diff is not extracted yet.
      **Read this PR's `intent` block first when it has one** — submit mode
      captured the author's stated problem, approach, and rejected
      alternatives, so do not re-derive them from the diff. See
      `references/story-mode.md`'s opening for what carries over and what
      does not.
      Author the four levels (`landscape`, `problem_solution`, `architecture`,
      `file_changes`), plus the tagline and the `voice` scripts. Write all of
      it directly into `data/story.json` for this PR. **`problem_solution` and `architecture`
      each also need a `beats` array** (`{"kind": ..., "text": ...}` items) —
      this is what the viewer's Background/Intuition and Forces/Contract/
      Boundary cards actually render. `problem`/`solution`/`forces`/`decision`
      alone are not enough. See `references/story-mode.md` §2a for the exact
      `kind` values per level and worked guidance.
   2. **ADR retro-extraction**. Follow `references/decision-records-lite.md`.
      Write/update `data/adrs.json` and `data/adrs.js`, and set this PR's `adrs[]`
      array in `story.json` to the resulting record ids. When the PR carries an
      `intent` block, §7 of that reference applies: take `alternatives` from
      the author instead of hunting for traces of them, and mark the record
      `provenance: authored`. An unmerged PR's record is `state: proposed`,
      not `approved` (§3.2).
   3. **Diff extraction**:
      ```bash
      uv run "${CLAUDE_PLUGIN_ROOT}/scripts/extract_diffs.py" --repo <target> --bundle-dir <bundle-dir> --prs <N>
      ```
   4. **Diagram authoring** — skipped when `--art image` is in effect (see
      below). The orchestrating Claude does **not** write the `.mmd` files
      itself. For each PR in this stage, spawn one subagent whose prompt
      must:
      - tell it to invoke `Skill("prodyssey:mermaid")` first. If that call
        gives `Unknown skill`, tell it to read
        `${CLAUDE_PLUGIN_ROOT}/skills/mermaid/SKILL.md` directly and obey
        that file instead. The skill resolves by name only in a session
        that has an installed plugin version which contains it. A session
        that runs from a development checkout, or from an installed version
        older than the skill, does not find it. The path always resolves,
        because `${CLAUDE_PLUGIN_ROOT}` points at the copy in use.
      - then tell it to read
        `${CLAUDE_PLUGIN_ROOT}/skills/odyssey/references/diagram-mode.md`.
      - hand it the grounding inputs: this PR's timeline entry in
        `<bundle-dir>/data/story.json`, its extracted diff
        (`<bundle-dir>/data/diffs-pr{N}.js`), and
        `<bundle-dir>/inventory.yaml`.
      - state the three output paths and the diagram type required for
        each: `<bundle-dir>/data/diagrams/pr{N}-level1.mmd` (`C4Container`,
        PR landscape), `<bundle-dir>/data/diagrams/pr{N}-level2.mmd`
        (`sequenceDiagram`, problem and solution), and
        `<bundle-dir>/data/diagrams/pr{N}-level3.mmd` (`classDiagram`,
        architecture). Level 4 has no diagram.
      - require the subagent to return only the paths it wrote.

      Then compile and validate:
      ```bash
      uv run "${CLAUDE_PLUGIN_ROOT}/scripts/build_diagrams.py" --repo <target> --bundle-dir <bundle-dir> --prs <N>
      ```
      This writes `<bundle-dir>/data/diagrams.js` from the `.mmd` sources
      and checks each file for the right diagram type per level and
      balanced brackets (`--strict` adds a mermaid-cli parse check). If
      validation fails, send the failure back to the **same** subagent to
      fix the source file — do not hand-patch the `.mmd` files yourself.
   5. **Scene-art prompts + generation** — skipped when `--art diagram` is
      in effect (see below):
      ```bash
      uv run "${CLAUDE_PLUGIN_ROOT}/scripts/generate_prompts.py" --repo <target> --bundle-dir <bundle-dir> --prs <N> --generate
      ```
   6. **Voice narration**:
      ```bash
      uv run "${CLAUDE_PLUGIN_ROOT}/scripts/generate_audio.py" --repo <target> --bundle-dir <bundle-dir> --prs <N>
      ```
      Pass `--voice <V>` if the user specified one.

   `--force` regenerates every stage regardless of `verify_bundle.py`'s result.
5. **Final verify**: re-run `verify_bundle.py --prs <all-selected> --art
   <mode> --json` (`<mode>` is this invocation's `--art` value) and report a
   per-PR artifact table (which stages ran, which were skipped as already
   complete, which failed).

### `--art` flag

`--art both|diagram|image` selects which visual family generate mode
produces for levels 1 through 3 (level 4 has neither). Default: `both`.

- `both` — runs diagram authoring (step 4) and scene art (step 5). This is
  today's behavior plus diagrams.
- `diagram` — runs diagram authoring, skips scene art entirely. No Gemini
  image calls for this sweep.
- `image` — skips diagram authoring, runs scene art. Matches the pre-diagram
  behavior exactly.

Pass the same `--art <mode>` value to `verify_bundle.py` in both the
resumability check (step 4's preamble) and the final verify (step 5). This
way resumability tracks whichever family this invocation actually asked
for, instead of reporting the untouched family as missing.

## View mode

Serves the currently selected bundle's `viewer/` as a static site in the
background — the session keeps going, the user gets a URL to open. No Gemini
call, no `uv`, just `python3`'s stdlib `http.server`, bound to localhost only.

One long-lived server process per hub, rooted at `<hub>/.prodyssey/` itself
(never at a bundle's `viewer/` subfolder directly — see below), always serving
`http://localhost:<port>/active/viewer/`. Switching which bundle is being
viewed is just repointing a symlink. It never requires restarting the server.

**Why the server is rooted one level up.** `viewer/index.html` requests
`../data/story.js`, `../data/manifest.js`, etc. `data/` is a SIBLING of
`viewer/`, not a child of it. A server rooted directly at `<bundle-dir>/viewer/`
404s on every one of those requests. The server must be rooted at the bundle
ROOT (parent of `viewer/` and `data/`), and the reported/requested URL must
include the `/viewer/` path segment. (Confirmed via curl this session: 404
from `<bundle-dir>/viewer/` root, 200 once served from `<bundle-dir>` — the
bundle root — with `/viewer/index.html` requested.)

`python3 -m http.server` also correctly follows symlinks. Both the symlink
itself and the relative `../data/...` requests made through pages served
via the symlink resolve correctly (confirmed via curl this session). This
is what makes the one-server-plus-symlink design below work.

### Layout

`<hub>/.prodyssey/` holds:
- `self/` — the hub's own self-analysis bundle (the repo that contains this
  `.prodyssey/`), and one subfolder per foreign-repo bundle (`<repo-slug>/`).
  Each is a peer full bundle root (`data/`, `viewer/`, `assets/`), created by
  Baseline/Generate mode per the storage rule in Hub resolution above. Harmless
  side effect worth knowing so nobody "fixes" it later: `self/` is therefore
  also directly reachable at `http://localhost:<port>/self/viewer/`, in
  addition to the usual `/active/viewer/`.
- `active` — a symlink to the ABSOLUTE path of whichever bundle root is
  currently selected for viewing. Usually points at a
  `<hub>/.prodyssey/self/` or `<hub>/.prodyssey/<slug>/` entry, but for a
  foreign bundle stored with `--store local` it points outside the hub
  entirely, at `<other-target>/.prodyssey/self/` — that is fine, `http.server`
  follows symlinks (see below).
- `.view-server.pid` / `.view-server.log` — the one long-lived server process
  for this hub.

Compute `<hub>` per Hub resolution above. `<hub>/.prodyssey/` may already exist
from a prior Baseline/Generate run (same `mkdir -p` + `.gitignore` check
applies — see Hub resolution).

### Steps

1. **Lightweight check**: confirm `python3` is on PATH.

2. **Discover known bundles** — needed for selection, `--list`, and the
   auto-select case:
   - Entries: immediate children of `<hub>/.prodyssey/` that are real
     directories, NOT symlinks — e.g. `find <hub>/.prodyssey -mindepth 1 -maxdepth 1 -type d`
     (`-type d` without `-L` naturally excludes the `active` symlink even
     though it points at a directory. Do not use a glob like `*/`, which
     follows symlinks and would wrongly include `active` as if it were its
     own bundle). Also excludes `.view-server.pid`/`.view-server.log` since
     those are files, not directories.
   - For each, read `data/story.json`'s `meta.repo` and `meta.generated`
     fields to build a human-readable label (repo name + generation date).
     Skip an entry whose `story.json` is missing or unreadable rather than
     failing discovery outright — note it as incomplete if listing. When an
     entry's directory name is `self`, label it "(this repo)" so it is
     distinguishable from a slug entry in the picker.

3. **`--list`**: print the discovered list from step 2 (label + path per
   entry) and STOP. Do not start or switch anything.

4. **`--stop`**: kill this hub's server and STOP — do not start a new one:
   ```bash
   PIDFILE="<hub>/.prodyssey/.view-server.pid"
   LOGFILE="<hub>/.prodyssey/.view-server.log"
   if [ -f "$PIDFILE" ] && ps -p "$(cat "$PIDFILE")" -o command= | grep -q "http.server"; then
     kill "$(cat "$PIDFILE")"
     echo "stopped"
   else
     echo "no server running for this hub"
   fi
   rm -f "$PIDFILE" "$LOGFILE"
   ```
   (The PID/log files live under `<hub>/.prodyssey/` rather than `/tmp` so
   they stay scoped per hub. They and `active` are the only three entries under
   `.prodyssey/` that should be gitignored — see the gitignore-suggestion
   paragraph in Hub resolution above. Everything else under `.prodyssey/` is a
   committed bundle, not scratch.)

5. **Select which bundle to view**:
   1. `--repo <path>` given → resolve the storage rule in Hub resolution above
      to a primary candidate bundle-dir. If `data/story.json` is missing
      there, probe the OTHER candidate before giving up — i.e. if the
      primary was `<target>/.prodyssey/self`, try
      `<hub>/.prodyssey/<repo-slug>`, and vice versa — and report which of the
      two was actually found. This is what makes bundles stored with
      `--store local` findable even though the storage rule's default guess
      would otherwise miss them. Only if BOTH candidates lack
      `data/story.json` does this fall through to the "no baseline found"
      handling below. No prompt either way.
   2. No `--repo`, and step 2's discovery found exactly one bundle total →
      auto-select it. No prompt.
   3. No `--repo`, and discovery found multiple bundles → present the list
      from step 2 (label + date per entry) and use the `AskUserQuestion` tool
      to ask the user which one to view.
   4. No `--repo`, and discovery found zero bundles → tell the user to run
      `/prodyssey:baseline` first and STOP.

   Whichever bundle-dir is selected, confirm `data/story.json` and
   `viewer/index.html` exist under it before proceeding. If not, STOP and
   tell the user to run `/prodyssey:baseline` for that repo first (same
   remediation as 5.4). This also covers the case where `--repo` pointed at
   a real repo that just has not been baselined yet, or was baselined with a
   different `--store` mode than the one this resolution assumed.

6. **Migrate the bundle**, so a stale viewer copy or an outdated data shape
   never reaches the browser:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/scripts/migrate_bundle.py" --bundle-dir <absolute-selected-bundle-dir>
   ```

7. **Point `active` at the selection**:
   ```bash
   ln -sfn "<absolute-selected-bundle-dir>" "<hub>/.prodyssey/active"
   ```

8. **Reuse or start the server**:
   ```bash
   PIDFILE="<hub>/.prodyssey/.view-server.pid"
   LOGFILE="<hub>/.prodyssey/.view-server.log"
   REQUESTED_PORT="<value of --port if the user passed it, else 0 for an OS-assigned port>"
   if [ -f "$PIDFILE" ] && ps -p "$(cat "$PIDFILE")" -o command= | grep -q "http.server"; then
     RUNNING_PORT=$(grep -o "port [0-9]*" "$LOGFILE" | tail -1 | grep -o "[0-9]*")
     echo "already running on port $RUNNING_PORT — active bundle switched, just refresh the browser tab"
   else
     nohup python3 -u -m http.server "$REQUESTED_PORT" --bind 127.0.0.1 --directory "<hub>/.prodyssey" > "$LOGFILE" 2>&1 &
     echo $! > "$PIDFILE"
   fi
   ```
   If a server is already running for this hub, do NOT start a second one —
   repointing `active` (step 7) is enough. The running server picks up the new
   symlink target on its next request, no restart needed. Just report the
   existing port/URL and tell the user to refresh. Note that `--port` has no
   effect in this branch, since it only applies to a fresh start. If the user
   explicitly passed `--port` while a server is already running on a
   different port, tell them so rather than silently ignoring it. Run the
   start branch as a normal (non-backgrounded-tool-call) Bash invocation —
   the trailing shell `&` detaches the server process itself, so the tool
   call returns immediately with nothing left running in its own foreground.
   Do not use the Bash tool's own `run_in_background` option here. That option
   is for commands that eventually finish, and this one never does.

9. **Confirm a fresh start actually came up** (skip this if step 8 reused an
   existing server): poll the log briefly rather than a single fixed sleep —
   `http.server` startup time varies under load:
   ```bash
   for i in 1 2 3 4 5 6 7 8 9 10; do
     grep -q "Serving HTTP" "$LOGFILE" 2>/dev/null && break
     sleep 0.3
   done
   cat "$LOGFILE"
   ```
   If a `Serving HTTP on ... port NNNNN ...` line appears, parse the port out
   of it. If it does not appear within the poll window, treat it as a failed
   start — the cause may be a port collision (`--port <N>` pointed at
   something already listening), a permission error, or something else.
   Show the log contents to the user verbatim and STOP. Never report a URL
   that has not been confirmed live.

10. **Report the URL**: `http://localhost:<port>/active/viewer/`. Tell the
    user the server keeps running in the background, so the session is free
    to continue. Tell them that switching bundles later is just re-running
    `/prodyssey:view --repo <other>` (or answering the picker) and
    refreshing the tab. Tell them that `/prodyssey:view --stop` shuts the
    server down entirely.

## Publish mode

Flattens already-generated PRs into self-contained Claude Artifacts — one per
PR, plus an index artifact linking to all of them. Publish mode is a
consumer of an existing bundle, not a generator: it needs `uv` (to run the
export scripts) but not `GEMINI_API_KEY`, and does not touch `<target>` at all.

1. **Resolve `<bundle-dir>`** per Hub resolution above (same `--repo`/`--store`
   rules as every other mode — nothing new here).
2. **Resolve `--format`** (default `artifact`). Anything other than `artifact`
   — right now that is just `notion` — is a recognized, reserved value with no
   implementation yet. Report that clearly ("`--format notion` is not
   implemented yet") and STOP rather than falling through to the artifact
   path silently.
3. **Resolve the PR list** from `--prs` (comma list or `N..M` range, same
   parsing as Generate mode). For each requested PR, confirm it exists in
   `<bundle-dir>/data/story.json`'s timeline. If any do not, tell the user to
   run `/prodyssey:generate --prs <N>` first and STOP before publishing any
   of the others (a partial publish from a partially-valid PR list is more
   confusing than refusing up front).
4. **Migrate the bundle**, before any export runs. This makes the stale-viewer
   export error self-healing:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/scripts/migrate_bundle.py" --bundle-dir <bundle-dir>
   ```
   `export_artifact.py`'s own verbatim guard against the viewer copy stays in
   place regardless, as a backstop — it should now never fire.
5. **Per PR**, in order:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/scripts/export_artifact.py" --bundle-dir <bundle-dir> --prs <N>
   ```
   This writes `<bundle-dir>/exports/pr-<N>.html` and updates that PR's entry
   in `<bundle-dir>/exports/publish-manifest.json`, printing whether the
   commit or narrative content changed since the last export. Read
   `publish-manifest.json` after the script runs (it prints the path) to get
   this PR's current `artifact_url` (if any):
   - If there is no recorded `artifact_url` yet, or the script reported a
     commit/content change, or the user passed `--force`: call the `Artifact`
     tool on `exports/pr-<N>.html` (`title`: `"<repo> — PR #<N>: <title>"`,
     `description`: the PR's tagline, `favicon`: an emoji fitting the PR).
     Pass the existing `artifact_url` as `url:` when there is one, so
     republishing updates the same link instead of minting a new one. Then
     record the result:
     ```bash
     uv run "${CLAUDE_PLUGIN_ROOT}/scripts/record_publish.py" --bundle-dir <bundle-dir> --target pr-<N> --url <returned-url>
     ```
   - Otherwise, report "already up to date" with the existing URL and move on
     — do not call the Artifact tool for a PR that has not changed.
6. **Always rebuild and republish the index**, regardless of which PRs (if
   any) actually changed this run — it reflects every PR ever recorded in
   `publish-manifest.json`, not just this invocation's:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/scripts/export_index.py" --bundle-dir <bundle-dir>
   ```
   Call the `Artifact` tool on the resulting `exports/index.html`, passing
   `publish-manifest.json`'s `index.artifact_url` as `url:` when present so
   it updates in place across sessions the same way per-PR artifacts do.
   Record it the same way: `--target index`.
7. **Report a summary table** — PR, status (published / updated / unchanged),
   artifact URL — plus the index URL.

The `Artifact` tool may not be available. Per Anthropic's own
documentation, publishing artifacts requires a `/login` session on a paid
plan — API-key and cloud-provider-credential sessions cannot publish. Even
then, the export files this mode produces are still valid deliverables.
Tell the user where they landed (`<bundle-dir>/exports/`) so they can open
or share them another way, instead of the run looking like it silently
failed.

## Submit mode

Interviews the author of a change, assesses that change against the bundle, and
opens the pull request. Submit mode is the author-side and reviewer-side half of
the plugin. Every other mode narrates history. This one runs before the
history exists. It needs `uv` and a git repo, never `GEMINI_API_KEY`, and it
generates no art and no audio.

Two references govern it, both loaded on demand:
`references/interview-guide.md` for what to ask and how, and
`references/review-mode.md` for the rubric, the verdicts, and the risk tiers.

`--stage pre|post` selects the stage (default `pre`).

### Pre stage

1. **Resolve `<bundle-dir>`** per Hub resolution above, then **migrate the
   bundle**:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/scripts/migrate_bundle.py" --bundle-dir <bundle-dir>
   ```
2. **Resolve the target**, in this order:
   - `--prs <N>` — the PR already exists. Use the existing open-PR path (see
     Generate mode step 3). Nothing gets created.
   - no `--prs` — the current branch. Ask `gh pr view --json number` for it
     first. If a PR already exists for this branch, adopt its number and
     continue as the case above. This is the re-run-after-review-feedback
     path. If not, this is a pre-submit run, and step 7 opens the PR.
3. **Extract the diff.** For a PR:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/scripts/extract_diffs.py" --repo <target> --bundle-dir <bundle-dir> --prs <N>
   ```
   For a branch with no PR yet (`--base` defaults to the detected default
   branch):
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/scripts/extract_diffs.py" --repo <target> --bundle-dir <bundle-dir> --branch [<ref>] [--base <branch>]
   ```
   The branch form writes `<bundle-dir>/exports/branch-<slug>/diff.json` and
   touches nothing under `data/`.
4. **Gather the rest of the evidence before asking the author anything.**
   Read, in this order:
   1. The touched districts in `<bundle-dir>/inventory.yaml`.
   2. Every record in `<bundle-dir>/data/adrs.json` whose `problem` or
      `decision` covers those districts.
   3. The matching stack card per `references/stacks/README.md`.
   4. The timeline entries for earlier PRs in the same districts.

   This order is not optional — `references/interview-guide.md` §2 depends on it.
5. **Interview the author** (Claude work, not a script). Follow
   `references/interview-guide.md`. Draft a hypothesis from step 4, but hold
   it back. Ask the problem and approach questions blind, and compare both
   against each other and against the hypothesis (§3a). Ask only what the
   evidence still cannot settle, then play the drafted `intent` back for
   confirmation. `--non-interactive`, or a session with no author present,
   takes the fallback in §6 of that file and sets `intent.source: "inferred"`.
6. **Assess** (Claude work, not a script). Follow `references/review-mode.md`:
   the three questions with evidence, the stack card's boundary greps, the
   district delta, the risk tier, `regret_risk`, and the verdict.
7. **Render, then open the PR.** Write `intent.json` and `assessment.json` into
   the branch staging directory (branch target) or the two blocks onto the
   timeline entry (PR target), then:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/scripts/render_review.py" --repo <target> --bundle-dir <bundle-dir> {--prs <N> | --branch [<ref>]}
   ```
   If step 2 found no PR, open one — see **Submitting the PR** below. If a PR
   already exists, skip to step 8.
8. **File the results under the PR number.** Write `intent` and `assessment`
   onto that PR's timeline entry in `<bundle-dir>/data/story.json`, regenerate
   `data/story.js`, then re-render so the deliverables carry the number:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/scripts/render_review.py" --repo <target> --bundle-dir <bundle-dir> --prs <N>
   ```
9. **Verify**:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/scripts/verify_bundle.py" --bundle-dir <bundle-dir> --prs <N> --require-review --json
   ```
   Report the verdict, the risk tier, the finding count, the PR URL, and the
   paths of the two markdown files.

### Submitting the PR

Assess first, create second. The assessment is part of the author's decision
about whether to open the PR at all.

1. **Make sure the branch is pushed.** If `git rev-parse --abbrev-ref
   --symbolic-full-name @{u}` finds no upstream, the branch needs
   `git push -u origin <branch>` before `gh pr create` can work.
2. **Confirm once, covering both outward actions.** Show the author the
   rendered description, the base branch, the verdict, and the risk tier. Then
   ask to "push `<branch>` and open a PR against `<base>`". Pushing a branch
   and opening a PR are public and hard to walk back. **Nothing fires without
   this confirmation** — not with `--force`, not in `--non-interactive`, which
   takes the `--no-create` path instead.
   - A `rework` verdict does not block anything. Offer three ways forward —
     open it, open it as a draft, or stop and fix first — and let the author
     pick. This mode reports. It never gates.
3. **Create it:**
   ```bash
   gh pr create --base <base> --head <branch> --title "<title>" --body-file <bundle-dir>/exports/branch-<slug>/description.md [--draft]
   ```
   Then read the number back with `gh pr view --json number`.
4. **Continue at pre-stage step 8** with that number.

**Three cases end at the staging directory instead**, and all three are normal:
`--no-create`, `gh` missing or unauthenticated, and the author declining at
step 2. In each, tell the user where the files landed
(`<bundle-dir>/exports/branch-<slug>/`), print the exact `gh pr create` line
above so nothing is lost, and say that re-running `/prodyssey:submit` once the
PR exists files the content into `story.json`.

### Post stage

Runs after the PR merges. Same steps 1 through 4, then:

5. **Compare the merged diff against the `intent` captured pre-merge** and
   write a second `assessment` with `stage: "post"` and a populated `drift`
   array. `references/review-mode.md` §7 holds the four drift kinds and the
   rule that matters most: **never rewrite the pre-stage `intent`.** Its value
   comes from being what the author said before the change shipped.
6. Render and verify as in pre-stage steps 8 and 9.

## Notes

- Narrative authoring and ADR extraction are Claude judgment work — never delegate
  their content to a script. Scripts only move data (diffs, prompts, audio, bundle
  verification). Diagram authoring is also Claude judgment work, but it runs one
  step further removed. The orchestrating Claude never writes `.mmd` files itself.
  It delegates that to a per-PR subagent (see Generate mode, step 4) and only calls
  a script (`build_diagrams.py`) to compile and validate the subagent's output into
  `data/diagrams.js`. The author interview and the architecture assessment are the
  same kind of work — `render_review.py` lays out the result and judges none of it.
- Never touch anything in `<target>` outside `<target>/.prodyssey/` and `<target>/.env`
  (read-only check, never written by this skill) — `<hub>/.prodyssey/` is also a
  sanctioned write location, for centrally-stored bundles and view-server bookkeeping.
  Submit mode's `git push` and `gh pr create` are the only actions that reach past
  this line. They never write a source file, and they only run after the explicit
  confirmation in Submit mode.
- `story.json`'s `meta.schema_version` is `"1.2"` — `verify_bundle.py` gates on it.
  `scripts/_bundle_meta.py` is the single source for that constant.
- Submit mode's `intent` and `assessment` live on the timeline entry, not in a file
  of their own. That is what puts them under `migrate_bundle.py`'s authored-field
  guard, and it is why the viewer needs no new global to render them.
- View mode's PID/log files and the `active` symlink live under
  `<hub>/.prodyssey/`, never inside a bundle directory — those two files plus
  `active` are the only entries meant to stay out of the commit.
- Publish mode's `exports/` (per-PR HTML, `index.html`, `publish-manifest.json`)
  lives inside `<bundle-dir>`. It is committable the same way `data/`/`assets/`
  are, since it is the durable record of what has been published and from
  what version, not disposable build output.
