# Program Design: Linear as a tracker beside beads

Epic designs hold the detail per epic: `epic-E1-design.md` to `epic-E5-design.md`. E6 and E7 carry one slice each, so they have no epic design.

## Files

New files in `shared/tracker_port/`. Each file stays near 200 lines.

| File | Job |
|---|---|
| `linear_client.py` | `LinearApi` protocol, the dataclasses of an issue, and `LinearClient`: GraphQL over `urllib`, paging, the request count, rate-limit errors |
| `linear_rows.py` | The record map: issue to `TrackerRecord`, the closed rule, envelope pack and unpack, the seen values |
| `linear.py` | `LinearAdapter`: the class, `capabilities`, `doctor`, `prepare`, the stubs, and the read operations |
| `linear_writes.py` | The write operations, as a mixin of `LinearAdapter` |
| `linear_ready.py` | The client ready rule: `next_ready` and the epic check |
| `linear_claim.py` | The claim rule: claim-first, nonce tie-break, release, stale claims |
| `linear_seen.py` | The seen values and the plan-change compare |
| `linear_seed.py` | `run_seed` and `run_sync` |

The plan splits the files now, because `beads.py` needed 14 helper files. A file stays near 200 lines. `linear_rows.py` holds only the record map, the closed rule, and the envelope pack and unpack. `shared/tracker_port/cli_operations.py` is already at 194 lines, so the `plan_changes` print goes into `shared/tracker.py`, next to the `conflicts` print.

New files outside it:

- `tests/_linear_fake_support.py`: `FakeLinear`, an in-memory `LinearApi` with a server clock, a request count, and human actions (drag, edit, archive). Not a test module.
- `tests/test_tracker_linear_*.py`: one test file per epic area.
- `tests/test_tracker_linear_live.py`: the live smoke test. It carries a marker that the default run skips.
- `shared/tracker-adapter-linear.md`: the adapter note.

Changed files: `config.py`, `projector.py`, `regenerate.py`, `shared/tracker.py`, `tests/_tracker_contract_support.py` (a `linear` builder and a ledger of pending cases), `shared/tracker-usage.md`, `docs/architecture/contexts/shared/boundary.yaml`, `CLAUDE.md` (principle 7), the `cobuilder-setup` skill, and `tests/test_install_tracker_config.py`.

## Types & signatures

```python
# linear_client.py
@dataclass(frozen=True)
class WorkflowState: id: str; name: str; type: str
@dataclass(frozen=True)
class Attachment: id: str; url: str; title: str; metadata: Mapping[str, str | int | float]; created_at: str
@dataclass(frozen=True)
class Issue:
    id: str; identifier: str; title: str; description: str | None
    parent_id: str | None; state: WorkflowState; assignee_id: str | None
    blocks: tuple[str, ...]; related: tuple[str, ...]
    attachments: tuple[Attachment, ...]; archived: bool

class LinearApi(Protocol):
    requests: int
    def issues(self, team: str, project: str | None, include_archived: bool) -> list[Issue]: ...
    def issue(self, issue_id: str) -> Issue: ...
    def create_issue(self, team: str, title: str, parent_id: str | None, state_id: str, description: str | None = None) -> Issue: ...
    def update_issue(self, issue_id: str, state_id: str | None = None, assignee_id: str | None = None, clear_assignee: bool = False) -> Issue: ...
    def upsert_attachment(self, issue_id: str, url: str, title: str, metadata: Mapping[str, str | int | float]) -> Attachment: ...
    def delete_attachment(self, attachment_id: str) -> None: ...
    def create_comment(self, issue_id: str, body: str) -> None: ...
    def create_relation(self, issue_id: str, other_id: str, kind: str) -> None: ...
    def team_states(self, team: str) -> list[WorkflowState]: ...
    def team_settings(self, team: str) -> Mapping[str, object] | None: ...

class LinearClient:                 # the real client
    def __init__(self, key: str, endpoint: str = ..., page_size: int = 50, transport: Callable = ...) -> None: ...

# linear_rows.py
PASS_SCORE = 0.90
def lifecycle_of(issue: Issue, envelope: Mapping[str, object], slices_closed: bool | None = None) -> Lifecycle: ...
def record_of(issue: Issue, issues: Mapping[str, Issue], repo: str) -> TrackerRecord: ...
def pack_envelope(envelope: Mapping[str, object]) -> dict[str, str | int | float]: ...
def unpack_envelope(metadata: Mapping[str, str | int | float]) -> dict[str, object]: ...

# linear.py
class LinearAdapter(LinearWrites):
    capabilities = Capabilities(native_ready=False, atomic_claim=False, rich_envelope=True, offline_read=False)
    name = "linear"
    def __init__(self, api: LinearApi, team: str, project: str | None, states: Mapping[str, str], users: Mapping[str, str], repo: str) -> None: ...
    # every TrackerPort method, plus:
    plan_changes: list[dict[str, object]]          # set by sync
    def migrate_mapping(self, dry_run: bool = False, plans_dir: Path | None = None) -> dict[str, object]: ...   # the empty report of the fake
    def repair_status(self, dry_run: bool = False, plans_dir: Path | None = None, index: Path | None = None) -> None: ...   # refuses, as the files adapter does

# linear_claim.py
STALE_SECONDS = 120
def claim(api: LinearApi, issue: Issue, claimant: str, claimant_id: str) -> bool: ...   # write claim, read back, True for the winner
def release(api: LinearApi, issue: Issue) -> None: ...
def stale_claims(issue: Issue, now: str) -> list[Attachment]: ...

# linear_seed.py
def run_sync(adapter: LinearAdapter) -> list[dict[str, object]]: ...
def run_seed(adapter: LinearAdapter, plans_dir: Path, dry_run: bool, refresh_envelope: bool) -> list[TrackerRecord]: ...
```

`LinearAdapter.sync` and `LinearAdapter.seed_from_files` call these two functions.

`config.load_adapter` reads `team`, `project`, `states`, and `users`, reads `LINEAR_API_KEY`, and builds `LinearAdapter(LinearClient(key), ...)`. A missing key raises `AdapterError` that names the variable (exit 3).

## Call stack

```
tracker.py claim-next
  config.load_adapter -> LinearAdapter(LinearClient)
  LinearAdapter.claim_next
    api.issues(include_archived=True)            # one paged read
    linear_rows.record_of  x N                   # envelope, closed rule, unplanned
    next-ready rule (client)                     # open, unclaimed, blockers closed, epic unblocked
    linear_claim.claim                           # attachment, read back, assignee for the winner
    api.update_issue(state=in_progress)

tracker.py sync
  LinearAdapter.sync
    api.issues -> compare seen values -> api.create_comment per changed issue
    -> api.upsert_attachment (refresh seen) -> self.plan_changes
  tracker.py prints plan_changes
```

## Test plan

Every test reads `FakeLinear` and checked-in fixtures. No default test calls the network.

- The shared contract suite runs on a `linear` builder. Slice 1 adds `linear` to `ADAPTER_BUILDERS` and to `READ_ADAPTER_BUILDERS` in `_tracker_contract_support.py`. About 50 existing cases then run on `linear`. RED of slice 1 reports the exact number. They sit in `test_tracker_contract.py`, `_writes`, `_claim_next`, `_migrate`, `test_tracker_program_state.py`, `test_tracker_program_stage_status.py`, `test_tracker_skip_slice.py`.
- A ledger keeps the build honest. `LINEAR_PENDING` in `_tracker_contract_support.py` maps a case name to the slice that makes it pass. A fixture marks that case as a strict expected failure for `linear`. A slice deletes the entries it satisfies. Strict mode turns an unexpected pass into a failure, so a slice cannot leave an entry behind. The ledger must be empty when slice 7 closes. The first assignment follows the area of the case: reads, text fields, envelope round trip, capabilities, projector parity, and migrate go to slice 1. The slice writes go to slice 4. Program and epic writes, stage, and lifecycle follow-through go to slice 5. Ready, pull request, and `sync` cases go to slice 6. Claim cases go to slice 7. RED of slice 1 assigns each case by running the suite.
- Closed rule, archived read, and unplanned records: one test file.
- Request budget and rate limit: a 265-issue fake read counts requests. A stubbed transport returns a rate-limit answer.
- Envelope round trip with scalars, a path, and a list of paths, compared value by value.
- Claim race on the fake clock, tie-break, release, and stale claim.
- Plan changes: reorder, rename, re-parent, and a CoBuilder-only write that raises none.
- Seed twice, and a differing plan field as a conflict.
- Boundary: a grep test finds no Linear API call outside `linear*.py`, and no key in the repo.
- The beads tests run unchanged and stay green.
- The live smoke test runs only on demand, in a test workspace.

## Least confident decisions

1. **The `LinearApi` shape.** It follows the Linear docs, and the live smoke test has not run. The test may show the fake is wrong in the claim order, the repeated create, or the sub-issue depth. E6 may force a rewrite of `FakeLinear` and parts of E1 to E4. The engineer accepts this cost.
2. **How a plan row names an existing Linear issue.** The design leaves it open. E4 slice 9 needs an answer to link a seeded plan row to an issue a person created. The proposal is a `linear:<identifier>` value in the `external_ref` of the plan row. The engineer decides at the E4 design review.
3. **`PASS_SCORE` is a constant of 0.90.** The gate threshold also lives in the manifest of each build. The two can drift. A later change could read the threshold from one place.
4. **The attachment metadata size limit** is unknown. A large envelope may not fit.
5. **The seen-values list may miss a plan field** that people change in Linear. A missed field raises no `plan_changes` entry.
