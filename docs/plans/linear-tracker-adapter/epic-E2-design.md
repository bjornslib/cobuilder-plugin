# Epic Technical Solution Design: E2 — The adapter writes progress

Feature: linear-tracker-adapter
Epic ID: E2

## Scope and Intent

E2 adds the write side of the `linear` adapter. A result that CoBuilder reaches shows in `FakeLinear`: the workflow state, the score and attempts, the gate dates, the branch, and the pull request issues. E2 ends when the write cases of the shared contract suite pass on the `linear` builder.

Out of scope: the claim and ready rules (E3), `sync` and the seed (E4).

## Files Touched

New files:

- `tests/test_tracker_linear_writes.py`: slice 4 and slice 5 assertions.

Modified files:

- `shared/tracker_port/linear_writes.py` (new): the write operations, as the mixin `LinearWrites`. `linear.py` inherits it.
- `shared/tracker_port/linear_rows.py`: adds `pack_envelope`, `unpack_envelope`, and `attachment_title`.
- `tests/_linear_fake_support.py`: adds attachment upsert by URL, comments, and relations.
- `tests/_tracker_contract_support.py`: deletes the `LINEAR_PENDING` entries that slices 4 and 5 satisfy. Strict mode fails the run if one stays.

## Types & Signatures

```python
# linear_rows.py
def pack_envelope(envelope: Mapping[str, object]) -> dict[str, str | int | float]: ...   # one JSON string under "envelope"
def unpack_envelope(metadata: Mapping[str, str | int | float]) -> dict[str, object]: ...
def attachment_title(kind: str, envelope: Mapping[str, object]) -> str: ...               # state word, score, attempts; gates and stage for a program

# linear.py
def set_slice_state(self, id: str, state: str, score: float | None = None, attempts: int | None = None) -> TrackerRecord: ...
def record_attempt(self, id: str, score: float, note: str | None = None) -> TrackerRecord: ...
def escalate(self, id: str, score: float, reason: str) -> TrackerRecord: ...
def skip_slice(self, id: str, reason: str, outcome: str = "skipped") -> TrackerRecord: ...
def add_note(self, id: str, text: str) -> None: ...
def set_program_stage(self, program: str, stage: str, plans_dir: Path | None = None) -> TrackerRecord: ...
def set_gate_value(self, program: str, gate: str, value: str) -> TrackerRecord: ...
def set_epic_state(self, epic: str, state: str, branch: str | None = None) -> TrackerRecord: ...
def open_pull_request(self, ref: str, epic_ids: list[str]) -> TrackerRecord: ...
def set_pull_request_state(self, ref: str, merged: bool) -> TrackerRecord: ...
```

Each write maps the port state to a workflow state id through the `states` map. A skipped slice goes to the `skipped` entry (type canceled). A write to the envelope upserts the attachment by its URL and updates only the fields it writes.

## Slice Decomposition

4. **A slice result shows in Linear.** The five slice writes, the state map, the envelope round trip, and the attachment title. Depends on E1.
5. **Program, epic, and pull request state show in Linear.** The program, epic, and pull request writes and the contract write cases. Depends on slice 4.

## Test Plan

`tests/test_tracker_linear_writes.py`:

- Slice 4: the slice write cases of the contract suites pass on `linear`, with the cases of `test_tracker_skip_slice.py`. `set_slice_state closed --score 0.92` moves `FakeLinear` to the completed state and the title reads closed with 0.92. A renamed state of type completed still maps. An envelope with a string, a number, a path, and a list of paths round-trips and a value-level compare finds no difference. `record_attempt` and `add_note` each post one comment. `skip_slice` moves to the canceled state with the outcome in the envelope.
- Slice 5: the program, epic, and gate cases pass on `linear`: `test_set_program_stage_writes_envelope`, `test_set_epic_state_writes_lifecycle`, `test_gate_value_round_trip`, and the cases of `test_tracker_program_state.py` and `test_tracker_program_stage_status.py`. The pull request cases that read `ready_sets` stay in the ledger until slice 6. The program title shows the gate dates and the stage. `set_epic_state` with a branch keeps the branch. A pull request issue has `related` relations to its epics and no `blocks` relation. A merge moves it to completed.

## Risks & Open Questions

- Linear metadata takes only strings and numbers, and its size limit is unknown. E6 checks it.
- A repeated attachment create with one URL may duplicate instead of update. The fake updates. E6 checks it.
- Program lifecycle follows its epics through `program_lifecycle` in `program_state.py`. The adapter must move the program workflow state on a change.
