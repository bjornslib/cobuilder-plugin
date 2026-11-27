# Epic Technical Solution Design: E1 — The adapter reads the plan

Feature: linear-tracker-adapter
Epic ID: E1

## Scope and Intent

E1 adds the `linear` adapter name and its read side. The adapter turns the issues of `FakeLinear` into `TrackerRecord` values that pass the read cases of the shared contract suite. E1 adds the closed rule, the archived read, the unplanned record, the request budget, and `prepare`. E1 ends when a full read of 265 issues costs no more than 8 requests.

E1 runs over `FakeLinear`. No test calls the network. The real `LinearClient` is written in slice 3, and the stubbed transport tests it.

Out of scope: every write except `prepare`, the claim, the ready rule beyond the contract read cases, `sync`, and the seed. Those belong to E2 to E4.

## Files Touched

New files:

- `shared/tracker_port/linear_client.py`: the `LinearApi` protocol, the dataclasses, and `LinearClient`.
- `shared/tracker_port/linear_rows.py`: the record map, the closed rule, and the envelope pack and unpack.
- `shared/tracker_port/linear.py`: `LinearAdapter` with the read operations, `capabilities`, `doctor`, `prepare`, and the stubs. `linear_writes.py`, `linear_ready.py`, and the later files arrive in their own epics.
- `tests/_linear_fake_support.py`: `FakeLinear` and `load_corpus_into(fake, corpus_dir)`.
- `tests/test_tracker_linear_read.py`: slice 1 and slice 2 assertions.
- `tests/test_tracker_linear_client.py`: slice 3 assertions.

Modified files:

- `shared/tracker_port/config.py`: adds `linear` to the adapter names, and reads `team`, `project`, `states`, `users`.
- `tests/_tracker_contract_support.py`: adds `_build_linear` to `ADAPTER_BUILDERS` and `READ_ADAPTER_BUILDERS`. It adds the `LINEAR_PENDING` ledger and the fixture that marks a pending case as a strict expected failure for `linear`. It changes no other builder. The ledger rules are in `03-program-design.md`.

No other file changes in E1. The beads files stay unchanged.

## Types & Signatures

The types of `Issue`, `Attachment`, `WorkflowState`, and `LinearApi` are in `03-program-design.md`. E1 adds:

```python
# linear_rows.py
def closed_with_proof(issue: Issue, envelope: Mapping[str, object]) -> bool: ...
def lifecycle_of(issue: Issue, envelope: Mapping[str, object], slices_closed: bool | None = None) -> Lifecycle: ...
def record_of(issue: Issue, issues: Mapping[str, Issue], repo: str) -> TrackerRecord: ...
def unplanned_record(issue: Issue, depth: int) -> TrackerRecord: ...

# linear.py
class LinearAdapter:
    def list_programs(self) -> list[TrackerRecord]: ...
    def list_epics(self, program: str | None = None) -> list[TrackerRecord]: ...
    def list_slices(self, epic: str | None = None) -> list[TrackerRecord]: ...
    def list_pull_requests(self) -> list[TrackerRecord]: ...
    def all_records(self) -> list[TrackerRecord]: ...
    def get_slice(self, id: str) -> TrackerRecord: ...
    def prepare(self) -> dict[str, bool]: ...
    def doctor(self) -> dict[str, object]: ...

# tests/_linear_fake_support.py
class FakeLinear:
    requests: int
    def __init__(self, page_size: int = 50, clock: Callable[[], str] = ...) -> None: ...
    def drag_to(self, issue_id: str, state_type: str) -> None: ...       # a human action
    def archive(self, issue_id: str) -> None: ...
    def rate_limit(self, reset_at: str) -> None: ...                       # next call raises
```

The closed rule follows `contracts.md`: type completed with a score of `PASS_SCORE` or more reads as closed. Type canceled with the outcome `skipped` reads as closed. Any other completed or canceled issue reads as open. An epic reads as closed only when all its slices do.

## Slice Decomposition

1. **Tracer bullet.** `_build_linear` loads the corpus into `FakeLinear`. `linear` joins both builder dicts, and the ledger marks every case that a later slice owns. The cases for reads, text fields, the envelope round trip, capabilities, projector parity, and migrate pass. `migrate_mapping` returns the empty report of the fake, and `repair_status` refuses as the files adapter does. This slice writes the read path for a planned record, and the client protocol with `FakeLinear`.
2. **The closed rule and the archived read.** Adds `closed_with_proof`, the epic rule, the `include_archived` flag, and the unplanned record. Depends on slice 1.
3. **The key, the budget, and prepare.** Adds `LinearClient` over a stub transport, paging, the request count, the rate-limit error, the key check in `config.py`, and `prepare`. Depends on slice 2.

## Test Plan

`tests/test_tracker_linear_read.py`:

- Slice 1: these existing cases pass on `linear`: `test_records_carry_the_text_fields_outside_equality`, `test_all_records_matches_the_kind_lists`, `test_all_records_holds_every_kind`, `test_envelope_round_trip`, `test_capabilities_reports_four_flags`, `test_contract_case_7_projector_parity`, and the two cases of `test_tracker_contract_migrate.py`. Every other `linear` case sits in the ledger with its slice number. `doctor` returns `rich_envelope` true and the other flags false.
- Slice 2: a slice dragged to Done with no score reads as open. A slice dragged to Done with a score of 0.92 reads as closed. A canceled slice without the outcome `skipped` reads as open, and with it reads as closed. An epic with one open slice reads as not closed. An archived closed slice appears in `list_slices` and blocks nothing. An issue with no envelope lists with the state `unplanned`, and `next_ready` never returns it.

`tests/test_tracker_linear_client.py`:

- Slice 3: 265 issues at page size 50 take at most 8 requests. A rate-limit answer raises `AdapterError` that carries the reset time. `doctor` shows `requests_left` and `reset_at` from the last response headers. A missing `LINEAR_API_KEY` raises `AdapterError` that names the variable. `prepare` reports a missing state, creates a missing label, and returns `changed`.

## Risks & Open Questions

- The `FakeLinear` order of claim attachments is a guess until E6. E3 relies on it.
- The real page complexity of 50 issues with nested attachments is unknown. The 8-request test counts pages, not complexity.
- `prepare` creates a label. Linear may need a label group or color. E6 checks it.
