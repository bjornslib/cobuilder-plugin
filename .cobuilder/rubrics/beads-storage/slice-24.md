Kind: test-suite

# Rubric: Slice 24 — E7 type, title, label, and text mapping

Feature: beads-storage
Epic: beads-storage/E7
Slice goal: A created issue has the new bd type, the name as title, the label `cb`, `external_ref`, and the text fields. A read returns title, description, acceptance criteria, and design from the row fields. A lookup by cb id runs `bd list --external-ref`. `prepare` sets no custom type. `doctor` reports `mapping`.
Test command: `uv run pytest tests/test_tracker_beads_mapping.py tests/test_tracker_contract.py tests/test_tracker_beads_create_record.py -q`

The tests in `tests/test_tracker_beads_mapping.py` replay recorded transcripts and need no `bd`. The suite stays fast.

## Criteria

### C1 — The create argv carries type, title, label, external ref, and set text fields [CRITICAL]

**Must be true:** `create_record` sends `--type feature` for a program, `--type milestone` for a pull request, and the native types for epic and slice. It sends `--title <record.title or cb id>`, `--labels cb`, and `--external-ref <record.external_ref>`. It sends `--description`, `--acceptance`, and `--design` only for a set field. For a pull request, `external_ref` is `gh-<n>`. Replay tests compare the whole argv against new transcripts.

**Evidence to check:** Run the replay tests. Read the recorded argv of one create for each kind. A record with no text field must show no `--description`, `--acceptance`, and `--design` flag.

**Scoring:**
- 1.0: each kind's whole argv equals its transcript, and the unset-field case has no text flag.
- 0.5: the type and the title are right, but one of the label, the external ref, or the unset-field rule is not asserted.
- 0.0: a type is wrong, the label is missing, or the tests assert only part of the argv.

### C2 — A read fills the record from the bd row fields [CRITICAL]

**Must be true:** A read of a recorded row fills `title`, `description`, `acceptance_criteria`, and `design` from the row fields of the same names. A lookup of one record by cb id runs `bd list --external-ref <ref> --json --limit 0 --all`, and an unknown ref gives no record. The four text fields stay out of record equality.

**Evidence to check:** Run the read tests over a recorded row. Read the recorded argv of the lookup. Compare two records that differ only in a text field, and check that they are equal.

**Scoring:**
- 1.0: the fields come from the row, the lookup argv is asserted, an unknown ref gives no record, and the equality test holds.
- 0.5: the fields are read, but the lookup argv or the unknown-ref case has no test.
- 0.0: a field is not read from the row, or a text field enters equality.

### C3 — `prepare` sets no custom type, and the legacy check reports its reasons [CRITICAL]

**Must be true:** `prepare` makes no `types.custom` call, and `_create` no longer retries on `invalid issue type`. `STATUS_MAP` maps `deferred` to `open`, so a deferred row reads with no error. `legacy_reasons` returns a reason for a cb row of type `program`, for a pr row of type `task`, and for an epic with a `blocks` edge to a pr row, and an empty list for a native tracker. `doctor` reports `mapping: legacy` or `mapping: native`.

**Evidence to check:** Read the tests for `prepare`, `STATUS_MAP`, `legacy_reasons`, and `doctor`. Check that a replay of `prepare` holds no `types.custom` call.

**Scoring:**
- 1.0: every item above has a passing test with an assertion on a call list or a returned value.
- 0.5: one item has no test.
- 0.0: `prepare` still sets a custom type, or a deferred row raises `unknown status`.

### C4 — The seed fills the text fields from the sources, and the title rule is one constant

**Must be true:** The seed sends the epic `description` from the `goal.json` outcome, the slice `acceptance_criteria` from the `Ends with` cell, and the `design` path only when the file exists. A field with no source sends no flag. One constant sets the title rule.

**Evidence to check:** Read the seed tests. Check one record with a source and one without.

**Scoring:**
- 1.0: both cases are asserted on the argv, and one constant sets the title rule.
- 0.5: the sources are asserted, but the no-source case is not.
- 0.0: a field with no source sends an empty flag, or the rule is spread over several places.

## Regression check

- `uv run pytest tests/test_tracker_beads.py tests/test_tracker_beads_write.py tests/test_tracker_beads_seed.py -q` passes, or the failing tests were changed only to follow the new mapping.
- The contract suite passes on the fake adapter with the new record fields.

## Out of scope — do not penalise

- Edges and ordering. Those belong to slices 25 and 26.
- Native ready and `claim-next`. Those belong to slices 27 and 28.
- The migration of a live tracker. That belongs to slice 29.
- The choice between the two title rules.
