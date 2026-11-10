# Rubric: Slice 1 — Tracer bullet: the contract read cases pass on the linear adapter

Feature: `linear-tracker-adapter`
Epic: E1 — The adapter reads the plan
Slice goal: A `linear` builder loads the corpus into `FakeLinear`, the read cases of the contract suite pass on it, and `doctor` reports the capability flags.
Test command: `uv run pytest tests -q`

## Criteria

### C1 — The slice 1 contract cases pass on the linear adapter [CRITICAL]

**Must be true:** `linear` is in `ADAPTER_BUILDERS` and `READ_ADAPTER_BUILDERS`. These cases pass on it: text fields, all-records lists, envelope round trip, capabilities, projector parity, and the two migrate cases. Every other `linear` case sits in the `LINEAR_PENDING` ledger with a slice number, as a strict expected failure. The records equal the fake adapter records for the same corpus.

**Evidence to check:**
- Run `uv run pytest tests/test_tracker_contract.py tests/test_tracker_contract_writes.py tests/test_tracker_contract_migrate.py -q` and read the `linear` ids. The named cases pass, and the others show as xfail.
- Read `LINEAR_PENDING` and check that each entry names a slice from 4 to 7.
- Read `_build_linear` in `tests/_tracker_contract_support.py`. It must build the adapter over `FakeLinear`, not over a stub that returns canned records.

**Scoring:**
- 1.0 — the named cases pass and the ledger covers every other linear case, with the builder filling `FakeLinear` from the corpus
- 0.5 — the cases pass but the ledger is missing for some cases, or the builder returns canned records
- 0.0 — a named case fails, an unexpected `linear` failure shows, or the builder is missing

### C2 — The capability flags are right [CRITICAL]

**Must be true:** `doctor` over the linear adapter reports `rich_envelope` true, and `native_ready`, `atomic_claim`, and `offline_read` false.

**Evidence to check:**
- Run the test that calls `doctor` on the `linear` adapter and read the four flag values.
- Read `LinearAdapter.capabilities`.

**Scoring:**
- 1.0 — all four flags match
- 0.5 — three of four match
- 0.0 — `rich_envelope` is false or the flags are missing

### C3 — No network call and no beads change

**Must be true:** No test opens a socket. The beads files and beads tests show no diff.

**Evidence to check:**
- Run `git diff --stat -- shared/tracker_port/beads*.py shared/tracker_port/bd_runner.py tests/test_tracker_beads*.py` and read the output.
- Grep the new files for `urlopen` and `socket`. Only `linear_client.py` may hold them.

**Scoring:**
- 1.0 — no diff in beads files and no network use outside `linear_client.py`
- 0.5 — one stray import
- 0.0 — a beads file changed or a test uses the network

## Regression check

- All tests that passed before this slice must still pass.
- Files outside the slice scope must remain unchanged. Protected scope: the beads adapter files and their tests.

## Out of scope — do not penalise

- the closed rule, the archived read, `LinearClient` paging, any write, claim, and `sync`.
