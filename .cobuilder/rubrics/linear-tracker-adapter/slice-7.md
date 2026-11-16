# Rubric: Slice 7 — One claim wins, and a crashed claim can end

Feature: `linear-tracker-adapter`
Epic: E3 — Ready and claim
Slice goal: Two claims on one slice give it to one winner, a held slice is refused, `set-slice-state open` releases a claim, a stale claim does not block, and `doctor` lists held claims.
Test command: `uv run pytest tests -q`

## Criteria

### C1 — One claim wins [CRITICAL]

**Must be true:** Two sessions claim one slice. The earlier server time wins, and a tie goes to the lower nonce. Only the winner writes the assignee. The loser deletes its attachment and gets a refusal. `claim_next` then takes the next ready slice.

**Evidence to check:**
- Run `uv run pytest tests/test_tracker_linear_claim.py -q`.
- Read the race test and the tie test.

**Scoring:**
- 1.0 — race, tie, winner-only assignee, and the claim_next fallback pass
- 0.5 — the race passes and the tie is missing
- 0.0 — two sessions both hold the assignee

### C2 — A crashed claim can end [CRITICAL]

**Must be true:** `set_slice_state open` removes every claim attachment and clears the assignee. A half-made claim older than 120 seconds on a slice that is not in progress does not block a new claim. A held, fresh claim still refuses. A claim on a slice that is in progress stays until `set-slice-state open`.

**Evidence to check:**
- Run the release test and the stale test.
- Read the clock values in the stale test.

**Scoring:**
- 1.0 — release, stale, fresh-held, and in-progress cases pass
- 0.5 — release passes and stale is missing
- 0.0 — a stale claim blocks forever

### C3 — Doctor lists held claims, an unmapped login exits 4, and the ledger is empty

**Must be true:** `doctor` lists each held claim with its claimant and age. A claim by an unmapped login exits 4. `LINEAR_PENDING` holds no entry.

**Evidence to check:**
- Run the doctor test and the login test.
- Read `LINEAR_PENDING` in `tests/_tracker_contract_support.py`.
- Read the doctor result for a held claim.

**Scoring:**
- 1.0 — both pass
- 0.5 — only one
- 0.0 — neither is tested

## Regression check

- All tests that passed before this slice must still pass.
- Files outside the slice scope must remain unchanged. Protected scope: slices 1 to 6 tests.

## Out of scope — do not penalise

- `sync`, the seed, and the real Linear claim order.
