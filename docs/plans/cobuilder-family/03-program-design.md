# Program Design: the cobuilder family

Gate 3. The decisions an agent would otherwise make silently while
implementing Gate 2. Every one of them is cheap to change here and expensive
to change once a slice has landed.

Governed by ADR-0016, ADR-0017, ADR-0018, and ADR-0019. Where this document
and an ADR disagree, the ADR wins and this document is wrong.

## Files

### The repository becomes a marketplace

```
.claude-plugin/marketplace.json        one file, five plugin entries
shared/                                 vendored by symlink into each plugin
  _bundle_meta.py
  _manifest.py
  migrate_bundle.py
  verify_bundle.py
  skills/ste-writing/
  skills/mermaid/
plugins/
  cobuilder-architect/
  cobuilder-pr/
  cobuilder-implement/
  cobuilder-artifact/
  cobuilder-full-lifecycle/
tests/                                  new, see Test plan
```

`shared/` sits at the marketplace root and each plugin carries a symlink to
it at `<plugin>/shared`. The install copy dereferences the link, so each
plugin's cache holds its own real copy. This is the mechanism ADR-0017
chose and the one E2 exists to prove.

### Where each existing file lands

| From | To | Why |
|---|---|---|
| `skills/architecture/` | `cobuilder-architect` | design, review, maintenance, decisions, describe, debug — six modes, since `explore-design` is deleted |
| `skills/odyssey/` | `cobuilder-pr` | baseline, generate, review. `view` and `publish` go to `cobuilder-artifact` instead |
| `skills/ste-writing/`, `skills/mermaid/` | `shared/skills/` | both are cited from both pillars, which is exactly what vendoring is for |
| `.claude/skills/collaborate-with-user/` | `cobuilder-artifact`, folded into its `SKILL.md` and `references/` | it presents a decision, which is the artifact pillar's job |
| `viewer/index.html` | `cobuilder-artifact` | the reading surface |
| `extract_story.py`, `extract_diffs.py`, `generate_prompts.py`, `generate_audio.py`, `build_diagrams.py`, `render_review.py` | `cobuilder-pr` | all six only run inside the per-PR sweep or submit |
| `build_adrs.py`, `build_designs.py` | deleted | `build_index.py` replaces both, see below |
| `validate_decision_state.py`, `compute_scores.py`, `html_to_pdf.py` | `cobuilder-architect` | decisions mode and the two review reports |
| `export_artifact.py`, `export_index.py`, `record_publish.py` | `cobuilder-artifact` | publish |
| `_bundle_meta.py`, `_manifest.py`, `migrate_bundle.py`, `verify_bundle.py` | `shared/` | every plugin that touches a bundle needs all four |
| `~/.claude/skills/cobuilder-factory/` | `cobuilder-implement` | the port and the rename |

### New files

| File | Plugin | Purpose |
|---|---|---|
| `scripts/build_index.py` | `cobuilder-artifact` | builds `data/index.json` and `index.js` |
| `scripts/serve_bundle.py` | `cobuilder-artifact` | replaces `python3 -m http.server`, adds `POST /feedback` |
| `scripts/watch_feedback.py` | `cobuilder-artifact` | the background wake command |
| `skills/cobuilder-full/SKILL.md` | `cobuilder-full-lifecycle` | names the four modes and when to reach for each |

**`build_index.py` lives in the artifact plugin and reads what the other
pillars wrote.** Not only `cobuilder-architect`'s ADRs, designs, and
contexts. Also `cobuilder-pr`'s `story.json`, its assessments, and its
`docs/pull-requests/`, and `cobuilder-implement`'s `docs/plans/`. That is not
a seam violation. Every one of those paths is inside the *target repo* or
inside the bundle. None resolves into another plugin's root. This is the
distinction ADR-0016 draws, and it is the one an implementing agent is most
likely to get wrong.

Settled at Gate 3 review: the index is a repo-wide artifact rather than one
pillar's output, so it belongs with the pillar that presents the repo.

### `cobuilder-artifact` owns the authoring skill as well as the viewer

`collaborate-with-user` does not travel as a separate skill directory. Its
rules become part of `cobuilder-artifact`'s own `SKILL.md`, with the long
material in `references/`: the composition rules, the theme-token rules, the
honesty rule, and the relationship to the architecture skill's two report
templates. One plugin then owns both halves of presenting something to a
person — the page it builds and the answer it collects.

**The agent doing this work must invoke the `skill-development` skill first.**
Folding a standalone `SKILL.md` into another plugin's skill is exactly the
job that has established practice, and this build should follow it rather
than reinvent a layout.

### Pages leave `.lavish/`

`.lavish/` is another tool's directory and this plugin's pages have no
business in it. A generated page belongs in the bundle, because it is derived
from an authored markdown file and a rebuild can reproduce it:

```
<bundle-dir>/pages/<slug>.html          the generated page
<bundle-dir>/exports/publish-manifest.json   already records the URL
```

The markdown stays the source of record in `docs/`, unchanged. Moving the
existing six pages is part of E5, and each keeps its published URL, because
a URL is bound to the artifact rather than to the local path.

## Types and signatures

### `shared/_bundle_meta.py`

```python
SCHEMA_VERSION = "1.3"                            # was "1.2"
SCHEMA_VERSION_KNOWN = {"1.0", "1.1", "1.2", "1.3"}
CURRENT_BUNDLE_FORMAT = 3                         # was 2

class BundleIncompatible(RuntimeError):
    """Raised when a bundle demands a reader this plugin cannot be."""

def require_compatible(bundle_dir: Path, plugin: str) -> None:
    """Refuse to write into a bundle this plugin is too old to read.

    Reads <bundle_dir>/bundle.json. Raises BundleIncompatible when
    min_reader_schema > SCHEMA_VERSION, or when bundle_format >
    CURRENT_BUNDLE_FORMAT. Returns None and is silent otherwise.
    A missing bundle.json is a new bundle and is compatible.
    """

def stamp_generator(bundle_dir: Path, plugin: str, version: str) -> None:
    """Record this plugin's version in bundle.json's generators map."""
```

Every script that writes into a bundle calls `require_compatible()` as its
first statement after argument parsing. Today three scripts stamp
`SCHEMA_VERSION` with no check at all: `extract_story.py:599`,
`export_artifact.py:428`, and `_manifest.py:76`.

### `bundle.json`, at format 3

```json
{
  "bundle_format": 3,
  "schema_version": "1.3",
  "min_reader_schema": "1.3",
  "generators": {
    "cobuilder-pr": "0.5.0",
    "cobuilder-artifact": "0.5.0"
  },
  "migrated_at": "2026-08-21T09:00:00Z"
}
```

`generator_version`, a scalar, becomes `generators`, a map keyed by plugin.
`min_reader_schema` is the floor a reader must meet and is raised only by a
migration that makes a bundle unreadable to an older plugin. A migration that
only adds an optional field leaves it alone.

### `scripts/build_index.py`

```python
def build_index(repo: Path, bundle_dir: Path) -> dict:
    """Full rebuild. Reads docs/ plus git. Never merges, never authors."""

def collect_adrs(repo: Path)      -> list[dict]
def collect_designs(repo: Path)   -> list[dict]
def collect_contexts(repo: Path)  -> list[dict]   # includes boundary rules
def collect_districts(bundle: Path) -> list[dict] # from inventory.yaml
def collect_plans(repo: Path)     -> list[dict]   # gates and slices
def collect_pull_requests(repo: Path) -> list[dict]  # git plus gh
def resolve_joins(entities: dict) -> dict
def compute_sources(repo: Path)   -> dict         # freshness

def is_stale(index: dict, repo: Path) -> bool:
    """True when any tracked subtree hash or the git head has moved."""
```

`index.json`:

```json
{
  "schema_version": "1.3",
  "sources": {
    "git_head": "642ecb3",
    "trees": {"docs/architecture/adr": "sha256:…",
              "docs/architecture/designs": "sha256:…",
              "docs/architecture/contexts": "sha256:…",
              "docs/plans": "sha256:…"}
  },
  "entities": {
    "adr": [...], "design": [...], "epic": [...],
    "context": [...], "district": [...], "boundary_rule": [...],
    "pull_request": [...], "slice": [...], "publication": [...]
  },
  "joins": {
    "adr_to_context":  {"ADR-0016": "cobuilder-packaging"},
    "adr_to_district": {"ADR-0007": "viewer"},
    "context_verifies_district": {"cobuilder-packaging": ["packaging"]},
    "adr_to_pull_request": {"ADR-0016": {"pr": 11, "via": "epic",
                                         "path": ["plugin-split/E1"]}},
    "slice_to_epic": {"cobuilder-family/3": "plugin-split/E1"},
    "epic_to_pull_request": {"plugin-split/E1": 11},
    "district_uncovered": ["narrative", "audio"]
  }
}
```

`joins` is materialised rather than computed in the viewer. A join resolved
once in Python is a join the viewer cannot get wrong, and `district_uncovered`
is the describe backlog ADR-0018 names.

### An ADR is not an epic

They are different things and neither contains the other.

An **ADR** is a decision. It outlives the work that carried it out, it can be
challenged years later, and its state machine describes the life of the
decision. An **epic** is a unit of work with a branch and an end.

The relation is many-to-many. One epic can carry several decisions: E1 lands
the renames and every ADR the renames settle. One decision can take several
epics: ADR-0016 needs E1, E1b, E2, and E3 before the code matches it. That is
exactly why the code-matches-the-decision axis is derived rather than stored
on the ADR.

### How `adr_to_pull_request` is derived

Two paths, tried in order. Nothing is authored.

1. **Direct.** The ADR's frontmatter carries `source_pr`. Retro-extraction
   sets it, because the record was written from a merged pull request. Done.
2. **Through the design and the epic.** Otherwise:

```
ADR-NNNN
  → design            the design whose adr list names it, or whose
                      directory the ADR's `related` paths point into
  → epic              goal.json.epics[] entries belonging to that design
  → branch            epics[].branch
  → pull_request      the PR whose head branch equals that branch,
                      from `gh pr list --head <branch> --state all`
```

`via` records which path resolved, and `path` records the epics it went
through. A reader can then see *why* an ADR is attached to a pull request,
which matters when the answer is wrong.

**The gap this exposes: a slice names no epic today.** `04-slices.md` lists
slices in build order and nothing ties a slice to the epic it advances. The
join therefore stops at the epic and cannot reach a slice. Gate 4 fixes this
at the source: **every slice line declares `epic: <design>/<epic-id>`.** The
alternative is to guess from the files a slice touches, which is a heuristic
in a chain built to avoid them.

**What stays underivable.** An epic with no branch has no pull request, and
that is correct rather than missing — it is work that has not started. The
index reports it as unstarted and does not search for a PR.

### `scripts/serve_bundle.py`

```python
def serve(bundle_dir: Path, port: int, allow_write: bool) -> None:
    """Static files, plus POST /feedback when allow_write is true.

    Binds 127.0.0.1 only. Never binds a routable address.
    """

def append_thread(bundle_dir: Path, record: dict) -> str:
    """Validate, assign a ulid, append one line, return the id.
    Opens with 'a' and one write call, so a concurrent append cannot
    interleave. Never rewrites and never truncates.
    """
```

Accepted routes: `GET` for any file under the bundle root, and
`POST /feedback`. Nothing else. A `DELETE` is not implemented, because a read
never deletes and neither does anything else.

### `scripts/watch_feedback.py`

```python
def watch(bundle_dir: Path, since: int, timeout: int = 900) -> list[dict]:
    """Block until threads.ndjson grows past byte offset `since`, or the
    timeout expires. Print the new lines as JSON and exit 0. Exit 2 on
    timeout with no new lines, so a caller can tell the two apart.
    """
```

Polls the file size once a second. It does not watch the filesystem, because
a watcher is a dependency and this is a local file the same machine writes.

### The comment record

Exactly as ADR-0019 specifies, including the agent reply that carries
`"author": "agent"` and `"replies_to": "<thread id>"`, and the state change
that carries only `id`, `state`, and `ts`. **The ledger is append-only, so a
state is the last line that names it, not a field edited in place.**

```python
def thread_view(bundle_dir: Path, thread_id: str) -> dict:
    """Fold every line naming this id into one thread: the root comment,
    its replies in append order, and the transition history."""

def project_threads(bundle_dir: Path) -> dict:
    """Fold the whole ledger once into feedback/threads-state.json:
    {thread_id: {state, updated_by, updated_at, reply_count, offset}}.
    Rewritten in full after each append. Never authored.
    """
```

**The current state is a field, and the log is still append-only.** The
earlier draft had every reader fold the file to learn a state, and that was
the wrong trade. `threads-state.json` is a projection rebuilt from the
ledger, so a reader gets the state in one lookup and keeps the audit trail
that says who moved it and when. The projection is derived and disposable —
delete it and the next append rebuilds it from the ledger.

The rule the projection must not break: **the ledger is the truth and the
field is the cache.** A writer appends to the ledger first and projects
second. A projection that disagrees with the ledger is a bug in the
projection, and `project_threads()` is cheap enough to rebuild whenever the
answer is in doubt. This is the same shape as `index.json` — derived, full
rebuild, never merged — so it needs no new idea, only the same discipline.

E6 ships `thread_view()`, `project_threads()`, and the reply record. It does
not ship the conversation interface — the drawer lists replies flat.
Rendering a thread as a conversation is a later slice, and the record shape
exists now so that slice adds no migration.

## Call stack

### Publishing a design, end to end

```
/cobuilder-architect:design
  → migrate_bundle.py --bundle-dir …            (shared, unconditional)
  → require_compatible(bundle, "cobuilder-architect")
  → interview, explore, challenge                (Claude judgment)
  → write docs/architecture/designs/<name>/*.json
  → write docs/architecture/adr/ADR-NNNN-*.md
  → when no context covers the region:
        describe procedure, in-process
        → write docs/architecture/contexts/<id>/{canvas.md,boundary.yaml}
        → boundary.verifies = [districts covered]
  → validate_decision_state.py
  → hand off: name cobuilder-implement, stop
```

### Building the index and reading it

```
any cobuilder-artifact mode
  → migrate_bundle.py
  → is_stale(index, repo)?
        yes → build_index.py
                collect_* ×6  →  resolve_joins  →  compute_sources
                write data/index.json and data/index.js
  → serve_bundle.py --allow-write
        viewer/index.html
          <script src="../data/index.js">  →  window.INDEX
          renderMode(mode)  →  Designs | Pull requests | Decisions
                               | Contexts | Builds
```

### A comment, end to end

```
reader clicks any element in the viewer
  → onSelect(event)
      computeSelector(el)     walk ≤5 ancestors, short-circuit on an id
      captureRange(selection) node path plus character offset per end
      openDrawer(anchor)      shifts the page, does not cover it
  → reader types, submits
      POST /feedback  →  append_thread()  →  ulid returned
      fallback when the server is read-only: localStorage, then the
      existing "Copy review as markdown" hand-off
  → agent side
      watch_feedback.py --since <offset>
        blocks → prints new lines → exits 0
        harness re-invokes the session with the threads in hand
      agent acts, appends a reply line, appends a state line
```

## Test plan

**This repository has no test suite today.** Gate 3 introduces one, because
the red-green-validate loop of `cobuilder-implement` cannot run without it.
`tests/` at the marketplace root, run with
`uv run --with pytest pytest tests/`. No CI. No package manager. The
constraint that this repo stays prose plus PEP-723 scripts holds, and pytest
arrives through `--with` rather than through a lockfile.

### Compatibility gate

- `test_require_compatible_passes_on_equal_schema`
- `test_require_compatible_raises_when_bundle_demands_newer_reader` —
  `min_reader_schema` `1.4` against a `1.3` plugin raises `BundleIncompatible`
- `test_require_compatible_raises_on_newer_bundle_format`
- `test_require_compatible_allows_missing_bundle_json` — a new bundle
- `test_write_scripts_call_require_compatible_first` — greps each writer for
  the call. Crude, and it is the test that actually prevents the regression.
- `test_stamp_generator_preserves_other_plugins` — writing as
  `cobuilder-pr` must not drop `cobuilder-artifact`'s entry

### Migration to format 3

- `test_scalar_generator_version_becomes_a_map`
- `test_migration_refuses_when_an_authored_field_changes_outside_touches`
- `test_migration_writes_a_backup_before_it_writes_the_new_story`
- `test_viewer_refreshes_unconditionally` — no version gate, the bug that
  motivated the mechanism

### The index

- `test_index_resolves_an_adr_to_its_context`
- `test_index_resolves_an_adr_to_a_context_through_a_district` — the join
  ADR-0018 adds
- `test_district_with_no_context_appears_in_district_uncovered`
- `test_epic_id_is_scoped_to_its_design` — two designs both carrying `E1`
- `test_is_stale_detects_a_changed_adr`
- `test_is_stale_detects_a_moved_git_head`
- `test_index_is_a_full_rebuild` — deleting an ADR removes it from the index
- `test_build_index_never_writes_into_docs`

### The ledger

- `test_append_thread_assigns_a_ulid_and_returns_it`
- `test_append_thread_never_rewrites_an_existing_line`
- `test_two_concurrent_appends_both_survive`
- `test_state_change_is_a_new_line_not_an_edit`
- `test_read_does_not_delete` — the point of departure from the lavish CLI
- `test_thread_view_folds_a_reply_under_its_root`
- `test_an_agent_reply_carries_author_agent_and_replies_to`
- `test_projection_state_equals_the_last_transition_in_the_ledger`
- `test_deleting_the_projection_rebuilds_it_from_the_ledger`
- `test_projection_records_who_moved_the_state_and_when`
- `test_watch_exits_2_on_timeout_with_no_new_lines`
- `test_serve_rejects_a_post_to_any_path_other_than_feedback`
- `test_serve_binds_loopback_only`

### The split itself

- `test_no_plugin_path_reference_crosses_a_pillar` — greps every plugin for
  `${CLAUDE_PLUGIN_ROOT}/skills/<other pillar>`. This is the E1b regression
  guard, and it is the single most valuable test in the list.
- `test_every_plugin_manifest_validates` — `claude plugin validate` on each
- `test_no_page_is_written_into_dot_lavish`
- `test_slice_declares_an_epic` — every line in `04-slices.md` names one
- `test_adr_reaches_a_pull_request_through_its_epic` — the two-path derivation
- `test_an_epic_with_no_branch_is_reported_unstarted_not_missing`
- `test_shared_symlink_dereferences_to_a_real_directory` — E2's proof,
  written as a test rather than as a one-off check

## Found while writing this document

**`explore-design` and `design` are the same command, and the command goes.**
`commands/explore-design.md:27` dispatches `Skill("architecture", args="design
$ARGUMENTS")`, which is character-for-character what `commands/design.md`
dispatches. Divergent exploration is stage 3 of Design mode and runs either
way, so the second command adds a name and no behaviour. **Decided: delete
the command. Divergent exploration stays an agent-invoked step inside Design
mode and is not a user-facing entry point.** `cobuilder-architect` ships six
modes. E1 carries the deletion.

**The backlog already exists and nobody was reading it.** Deferred work has a
home, and it is `goal.json.epics[]`. Each entry carries an `id`, a `branch`,
a `pr`, and a `state`, and an epic with a null branch is work that is planned
and not started. That is a backlog item. Nothing new is needed to hold one.

So the three levels are:

| Level | Where it lives | Lifetime |
|---|---|---|
| **Epic** | `goal.json.epics[]` in a design | survives the session, survives the branch |
| **Slice** | `04-slices.md` for a feature, one line each in build order | survives the session, dies with the feature |
| **Task** | inside a slice, in the session doing it | dies with the session, deliberately |

A task below slice level is not durable and should not be. A slice is small
enough that its tasks are the work of one sitting, and writing them down
costs more than redoing them.

**The Builds view gains a Backlog lane**, and it is a query rather than a
file: every epic with a null branch, plus every slice not yet scored, ranked
by the count of ADRs that depend on the epic. Nothing authors it, and nothing
can go stale against a list it computes.

`plugin-split/goal.json` is now the real list. It held five epics from the
first draft while `02-architecture.md` had grown to eight. It carries all
nine, including **E8, rendering a thread as a conversation** — which is the
answer to where that deferred work went.

**Rendering a thread as a conversation needs no ADR.** ADR-0019 already
decides the reply channel, the record shape, and that `replies_to` exists.
Rendering those replies as a thread is deferred work under that decision, not
a competing option, and a record with no rejected alternative is a task in
ADR clothing. One thing would earn its own record: if the viewer's threads
and the Artifact platform's threads have to merge into one inbox, that is a
real decision with real alternatives. It is not in scope for E6.

## Least confident decisions

1. **`serve_bundle.py` replaces `python3 -m http.server` outright.** A
   smaller change keeps the stock server for reading and adds the write
   endpoint only under a flag. That leaves two servers to keep in step. One
   server with `--allow-write` off by default is simpler and it is still a
   real application where there used to be none.

2. **Materialised `joins` in `index.json`.** It duplicates what the entities
   already state, and it goes stale in exactly the same rebuild the entities
   do, so the duplication costs size rather than correctness. The argument
   against is that a viewer bug and an index bug now look identical.

3. **pytest through `uv run --with`.** It keeps the no-package-manager
   constraint and it re-resolves pytest on every run. A slow test command is
   a test command people skip.

4. **A projection file beside the ledger.** It is a second file that can
   disagree with the first. The alternative is a fold on every read, which
   was the earlier draft and which made the common operation the expensive
   one. Two files with a stated direction of truth is the better trade, and
   it is the trade `index.json` already makes.

5. **`shared/` as a sibling of `plugins/` rather than duplicated content in
   git.** Everything rests on the symlink dereference. If E2 finds it does
   not work for a directory of Python, the fallback is a copy step before
   publish, and that fallback is a build step in a repo that has none.
