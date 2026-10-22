---
# --- doc-gardener required frontmatter ---
title: "ADR-0031 — Beads is the storage layer for CoBuilder programs, epics, and slices"
status: active
type: architecture
last_verified: 2026-09-29
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0031
source_pr: null
name: "Beads is the storage layer for CoBuilder programs, epics, and slices"
state: decided
groups: [data-model, implement, architect]
approved_by: ""
problem: "CoBuilder workflow state has no storage layer. Slice states, scores, and attempts live in the markdown tables of docs/plans/<slug>/04-slices.md. Any session can silently contradict that prose. Epic branches and pull-request numbers live in hand-maintained index joins. Nothing below the file level answers what is next. Nothing answers what blocks what, or what changed while two sessions worked one ladder. The record index has a read model and no write model."
decision: "Beads v1.3.0 becomes the storage layer for CoBuilder workflow state. The narrated repo gains one .beads tracker. Each program, epic, and slice becomes one beads issue. The issue is typed, parented, and chained in the slice ladder with blocked-by dependencies. Every record keeps its shape under a namespaced metadata envelope, metadata.cb. Beads stores the envelope as well-formed JSON on the issue. The markdown sources of record stay untouched as documents. Beads holds the state. shared/build_index.py gains one beads read and writes the same data/index.json. The viewer stays build-free per ADR-0001, ADR-0018, and ADR-0020. The mapping below fixes every field."
maps_to:
  context: cobuilder-packaging
  modules: [shared, plugins/implement, plugins/architect]
  rule: "Workflow state for programs, epics, and slices lives in beads under the metadata.cb envelope. Documents keep the prose. build_index.py reads beads when bd is present and files otherwise, and both paths project the same shapes. bd is the only writer of state."
forces:
  - "Slices carry state, score, and attempts in the tables of docs/plans/<slug>/04-slices.md. shared/slice_table.py parses that prose with regexes for three callers, and the attempts column must be bumped by hand in the same commit as the evidence file."
  - "Epic branch and pull-request joins are hand-maintained. The index is a full rebuild every run, so state has no durable home and no writer."
  - "Beads v1.3.0 stores arbitrary well-formed JSON metadata per issue as the sanctioned extension point (GH#1406), with readiness, dependencies, gates, leases, compaction, history, and Dolt-backed sync."
  - "ADR-0029 decided the pull request is content read from GitHub, so the tracker must not become a second copy of GitHub state."
  - "ADR-0016 set the install-surface rule: the plugins ship no agent, no hook, and no MCP server. Any new store is called from scripts, the way git and gh are."
delivers:
  capability: "Programs, epics, and slices gain a real store with readiness, blocking, history, and sync. The viewer keeps reading the same static index."
  benefit: "bd ready answers what is next, gates hold merges, and two sessions on one ladder stop racing at whole-file grain."
  beneficiary: [developer, implement-worker]
  enables: ["The slice ladder is machine-readable, so any session can claim the next slice", "The merge gate can automate once beads gh:pr gates land", "The tracker syncs across machines through Dolt without a new protocol"]
provenance: authored
history:
  - { state: decided, date: 2026-09-26, by: bjornslib, note: "Decided after the beads fork sync landed bd 1.3.0 in this workspace and smoke-tested the mapping in a scratch tracker. The engineer directed the design: map CoBuilder to beads and extend it through the metadata envelope. The mapping fixes the field-level home of every stateful record. The cutover of the 04-slices.md state columns, the gh:pr gate timing, and the seed-script ownership stay open." }
  - { state: decided, date: 2026-09-29, by: engineer, note: "Amendment after review against the sync goal: the status file maps into beads too, the seed gains a newest-wins reconcile in both directions, the bd-absent fallback becomes read-only, and the implemented and superseded program closings gain a named moment." }
  - { state: decided, date: 2026-09-29, by: engineer, note: "Second amendment: the stateful sections generate from beads and a separate beads-to-file sync is dropped; comment surfaces verified across list, export, and show; epic scope notes added for the seed reconcile, the read-model scripts, and the goal.json authoring shape; bd init must run --skip-agents --skip-hooks." }
related:
  - "docs/architecture/designs/beads-storage/goal.json"
  - "docs/architecture/designs/beads-storage/intent.json"
  - "docs/architecture/designs/beads-storage/assessment.json"
  - "docs/plans/cobuilder-viewer/04-slices.md"
  - "shared/build_index.py"
  - "shared/slice_table.py"
alternatives:
  - option: "Keep markdown tables and hand-edited JSON as the only state"
    rejected_because: "The state columns of 04-slices.md sit in prose. Any session can contradict them. Two sessions editing one table conflict at whole-file grain. Readiness is recomputed by humans. Nothing records who changed what."
  - option: "Store the same records in GitHub Issues or Projects"
    rejected_because: "Every state flip needs network and credentials, and offline work stops. ADR-0029 reads the pull request from GitHub as content. GitHub does not need to become the tracker too. Slice granularity would collapse into labels on long-lived issues."
  - option: "Write a bespoke JSON or SQLite store for the bundle"
    rejected_because: "It reinvents what beads already ships. Beads ships readiness, dependencies, gates, leases, compaction, history, and Dolt-backed sync. A second engine would need its own CLI, audit trail, and merge story."
  - option: "Use beads milestone type for programs and avoid custom types"
    rejected_because: "Milestone means a completion marker with no work attached. It reads right for the container half of a program. A program also carries a stage workflow and an outcome. The implement plugin filters programs by type, not by milestone. types.custom is the sanctioned path for orchestrator types."
---

# ADR-0031 — Beads is the storage layer for CoBuilder programs, epics, and slices

## Context

The bundle family narrates a locally checked-out git repo. Its records come from files. `shared/build_index.py` rebuilds the whole index on every run. The current corpus holds 16 designs, 77 epics, 47 slices, 30 ADRs, 17 pull requests, 4 publications, 5 program designs, 15 epic designs, 1 context, 6 districts, and 16 boundary rules.

The state lives in three places, and none of them is a store.

Slices carry `state`, `score`, and `attempts` inside the markdown tables of `docs/plans/<slug>/04-slices.md`. `shared/slice_table.py` parses that table with regexes for three callers. An attempt is an appended file under `.cobuilder/rubrics/<slug>/evidence/`. The table's `attempts` column must be bumped by hand in the same commit.

Epics carry `branch`, `pr`, and `state` in the index joins, hand-maintained by whatever session last edited them.

The index is a full rebuild. It answers reads well and has no write model. Nothing records who moved a slice or what blocked what. Two sessions editing one ladder race at whole-file grain. Readiness is a human judgment re-derived from prose each time.

Beads v1.3.0 is available in this workspace. The beads fork sync work in this workspace exercised its full surface. Issue records carry arbitrary well-formed JSON metadata as the sanctioned extension point (GH#1406). This design leans on the dependency graph, the readiness projection, gates, and Dolt-backed sync.

## Options considered

1. **Status quo.** Markdown tables stay the state. Rejected: the state sits in prose, races at file grain, and has no history.
2. **GitHub as the store.** Rejected: network-bound, offline-blind, and the wrong granularity for slices. ADR-0029 already decided the pull request is content read from GitHub, not a second record kept here.
3. **A bespoke JSON or SQLite store.** Rejected: rebuilds the engine beads ships, with no reader other than the scripts that would have to maintain it.
4. **Beads with built-in types only.** Rejected for programs specifically. recorded in the frontmatter alternatives.

## Decision

### Where the tracker lives

The narrated repo owns one `.beads/` tracker. For this repository the tracker is its own: this repo is also a narrated repo (the `cobuilder-viewer` program narrates this checkout), so the pilot seeds here. Prefix `cb`.

A target repo gets its tracker when a program seeds into it, not at plugin install. ADR-0016 sets the install-surface rule. The plugins ship no agent, no hook, and no MCP server. They call `bd` from scripts exactly as they call `git` and `gh` today.

Beads v1.3.0 requires `types.custom = program` in the tracker config. Set it once at `bd init`. The custom-type surface is the upstream-sanctioned home for orchestrator types. the beads fork's own tracker already carries `merge-request` this way.

### The schema mapping

The mapping keeps every existing consumer key alive. Beads ids (`cb-1j6.1`) are storage keys. The CoBuilder composite ids (`<design>/E5`, `<design>/<n>`) stay in metadata. The index and the viewer keep working unchanged.

| CoBuilder record | Beads issue | Field map |
|---|---|---|
| `DesignEntity` (program) | type `program` (custom), P1 | `name` → title suffix and `metadata.cb.name`. `outcome` → issue description. `stage` → `metadata.cb.stage`. design doc → untouched file, path in `external_ref`. `done_when` → issue `acceptance_criteria` |
| `EpicEntity` | type `epic` (built-in), `--parent <program>` | `epic_id` ("E5") → `metadata.cb.epic_id`. `branch` → `metadata.cb.branch`. `pr` → `metadata.cb.pr`. `note` → issue description |
| `SliceEntity` | type `task` (built-in), `--parent <epic>`, `--deps blocked-by:<slice n-1>` | `n` → `metadata.cb.n`. `title` → issue title. `ends_with` → `metadata.cb.ends_with`. `score` → `metadata.cb.score`. `attempts` → `metadata.cb.attempts`. `feature` → `metadata.cb.feature` |
| `AdrEntity` | type `decision` (built-in), `--deps relates-to <program>` | ADR id → title prefix and `metadata.cb.adr`. ADR file → untouched, path in `external_ref`. districts → `metadata.cb.districts` |
| `PullRequest` | no issue | The epic's `metadata.cb.pr` plus `external_ref: gh-<n>`. GitHub stays the source of record, per ADR-0029 |
| `GateStep` (feature gates) | type `gate`, `--blocks <slice or epic>` | `name` → gate title. `state` → gate resolution |
| `Publication` | no issue | Stays index-derived from the publish step. a publish is an event, not tracked work |
| `DistrictEntity`, `BoundaryRule`, `ContextEntity` | no issue | Architecture geography stays in `docs/architecture/contexts/`. decisions name districts in metadata |
| `ProgramDesignEntity`, `EpicDesignEntity`, `InteractionDesignEntity` | no issue | Prose documents. The program issue's `external_ref` points at the design directory |

Records with a stage, a score, or a ladder position become issues. Prose and external facts stay out and get a pointer.

### The metadata envelope

Beads stores one `metadata` JSON object per issue. It validates only that the value is well-formed JSON. CoBuilder claims one top-level key and owns everything under it.

```json
{
  "cb": {
    "v": 1,
    "kind": "slice",
    "design": "cobuilder-viewer",
    "epic": "E5",
    "n": 2,
    "ends_with": "types.ts declares every index record",
    "score": "0.85",
    "attempts": 1,
    "feature": "cobuilder-viewer",
    "evidence": [
      ".cobuilder/rubrics/cobuilder-viewer/evidence/slice-18-attempt-1.md"
    ]
  }
}
```

Rules:

1. **One key per tool.** The envelope sits under `cb`, versioned by `v`. A second extension later adds its own key beside it, never inside it.
2. **Scalars, paths, and lists of paths only.** No prose blobs. The documents stay in git. the tracker carries pointers.
3. **`kind` discriminates.** `program`, `epic`, `slice`, `decision`, `gate`. `shared/build_index.py` projects each entity kind from the matching issues.
4. **Evidence stays files.** Rubric evidence, screenshots, and attempt narratives live under `.cobuilder/rubrics/<slug>/evidence/`. The envelope lists their paths. A tracker that stores screenshots is a document store. This design already decided beads is not one.
5. **Consumer ids live here.** `metadata.cb.epic_id` and `metadata.cb.n` reproduce the composite ids the viewer and the tests already use, so the mapping costs no consumer changes.

Dependency edge metadata exists in beads too (`Dependency.metadata`), but the v1 mapping needs no edge data. The dependency types carry the joins.

### State vocabularies

Beads status is a lifecycle projection. CoBuilder's vocabularies are richer, so the full word stays in metadata and the status carries the workflow shape.

| CoBuilder value | `metadata` keeps | beads `status` |
|---|---|---|
| program: `backlog`, `decided`, `design`, `review`, `approved` | `stage` | `open` |
| program: `implemented` | `stage` | `closed` |
| program: `superseded` | `stage` | `closed`, with a `supersedes` edge to the successor |
| epic: `planned` | `state` | `open` |
| epic: `open` | `state` | `in_progress` |
| epic: `deferred` | `state` | `open`, excluded from `bd ready` by its blocked gate or its parent's |
| epic: `completed`, `merged` | `state` | `closed`, close reason carries the word |
| slice: `planned` | nothing. status suffices | `open` |
| slice: `completed` | nothing. status suffices | `closed` |
| slice claimed by a worker | `attempts` bump | `in_progress` or `hooked` |

The rubric score never maps to priority. Priority stays the tracker's scheduling order (program P1, epic P2, slice P2). Score is assessment history in metadata.

### The joins, mapped

| Index join today | Beads projection |
|---|---|
| `epic_status` | the epic issue's `status` and `metadata.cb.state` |
| `slice_to_epic` | the parent-child dependency (the hierarchical id encodes it) |
| `epic_to_pull_request` | `metadata.cb.pr` on the epic |
| `adr_to_pull_request` | `metadata.cb.pr` on the decision |
| `adr_to_context`, `adr_to_district` | `metadata.cb.districts` on the decision |
| `feature_gates` | gate issues. `bd show <epic>` returns the blocking gates |
| `slice_to_epic_unresolved` | a seed-time report: a slice whose epic id has no issue. Unresolvable by construction afterwards |
| `context_verifies_district`, `district_uncovered` | unchanged, still derived from `docs/architecture/contexts/` |

### The read model

`shared/build_index.py` gains one source. It calls `bd list --json` once for the whole corpus. Five programs and roughly two hundred issues make the corpus small. The script projects entities and joins exactly as today and writes the same `data/index.json`. The viewer stays build-free and reads the static index. ADR-0001, ADR-0018, and ADR-0020 stand unchanged.

The workflow reads never touch the index. `bd ready` names the next actionable slice. `bd tree` renders the board's rows. `bd show <epic>` returns the epic with its gates.

### The write model

| CoBuilder moment | Command |
|---|---|
| Gate 3 passes. the design seeds a program | `bd create "Program: <name>" -t program --metadata @envelope.json --external-ref <goal.json>` |
| Epics enter the program | `bd create "E5: <title>" -t epic --parent <program> --metadata @envelope.json` |
| The ladder is authored for an epic | `bd create "Slice <n>: <title>" -t task --parent <epic> --deps blocked-by:<prev> --metadata @envelope.json` |
| An attempt fails | append the evidence file. `bd update <slice> --metadata @envelope.json` with `attempts` bumped |
| A worker claims a slice | `bd update <slice> --status in_progress` |
| A slice passes its rubric | `bd close <slice> --reason "<ends_with> verified"` |
| A pull request opens | `bd gate create "Merge PR <n>" --type human --blocks <epic>` |
| The pull request merges | `bd gate resolve <gate>`. `bd close <epic> --reason merged` |
| A design is superseded | `bd close <program>` plus a `supersedes` edge to the successor |

The envelope files are written next to the work by the session that does it, then fed to `bd` with `--metadata @file`. No plugin code parses beads JSON to write it. `bd` is the only writer, which is the whole point of a store.

Smoke-verified against bd 1.3.0: `--parent` creates the parent-child dependency itself, and adding a second `parent-child` edge by hand is refused as a cycle. The ladder read flips correctly: with slice 1 open, `bd ready` names slice 1. after `bd close`, it names slice 2. `bd export` carries the full envelope, so a plain JSONL interchange stays available to any future consumer. Verified 2026-09-29: `bd export` also carries the comments array inline on each issue. `bd list --json` exposes `updated_at` and `comment_count` on every row. `bd show <id> --json --include-comments` streams one issue's comments.

### What beads must not hold

Prose documents, screenshots, pull-request state, district geography, and publication history stay where they are. Beads is the state layer, not the corpus. A pointer beats a copy wherever the source of record already exists.

## Consequences

The write path gains a real store. Readiness, blocking, history, and Dolt-backed sync come from beads instead of from human discipline. Two sessions on one ladder get row-level truth and a recorded trail. The index keeps its shape. Every existing consumer key survives in metadata.

The costs are real. `bd` becomes a system dependency. scripts must detect its absence and fall back to today's file flow rather than fail a session. The tracker config must ship `types.custom = program`. Metadata has no query language, so corpus-wide questions stay with the index, which is where the viewer's questions already live. And two sources of state exist during the migration window, which is why the seed script is idempotent and dry-run first.

# Amendment 2026-09-29 — the status file, the reconcile rule, the fallback, the closings

A review against the sync goal found the ADR silent on four surfaces. This amendment fixes each. Verified on the corpus, `docs/plans/<slug>/00-status.md` is the second state surface. Its nine files share one anatomy. It holds a prose header, gate approval lines with an indented `view:` route line, the 4a/4b/4c sub-lines of Gate 4, slice lines of the form `- [x] Slice N — <title> score: X.XX (attempt M)`, an escalation section, and prose sections for the fresh-session notes and the verification record. `shared/gate_status.py` parses the gate lines per ADR-0032. The slice lines restate the `04-slices.md` table. Two files carry one truth, and that duplication is the observed drift mechanism.

**The status file maps into beads.** A gate approval line is the resolution of a gate issue. The session runs `bd gate resolve <gate>`. The approval date becomes the close reason, and the `view:` route becomes `metadata.cb.view`. A slice PASS line is an envelope update (`score`, `attempts`) plus a dated `bd comment <slice>` line that keeps the narrative. bd 1.3.0 comments are append-only per issue, and rule 2 stands. Metadata stays scalars. Comments are beads's own prose surface, not envelope prose. An escalation is an escalated-true envelope flag plus a comment that carries the score and the reason. The prose sections stay authored documents.

**The seed reconciles, newest wins, both directions.** `shared/beads_seed.py` is not create-only. Every run diffs each record's file source against its issue envelope. Equal is a no-op. The file newer than the issue's `updated_at` updates the issue. The issue newer than the file updates the file's stateful lines. That backfill repairs the state a degraded session wrote while bd was absent. The comparison key is the record's last git commit date against the issue `updated_at`, not file mtime. A fresh clone stamps fresh mtimes on old files. When both sides changed since the last reconcile, or the tie cannot be decided, the pair is reported as a conflict and nothing moves.

**The bd-absent fallback is read-only.** Scripts read the file sources and refuse to write workflow state. The engineer may instruct a degraded file write as an exception; the next reconcile imports it. Nothing writes file state silently.

**The program closings get a named moment.** Nothing in today's workflows sets stage `implemented` or `superseded` — verified across all four plugin command sets. The moments now belong to the write model: when every epic issue of a program is closed, the closing session runs `bd close <program> --reason implemented`. When a design decides a successor, the deciding session runs `bd close <program> --reason superseded` plus the `supersedes` edge to the successor program. Both are beads commands; the file sources stop carrying these two words.

**The stateful sections generate from beads, and a separate beads-to-file sync is dropped.** The engineer decided this in the second 2026-09-29 review. The generator is the seed's reconcile itself: the file-newer and issue-newer branches already rewrite the file's stateful lines, so generation adds no second writer. The workflow runs the reconcile beside the existing refresh-the-bundle step after bd writes. Agent-facing aggregate reads keep the generated file: the status update reaches a fresh session as one file read in today's shape, not as comment queries.

**Comments are history. Scalars are state.** The per-issue comment surface is append-only, which is correct for it. The whole-corpus read stays `bd list --json`. The reconcile detects comment drift through `comment_count` without reading comments. The full audit read is `bd export`, which returns every issue with its complete comments in one call. The per-issue history read is `bd comments <id>` or `bd show <id> --json --include-comments`. No consumer opens comments issue by issue in a loop. `bd init` must run with `--skip-agents --skip-hooks`: bd init installs an agent skill, Cursor rules, and git hooks by default, which would breach ADR-0016's install-surface rule in the narrated repo.

**Epic scope notes.** E1 gains deliverables: the reconcile, the conflict report, and a count check that derives its counts from the current index at run time, no pinned literal. E2 gains two readers: `plugins/artifact/scripts/build_builds_view.py` reads `04-slices.md` directly through `slice_table`, so it joins the bd-first rule beside `build_index.py`; `verify_gate.py` keeps its own raw-line link check and moves its state reads the same way. E3 gains the authored `goal.json` shape change: `epics[]` stops carrying `branch`, `pr`, and `state`, and `goal-sync.md` retires. A guardrail test lands with E2: every join scalar comes from the envelope, never from parsed comment text.

## Not decided

- How the 4a, 4b, and 4c sub-lines of Gate 4 map. The leaning is three real gate issues, because the sub-lines already carry their own approval dates while the parent line holds one, and some files mark a sub-line n/a while the parent stays approved. Two bd behaviours are untested: `bd gate create --blocks <gate-issue>` on a gate-type target, and several gates blocking one target. Smoke-check both before E3; if gate-on-gate fails, the sub-gates block the same target Gate 4 blocks.
- Whether an n/a gate (`Gate 2b — n/a (no UI)`) resolves with a reason on the gate issue or stays an authored line.
- When `gh:pr` gate automation replaces the human merge gate. Which plugin runs `bd init` in a target repo, and how consent is asked. Who owns `shared/beads_seed.py`.
- The thread ledger (`shared/ledger.py`, thread state open and resolved) stays out of the mapping. It is a reply-channel vocabulary, not work-item state; its exclusion belongs on the record.
