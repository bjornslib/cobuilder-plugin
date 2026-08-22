---
name: artifact
title: "Bundle Viewer and Publisher"
status: active
version: 0.1.0
description: >
  Serve a generated codebase-odyssey bundle locally, publish a PR level or a
  diagram as a self-contained Claude Artifact, or author a collaborative HTML
  presentation for a decision or gate. Use when the user asks to "view the
  odyssey bundle", "serve the bundle", "open the viewer", "start the odyssey
  server", "stop the odyssey server", "publish the odyssey", "present a
  decision", "show a gate as a page", or invokes `/cobuilder-architect:view`
  or `/cobuilder-architect:publish`.
---

# Bundle Viewer and Publisher

This skill serves a `.cobuilder-architect/` bundle for local viewing and
publishes a bundle level as a Claude Artifact. It never edits application
source, and it never generates narrative, art, or audio. The `cobuilder-pr`
plugin produces the bundle this skill reads.

Reference material lives in `references/` and loads on demand, including
`references/collaborate-with-user.md`, the rules for presenting a decision,
a gate, or a review result as a page instead of prose.

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
  `assets/`), created by Baseline or Review mode per the storage rule in
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
may already exist from a prior Baseline or Review run (the same
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
   uv run "${CLAUDE_PLUGIN_ROOT}/shared/migrate_bundle.py" --bundle-dir <absolute-selected-bundle-dir>
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
   same parsing as Review mode). For each requested PR, confirm it
   exists in the timeline of `<bundle-dir>/data/story.json`. If any do
   not, tell the user to run `/cobuilder-architect:review --prs <N>`
   first, and STOP before publishing any of the others. A partial
   publish from a partly-valid PR list confuses more than an upfront
   refusal does.

4. **Migrate the bundle**, before any export runs. This makes the
   stale-viewer export error self-healing:
   ```bash
   uv run "${CLAUDE_PLUGIN_ROOT}/shared/migrate_bundle.py" --bundle-dir <bundle-dir>
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

## Presenting decisions and gates (collaborative presentation)

Present important gates, design decisions, and status readouts as
self-contained HTML pages. Do not use HTML pages for direct questions or
one-sentence answers. Those remain in chat.

### Core presentation rules

All pages authored under this skill must adhere to nine rules:

1. **Source of record:** The markdown or JSON file on disk is the source of
   record. The HTML page is a visual presentation of that file. Write the
   underlying document first.
2. **Theme tokens:** Define the light palette on `:root`. Guard dark mode with
   `:root:not([data-theme="light"])`. Support explicit toggles with
   `:root[data-theme="dark"]`. Define no colors solely within media queries.
3. **Self-contained:** Author each page as a single file. Do not use external
   network requests except Google Fonts. Inline all CSS, JavaScript, and SVG
   assets.
4. **Visual identity per purpose:** Tailor typography and layouts to the
   document role. Do not reuse a single template for all documents.
5. **Decision placement:** Place the decision at the bottom as the most
   prominent element. State the decision as the exact question for the reader to
   answer.
6. **Wide content scrolling:** Wrap tables, code blocks, and diagrams in
   containers with `overflow-x: auto`. The main page body must never scroll
   horizontally.
7. **Real content only:** Use actual project data, metrics, and quotes. Do not
   include placeholder text or TBD markers.
8. **The honesty rule:** Include an explicit visible section for open
   questions, procedural deviations, and unverified claims. Never hide doubt.
9. **Relationship to architecture review reports:** Architecture review
   reports in `docs/architecture/review/` follow `cobuilder-architect` rules. Do
   not route architecture review reports through this skill.

For complete authoring details and templates, see
[references/collaborate-with-user.md](references/collaborate-with-user.md).



