---
# --- doc-gardener required frontmatter ---
title: "ADR-0040 — A tracker port sits between CoBuilder and the task system"
status: active
type: architecture
last_verified: 2026-10-17
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0040
source_pr: null
name: "A tracker port sits between CoBuilder and the task system"
state: decided
groups: [data-model, implement, architect]
approved_by: ""
problem: "ADR-0031 binds CoBuilder to beads. Every reader and writer of workflow state would call bd directly. A team that works in Linear or Jira could not use CoBuilder without beads, and a later adapter would force a rewrite of every caller."
decision: "CoBuilder gets a tracker port in shared/tracker_port/. A neutral TrackerRecord and a TrackerPort define every read and write of workflow state. One shared projector turns record lists into entities, joins, and data/index.json. Adapters implement the port: beads first, then files (read only) and fake (in memory). Linear and Jira follow as later programs, and one contract test suite runs against every adapter. One command, shared/tracker.py, is the only entry point for agents, and one shared reference, shared/tracker-usage.md, teaches agents to use it."
maps_to:
  context: shared
  modules: [shared/tracker, shared/tracker.py, shared/tracker-usage.md, shared/tracker-backfill.md, shared/build_index.py, plugins/implement, plugins/architect]
  rule: "Readers and writers of workflow state call the tracker port, never a tracker's own CLI or API, such as bd. Agents reach the port through shared/tracker.py. Only an adapter knows a tracker. build_index.py reads TrackerRecord lists through the projector."
forces:
  - "The engineer wants a layer between CoBuilder and the task system, and Linear and Jira connectors may follow."
  - "The work graph (parent, blocks, lifecycle) is native in beads, Linear, and Jira. The state envelope needs a custom-data slot, and each tracker offers a different one."
  - "The beads bridges do not push metadata.cb. A Jira pull replaces the metadata column when it changes a mapped field. A Linear pull replaces it only for an issue with a project milestone. So a bridge cannot hold the CoBuilder state."
  - "No tracker has a verified atomic claim. Linear and Jira have no compare-and-set field."
  - "ADR-0016 and CLAUDE.md principle 5 forbid a plugin-shipped MCP server. Scripts call tools the way they call git and gh."
  - "Twelve readers parse state files today. One projector replaces that spread."
alternatives:
  - option: "Beads only, with the bd bridges (bd jira sync, bd linear sync) for other trackers"
    rejected_because: "No bridge pushes metadata.cb. A Jira pull that changes a mapped field replaces the metadata column, and a Linear pull replaces it for an issue with a project milestone. The state stays in beads, and beads stays mandatory even for a Jira-only team. A bridge is a mirror at best, not a system of record."
  - option: "Beads direct now, and extract the port when a second adapter arrives"
    rejected_because: "Every caller then holds bd calls, and the later extraction rewrites all of them. With no second implementation, the seam is a guess."
  - option: "An MCP server for each tracker"
    rejected_because: "ADR-0016 and CLAUDE.md principle 5 say no plugin ships an MCP server."
  - option: "Make each attempt its own record that relates to a slice"
    rejected_because: "No tracker has a natural child type for run history. A child issue for each attempt multiplies issues several times (96 slices today) and clutters Linear and Jira boards. The slice keeps the latest score and the attempt count in its envelope. The evidence files and one dated comment for each attempt keep the history. record_attempt is the single write operation, so a later child record needs no change in any caller."
delivers:
  capability: "CoBuilder reads and writes workflow state through one port. A second adapter can replace beads without a change to any caller."
  benefit: "A fake adapter and one contract test prove the seam before anyone builds a real second tracker. Linear and Jira stay later programs with their own smoke tests."
  beneficiary: [developer, implement-worker]
  enables: ["A Linear or Jira adapter as its own program", "One projector instead of twelve readers", "A contract test that every adapter must pass"]
provenance: authored
history:
  - { state: decided, date: 2026-10-17, by: engineer, note: "Decided as Option A of the tracker port exploration, inside the beads-storage program. The Linear and Jira adapters become later programs. The offline rule relaxes for them: the port has no snapshot, and an API adapter may cache inside the adapter. That choice belongs to the later programs." }
  - { state: decided, date: 2026-10-17, by: engineer, note: "Added the tracker CLI and the shared usage reference. Agents follow Markdown, so the port gets one command surface and one document that teaches it. The skills link the document once." }
related:
  - "docs/architecture/designs/beads-storage/goal.json"
  - "docs/architecture/designs/beads-storage/tracker-port-exploration.md"
  - "docs/architecture/adr/ADR-0031-beads-as-the-cobuilder-storage-layer.md"
  - "shared/build_index.py"
---

# ADR-0040 — A tracker port sits between CoBuilder and the task system

## Context

ADR-0031 makes beads the first storage adapter for programs, epics, slices, and pull requests. As written before this ADR, every reader and writer would call `bd`. The engineer wants a layer between CoBuilder and the task system, because Linear and Jira connectors may follow.

A scan of `shared/` and `plugins/*/scripts` found that no script writes workflow state today. Agents edit `00-status.md`, `04-slices.md`, and `goal.json` by hand. Twelve readers parse those files, among them `build_index.py`, `slice_table.py`, `gate_status.py`, `verify_gate.py`, and `build_builds_view.py`. The scan was a grep, not a full read of every file.

The exploration note compares beads, Linear, and Jira on nine points. They are custom data, parent and child, blocks, ready query, program type, external key, claim, status words, and corpus read. It also reads the beads bridges. The work graph is native in every tracker. The state envelope needs a custom-data slot, and the slot differs in each tracker.

## Options considered

1. **A port with adapters.** CoBuilder owns the seam. Chosen.
2. **Beads only, with the bd bridges.** Rejected. No bridge pushes `metadata.cb`.
3. **Beads direct now, and extract the port at the second adapter.** Rejected. Every caller holds `bd` calls, and the seam is a guess.
4. **An MCP server for each tracker.** Rejected by ADR-0016.
5. **Each attempt as its own record that relates to a slice.** Rejected for now. See the alternatives in the frontmatter.

## Decision

`shared/tracker_port/` holds the port. It has six parts.

- **TrackerRecord.** A neutral record. Its fields are `id`, `kind` (`program`, `epic`, `slice`, `pr`), `parent`, `blocked_by`, `lifecycle` (`open`, `in_progress`, `closed`), `assignee`, `envelope`, and `external_ref`. The `assignee` holds a GitHub login. The envelope follows rule 2 of ADR-0031: scalars, paths, and lists of paths. An adapter whose slot is flat, such as Linear, encodes a list as a JSON string. The beads status `hooked` maps to `in_progress`.
- **TrackerPort.** The operations are these.
  - List programs, epics, slices, and pull requests. Get one slice.
  - `next_ready(kind="slice", under=None)` returns the ready records of one kind (`program`, `epic`, or `slice`). With `under`, it returns only the records below that parent id. It never returns a pull request record.
  - `sync` makes local and central state equal. On beads it is `bd sync`. For an API adapter it may do nothing, or it may refresh the adapter cache.
  - `claim_slice(id, claimant)` sets the assignee to the claimant, a GitHub login. When `atomic_claim` is false, it writes and then reads the assignee back. Beads stores the login as the assignee string. An adapter maps a login to a tracker user through a user map in its config.
  - Set a program stage, a gate value, an epic state, and a slice state with score and attempts. Record an attempt. Add a note.
  - `escalate(slice, score, reason)` marks a slice that failed its attempt limit. It sets the envelope flag `escalated` to true. It records the score and the reason as a dated comment. It stops the slice loop until the engineer decides. It replaces the `## Escalated` section that agents write in `00-status.md` (see `slice-loop.md` lines 129-132 and `validation-scoring.md` lines 105-112 in `plugins/implement`).
  - `open_pull_request(ref, epic_ids)` creates the pull request record and blocks each epic. `set_pull_request_state(ref, merged)` closes it.
  - Regenerate the status files. Seed from files.
  - `capabilities()` is a read-only report of four flags: `native_ready`, `atomic_claim`, `rich_envelope`, and `offline_read`. The contract test gates cases on the flags. Callers read `atomic_claim` to know whether a claim needs a read-back. Callers read `offline_read` to know whether the index rebuild can run with no network. With `native_ready` false, the adapter computes ready itself.

  A record is ready when its lifecycle is open, every record in its `blocked_by` is closed, and its parent is not deferred. By kind:
  - A program is ready when its stage is open and it is unblocked.
  - An epic is ready when it is open and unblocked, and its program is ready. A pull request record that blocks the epic counts as a blocker. A deferred epic is not ready.
  - A slice is ready when it is open and unblocked, and its epic is ready.
- **Projector.** One shared function turns a TrackerRecord list into the entities, the joins, and `data/index.json`. It replaces the projection logic spread over the readers. A reader gets the records from the port, and no reader feeds the projector from another source.
- **Adapters.** `beads` (the `bd` CLI) comes first. `files` reads today's files through `slice_table` and refuses writes. `fake` keeps records in memory and proves the seam. `linear` and `jira` are later programs and are not built here.
- **Config.** One file names the adapter. The proposed name is `.cobuilder/tracker.yaml`.
- **Tracker CLI.** `shared/tracker.py` is the one command that agents call. The name is a proposal. The section "How agents use the port" below defines it.

One contract test suite runs against every adapter, and a read-only adapter runs the read cases only. The suite is the guard against a port shaped like beads. Its cases are these.

1. `next_ready` excludes pull request records and deferred epics.
2. `next_ready` returns the right records for each kind: `program`, `epic`, and `slice`. One case passes `under`.
3. `claim_slice` leaves the claimant in `assignee`. When `atomic_claim` is true, it writes once. When it is false, it writes and then reads the assignee back.
4. A value-level envelope round trip: write, read, and compare each value and each list item, not only each key. A list survives the encoding of a flat-slot adapter.
5. A pull request record from `open_pull_request` blocks two epics, and `next_ready(kind="epic")` shows both only after `set_pull_request_state(ref, merged)`.
6. A write with no configured adapter fails.
7. The projector gives one index from the records of the fake adapter and from the records of the beads adapter.

A second check, a grep-based test, asserts that no script outside `shared/tracker_port/` calls `bd`.

A third group of checks guards the documents. They are in a proposed `tests/test_tracker_docs.py`, and they check structure and effect, never wording.

1. The reference file exists, and the main `SKILL.md` of architect, implement, pr, and artifact names it.
2. Every `tracker.py <operation>` in a skill, command, or reference names a subcommand that `tracker.py --help` lists.
3. No skill, command, or reference outside the beads adapter notes names a `bd` command.
4. The reference is in `AUTHORING_REFERENCES` in `tests/test_prose_budget.py`.

A CLI test runs `tracker.py` over the fake adapter. It checks that stdout holds JSON, that a write with no adapter exits 2, and that bad arguments exit 4.

The fixtures are JSON files that the repo checks in under `tests/fixtures/tracker/`. This follows the existing `tests/fixtures/<topic>/` convention. The fake adapter loads its records from them. The contract test and the projector tests use them. They are the only source of data in these tests, and no test reads the live repo's plans.

- `corpus/` holds one program with gate scalars (one `n/a` and one not reached) and three epics. One pull request record blocks two epics, and the third epic is deferred. It also holds three slices in a ladder: one closed with a score, one in progress with an assignee, and one open.
- `expected-index.json` is the golden index, the projection of the corpus. The projector test compares it value by value.
- `plans/` is a miniature `docs/plans` tree. The files adapter test uses it.

The offline rule relaxes for Linear and Jira. The port has no snapshot. An API adapter may cache inside the adapter, because of rate limits. Linear allows 2,500 requests an hour, and 300 issues need about six pages of 50.

The later `tracker-linear` and `tracker-jira` programs decide the cache. The `offline_read` flag tells a caller whether the index rebuild can run with no network. The beads adapter still reads a local database.

Out of scope: the Linear and Jira adapters, any live-account call, and any MCP server.

## How agents use the port

Agents follow Markdown, so the port needs a command surface and one document that teaches it. This ADR designs both. It does not write them.

### The command
The command is the file `shared/tracker.py`. The adapters, the record, and the projector live in the package `shared/tracker_port/`. The two names differ on purpose. A file `tracker.py` and a package `tracker` in one folder collide on `import tracker`, and `tests/test_script_references.py` needs the top-level file for each `uv run shared/<name>.py` call. The program design of 2026-10-17 found this collision.

- **Call.** `uv run "${CLAUDE_PLUGIN_ROOT}/shared/tracker.py" <operation> [args]`. The script is a PEP 723 script. The path works in every plugin, because ADR-0017 symlinks `shared/` into each plugin.
- **Subcommands.** One for each port operation, with the same name and hyphens: `next-ready`, `claim-slice`, `set-slice-state`, `record-attempt`, `escalate`, `set-gate-value`, `set-epic-state`, `set-program-stage`, `open-pull-request`, `set-pull-request-state`, `add-note`, `sync`, `regenerate-status-files`, `seed-from-files`, `capabilities`, `list-programs`, `list-epics`, `list-slices`, `list-pull-requests`, and `get-slice`. `set-epic-state` also takes `--branch`, because the branch of an epic is an envelope field.
- **Doctor.** `doctor` names the configured adapter, shows the capabilities, and says what the setup lacks.
- **Output.** The command always prints JSON on stdout and a message on stderr.
- **Exit codes.** 0 means ok. 2 means refused: the command has no adapter, so no state write happens. 3 means an adapter error. 4 means bad arguments.
- **Repeat.** A write is safe to repeat where the operation allows it. A repeated `set-*` has the same effect. `open-pull-request` uses its `ref` as the key.
- **Ids.** A caller names a record by its composite id, `<design>/E5` or `<design>/<n>`. The port resolves it. A caller never uses a tracker id.
- **Callers.** A caller never parses tracker output and never writes an envelope by hand.

### The shared reference

The proposed path is `shared/tracker-usage.md`. The contract and the commands live there once. Each main `SKILL.md` links to it. It has these parts.

- **(a) The rule.** An agent reads and writes workflow state only through `tracker.py`. It never uses `bd`, a tracker API, or an edit of the state in `00-status.md`, `04-slices.md`, or `goal.json`. The tool generates the stateful lines of those files. The agent still writes evidence files and prose documents. The agent still uses `gh` to open a pull request, and then records it with `open-pull-request`.
- **(b) Session start.** Run `doctor`. Then find the program the request names with `list-programs`, and read its stage and gate fields. A design session starts a new program or continues one at its stage. A build session reads the program and its epics with `list-epics`. Call `next-ready --kind slice --under <program>` only to resume a build in progress, to pick the next slice. A session that builds or designs a whole program does not start with `next-ready`.
- **(c) Vocabulary.** The record kinds, the lifecycle, the envelope, and the composite ids. Also the gate fields (a date, `n/a`, or absent) and the assignee, which is a GitHub login.
- **(d) The moment table.** Each row gives the workflow moment, the command, the effect, the JSON result, and the failure. The rows are in the table below.
- **(e) Read patterns.** Use `next-ready --kind <kind> [--under <id>]`, `get-slice`, and the `list-*` commands. Never read the index for state. Never read `04-slices.md` for state.
- **(f) Failure and refusal.** The exit codes. On exit 2, tell the engineer that the tool has no adapter and wrote no state. Suggest `doctor`. Do not edit a status file by hand.
- **(g) Adapter notes.** One paragraph points to the notes for each adapter. The notes live in a separate file for each adapter, for example `shared/tracker-adapter-beads.md`. The beads notes hold the `bd init` consent question and its two flags, `bd sync`, and the claim read-back. Later Linear and Jira notes follow. The contract stays tracker-neutral, and only an adapter note may name `bd`.
- **(h) What an agent must not do.** It must not call `bd`, a tracker API, or an MCP tool for state. It must not edit generated state lines. It must not write an envelope. It must not use a tracker id. It must not read the index to find the next slice.

| Workflow moment | Command |
|---|---|
| Session start | `doctor`, then `list-programs` (and `list-epics` for a build). `next-ready` only to resume a build |
| A design is decided or approved | `set-program-stage` |
| Design stage 7 creates the first branch | `set-epic-state --branch` |
| A gate is approved | `set-gate-value`, then `add-note` |
| Gate 3 passes and the program seeds | `seed-from-files` |
| A worker claims a slice | `claim-slice` |
| An attempt fails | `record-attempt` |
| A slice passes | `set-slice-state` |
| A slice fails its attempt limit | `escalate` |
| A pull request opens | `open-pull-request` |
| A human merges the pull request | `set-pull-request-state`, then `set-epic-state` |
| A program is implemented or superseded | `set-program-stage` |
| A slice passes, and a session ends its writes | `regenerate-status-files` after the pass, then `sync` and `regenerate-status-files` at the end |

### The backfill

The backfill is an agent workflow in `shared/tracker-backfill.md`. It runs over the port operation `seed-from-files`. It has these steps.

1. Inventory. The agent lists the plans and their records through the files adapter. It does not call `bd`.
2. Dry run. The agent prints each planned create. It writes nothing.
3. Consent. The engineer approves the printed list before any write.
4. Create-only write. The agent creates each missing record through `seed-from-files`. A record whose `external_ref` exists is skipped.
5. Conflict. A record that exists with a different value is flagged, with both values shown. The agent never overwrites it.
6. Pull requests. The agent lists them with `gh pr list`, per ADR-0029.
7. Count check. The agent derives the expected count at run time from the index. It uses no pinned number.

The backfill is idempotent by `external_ref`. A second run creates nothing.

### Wiring

Each main `SKILL.md` gets one short section, "Workflow state". It says when to read the reference. Four skills get it.

- **architect.** Design mode writes the program stage and the first branch. Every mode reads state.
- **implement.** The build skill and its references `slice-loop.md`, `validation-scoring.md`, and `goal-sync.md` (which retires), and the `start`, `install`, and `debug` commands.
- **pr.** `generate` opens the pull request, so it calls `open-pull-request`. `review` reads state.
- **artifact.** `build_builds_view.py` reads state.

This goes beyond architect and implement. The pr and artifact skills touch workflow state at the same moments. A reader who skips the reference would read state from the files again.

The step procedures stay where each moment happens, for example in `slice-loop.md`. They name the command. They do not copy the moment table.

### Work by epic

E1 builds `tracker.py` over the fake and files adapters, and the reference. E2 builds the beads adapter notes. E3 switches the readers to the port, in place of a parse of `04-slices.md`. E4 writes the skill text.

### Export to other harnesses

`scripts/export-agent-skills.sh` now copies `shared/` to `<target>/shared/` and rewrites each `${CLAUDE_PLUGIN_ROOT}/shared/` path in the exported skills, agents, and shared files to a relative path. A harness that is not Claude Code therefore receives the reference and the CLI, if the engineer keeps `shared/` beside the skills. Verified on 2026-10-17 with an export to a temporary folder: no `${CLAUDE_PLUGIN_ROOT}/shared/` path was left, and all 40 relative paths in the skills resolved. No harness other than Claude Code has run the exported copy.

## Consequences

- **Positive:** a caller names no tracker. A second adapter needs no caller change. The fake adapter and the contract test prove the seam first.
- **Constraint introduced:** readers and writers of workflow state call the tracker port, never a tracker's own CLI or API. Agents reach the port through `shared/tracker.py`. Only an adapter knows a tracker.
- **Negative / accepted:** the port may take the shape of beads. The capability flags and the contract test are the guard. A method that only one tracker can implement, and that cannot be a capability flag, means the port needs a redesign.
- **Negative / accepted:** a flat custom-data slot, as in Linear, costs the list encoding named in TrackerRecord. The encoding must pass case 4.
- **Negative / accepted:** no tracker gives a verified atomic claim. When `atomic_claim` is false, `claim_slice` writes the claimant and reads the assignee back. Two sessions can still race until that read lands.
- **Negative / accepted:** the reference and the skills can drift apart. The tests in `tests/test_tracker_docs.py` guard it: each command that a document names must exist, and no document outside the beads notes names `bd`.
- **Negative / accepted:** an exported copy needs `shared/` beside the skills, and `uv` to run `tracker.py`. No other harness has run it yet.
- **Not verified:** the Jira claim race, property limits, create-time parent, and repeated issue create. Also the Linear claim race, a repeated `issueCreate`, and the sub-issue depth. Also whether `bd claim` is atomic. Also how Linear and Jira resolve a GitHub login to a user. Each Linear or Jira row needs a live account, so it is a smoke test at the start of its later program.

## Value delivered

- **New capability:** CoBuilder reads and writes workflow state through one port.
- **Benefit:** a team can change its tracker without a change to any caller.
- **Beneficiary:** developer and implement worker.

## Maps to

Context `shared`, modules `shared/tracker_port`, `shared/tracker.py`, `shared/tracker-usage.md`, `shared/build_index.py`, `plugins/implement`, and `plugins/architect`. ADR-0031 holds the beads mapping, which is the first adapter.
