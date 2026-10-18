---
# --- doc-gardener required frontmatter ---
title: "ADR-0031 — Beads is the first storage adapter for CoBuilder programs, epics, and slices"
status: active
type: architecture
last_verified: 2026-10-17
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0031
source_pr: null
name: "Beads is the first storage adapter for CoBuilder programs, epics, and slices"
state: decided
groups: [data-model, implement, architect]
approved_by: ""
problem: "CoBuilder workflow state has no storage layer. Slice states, scores, and attempts live in the markdown tables of docs/plans/<slug>/04-slices.md. Any session can silently contradict that prose. Epic branches and pull-request numbers live in hand-maintained index joins. Nothing below the file level answers what is next. Nothing answers what blocks what, or what changed while two sessions worked one ladder. The record index has a read model and no write model."
decision: "Beads v1.3.0 becomes the first adapter of the CoBuilder tracker port (ADR-0040). The narrated repo gains one .beads tracker. Each program, epic, slice, and pull request becomes one beads issue. The issue is typed, parented, and chained in the slice ladder with blocked-by dependencies. Every record keeps its shape under a namespaced metadata envelope, metadata.cb. Beads stores the envelope as well-formed JSON on the issue. The markdown sources of record stay untouched as documents. The beads issue holds the state and wins over any file. shared/build_index.py reads state through the port and the projector and writes the same data/index.json. The viewer stays build-free per ADR-0001, ADR-0018, and ADR-0020. The mapping below fixes every field."
maps_to:
  context: cobuilder-packaging
  modules: [shared, plugins/implement, plugins/architect]
  rule: "Workflow state for programs, epics, slices, and pull requests lives in beads under the metadata.cb envelope when the beads adapter is configured. Documents keep the prose. build_index.py reads state through the tracker port, and every adapter projects the same shapes. Every state write goes through the port, and the beads adapter is the only caller of bd."
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
  - { state: decided, date: 2026-10-17, by: engineer, note: "Third amendment: the central store is Dolt-in-git, bd is required for every state write, and the beads issue wins over a file. A pull request becomes its own issue, the Gate 1 to 4 approvals become scalar fields on the program issue, and an ADR stays a file pointer. The goal is one backlog shared by local, cloud, and team sessions." }
  - { state: decided, date: 2026-10-17, by: engineer, note: "Fourth amendment: beads is the first adapter of a tracker port, and ADR-0040 owns the port. This ADR keeps the beads mapping, the envelope, bd init, and the Dolt-in-git store." }
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

# ADR-0031 — Beads is the first storage adapter for CoBuilder programs, epics, and slices

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

A target repo gets its tracker when a program seeds into it, not at plugin install. ADR-0016 sets the install-surface rule. The plugins ship no agent, no hook, and no MCP server. Only the beads adapter in `shared/tracker_port/` calls `bd`, the way scripts call `git` and `gh` today.

Beads v1.3.0 requires `types.custom = program` in the tracker config. Set it once at `bd init`. The custom-type surface is the upstream-sanctioned home for orchestrator types. the beads fork's own tracker already carries `merge-request` this way.

### The schema mapping

The mapping keeps every existing consumer key alive. Beads ids (`cb-1j6.1`) are storage keys. The CoBuilder composite ids (`<design>/E5`, `<design>/<n>`) stay in metadata. The index and the viewer keep working unchanged.

| CoBuilder record | Beads issue | Field map |
|---|---|---|
| `DesignEntity` (program) | type `program` (custom), P1 | `name` → title suffix and `metadata.cb.name`. `outcome` → issue description. `stage` → `metadata.cb.stage`. design doc → untouched file, path in `external_ref`. `done_when` → issue `acceptance_criteria` |
| `EpicEntity` | type `epic` (built-in), `--parent <program>` | `epic_id` ("E5") → `metadata.cb.epic_id`. `branch` → `metadata.cb.branch`. `note` → issue description. The pull request comes from the `pr` issue that blocks the epic |
| `SliceEntity` | type `task` (built-in), `--parent <epic>`, `--deps blocked-by:<slice n-1>` | `n` → `metadata.cb.n`. `title` → issue title. `ends_with` → `metadata.cb.ends_with`. `score` → `metadata.cb.score`. `attempts` → `metadata.cb.attempts`. `feature` → `metadata.cb.feature` |
| `AdrEntity` | no issue | The ADR file stays the source. Its frontmatter keeps the districts and the pull request. An index join reads them as today |
| `PullRequest` | type `task` (built-in), `metadata.cb.kind` = `pr`, title = the ref (`pr-<n>`), `--external-ref gh-<n>`, one dependency edge per epic it holds (`bd dep add <epic> <pr>`) | The number lives in `external_ref`. The issue holds the merged bit (status). GitHub stays the source of every other fact, per ADR-0029 |
| `GateStep` (Gates 1 to 4, 4a to 4c) | no issue | Scalar fields on the program issue: `metadata.cb.gate1`, `gate2`, `gate2b`, `gate3`, `gate4`, `gate4a`, `gate4b`, `gate4c`. A gate field holds the approval date (YYYY-MM-DD) or `n/a`, and an absent field means the gate is not reached. The `view:` route of a gate is `metadata.cb.gate<n>_view` |
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
3. **`kind` discriminates.** `program`, `epic`, `slice`, `pr`. `shared/build_index.py` projects each entity kind from the matching issues.
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
| epic: `deferred` | `state` | `open`, kept out of `bd ready` by a blocking edge or its parent's |
| epic: `completed`, `merged` | `state` | `closed`, close reason carries the word |
| slice: `planned` | nothing. status suffices | `open` |
| slice: `completed` | nothing. status suffices | `closed` |
| slice claimed by a worker | `attempts` bump | `in_progress`. The beads status `hooked` also maps to the port lifecycle `in_progress` |

The rubric score never maps to priority. Priority stays the tracker's scheduling order (program P1, epic P2, slice P2). Score is assessment history in metadata.

### The joins, mapped

| Index join today | Beads projection |
|---|---|
| `epic_status` | the epic issue's `status` and `metadata.cb.state` |
| `slice_to_epic` | the parent-child dependency (the hierarchical id encodes it) |
| `epic_to_pull_request` | the dependency edge that `bd dep add <epic> <pr>` creates, and `external_ref` `gh-<n>` on the `pr` issue |
| `adr_to_pull_request`, `adr_to_context`, `adr_to_district` | unchanged, derived from the ADR frontmatter |
| `feature_gates` | the gate scalars on the program issue. `bd show <epic>` returns the `pr` issue that blocks it |
| `slice_to_epic_unresolved` | a seed-time report: a slice whose epic id has no issue. Unresolvable by construction afterwards |
| `context_verifies_district`, `district_uncovered` | unchanged, still derived from `docs/architecture/contexts/` |

### The read model

The beads adapter calls `bd list --json` once for the whole corpus. Five programs and roughly two hundred issues make the corpus small. `shared/build_index.py` reads the records through the tracker port, and the projector turns them into entities and joins exactly as today. It writes the same `data/index.json`. The viewer stays build-free and reads the static index. ADR-0001, ADR-0018, and ADR-0020 stand unchanged.

The workflow reads never touch the index. The port operation `next_ready(kind="slice", under=None)` names the ready slices, and on beads the slice call is `bd ready`. ADR-0040 defines ready. `bd tree` renders the board's rows. `bd show <epic>` returns the epic with the pull request that blocks it. A `pr` issue shows in `bd ready` until it closes, so `next_ready` and every other consumer filters on `metadata.cb.kind`.

### The write model

| CoBuilder moment | Port operation | Beads adapter command |
|---|---|---|
| Gate 3 passes. the design seeds a program | `seed_from_files` | `bd create "Program: <name>" -t program --metadata @envelope.json --external-ref <goal.json>` |
| Epics enter the program | `seed_from_files` | `bd create "E5: <title>" -t epic --parent <program> --metadata @envelope.json` |
| The ladder is authored for an epic | `seed_from_files` | `bd create "Slice <n>: <title>" -t task --parent <epic> --deps blocked-by:<prev> --metadata @envelope.json` |
| A gate is approved | `set_gate_value`, `add_note` | `bd update <program> --metadata @envelope.json`, then `bd comment <program>` |
| An attempt fails | `record_attempt` | append the evidence file, then `bd update <slice> --metadata @envelope.json` with `attempts` bumped |
| A worker claims a slice | `claim_slice` | `bd update <slice> --status in_progress` with the claimant (a GitHub login) as assignee, then a read of the assignee when `atomic_claim` is false |
| A slice passes its rubric | `set_slice_state` | `bd close <slice> --reason "<ends_with> verified"` |
| A pull request opens | `open_pull_request` | `bd create "pr-<n>" -t task --metadata {"cb": {...}} --external-ref gh-<n>`, then `bd dep add <epic> <pr>` for each epic it holds |
| The pull request merges | `set_pull_request_state`, `set_epic_state` | `bd close <pr> --reason merged`, then `bd close <epic> --reason merged` for each epic it held |
| A session ends its writes | `sync` | `bd sync` |
| A design is superseded | `set_program_stage` | `bd close <program>` plus a `supersedes` edge to the successor |

Only the beads adapter runs these commands. It writes the envelope files next to the work and feeds them to `bd` with `--metadata @file`. No plugin code parses beads JSON to write it, and no caller outside `shared/tracker_port/` calls `bd`.

Smoke-verified against bd 1.3.0: `--parent` creates the parent-child dependency itself, and adding a second `parent-child` edge by hand is refused as a cycle. The ladder read flips correctly: with slice 1 open, `bd ready` names slice 1. after `bd close`, it names slice 2. `bd export` carries the full envelope, so a plain JSONL interchange stays available to any future consumer. Verified 2026-09-29: `bd export` also carries the comments array inline on each issue. `bd show <id> --json --include-comments` streams one issue's comments.

### What beads must not hold

Prose documents, screenshots, pull-request state, district geography, and publication history stay where they are. Beads is the state layer, not the corpus. A pointer beats a copy wherever the source of record already exists.

## Consequences

The write path gains a real store. Readiness, blocking, history, and Dolt-backed sync come from beads instead of from human discipline. Two sessions on one ladder get row-level truth and a recorded trail. The index keeps its shape. Every existing consumer key survives in metadata.

The costs are real. With the beads adapter, `bd` becomes a system dependency, and a script that writes state refuses the write when `bd` is absent. Scripts still read the file sources through the files adapter. The tracker config must ship `types.custom = program`. Metadata has no query language, so corpus-wide questions stay with the index, which is where the viewer's questions already live. And two sources of state exist during the migration window, which is why `seed-from-files` is idempotent and dry-run first.

# Amendment 2026-09-29 — the status file, the write refusal, the closings

The amendment of 2026-10-17 replaces the gate issue and the epic scope notes of this amendment. This text states the other rules in their current form.

A review against the sync goal found the ADR silent on four surfaces. This amendment fixes each. Verified on the corpus, `docs/plans/<slug>/00-status.md` is the second state surface. Its nine files share one anatomy. It holds a prose header, gate approval lines with an indented `view:` route line, the 4a/4b/4c sub-lines of Gate 4, slice lines of the form `- [x] Slice N — <title> score: X.XX (attempt M)`, an escalation section, and prose sections for the fresh-session notes and the verification record. `shared/gate_status.py` parses the gate lines per ADR-0032. The slice lines restate the `04-slices.md` table. Two files carry one truth, and that duplication is the observed drift mechanism.

**The status file maps into beads.** A gate approval line becomes a `gate<n>` scalar on the program issue, and the `view:` route becomes `gate<n>_view`. The dated narrative goes to `bd comment <program>`. A slice PASS line is an envelope update (`score`, `attempts`) plus a dated `bd comment <slice>` line that keeps the narrative. bd 1.3.0 comments are append-only per issue, and rule 2 stands. Metadata stays scalars. Comments are beads's own prose surface, not envelope prose. An escalation is an escalated-true envelope flag plus a comment that carries the score and the reason. The prose sections stay authored documents.

**`seed-from-files` only creates.** The operation reads a file to create an issue that does not exist yet. After that, the issue is the only source of state. A hand edit of a stateful line is reported and overwritten, as the amendment of 2026-10-17 states.

**Without an adapter, scripts refuse state writes.** Scripts read the file sources and refuse to write workflow state. Nothing writes file state silently.

**The program closings get a named moment.** Nothing in today's workflows sets stage `implemented` or `superseded` — verified across all four plugin command sets. The moments now belong to the write model: when every epic issue of a program is closed, the closing session runs `bd close <program> --reason implemented`. When a design decides a successor, the deciding session runs `bd close <program> --reason superseded` plus the `supersedes` edge to the successor program. Both are beads commands; the file sources stop carrying these two words.

**The stateful sections generate from the tracker, and a separate tracker-to-file sync is dropped.** The engineer decided this in the second 2026-09-29 review. The port operation `regenerate_status_files` rewrites the stateful lines of each file, so generation adds no second writer. The workflow runs it beside the existing refresh-the-bundle step after the writes. Agent-facing aggregate reads keep the generated file: the status update reaches a fresh session as one file read in today's shape, not as comment queries.

**Comments are history. Scalars are state.** The per-issue comment surface is append-only, which is correct for it. The whole-corpus read stays `bd list --json`. The full audit read is `bd export`, which returns every issue with its complete comments in one call. The per-issue history read is `bd comments <id>` or `bd show <id> --json --include-comments`. No consumer opens comments issue by issue in a loop. `bd init` must run with `--skip-agents --skip-hooks`: bd init installs an agent skill, Cursor rules, and git hooks by default, which would breach ADR-0016's install-surface rule in the narrated repo.

**Epic scope notes.** The four epics match `goal.json`.

E1 builds the port in `shared/tracker_port/`: the neutral record, the projector, the fake adapter, a read-only files adapter that reuses `slice_table`, and the contract test. E1 ships alone, and its projector matches `data/index.json` offline.

E2 builds the beads adapter, which implements `seed-from-files`. That operation only creates. It also builds a count check that derives its counts from the current index at run time, with no pinned literal. The Dolt-in-git cloud-clone smoke check gates E2.

E3 moves the readers to the port: `shared/build_index.py`, `plugins/artifact/scripts/build_builds_view.py` (which reads `04-slices.md` through `slice_table`), and `verify_gate.py` (which keeps its own raw-line link check). The stateful file sections generate from the tracker through `regenerate_status_files`. A guardrail test lands with E3: every join scalar comes from the envelope, never from parsed comment text.

E4 builds the write model and the authored `goal.json` shape change: `epics[]` stops carrying `branch`, `pr`, and `state`, and `goal-sync.md` retires. The issue wins, so no conflict report exists.

# Amendment 2026-10-17 — the central store, the bd requirement, the winner

**The problem.** Work runs on a local machine, in cloud sessions, and with several team members. Without one central store, the backlog and the program states drift apart. A sync of the CoBuilder JSON and markdown files gives complex merges. The success measure has two cases. A fresh session finds a program and its stage with one `list-programs` call and zero file reads. A session that resumes a build finds the next slice with one `next-ready` call and zero file reads. On beads, that second call is `bd ready`.

**The central store is Dolt-in-git. The first publish is verified on a local bare remote only.** The tracker database rides in the repo's own git remote as the hidden ref `refs/dolt/data`. The first publish runs `bd sync -y`, then one `bd dolt push`, then `bd sync`. A later clone runs `bd init`, then `bd sync`. A session runs the port operation `sync` after its writes, beside the refresh-the-bundle step. On beads, that is `bd sync`. No new service is needed.

Not verified: a cloud session that holds only a git clone. A real GitHub remote is also not verified. A smoke check of each case must pass before E2 closes.

**Every state write needs a configured adapter.** This replaces the read-only fallback and the degraded-write exception of the first amendment. When no adapter is configured, scripts still read the file sources. They refuse every state write and name the missing adapter. With the beads adapter, the missing tool is `bd`. The install command and `implement:start` check for the adapter.

**The beads issue wins.** This replaces the newest-wins reconcile of the first amendment. `seed-from-files` reads a file only to create an issue that does not exist yet. After that, the issue is the only source of state. The reconcile regenerates the stateful lines of each file from the issue. It reports a hand edit of a stateful line and overwrites it. No file-to-issue update remains, because no state write can happen without `bd`.

**Scope.** Beads is the master of programs, epics, slices, and their states. Every other record stays a file, and the issue holds a pointer. The thread ledger and the Hindsight initiative pages stay outside beads.

**Who runs what.** The beads adapter implements `seed-from-files`, and the agent workflow in `shared/tracker-backfill.md` runs it. `bd init` runs with `--skip-agents --skip-hooks`, from `implement:start` at Gate 3 after an explicit consent question, and from the install command.

**The pull request is its own issue.** One pull request can close several epics. The `pr` issue holds the number as a pointer and blocks each epic it holds. A human closes the issue on merge, until `gh:pr` automation lands. That close frees every epic at once. This replaces the human merge gate and the `gate` type. A scratch tracker smoke test on 2026-10-17 passed. One `task` issue with `cb.kind = pr` blocked two epics, `bd ready` hid both epics until `bd close`, and then it showed both.

**The gate approvals are program scalars.** Gates 1 to 4 run in order on one program and block no other work item. Their dates are flat scalar fields on the program issue, so the envelope rule 2 holds. A gate approval line becomes `bd update <program> --metadata @envelope.json`, and the dated narrative goes to `bd comment <program>`. This replaces the `bd gate resolve` text of the first amendment. The smoke test showed that flat gate fields round-trip through `bd show`.

**The ADR is a file pointer.** No `decision` issue exists. This replaces the ADR row of the first mapping.

# Amendment 2026-10-17 (fourth) — beads is the first adapter

**Scope narrows.** ADR-0040 adds a tracker port in `shared/tracker_port/`. Readers and writers of workflow state call the port, and an adapter calls the tracker. This ADR no longer says that beads is the storage layer for every caller. Beads is the first adapter. This ADR owns the beads-specific parts: the mapping, the `metadata.cb` envelope, `bd init --skip-agents --skip-hooks`, the Dolt-in-git store, and the `seed-from-files` operation of the beads adapter.

**The write rule changes its subject.** "bd is required for every state write" becomes "a configured tracker adapter is required for every state write". With the beads adapter, that means `bd`. Without an adapter, scripts read the file sources and refuse state writes.

**The success measure has two cases.** A fresh session finds a program and its stage with one `list-programs` call and zero file reads. A session that resumes a build finds the next slice with one `next-ready` call and zero file reads. On beads, that second call is `bd ready`.

**What stays.** Every row of the mapping, the state vocabularies, and the joins still describe the beads adapter. The write-model table now names the port operation first and the beads command second. The first three amendments stand for beads, except where the third and fourth amendments replace them. ADR-0040 wins on the port.

**Agents call one command.** The write-model commands above run inside the beads adapter. An agent never types them. An agent calls `shared/tracker.py`, and ADR-0040 defines that command and the shared reference that teaches it. The beads notes in that reference hold the `bd init` consent question and its two flags.

**Two statements that the program design overrides.** The deferred state of an epic is the envelope key `deferred`. It is not a blocking edge or a parent status, so the rows of the state-vocabulary table that name a blocking edge for `deferred` no longer apply. Projector parity with the live `docs/plans` tree is a one-off manual run in slice 10 of the build plan. It is not a test, because no test reads the live plans.

# Amendment 2026-10-18 — first publish and the pull request issue

**The first publish is a fixed sequence.** On an empty remote, the seed runs `git remote add origin`, `bd config set team.enabled true`, and `bd config set team.sync_branch main`. Then it runs `bd sync -y`, which exits 1 once with `no branches found in remote`. One `bd dolt push` publishes `refs/dolt/data`. After that, bare `bd sync` exits 0. This sequence is verified on a local bare remote with bd 1.3.0. A real GitHub remote is not verified.

**The pull request issue takes its title from the ref.** The title is `pr-<n>`, and the number lives in `external_ref` as `gh-<n>`. The envelope holds no `pr` key. Each epic it holds gets `bd dep add <epic> <pr>`, with no `--type`. This replaces the number-as-pointer text of the 2026-10-17 amendment.

## Not decided

- When `gh:pr` automation closes the `pr` issue on merge, in place of the human close.
- Whether an n/a gate (`Gate 2b — n/a (no UI)`) stores the value `n/a` or leaves the field absent. The leaning is the value `n/a`, so that a missing field means a gate not yet reached.
- The thread ledger (`shared/ledger.py`, thread state open and resolved) stays out of the mapping. It is a reply-channel vocabulary, not work-item state; its exclusion belongs on the record.
