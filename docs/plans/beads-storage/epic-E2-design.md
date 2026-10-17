# Epic Technical Solution Design: E2 — The beads adapter

Feature: beads-storage
Epic ID: E2

## Scope and Intent

E2 adds the beads adapter. The adapter maps `bd` output to the neutral `TrackerRecord`. It writes state through `bd`. A seed script creates the plan records in beads. Slice 9 proves that a fresh git clone starts and syncs.

E2 starts after E1 slice 5 closes. E3 starts only after E2 slice 9 closes. Slice 9 gates the epic. If slice 9 fails, E2 does not close, and the decision returns to the engineer (03 Least-confident 1).

Out of scope: the GitHub and Linear adapters, the skill migration, and the `pr:generate` flow.

## Files Touched

New files:

- `shared/tracker_port/bd_runner.py`. The only subprocess call to `bd`.
- `shared/tracker_port/beads.py`. The beads adapter.
- `shared/beads_seed.py`. A PEP 723 script. It dry-runs by default.
- `shared/tracker-adapter-beads.md`. The consent question, the `bd init` flags, the sync step, and the claim read-back.
- `tests/test_tracker_beads.py`. All E2 assertions.
- `tests/fixtures/tracker/beads/list.json`. A recorded `bd list --json` array built from the E1 corpus.
- `tests/fixtures/tracker/beads/transcripts/*.json`. One file per write case. Each file holds `bd` (the version string), `args` (the argument list), and `stdout` (the recorded output).
- `tests/fixtures/tracker/beads/seed_dry_run.txt`. The expected dry run output for the mini plan.

Modified files:

- `shared/tracker_port/config.py`. Adds `beads` to the adapter names.
- `tests/test_tracker_contract.py`. E1 owns this file. E2 slice 6 adds one parametrized `beads` entry to the adapter list. It changes no other case or assertion. The beads entry skips with a reason string when `bd` is not on `PATH` or no beads workspace exists. A machine without beads keeps the E1 suite green.

No other file changes in E2.

## Types & Signatures

```python
# shared/tracker_port/bd_runner.py
class BdError(Exception):
    exit_code: int
    stderr: str

class BdRunner:
    def __init__(self, bd: str = "bd", cwd: Path | None = None) -> None: ...
    def run(self, args: list[str]) -> str: ...
```

`BdRunner.run` starts `bd` with the argument list. It passes no shell string. It returns stdout. A non-zero exit raises `BdError`.

```python
# shared/tracker_port/beads.py
class BeadsAdapter:
    def __init__(self, runner: BdRunner) -> None: ...
    def capabilities(self) -> Capabilities: ...
```

`BeadsAdapter` implements the port methods that E1 slice 1 defines. Its capability flags are:

| Flag | Value | Reason |
|---|---|---|
| `native_ready` | false | The adapter computes ready slices from `blocked_by` (ADR-0040 case 1). |
| `atomic_claim` | false | No tracker has a verified atomic claim (ADR-0040). |
| `rich_envelope` | true | `metadata.cb` holds the envelope. |
| `offline_read` | true | The embedded Dolt store answers reads with no network. Not yet verified. |

The mapping rules:

- `metadata.cb.kind` picks the kind: `program`, `epic`, `slice`, or `pr`.
- `metadata.cb.v` must equal `1`. Any other value raises an error that names the value.
- The status `hooked` maps to `in_progress`. The other status values follow ADR-0031.
- Priority: program P1, epic P2, slice P2.
- `claim_slice(id, claimant)` runs `bd update <id> --status in_progress --assignee <claimant>`. It then reads `bd show <id> --json` and compares the assignee. A mismatch raises the claim error that E1 defines.

```python
# shared/beads_seed.py
class BeadsSeed:
    def __init__(self, runner: BdRunner) -> None: ...
    def seed_from_files(self, plans_dir: Path) -> list[TrackerRecord]: ...
```

`seed_from_files` reads the plan files and returns the records to create, in dependency order. It creates only issues that do not yet exist. The class name is this design's choice. 03 gives the method only.

Transcript format for the stub runner in tests:

```json
{"bd": "1.3.0", "args": ["create", "..."], "stdout": "..."}
```

The stub runner compares `args` with the call. A difference fails the test. The stub returns `stdout`.

## Slice Decomposition

| Slice | Name | Depends on | Files | Ends with |
|---|---|---|---|---|
| 6 | Beads reads match the fake adapter | E1 slice 5 | `bd_runner.py`, `beads.py`, `config.py`, fixtures `beads/list.json` and `transcripts/list.json` | `bd list --json` maps to the fake corpus records. Read cases pass. Contract case 7 passes. |
| 7 | Beads writes on recorded transcripts | Slice 6 | `beads.py`, `transcripts/*.json` | Write cases pass, including the claim read-back and the `metadata.cb` round trip. |
| 8 | Seed dry run lists the creates | Slice 7 | `beads_seed.py`, `seed_dry_run.txt` | The dry run prints the planned creates for the mini plan. The output equals the checked-in file. |
| 9 | Fresh clone initializes and syncs | Slice 8, E1 slice 5 | `shared/tracker-adapter-beads.md`, `tests/test_tracker_beads.py` | Real `bd` and `git` in a temp directory: `bd init --remote` and `bd sync` exit 0 in a fresh clone. |

### Slice 6

- Input: `tests/fixtures/tracker/beads/list.json`, recorded from the E1 corpus.
- The adapter reads the rows and maps them to records.
- Assertions in `tests/test_tracker_beads.py`:
  - `test_list_json_maps_to_fake_records`: the records from `list.json` equal `FakeAdapter(corpus)` records for the four kinds. Compare by id after sorting.
  - `test_hooked_status_maps_to_in_progress`: a row with status `hooked` reads as `in_progress`.
  - `test_unknown_metadata_version_raises`: a row with `metadata.cb.v` = 2 raises an error. The message contains `2`.
  - `test_capabilities_flags`: `atomic_claim` is false and `rich_envelope` is true.
  - `test_contract_case_7_projector_parity`: `project(beads records)` equals `tests/fixtures/tracker/expected-index.json`. The contract suite runs this case with `beads` added to its adapter list.

### Slice 7

- Input: one transcript per write case in `tests/fixtures/tracker/beads/transcripts/`. The cases are `create_program`, `create_epic`, `create_slice`, `create_pr`, `set_state`, and `claim_slice`.
- Assertions in `tests/test_tracker_beads.py`:
  - `test_write_args_match_transcripts`: for each transcript, the adapter call sends the recorded `args`. The stub returns the recorded `stdout`.
  - `test_claim_reads_back_assignee`: the claim sends `update`, then `show --json`. The assignee in the read-back equals the claimant.
  - `test_claim_mismatch_raises`: a read-back that shows another assignee raises the claim error.
  - `test_metadata_round_trip`: the envelope for slice `demo-E1-s1` (`score: 0.92`) written through `create` equals the envelope read back from `show --json`.
  - Contract cases 3, 4, and 5 run with `beads` added. Case 5 is the pr blocking rule.

### Slice 8

- Input: the mini plan `tests/fixtures/tracker/plans/beads-storage-mini/` from E1.
- Assertions in `tests/test_tracker_beads.py`:
  - `test_dry_run_prints_planned_creates`: the script runs with `--dry-run --plans-dir tests/fixtures/tracker/plans/beads-storage-mini`. Stdout equals `tests/fixtures/tracker/beads/seed_dry_run.txt`. Exit code 0.
  - `test_dry_run_needs_no_bd`: the script runs with `PATH` set to an empty directory. Exit code 0 proves that the dry run calls no `bd`.
  - `test_each_planned_line_is_an_envelope`: every line of stdout parses as a JSON object. Each object holds `title`, `kind`, and `metadata.cb.v` = 1.
  - `test_apply_creates_in_dependency_order`: with a stub runner, apply creates each record once. A blocked-by target is created before its dependent.
  - `test_second_apply_creates_nothing`: with `list.json` already holding every id, apply sends no `create` call.

### Slice 9

- Input: real `bd` and real `git`. Nothing is stubbed.
- Procedure, run by `test_fresh_clone_inits_and_syncs` in a `tempfile.TemporaryDirectory`:
  1. Create `origin.git` with `git init --bare`.
  2. Create `seed/` with `git init`, make one empty commit on `main`, and push it to `origin.git`. A bare remote with no branch fails `bd init --remote` (probe).
  3. In `seed/`, run `bd init --skip-agents --skip-hooks -p demo --remote <origin.git path>`.
  4. In `seed/`, run `BeadsSeed(BdRunner(cwd=seed)).seed_from_files(mini plan)` in apply mode.
  5. In `seed/`, run `bd dolt push`. The probe used this command to publish `refs/dolt/data`. Whether `bd sync` alone publishes the first data is not verified.
  6. Run `git clone origin.git clone1`. In `clone1`, run `bd init --skip-agents --skip-hooks -p demo --remote <origin.git path>`, then `bd list --json`, then `bd sync`.
  7. Run `git clone origin.git clone2`. Repeat step 6 in `clone2`.
- Pass, observed in the output:
  - The exit code of each `bd` command in `clone1` and `clone2` is 0.
  - No line of combined output starts with `Error`.
  - The sorted ids from `bd list --json` in each clone equal the ids that the seed created.
  - The counts per kind in both clones equal the counts that `project` gives for the seeded records.
- The test fails when `bd` is missing. It does not skip.
- The test prints the transcript of every command. The implementer pastes that transcript into the slice 9 evidence. Evidence stays local, as `.cobuilder/rubrics/*/evidence/` is git-ignored.

## Test Plan

- Unit and transcript tests: `tests/test_tracker_beads.py`, slices 6 to 8. They run with `uv run pytest tests/test_tracker_beads.py -q`.
- Contract cases: `tests/test_tracker_contract.py` with the `beads` entry. Cases 3, 4, 5, and 7 run for beads in E2. Cases 1, 2, and 6 stay with the fake adapter and the CLI in E1. ADR-0040 lists seven cases. The file holds all seven. The beads entry skips with a reason when `bd` or the workspace is missing.
- Clone check: `test_fresh_clone_inits_and_syncs` in slice 9. It uses real `bd` and `git`, so it needs the tool versions in Risks and Open Questions.
- Epic run: `uv run pytest tests -q`, run once by Main after implementation. Slices do not run it.

## Risks & Open Questions

1. **The clone check is not verified.** The probe showed that `bd init --remote` fails on an empty bare remote. It also showed that `bd dolt push` publishes `refs/dolt/data`. Slice 9 must pass on the first real run. If it fails, E2 does not close. The decision returns to the engineer. The "second store per clone" option is not decided (03 Least-confident 1).
2. **`bd init` changes the target repo.** The probe showed that `bd init` makes one git commit. It adds the `.beads/` config files and appends to the root `.gitignore`. The embedded Dolt store is ignored. The consent step in `shared/tracker-adapter-beads.md` must say this before the user confirms.
3. **Capability values are not verified.** `offline_read` and `native_ready` lack a recorded run. Slice 6 records `bd` output for each. A value that the transcript does not support changes to false.
4. **The `bd` version is pinned in fixtures.** Transcripts record `bd` 1.3.0 (Homebrew). A different version can change the output. The tests fail on a changed `stdout` shape, not on a changed version.
5. **Claim race.** `atomic_claim` is false. The read-back narrows the race but does not close it (ADR-0040).
6. **Naming conflict.** `shared/tracker.py` and the `shared/tracker_port/` package share one name. The default keeps both names (03 Least-confident 2).
7. **Contract file ownership.** `tests/test_tracker_contract.py` belongs to E1. E2 adds one adapter entry. The E1 owner must accept the change before slice 6 starts.
8. **Rubric path.** 04 names `docs/architecture/designs/beads-storage/rubrics/` for rubrics. This epic uses `.cobuilder/rubrics/beads-storage/`, as the task and SKILL 4c require.
