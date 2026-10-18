# Epic Technical Solution Design: E1, the tracker port and the read path

Feature: beads-storage
Epic ID: E1

## Scope and Intent

E1 builds the tracker port: a Python interface between CoBuilder and the
task system, as ADR-0040 defines it. E1 ships the read path, the fake
adapter, the files adapter, and the command-line entry point `shared/tracker.py`.
E1 ends when the fake adapter passes the contract cases.
The files adapter lists the miniature plans tree.
The command prints JSON with the exit codes that the design defines.

E1 does not build the beads adapter (E2). It does not switch any read model
to the port (E3). It does not write to any task system. Every write call in
E1 either exits 2 with no adapter, or runs against the fake adapter in tests.

Sources: `03-program-design.md` § E1, ADR-0040, ADR-0031.

## Files Touched

E1 creates these files. It changes no existing file.

- `shared/tracker_port/__init__.py`: the package marker and the public names.
- `shared/tracker_port/record.py`: `TrackerRecord`, `Capabilities`, and `Scalar`.
- `shared/tracker_port/port.py`: the `TrackerPort` protocol and the three error classes.
- `shared/tracker_port/projector.py`: `project(records)`, the pure function that turns records into the index shape.
- `shared/tracker_port/fake.py`: `FakeAdapter`, which reads a corpus directory into memory.
- `shared/tracker_port/files.py`: `FilesAdapter`, which reads the plans tree and refuses every write.
- `shared/tracker_port/config.py`: `load_adapter(config_path, repo_root)`.
- `shared/tracker.py`: the PEP 723 command-line entry point.
- `shared/tracker-usage.md`: the usage reference for the command. Slice 5 writes it.
- `shared/tracker-backfill.md`: the backfill reference. It runs the create step over `seed-from-files`. Slice 3 creates it.
- `tests/fixtures/tracker/corpus/program.json`, `epics.json`, `prs.json`, `slices.json`.
- `tests/fixtures/tracker/expected-index.json`.
- `tests/fixtures/tracker/plans/beads-storage-mini/00-status.md` and `04-slices.md`.
- `tests/fixtures/tracker/backfill/dry_run.txt`: the checked-in dry run of the mini plan on the fake adapter. Slice 3 creates it.
- `tests/test_tracker_contract.py`, `tests/test_tracker_projector.py`, `tests/test_tracker_files.py`, `tests/test_tracker_cli.py`.

## Types & Signatures

These signatures are the E1 contract. E2, E3, and E4 consume them.

```python
Scalar = str | int | float | bool | None

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

class NoAdapterError(Exception): ...   # exit 2
class AdapterError(Exception): ...     # exit 3
class ArgumentError(Exception): ...    # exit 4

class TrackerPort(Protocol):
    capabilities: Capabilities
    def list_programs(self) -> list[TrackerRecord]: ...
    def list_epics(self, program: str | None = None) -> list[TrackerRecord]: ...
    def list_slices(self, epic: str | None = None) -> list[TrackerRecord]: ...
    def list_pull_requests(self) -> list[TrackerRecord]: ...
    def get_slice(self, id: str) -> TrackerRecord: ...
    def next_ready(self, kind: str = "slice", under: str | None = None) -> list[TrackerRecord]: ...
    def seed_from_files(self, plans_dir: Path) -> list[TrackerRecord]: ...

def project(records: Sequence[TrackerRecord]) -> dict[str, Any]: ...
def load_adapter(config_path: Path, repo_root: Path) -> TrackerPort | None: ...

class FakeAdapter:
    def __init__(self, corpus_dir: Path) -> None: ...

class FilesAdapter:
    def __init__(self, plans_dir: Path) -> None: ...
```

The protocol declares the write methods of `TrackerPort` (claim, set-state, notes, pull request, regenerate) as signatures only. It also declares `seed_from_files(plans_dir)`, which returns the records to create and writes nothing. `FakeAdapter` implements the write methods as in-memory updates. It keeps created records in memory. A second `seed_from_files` call then returns no creates. `FilesAdapter` raises `NoAdapterError` for each write method. E2 and E3 give the protocol its full behavior.

`next_ready` returns open records of the given kind.
Each record in `blocked_by` must have `lifecycle == "closed"`.
If `under` is set, the function keeps only records whose `parent` is `under`.
`next_ready` never returns a pull request.
`next_ready` skips a record with an envelope `deferred` key.

`project` returns a dict with two keys: `entities` (a map from id to the
record's fields) and `joins` (a sorted list of `[from, to, kind]` triples
for every `parent` and `blocked_by` link). The shape is a reduced form of
the top-level keys of `data/index.json`. E3 slice 10 aligns the two shapes.

## Slice Decomposition

| Slice | Ends with | Depends on |
|---|---|---|
| 1 | A test loads the fixture corpus through the fake adapter, matches `expected-index.json`, and one next-ready case passes | none |
| 2 | Contract cases 1 to 6 of the seven in ADR-0040 pass on the fake adapter. Case 7 needs beads, so slice 1 checks only the fake side. A write with no configured adapter exits 2 | 1 |
| 3 | The files adapter lists the miniature plans tree and projects it to the fake index shape. Every state write it receives exits 2. The fake adapter's backfill dry run lists the creates, and the list equals `tests/fixtures/tracker/backfill/dry_run.txt`. A second run creates nothing. `shared/tracker-backfill.md` names each workflow step | 2, because it reuses the contract tests |
| 4 | `shared/tracker.py list-programs` prints the corpus as JSON, and the CLI test shows exit codes 0, 2, 3, and 4 | 2 and 3, because the command reads both adapters |
| 5 | A reader runs each example in `shared/tracker-usage.md` and gets the output that the reference shows | 4 |

Slice numbers match the global numbers of `04-slices.md`. Slices 1 to 5 run
in order. Slice 3 and slice 4 need slice 2, so no slice runs in parallel
with another in E1.

## Test Plan

Each slice runs `uv run pytest tests -q`. The main session runs it once
after all edits, as the program requires.

**Slice 1: projector golden and one next-ready case.**
- `tests/test_tracker_projector.py::test_golden_index`: `project(records)` must equal `tests/fixtures/tracker/expected-index.json`. The records are the four `list_*` results of `FakeAdapter(corpus)`. A person checks the expected file by hand before the commit.
- `tests/test_tracker_contract.py::test_next_ready_slice_under_epic`: `next_ready("slice", under="demo-E1")` returns exactly the record `demo-E1-s3`.

**Slice 2: contract cases 1 to 6 of seven, on the fake adapter only.** The module is
`tests/test_tracker_contract.py`. Each case is a test function that takes
an adapter factory fixture. The fixture is `fake_adapter`, which builds
`FakeAdapter(corpus_dir)` on a fresh copy of the corpus.
1. `test_next_ready_excludes_pr_and_deferred`: `next_ready("epic")` excludes `demo-E3`, and no `next_ready` kind returns `pr-101`.
2. `test_next_ready_kinds`: `next_ready("program")` returns `demo`. `next_ready("epic")` returns `demo-E1` and `demo-E2` only after the pr is merged. `next_ready("slice", under="demo-E1")` returns `demo-E1-s3`.
3. `test_claim_leaves_assignee`: `claim_slice("demo-E1-s3", "agent-x")` sets `assignee == "agent-x"` on read-back.
4. `test_envelope_round_trip`: a tuple-valued envelope key and a float key come back with the same type and value.
5. `test_pr_blocks_two_epics`: before `set_pull_request_state("pr-101", merged=True)`, the epics `demo-E1` and `demo-E2` do not show as ready. After the call, both show as ready.
6. `test_write_without_adapter_raises`: `load_adapter` on a missing config path returns `None`. The test asserts that every write method of `FilesAdapter`, such as `claim_slice`, raises `NoAdapterError`.

**Slice 3: files adapter.** `tests/test_tracker_files.py`.
- `test_lists_programs_from_plans_tree`: `FilesAdapter(plans_dir).list_programs()` returns one record `beads-storage-mini`.
- `test_lists_slices_from_04`: `list_slices()` returns the slice rows of the fixture `04-slices.md`, with `lifecycle` set from the row state.
- `test_every_write_exits_2`: each write method raises `NoAdapterError`. The test runs them in a loop over the protocol write names.
- `test_backfill_dry_run_matches_fixture`: `seed_from_files(mini plan)` on `FakeAdapter` returns the creates. The printed lines equal `tests/fixtures/tracker/backfill/dry_run.txt`.
- `test_second_run_creates_nothing`: after the creates are written in memory, a second `seed_from_files` call returns an empty list.
- `test_backfill_reference_names_operations`: `shared/tracker-backfill.md` names `seed-from-files` and each `tracker.py` operation that the reference calls. The test checks each name against `tracker.py --help`.

**Slice 4: command.** `tests/test_tracker_cli.py`, which runs `uv run shared/tracker.py` in a subprocess with `--config` set to a temporary path.
- `test_list_programs_prints_json`: exit 0, and stdout parses as a JSON list of the corpus programs.
- `test_write_without_config_exits_2`: `set-slice-state demo-E1-s3 closed` exits 2 and changes no file.
- `test_adapter_error_exits_3`: a config that names a missing corpus directory exits 3.
- `test_bad_arguments_exit_4`: `get-slice` with no id exits 4.

**Slice 5: usage reference.** No new test file. The slice runs each example
in `shared/tracker-usage.md` by hand and compares the output with the text
of the reference. The evidence is the transcript of those runs.

**Fixtures (named, shared by slices 1 to 4):**
- `tests/fixtures/tracker/corpus/program.json`: one program `demo`, `stage: "design"`, and an envelope with `gate1: "2026-10-14"` and `gate2b: "n/a"`. The `gate3` key is absent.
- `tests/fixtures/tracker/corpus/epics.json`: `demo-E1` (open, `blocked_by: ["pr-101"]`), `demo-E2` (open, `blocked_by: ["pr-101"]`), `demo-E3` (open, envelope `deferred: "2026-11-01"`, no blockers). All three have parent `demo`.
- `tests/fixtures/tracker/corpus/prs.json`: `pr-101` (open, `external_ref: "PR#101"`, `blocked_by` empty).
- `tests/fixtures/tracker/corpus/slices.json`: `demo-E1-s1` (closed, envelope `score: 0.92`), `demo-E1-s2` (in_progress, `assignee: "agent-1"`, `blocked_by: ["demo-E1-s1"]`), `demo-E1-s3` (open, `blocked_by: ["demo-E1-s1"]`). All three have parent `demo-E1`.
- `tests/fixtures/tracker/expected-index.json`: the golden output of `project` over those four files.
- `tests/fixtures/tracker/plans/beads-storage-mini/00-status.md` and `04-slices.md`: a miniature plan with one gate table and one slice table in the shape that `shared/gate_status.py` and `shared/slice_table.py` read.
- `tests/fixtures/tracker/backfill/dry_run.txt`: the expected dry run of the mini plan, one JSON line per create. E2 slice 8 reads it too.

## Risks & Open Questions

1. **Module name (03 least-confident decision 2, decided).** `shared/tracker.py` is the CLI and `shared/tracker_port/` is the package, so the two names do not collide. The CLI imports `tracker_port` only. A test greps both names, so a rename of one without the other fails.
2. **Pull request key `ref` (03 decision 6, decided).** `set_pull_request_state` takes `ref`. ADR-0040 now names the key too, so the two documents agree.
3. **Deferred epic and the pr fixture (decided).** The pr record blocks `demo-E1` and `demo-E2`, so contract case 5 sees both become ready after the merge. `demo-E3` carries the deferral and no blocker, so the deferral keeps it out of the ready list in every state. `03-program-design.md` carries the same shape.
4. **The `gate3` key (conflict within 03).** 03 names `gate3: null` in one line and `gate3 absent` in another. This design uses absent. The projector treats absent and null alike.
5. **Linear and Jira claim race.** `claim_slice` on a system without `atomic_claim` reads back the assignee. A race between two claimants stays open until E2 or a later epic decides the rule. E1 does not handle it.
6. **`.beads/` directory.** It does not exist in the repo. E1 does not need it. E2 slice 9 checks the Dolt-in-git path.
7. **Live `docs/plans` parity.** Projector parity between the live plans and the port is a manual E3 step (03 decision 4). No E1 test reads live `docs/plans`.
