# Program Design: beads-storage

Source: ADR-0040 (the port, the contract cases, the CLI), ADR-0031 (the envelope and the state vocabulary), and `tracker-port-exploration.md` (the three-tracker table and Option A). Four epics: `beads-storage/E1` to `beads-storage/E4`.

## Files

### E1 — tracker-port

Created:

- `shared/tracker_port/__init__.py`. Re-exports the public names. It holds no logic.
- `shared/tracker_port/record.py`. `TrackerRecord`, `Capabilities`, and the kind and lifecycle constants. Rationale: one neutral shape that every adapter maps to.
- `shared/tracker_port/port.py`. The `TrackerPort` protocol and the three errors `NoAdapterError` (exit 2), `AdapterError` (exit 3), and `ArgumentError` (exit 4). Rationale: the errors carry the exit code, so the CLI maps them without a table.
- `shared/tracker_port/projector.py`. The one function that turns records into entities, joins, and the index shape. Rationale: ADR-0040 names one projector.
- `shared/tracker_port/fake.py`. The in-memory adapter that loads `tests/fixtures/tracker/corpus/`. Rationale: the second implementation that proves the seam.
- `shared/tracker_port/files.py`. The read-only adapter. It parses `docs/plans` through `shared/slice_table.py` and `shared/gate_status.py`. Every write raises `NoAdapterError`, which exits 2.
- `shared/tracker_port/config.py`. Reads `.cobuilder/tracker.yaml` and selects one adapter. With no file, it selects no adapter.
- `shared/tracker.py`. The one agent command. A PEP 723 script that parses subcommands, calls the port, and prints JSON. Rationale: ADR-0040 names this path, and every plugin reaches it through its `shared` symlink.
- `shared/tracker-usage.md`. The reference that teaches the command (parts a to h of ADR-0040). Rationale: one document, linked from the four main skills in E4.
- `shared/tracker-backfill.md`. The agent-run backfill. It names six steps: inventory the files, dry run, consent, write, flag each conflict, and check counts. Rationale: the engineer decided that an agent runs the backfill, not a script.
- `tests/fixtures/tracker/corpus/*.json`, `tests/fixtures/tracker/expected-index.json`, and `tests/fixtures/tracker/plans/`. The checked-in fixtures.
- `tests/fixtures/tracker/backfill/dry-run.json`. The checked-in list of creates for the miniature plans tree. Slices 3 and 8 compare with it.
- `tests/test_tracker_contract.py`. The seven contract cases of ADR-0040, run against the fake adapter and the files adapter (read cases only).
- `tests/test_tracker_projector.py`. The golden comparison of the fake index with `expected-index.json`.
- `tests/test_tracker_files.py`. The files adapter over `tests/fixtures/tracker/plans/`.
- `tests/test_tracker_cli.py`. Stdout JSON, exit codes 0, 2, 3, and 4.
- `tests/test_tracker_backfill.py`. The dry run on the fake adapter equals the checked-in list. A second write run creates nothing.

Modified: none. Plugins do not call the command yet. No plugin version bump in E1.

### E2 — beads-adapter

Created:

- `shared/tracker_port/bd_runner.py`. The one module that runs `bd` as a subprocess. It takes an injectable runner so tests replay recorded transcripts. Rationale: the grep check of ADR-0040 allows `bd` only under `shared/tracker_port/`.
- `shared/tracker_port/beads.py`. The beads adapter. It maps `bd list --json` rows to `TrackerRecord`, maps `hooked` to `in_progress`, reads and writes `metadata.cb` with the version key `v`, and does the claim read-back.
- `shared/tracker-adapter-beads.md`. The beads notes: the `bd init` consent question, its two flags, `bd sync`, and the claim read-back.
- `tests/fixtures/tracker/beads/list.json` and `tests/fixtures/tracker/beads/transcripts/*.json`. Recorded `bd` output for the read, write, and seed dry-run cases.
- `tests/test_tracker_beads.py`. Runs the contract suite against the beads adapter with the recorded transcripts.

Modified:

- `shared/tracker_port/config.py`. Adds the `beads` adapter name.

Generated in this repo by the E2 consent step, after the engineer says yes: `.beads/` (the local store, not committed), and `.cobuilder/tracker.yaml` (committed, names `beads`).

### E3 — read-model

Modified:

- `shared/build_index.py`. Reads records from the port and passes them to the projector. It keeps writing `data/index.json` and `.cobuilder-architect/self/data/index.json`. The port read replaces the `collect_plans` path.
- `shared/tracker_port/projector.py`. Gains the entity and join rules that `build_index.py` holds today.
- `shared/gate_status.py`. Stays as the gate-line parser. The files adapter calls it. No other caller parses gate lines.
- `plugins/implement/scripts/verify_gate.py`. Reads gate values and slice rows through the port.
- `plugins/artifact/scripts/build_builds_view.py`. Reads through the port.

Created:

- `shared/tracker_port/regenerate.py`. Writes the state lines of `00-status.md` and `04-slices.md` from the records. It owns those lines only. Prose stays with the agent.
- `tests/test_tracker_regenerate.py`. Golden test. Regenerating the fixture corpus writes files that match checked-in golden files.

Viewer: no source change. The bundle rebuild writes `data/index.json`. `tests/test_viewer_build.py` checks that the committed `index.html` is unchanged.

### E4 — write-model

Modified:

- `plugins/architect/skills/architecture/SKILL.md` and `references/design-mode.md`. Gains "Workflow state". Design mode writes the program stage, the gate values, and the first branch through the CLI.
- `plugins/implement/skills/build/SKILL.md`, `references/slice-loop.md`, `references/validation-scoring.md`, and `references/goal-sync.md`. `goal-sync.md` retires. The slice loop writes claims, attempts, scores, and escalations through the CLI. The `start`, `install`, and `debug` commands call the CLI, not a state edit. When the tracker holds no record, `start` names `shared/tracker-backfill.md`. Lands in slice 13.
- `plugins/pr/skills/odyssey/SKILL.md`, which the `generate` and `review` commands call. Gains "Workflow state". `open-pull-request` runs after `gh pr create`. `set-pull-request-state` runs after the merge.
- `plugins/artifact/skills/cobuilder-artifacts/SKILL.md`. Gains "Workflow state". It reads through `list-*`.
- `docs/architecture/designs/beads-storage/goal.json`, and the `epics[]` shape in the bundle schema. Drops `branch`, `pr`, and `state`. Rationale: those fields move to the tracker.
- `shared/_bundle_meta.py` (bump `CURRENT_BUNDLE_FORMAT`) and `shared/migrate_bundle.py` (add the ladder step). Rationale: CLAUDE.md says add a migration, not a rebuild.
- `plugins/implement/.claude-plugin/plugin.json`, `plugins/architect/.claude-plugin/plugin.json`, `plugins/pr/.claude-plugin/plugin.json`, `plugins/artifact/.claude-plugin/plugin.json`, `plugins/cobuilder-full-lifecycle/.claude-plugin/plugin.json`, and `.claude-plugin/marketplace.json`. Version bump, both files equal. Rationale: an installed copy needs the new skills. Each plugin bumps in its first E4 slice. The umbrella bumps in slice 17.
- `plugins/cobuilder-full-lifecycle` install command. Adds the allow rule for `uv run … shared/tracker.py`. After the adapter config, it points to `shared/tracker-backfill.md`, runs the dry run, and asks for consent before any write. Lands in slice 17.
- `tests/test_prose_budget.py`. Adds `shared/tracker-usage.md` to `AUTHORING_REFERENCES`.
- `README.md`, `CLAUDE.md`, and `DDD-VOCABULARY.md`. Count and term updates, if any count changes. The glossary already holds the terms.

Created:

- `tests/test_tracker_docs.py`. The four document checks of ADR-0040, and the grep check that no script outside `shared/tracker_port/` calls `bd`.

Unchanged: `plugins/implement/hooks`, `plugins/cobuilder-memory`. The design adds no MCP server.

## Types & signatures

No bodies. The types live in `shared/tracker_port/`. Argument names follow ADR-0040.

```python
# shared/tracker_port/record.py
@dataclass(frozen=True)
class TrackerRecord:
    id: str
    kind: Literal["program", "epic", "slice", "pr"]
    parent: str | None
    blocked_by: tuple[str, ...]
    lifecycle: Literal["open", "in_progress", "closed"]
    assignee: str | None
    envelope: Mapping[str, Scalar | tuple[Scalar, ...]]
    external_ref: str | None

@dataclass(frozen=True)
class Capabilities:
    native_ready: bool
    atomic_claim: bool
    rich_envelope: bool
    offline_read: bool

Scalar = str | int | float | bool | None
```

```python
# shared/tracker_port/port.py
class NoAdapterError(Exception): ...      # exit 2
class AdapterError(Exception): ...        # exit 3
class ArgumentError(Exception): ...       # exit 4

class TrackerPort(Protocol):
    def capabilities(self) -> Capabilities: ...
    def list_programs(self) -> list[TrackerRecord]: ...
    def list_epics(self, program: str | None = None) -> list[TrackerRecord]: ...
    def list_slices(self, epic: str | None = None) -> list[TrackerRecord]: ...
    def list_pull_requests(self) -> list[TrackerRecord]: ...
    def get_slice(self, id: str) -> TrackerRecord: ...
    def next_ready(self, kind: Literal["program", "epic", "slice"] = "slice", under: str | None = None) -> list[TrackerRecord]: ...
    def sync(self) -> None: ...
    def claim_slice(self, id: str, claimant: str) -> TrackerRecord: ...
    def set_program_stage(self, program: str, stage: str) -> TrackerRecord: ...
    def set_gate_value(self, program: str, gate: str, value: str) -> TrackerRecord: ...
    def set_epic_state(self, epic: str, state: str, branch: str | None = None) -> TrackerRecord: ...
    def set_slice_state(self, id: str, state: str, score: float | None = None, attempts: int | None = None) -> TrackerRecord: ...
    def record_attempt(self, id: str, score: float, note: str | None = None) -> TrackerRecord: ...
    def add_note(self, id: str, text: str) -> None: ...
    def escalate(self, slice: str, score: float, reason: str) -> TrackerRecord: ...
    def open_pull_request(self, ref: str, epic_ids: list[str]) -> TrackerRecord: ...
    def set_pull_request_state(self, ref: str, merged: bool) -> TrackerRecord: ...
    def regenerate_status_files(self, program: str) -> list[Path]: ...
    def seed_from_files(self, plans_dir: Path, dry_run: bool = False) -> list[TrackerRecord]: ...
```

```python
# shared/tracker_port/projector.py
def project(records: Sequence[TrackerRecord]) -> dict[str, Any]: ...
```

```python
# shared/tracker_port/fake.py        class FakeAdapter: implements TrackerPort; __init__(self, corpus_dir: Path)
# shared/tracker_port/files.py       class FilesAdapter: implements the read cases; every write raises NoAdapterError
# shared/tracker_port/beads.py       class BeadsAdapter: implements TrackerPort; __init__(self, runner: BdRunner)
# shared/tracker_port/bd_runner.py   class BdRunner: run(self, args: list[str]) -> str   (the only subprocess call of bd)
# shared/tracker_port/config.py      def load_adapter(config_path: Path, repo_root: Path) -> TrackerPort | None
# shared/tracker_port/regenerate.py  def regenerate(port: TrackerPort, program: str, plans_dir: Path) -> list[Path]
```

### CLI (`shared/tracker.py`)

| Subcommand | Arguments | Port call |
|---|---|---|
| `next-ready` | `--kind {program,epic,slice}` `--under <id>` | `next_ready` |
| `claim-slice` | `<id> --claimant <login>` | `claim_slice` |
| `set-slice-state` | `<id> --state <s> [--score f] [--attempts n]` | `set_slice_state` |
| `record-attempt` | `<id> --score f [--note t]` | `record_attempt` |
| `escalate` | `<slice> --score f --reason t` | `escalate` |
| `set-gate-value` | `<program> --gate <g> --value <v>` | `set_gate_value` |
| `set-epic-state` | `<id> --state <s> [--branch b]` | `set_epic_state` |
| `set-program-stage` | `<program> --stage <s>` | `set_program_stage` |
| `open-pull-request` | `--ref <r> --epics <id,...>` | `open_pull_request` |
| `set-pull-request-state` | `--ref <r> --merged {true,false}` | `set_pull_request_state` |
| `add-note` | `<id> --text t` | `add_note` |
| `sync` | none | `sync` |
| `regenerate-status-files` | `<program>` | `regenerate_status_files` |
| `seed-from-files` | `<plans_dir> [--dry-run]` | `seed_from_files` |
| `capabilities` | none | `capabilities` |
| `list-programs` | none | `list_programs` |
| `list-epics` | `[--program id]` | `list_epics` |
| `list-slices` | `[--epic id]` | `list_slices` |
| `list-pull-requests` | none | `list_pull_requests` |
| `get-slice` | `<id>` | `get_slice` |
| `doctor` | none | `capabilities` plus the config check |

Output: JSON on stdout, one message on stderr. Exit codes: 0 ok, 2 refused (no adapter, no write), 3 adapter error, 4 bad arguments.

### Fixture shapes

- `corpus/program.json`: one object `{"id", "kind": "program", "stage", "envelope": {"gate1": "<date>", "gate2b": "n/a", "gate3": null, ...}}`. `gate2b` is `n/a`. `gate3` is absent, which means not reached.
- `corpus/epics.json`: a list of three `TrackerRecord` objects. One defers through its envelope and has no blocker.
- `corpus/prs.json`: one pr record with `blocked_by` empty. Two epics, `demo-E1` and `demo-E2`, name it in `blocked_by`.
- `corpus/slices.json`: three records in a ladder. One is `closed` with `envelope.score`. One is `in_progress` with an `assignee`. One is `open`.
- `expected-index.json`: `project(load(corpus))`, written once and checked in.
- `plans/`: the miniature tree, with `00-status.md` and `04-slices.md` in one plan directory.
- `beads/list.json`: a recorded `bd list --json` array. `beads/transcripts/*.json`: the recorded argument list and stdout for each write case.
- `backfill/dry-run.json`: a JSON array of the `TrackerRecord` values that the dry run plans to create for the miniature tree. Each value carries its `external_ref`.

## Call stack

**next-ready** (`--kind slice --under <program>`)
1. `tracker.py` parses the arguments and calls `load_adapter`.
2. `port.next_ready("slice", under)` returns the ready slices. For `native_ready` false, the adapter computes it from `blocked_by` and the parent state.
3. The command prints the JSON list and exits 0.

**claim-slice** (`<id> --claimant <login>`)
1. `port.claim_slice(id, claimant)` calls the adapter write.
2. When `capabilities().atomic_claim` is false, the adapter reads `assignee` back.
3. The read-back value must equal the claimant. If not, the adapter raises `AdapterError` (exit 3). The caller retries or stops.

**record-attempt** (`<id> --score f --note t`)
1. `port.record_attempt` increments `attempts` in the envelope and writes the score.
2. The adapter adds the note as a comment when the caller passes a note.
3. A failing attempt does not change `lifecycle`. `escalate` does, after the attempt limit.

**pr open and merge**
1. The agent runs `gh pr create`. `gh` stays outside the port.
2. `open-pull-request --ref <r> --epics <ids>` creates a pr record that blocks each listed epic.
3. After the human merge, `set-pull-request-state --ref <r> --merged true` closes the pr record. The epics become ready on the next `next-ready --kind epic`.

**session end sync and regenerate**
1. `sync` makes local and central state equal. On beads, it runs `bd sync`.
2. `regenerate-status-files <program>` reads the records and writes the state lines of `00-status.md` and `04-slices.md`. Prose lines stay as they are.

**seed-from-files (backfill, run by the agent)**
1. `tracker.py seed-from-files docs/plans --dry-run` reads the plans through the files adapter. It maps them to `TrackerRecord` values.
2. The command compares each record with the configured tracker. It prints the planned creates as JSON and writes nothing.
3. The agent shows the list and asks the engineer for consent. Without consent, the workflow stops.
4. With consent, `tracker.py seed-from-files docs/plans` creates each missing record. A record is missing when no record holds its `external_ref`. A second run creates nothing.
5. The agent flags each record whose file value differs from its tracker value. It shows both values and asks which value wins.
6. The agent lists open pull requests with `gh pr list` (ADR-0029). It opens each one through `open-pull-request`.
7. The agent compares the counts of the files adapter with the `list-*` counts. Equal counts pass.

**refusal**
1. With no `.cobuilder/tracker.yaml`, `load_adapter` returns `None`.
2. Each write subcommand prints a refusal on stderr and exits 2. No file changes.

## Test plan

All tests read checked-in fixtures under `tests/fixtures/tracker/` or recorded transcripts. No test reads the live `docs/plans`.

1. **Contract cases (ADR-0040, the seven cases)**, in `tests/test_tracker_contract.py`. Cases 1 to 6 run in E1 slice 2 on the fake adapter. Case 6 also runs on the files adapter. Case 7 runs in E2 slice 6, when the beads reads exist:
   1. `next_ready` excludes pr records and deferred epics.
   2. `next_ready` returns the right records for `program`, `epic`, and `slice`, and one case passes `under`.
   3. `claim_slice` leaves the claimant in `assignee`. With `atomic_claim` false, the read-back runs.
   4. Value-level envelope round trip: each scalar and each list item survives a write and a read.
   5. A pr record blocks two epics. `next_ready(kind="epic")` shows both only after `set_pull_request_state(merged=True)`.
   6. A write with no adapter raises `NoAdapterError`.
   7. The projector gives one index from the fake records and from the beads records. Run in E2.
2. **Projector golden test**: `project(corpus)` equals `expected-index.json` value by value.
3. **Files adapter fixture test**: `FilesAdapter(plans/)` lists the programs, epics, and slices of the miniature tree, and every write raises `NoAdapterError`.
4. **CLI exit codes and JSON**: stdout parses as JSON for a read. Exit 2 for a write with no adapter. Exit 4 for a missing argument. Exit 3 for an injected adapter error.
5. **Refusal with no adapter**: `load_adapter` returns `None` for a repo with no config. Each write exits 2 and changes no file.
6. **Grep check**: no script outside `shared/tracker_port/` calls `bd`. ADR-0040 names this check.
7. **Document checks** (`tests/test_tracker_docs.py`): the reference exists and four main `SKILL.md` files name it. Each `tracker.py <operation>` in a document names a subcommand that `--help` lists. No document outside the beads notes names a `bd` command. The reference is in `AUTHORING_REFERENCES`.
8. **Viewer byte compare**: `tests/test_viewer_build.py` passes, so the committed `index.html` is unchanged.
9. **Value-level envelope round trip on beads**: the recorded transcripts replay the write and the read, and each list item matches.
10. **Regenerate golden test**: `regenerate(fake, corpus)` writes files equal to the checked-in golden files.
11. **Manifest and reference tests**: `tests/test_shared_manifest.py`, `tests/test_script_references.py`, and `tests/test_plugin_manifests.py` pass after each slice that adds a file.
12. **Backfill dry run**: `seed_from_files(plans/, dry_run=True)` on the fake adapter equals `backfill/dry-run.json`. A second write run creates nothing. The beads adapter repeats the dry run in slice 8.

## Least confident decisions

1. **Cloud clone smoke check.** A cloud session with only a git clone must run `bd init --skip-agents --skip-hooks` and `bd sync` against `refs/dolt/data`. The exploration note marks this not verified. E2 slice 9 runs it on a fresh clone. If it fails, E2 does not close, and the decision returns to the engineer. Option: a second store per clone, not decided.
2. **`tracker.py` and the package no longer share a name.** The CLI is `shared/tracker.py`, as ADR-0040 decides. The package is `shared/tracker_port/`, so `import tracker_port` never meets the CLI file. This resolves the collision that this design found. Decided on 2026-10-17 in ADR-0040. Risk that stays: a later session may rename one of the two names without the other, so a test greps both names.
3. **Claim read-back on Linear and Jira.** No tracker gives an atomic claim, and the race is unknown. The read-back closes most races, not all. Linear and Jira programs decide the rule. This design only keeps the flag.
4. **Projector parity with today's `build_index` for the 15 plans.** The 15 plans are the live `docs/plans` tree. A test may not read them (ADR-0040). So parity is a one-off run in E3 slice 10. The run compares `data/index.json` before and after. It is a manual check that E3 slice 10 records. It is not a test in the suite.
5. **The list-programs success measure.** The product goal is "list programs and next ready with zero file reads". A test can check the calls on the fake adapter, with a spy on file opens under `docs/plans`. The spy checks the adapter path, not the agent, so this design cannot test an agent's own reads.
6. **`set_pull_request_state` takes `ref`.** ADR-0040 writes `set_pull_request_state(ref, merged)` with no key. A pr record needs a key to find it, so this design adds `ref`. The ADR text should follow in its next amendment.
7. **E4 prose and blind rubrics.** The four skill edits and `tracker-usage.md` are prose. Gate 4c requires a blind rubric for prose that steers an agent. E4 slices run the rubric pass as `SKILL.md` Gate 4c prose case directs. The rubric wording is set in the E4 epic design, not here.
8. **Plugin version bumps.** The bump lands in each plugin's first E4 slice. The exact versions are set at that slice.
9. **`.beads/` is local.** The design assumes `.beads/` stays out of git and `.cobuilder/tracker.yaml` is committed. This is not verified against the beads fork's own ignore rules.
10. **E4 slice 16 also changes `build_index.py` (decided).** `shared/build_index.py` reads `branch`, `pr`, and `state` from `goal.json` (`EPIC_FIELDS`, and the epic record near line 513). A goal file with no such key breaks that read. Slice 16 therefore moves those three joins to the tracker records in the same slice, and the epic count stays at four.
11. **Regenerate after each slice pass (decided).** `regenerate-status-files` runs after every slice pass and at the session end, so the status file shows each new score at once. The ADR-0040 moment table lists both.
12. **E3 decisions (decided on 2026-10-17).**
    - Existing tests that read the live `docs/plans/cobuilder-family/` tree stay as they are. The ADR-0040 bar covers the new tracker tests only.
    - Readers import Python from `shared/tracker_port/`. They do not call the CLI.
    - `regenerate-status-files` may write the plans tree through the files adapter, and the only refusal is the case with no adapter at all.
    - E3 does not wait on E2 slice 9, because the read model runs on the files and fake adapters.
    - Readers do not call `next-ready`. ADR-0040 limits it to a session that resumes a build.
    - Slice 10 lists the volatile keys of `index.json` in its evidence before it compares the two files.
13. **Prose slices and the blind pass.** Slices 13 to 16 edit prose that steers an agent. Their rubrics are behavioral. The blind pass of `SKILL.md` Gate 4c runs inside each of those slices, once the prose exists, because no changed file exists before it.
14. **A writable adapter for the fixture runs (decided).** The fake adapter keeps records in memory and takes an optional `--state-file <path>`. With that option, each write goes back to the file, and the next call reads it. Slices 4 and 13 to 15 use it, so state persists between CLI calls with no real tracker. The files adapter stays read-only for tracker state.
15. **Who owns each done_when item.**
    - Counts of a seeded tracker: slice 9. The backfill dry run equals its checked-in list: slices 3 and 8.
    - Index from the projector, viewer byte equal: slices 10.
    - Ready flip and PR blocking: slices 7 and 15.
    - Refusal with no adapter and no `bd` outside `shared/tracker_port/`: slices 2 and 17.
    - Second clone sees the same state: slice 9.
    - Zero file reads: slice 4, with the spy.
    - Fake adapter passes the contract test: slices 2 and 6.
    - Value-level round trip: slices 2 and 7.
    - `goal.json` shape: slice 16.
    - Docs tests and install consent: slice 17.
    - Files adapter projects with no `bd`: slice 3.
16. **Two ADR-0031 statements that this plan overrides, and ADR-0031 now says so.** The deferred state of an epic is an envelope key, not a blocking edge. Projector parity with the live plans is a one-off manual run in slice 10, not a test.
17. **The backfill stays agent-run (engineer decision, 2026-10-17).** No script writes the seed. Each run needs the engineer's consent before any write. The mechanical checks are the dry run and the count check.
