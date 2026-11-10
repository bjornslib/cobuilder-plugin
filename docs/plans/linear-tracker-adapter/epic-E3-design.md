# Epic Technical Solution Design: E3 — Ready and claim

Feature: linear-tracker-adapter
Epic ID: E3

## Scope and Intent

E3 adds the client ready rule and the claim rule. Linear has no native ready and no compare-and-set, so the adapter computes ready and uses a write-then-read claim. E3 ends when two claims on one slice give it to one winner, and a crashed claim can end.

Out of scope: `sync`, the seed, and the real Linear claim order (E6).

## Files Touched

New files:

- `shared/tracker_port/linear_claim.py`: `claim`, `release`, `stale_claims`, and `winner`.
- `tests/test_tracker_linear_ready.py`: slice 6 assertions.
- `tests/test_tracker_linear_claim.py`: slice 7 assertions.

Modified files:

- `shared/tracker_port/linear_ready.py` (new): `next_ready` and the epic check.
- `shared/tracker_port/linear.py` and `linear_writes.py`: add `claim_slice` and `claim_next`, and a release call inside `set_slice_state`.
- `tests/_linear_fake_support.py`: adds a server clock for attachment creation time and a second-session helper.

## Types & Signatures

```python
# linear_claim.py
STALE_SECONDS = 120
def winner(claims: list[Attachment]) -> Attachment: ...                    # earliest created_at, then lower nonce
def claim(api: LinearApi, issue: Issue, claimant: str, claimant_id: str) -> bool: ...
def release(api: LinearApi, issue: Issue) -> None: ...                     # delete every claim attachment, clear the assignee
def stale_claims(issue: Issue, now: str) -> list[Attachment]: ...         # issue not in progress, claim older than STALE_SECONDS

# linear.py
def next_ready(self, kind: str = "slice", under: str | None = None) -> list[TrackerRecord]: ...
def claim_slice(self, id: str, claimant: str) -> TrackerRecord: ...
def claim_next(self, claimant: str, under: str | None = None) -> TrackerRecord | None: ...
```

The ready rule: a slice is open and unclaimed, each blocker reads as closed, and its parent epic has no open blocker. An epic with a defer date in the future holds its slices, as the contract case `test_next_ready_excludes_pr_and_deferred` requires. The defer date sits in the envelope key `deferred`. A claim attachment has the URL `cobuilder://<repo>/<id>#claim-<nonce>` and the metadata `claimant` and `nonce`. A claim of an unmapped login raises `ArgumentError` (exit 4).

## Slice Decomposition

6. **Next-ready follows the slice and epic order.** The ready rule, the defer date, and the contract cases for ready, pull requests, and `sync`. Depends on E2.
7. **One claim wins, and a crashed claim can end.** The claim, the loser path, the release inside `set_slice_state open`, the stale-claim delete, and the `doctor` list of held claims. Depends on slice 6.

## Test Plan

`tests/test_tracker_linear_ready.py`:

- Slice 6: the ready cases of the contract suite pass with the `linear` builder. The first slice of epic 2 is not ready while epic 1 is open. A pull request and an unplanned issue are never in `next_ready`.

`tests/test_tracker_linear_claim.py`:

- Slice 7: two sessions claim one slice, and the earlier server time wins. With equal times, the lower nonce wins. Only the winner holds the assignee. The loser deletes its attachment and gets a refusal. `claim_next` takes the next ready slice after a loss. A held slice is refused. `set_slice_state open` removes the claim attachments and the assignee. A half-made claim older than 120 seconds on a slice that is not in progress does not block a new claim. `doctor` lists a held claim with its claimant and age. An unmapped login exits 4. The `LINEAR_PENDING` ledger is empty at the end of the slice.

## Risks & Open Questions

- A crashed session leaves its claim on a slice that is in progress. The stale rule does not cover it, because a slice may run for hours. Only `set-slice-state open` ends that claim. `doctor` lists held claims with their age, and the adapter note names the release path.
- The claim window stays open for a short time, so two sessions can both claim. The adapter reports `atomic_claim` false, and the ADR accepts this.
- The stale window of 120 seconds is a guess. A slow API call could outlast it. E6 measures the real call time.
- If E6 shows that two attachments have no stable server order, the claim rule must change. The abort rules do not cover it. The engineer decides then.
