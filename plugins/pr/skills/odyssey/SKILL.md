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
  serves the bundle locally for viewing.
  Use when the user asks to "narrate codebase
  odyssey", "odyssey baseline", "prodyssey", "tell the story of this PR as scene
  art", "build the odyssey bundle", "view the odyssey bundle", "start the odyssey
  server", "publish the odyssey", "generate this PR", "review this branch before I
  open a PR", "should we merge this", "will we regret this change", or invokes
  `/pr:baseline`, `/pr:review`, `/artifact:view`,
  `/artifact:publish`, or `/pr:generate`.
---

# Codebase Odyssey Generator

This is the orchestration procedure for turning merged PRs of **any locally
checked-out git repo** into a portable bundle. The repo can be the session's
own repo, or any other checkout reached through `--repo`. The bundle holds a
four-level narrated story, scene art, TTS narration, and ADR retro-extraction.
This procedure also runs Generate mode. Generate mode interviews the author
of a change, assesses the change against that bundle, and opens the pull
request. Designing a change before any code exists is Design Mode, and it
lives in the `architecture` skill. See that skill's own `SKILL.md`.

**This skill never edits application source.** The sanctioned writes are the
bundle directory (`<bundle-dir>`, see Hub resolution below), `docs/`
(self-only: reviews and pull-request files), and the confirmed
`git push` / `gh pr create` of Generate mode. Baseline, Review, View, and
Publish read the target, and write only inside the bundle. Generate mode
takes the one action outside the bundle. That action is narrow. After an
explicit confirmation, it pushes the branch and runs `gh pr create`. It
still writes no application source, and it takes no other outward action.
It posts no comments, edits no existing PR body, sets no labels, adds no
reviewers, and performs no merges. See Generate mode.

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
   (for example `/pr:review --repo ~/code/other-project --prs 12`).

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

Every odyssey mode (Baseline, Review, Generate, View, and Publish)
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
above.) `<bundle-dir>` is the only path Baseline, Review, and Publish
modes ever write to. No mode references a literal bundle path directly.
Generate mode writes there too. Generate mode's `git push` / `gh pr create`
are the only actions that reach a remote.

**Legacy layout detection.** Compute `BUNDLE_DIR` above, then check this
immediately. All five modes reach this check, because Step 0's prereq gate
skips View, Publish, and Generate. If `$BUNDLE_DIR` does not exist
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
Second, without this check, Review mode's auto-baseline check (below)
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

This applies the first time *any* mode (Baseline, Review, or View)
creates the directory, not only View mode. It is also a one-time notice,
not a durable reminder. Once `<hub>/.cobuilder-architect/` exists, later
invocations skip the check, even when the user never added the suggested
lines.

## Step 0 — Prereq gate (hard, before ANYTHING generative)

This gate applies to **baseline** and **review** modes. **View, Publish,
and Generate modes are exempt**:

- View only serves static files already on disk. It needs neither `uv` nor
  `GEMINI_API_KEY`.
- Publish only flattens and publishes what is already generated. It needs
  `uv` for its export scripts, but not `GEMINI_API_KEY`.
- Generate reads git and writes markdown. It needs `uv` and a git repo, but
  it never calls Gemini, because its narrative work is Claude judgment
  work, and it generates no art or audio.

See each mode's own section below.

Run this before any other step, on every baseline or review invocation:

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
   output. But the default `review` sweep always needs the key for
   narration, and must stop here if the key is absent.

Only after all three checks pass does mode dispatch begin.

## Mode dispatch

The invoking command passes a mode (`baseline`, `review`, `view`,
`publish`, or `generate`) plus forwarded args (`--repo`, `--store`,
`--prs`, `--force`, `--voice`, `--art`, `--dry-run`, `--port`, `--stop`,
`--list`, `--format`, `--style`, `--stage`, `--branch`, `--base`,
`--draft`, `--no-create`, `--non-interactive`).
If invoked with no mode, ask the user whether they want `baseline`,
`review`, `view`, `publish`, or `generate`. `design` dispatches to the
`architecture` skill, not to this one.

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
   uv run "${CLAUDE_PLUGIN_ROOT}/shared/migrate_bundle.py" --bundle-dir <bundle-dir>
   ```
   This replaces the old bare `cp` of `viewer/index.html`. Migration owns
   the viewer refresh now, so there is one mechanism, not two.

5. Verify:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/shared/verify_bundle.py" --bundle-dir <bundle-dir> --json
   ```
   Report the `baseline` section of the result to the user.

Baseline mode is re-runnable at any time, and it refreshes in place. It
never overwrites human-authored narrative fields already present in
`story.json`. That discipline lives in `extract_story.py`, and in how you
write district blurbs. Treat existing text as authored, not as scratch.

## Review mode

This mode runs the per-PR narrative, ADR, art, and audio sweep. Steps:

1. **Auto-baseline check.** If `<bundle-dir>/data/story.json` or
   `<bundle-dir>/inventory.yaml` is missing, announce "No baseline found,
   running baseline first" and run the full Baseline mode above before
   continuing.

2. **Migrate the bundle**, so the sweep below never runs against a stale
   viewer copy or an outdated data shape:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/shared/migrate_bundle.py" --bundle-dir <bundle-dir>
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
   review mode with `--force` for that PR, after new commits land on its
   branch, refreshes the size, touched files, diff, and narrative for the
   new tip. It does not treat the original snapshot as immutable the way a
   merged PR's snapshot is.

4. **Per PR**, run the resumability check first, and execute only the
   stages whose artifacts are missing (or all stages if `--force`):
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/shared/verify_bundle.py" --bundle-dir <bundle-dir> --prs <N> --art <mode> --json
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
      **Read this PR's `intent` block first, when it has one.** Generate
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
      under `docs/architecture/adr/`, then run:
      ```bash
      uv run "${CLAUDE_PLUGIN_ROOT}/shared/build_index.py"
      ```
      Never write `data/adrs.json` by hand. Set this PR's `adrs[]` array in
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
      - tell it to invoke `Skill("pr:mermaid")` first. If
        that call gives `Unknown skill`, tell it to read
        `${CLAUDE_PLUGIN_ROOT}/skills/mermaid/SKILL.md` directly, and obey
        that file instead. The skill resolves by name only in a session
        that has an installed plugin version containing it. A session
        that runs from a development checkout, or from an installed
        version older than the skill, does not find it. The path always
        resolves, because `${CLAUDE_PLUGIN_ROOT}` points at the copy in
        use.

      - then tell it to read
        `${CLAUDE_PLUGIN_ROOT}/skills/mermaid/references/diagram-mode.md`.
        This file moved into the mermaid skill because both the odyssey
        and architecture pillars need it, and mermaid is already vendored
        into every plugin per ADR-0017.

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

`--art both|diagram|image` selects which visual family review mode
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

## View and Publish modes

View mode and Publish mode moved to the `artifact` plugin.
See that plugin's `artifact` skill for the serving and publishing
procedure. This skill still produces the bundle that mode serves.

## Generate mode

This mode interviews the author of a change, assesses that change against
the bundle, and opens the pull request. Generate mode covers both the
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
   uv run "${CLAUDE_PLUGIN_ROOT}/shared/migrate_bundle.py" --bundle-dir <bundle-dir>
   ```

2. **Resolve the target**, in this order:
   - `--prs <N>`. The PR already exists. Use the existing open-PR path
     (see Review mode step 3). Nothing gets created.
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

   A branch can carry more than one design. Generate mode never picks
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
   `goal.json`, not only the first, and run:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/shared/build_index.py"
   ```
   once at the end.

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
   that one epic. Then run:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/shared/build_index.py"
   ```

10. **Verify:**
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/shared/verify_bundle.py" --bundle-dir <bundle-dir> --prs <N> --require-review --json
   ```
   Report the verdict, the risk tier, the finding count, the PR URL, and
   the paths of the two markdown files.

11. **Offer to continue into narrative generation.** Ask the author
    (`AskUserQuestion`) whether to move straight into the per-PR sweep of
    Review mode for this PR, now that `intent` and `assessment` are
    captured. Frame it as optional. Declining just stops here, the same
    as before this step existed. If declined, tell the author the same
    PR can be narrated later with
    `/pr:review --prs <N>`.

    If the author says yes, ask (the same or a follow-up
    `AskUserQuestion`):
    - `--art image` (Gemini-generated scene art) or `--art diagram`
      (authored Mermaid, see the subagent-authoring rule in Review mode
      step 4).
    - Whether to include audio narration (`--voice <V>`, or a specific
      voice), or skip audio entirely.

    Then run the per-PR steps of Review mode above (steps 1 through 4)
    for this PR with the chosen flags. The resumability check of Review
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
`/pr:generate`, once the PR exists, files the content
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
   `partially-delivered`. Fill that epic's `state` to `merged`.

   Stamp `approved_by` on the ADR this design wrote (the proposed record
   in `docs/architecture/adr/`), now that a human has merged it. An agent
   still must not set `approved` on its own initiative at generate time.
   This post-stage stamp is the human-merge signal. Then run:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/shared/build_index.py"
   ```
   once, to rebuild both the design and the ADR projections.

6. Render and verify as in pre-stage steps 9 and 10.

7. **Offer to continue into narrative generation**, the same as
   pre-stage step 11. A PR can reach post stage without ever having been
   narrated (this is exactly the case that motivated adding step 11).
   Check whether the `narrative.*`/`asset.*` keys of `verify_bundle.py`
   are still `missing` for this PR. If so, make the same offer, and ask
   the same two questions (`--art` mode, audio or not), then run the
   per-PR steps of Review mode as pre-stage step 11 describes.

## Notes

- Narrative authoring and ADR extraction are Claude judgment work. Never
  delegate their content to a script. Scripts only move data (diffs,
  prompts, audio, bundle verification). Diagram authoring is also Claude
  judgment work, but it runs one step further removed. The orchestrating
  Claude never writes `.mmd` files itself. It delegates that to a per-PR
  subagent (see Review mode, step 4), and only calls a script
  (`build_diagrams.py`) to compile and validate the subagent's output
  into `data/diagrams.js`. The author interview and the architecture
  assessment are the same kind of work. `render_review.py` lays out the
  result and judges none of it.

- Never touch application source in `<target>`. The sanctioned writes
  are `<target>/.cobuilder-architect/` (the self-bundle),
  `<hub>/.cobuilder-architect/` (centrally-stored bundles and
  view-server bookkeeping), and `docs/` (self-only: reviews and
  pull-request files). `<target>/.env` is a read-only check, never
  written by this skill. `git push` and `gh pr create` in Generate mode
  are the only actions that reach past this line. They never write a
  source file, and they run only after the explicit confirmation in
  Generate mode. Design Mode, in the `architecture` skill, writes
  `docs/architecture/designs/` and creates the first local branch after
  confirmation. It never pushes, and never opens a pull request.

- `meta.schema_version` in `story.json` is `"1.2"`. `verify_bundle.py`
  gates on it. `shared/_bundle_meta.py` is the single source for that
  constant.

- The `intent` and `assessment` fields of Generate mode live on the
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
