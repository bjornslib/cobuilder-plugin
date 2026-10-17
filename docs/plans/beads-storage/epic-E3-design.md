# Epic Technical Solution Design: E3

Feature: beads-storage
Epic ID: E3

## Scope and Intent

E3 is the read model. Four readers stop parsing plan files. They read through the tracker port and the projector instead:

- the bundle build (`shared/build_index.py`),
- the gate check (`plugins/implement/scripts/verify_gate.py`),
- the builds view (`plugins/artifact/scripts/build_builds_view.py`),
- the status-file writer (a new `regenerate` module that writes the state lines of `00-status.md` and `04-slices.md`).

E3 changes no viewer source. The viewer keeps reading `data/index.json`.

E3 does not add a write path. It does not change the four skills that write state (E4). It does not start a beads adapter (E2). The files adapter is read-only (E1 slice 3).

The design follows `03-program-design.md` section E3, ADR-0040 (the port and its rules), and ADR-0031 (beads as the storage layer).

Derived output stays derived. The bundle rebuild writes `data/index.json`. No adapter writes it.

## Files Touched

Modified:

- `shared/build_index.py`. Reads `TrackerRecord` values through the port and passes them to `project`. It keeps writing `data/index.json` and `.cobuilder-architect/self/data/index.json`. The port read replaces `collect_plans`.
- `shared/tracker_port/projector.py`. Gains the entity and join rules that `build_index.py` holds today (E1 slice 1 creates the module).
- `shared/gate_status.py`. Stays the gate-line parser. The files adapter calls it. No other caller parses gate lines.
- `plugins/implement/scripts/verify_gate.py`. Reads gate values and slice rows through the port.
- `plugins/artifact/scripts/build_builds_view.py`. Reads through the port.

Created:

- `shared/tracker_port/regenerate.py`. Writes the state lines of `00-status.md` and `04-slices.md` from the records. It owns those lines only. Prose stays with the agent.
- `tests/test_build_index_port.py`. Characterization test for slice 10 (miniature tree, no live read).
- `tests/test_tracker_read_spy.py`. Zero-file-read spy test for slice 11.
- `tests/test_verify_gate_port.py`. Golden test for the gate check through the port (slice 11).
- `tests/test_build_builds_view_port.py`. Golden test for the builds view through the port (slice 11).
- `tests/test_tracker_regenerate.py`. Golden test for the status-file writer (slice 12).
- `tests/fixtures/tracker/golden/` holds the checked-in golden outputs for the three tests above. It holds `build_index_entities.json` (slice 10), `verify_gate.json` and `builds_view.json` (slice 11), and `plans/<program>/00-status.md` and `plans/<program>/04-slices.md` (slice 12).

Viewer: no source change. The bundle rebuild writes `data/index.json`. `tests/test_viewer_build.py` fails when the build does not match the committed `index.html`.

Not touched: `shared/tracker.py`, the four skill files, `goal.json`, any plugin version, and any file outside the list above.

## Types & Signatures

Names and fields come from the port contract in `03-program-design.md` and ADR-0040. E3 adds no new record kind.

```python
# shared/tracker_port/projector.py  (created by E1 slice 1, extended by E3 with the entity and join rules)
def project(records: Iterable[TrackerRecord]) -> dict[str, Any]: ...
# Returns the index dict with the same top-level keys that build_index.py writes today.

# shared/tracker_port/port.py  (E1)
class TrackerPort(Protocol):
    def list_programs(self) -> list[TrackerRecord]: ...
    def list_epics(self, program: str) -> list[TrackerRecord]: ...
    def list_slices(self, epic: str) -> list[TrackerRecord]: ...
    def list_pull_requests(self) -> list[TrackerRecord]: ...
    def get_slice(self, slice_id: str) -> TrackerRecord: ...
    def next_ready(self, kind: str, under: str | None = None) -> list[TrackerRecord]: ...
    def regenerate_status_files(self, program: str) -> list[Path]: ...
    def capabilities(self) -> Capabilities: ...

def load_adapter(config_path: Path, repo_root: Path) -> TrackerPort | None: ...

# shared/tracker_port/regenerate.py  (E3 slice 12)
def regenerate(port: TrackerPort | None, program: str, plans_dir: Path) -> list[Path]:
    """Write the state lines of 00-status.md and 04-slices.md under plans_dir/<program>.

    Raises NoAdapterError when port is None. Writes nothing in that case.
    Returns the paths it wrote. It never changes a prose line.
    """
```

`TrackerPort.regenerate_status_files(program)` in the port contract delegates to `regenerate`. The port supplies `plans_dir` from its own config. See Risks, item 6.

Readers call the port in Python. They import from `shared/`. They do not shell out to `tracker.py`. See Risks, item 7.

## Slice Decomposition

`04-slices.md` leaves the `Depends on` column empty for every E3 row. The dependencies below derive from each slice's inputs. Each derived row says so.

| Slice | Ends with | Depends on |
|---|---|---|
| 10 | Bundle index unchanged after the port | E1 slice 1 (projector and fake adapter), E1 slice 3 (files adapter) |
| 11 | Gate check and builds view read the port | Slice 10 (the port read path in `build_index.py` is the pattern), E1 slice 3 |
| 12 | Status files regenerate from records | Slice 11 (the gate and slice line parsers that the files adapter calls), E1 slice 1 (fake adapter and golden corpus) |

Each slice adds its own tests. Each slice runs the existing tests that name its files.

### Slice 10 — Bundle index unchanged after the port

Changes:

1. Capture the golden before any edit. Run the current `build_index.py` on `tests/fixtures/tracker/plans/` in a temp repo. Check in the entity output as `tests/fixtures/tracker/golden/build_index_entities.json`.
2. Replace `collect_plans` with a port read. Route `TrackerRecord` values through `project`. Keep the two write paths.
3. Move the entity and join rules into `projector.py`.

Tests:

- `tests/test_build_index_port.py::test_entities_match_golden` runs `build_index` on the miniature tree and asserts the entities equal `build_index_entities.json`.
- `tests/test_build_index_port.py::test_writes_both_index_paths` asserts that `data/index.json` and `.cobuilder-architect/self/data/index.json` exist after one run.
- `tests/test_build_index_port.py::test_does_not_read_live_plans` asserts that the test file contains no path under `docs/plans`.
- Existing: `tests/test_build_index.py`, `tests/test_build_index_plan_docs.py`, `tests/test_build_index_gate_docs.py`, `tests/test_build_index_rubrics.py`, and `tests/test_viewer_build.py` pass unchanged.

Manual parity (not a suite test, per 03 least-confident #4):

- Before the change, copy `data/index.json` and the SHA-256 of `.cobuilder-architect/self/viewer/index.html` to the slice evidence folder.
- After the change, run `build_index.py` once on this repo and record the same two values.
- Compare the two `index.json` files. Record each key that changes on every run, such as a generation timestamp, with its values in the evidence. Every other byte must match.
- The viewer SHA-256 must match.

Evidence goes in `.cobuilder/rubrics/beads-storage/evidence/slice-10/`, which Git ignores.

### Slice 11 — Gate check and builds view read the port

Changes:

1. `verify_gate.py` reads gate values and slice rows through the port.
2. `build_builds_view.py` reads through the port.
3. `gate_status.py` stays the only gate-line parser. The files adapter calls it.

Tests:

- `tests/test_tracker_read_spy.py::test_list_programs_opens_no_plan_file` runs `list_programs` and `next_ready` on the fake adapter. A spy on `open` and `Path.read_text` records calls under `docs/plans`. It asserts zero calls.
- `tests/test_tracker_read_spy.py::test_gate_check_through_fake_opens_no_plan_file` runs `check_4a` and `check_4b` on the fake adapter with the same spy.
- `tests/test_verify_gate_port.py::test_results_match_golden` runs `check_4a` and `check_4b` on `tests/fixtures/tracker/plans/` through the files adapter. It asserts the result dict equals `verify_gate.json`.
- `tests/test_build_builds_view_port.py::test_read_epics_and_plan_match_golden` runs `read_epics` and `read_plan` on the same tree. It asserts the output equals `builds_view.json`.
- Existing: `tests/test_verify_gate.py`, `tests/test_verify_gate_2b.py`, `tests/test_verify_gate_links.py`, `tests/test_build_builds_view.py` pass unchanged.

Manual parity (not a suite test):

- For every directory under `docs/plans`, run `verify_gate.py --plan <dir>` before and after the change. Record each output.
- Run `build_builds_view.py` for the same plans before and after. Record each output.
- Each pair must match.

Evidence goes in `.cobuilder/rubrics/beads-storage/evidence/slice-11/`.

### Slice 12 — Status files regenerate from records

Changes:

1. Create `regenerate.py`. It reads the program, epic, and slice records through the port. It rewrites only the state lines of `00-status.md` and `04-slices.md`. It keeps every other byte.
2. Check in the golden output. Generate it once from `tests/fixtures/tracker/plans/` and the corpus, then check each line by hand against the corpus values before the commit.
3. Route the `None` case to `NoAdapterError`.

Tests:

- `tests/test_tracker_regenerate.py::test_output_equals_golden` copies `tests/fixtures/tracker/plans/` to a temp dir, runs `regenerate` with the fake adapter, and compares both files byte for byte with `tests/fixtures/tracker/golden/plans/<program>/`.
- `tests/test_tracker_regenerate.py::test_prose_lines_unchanged` asserts that the lines outside the state set are equal to the input lines.
- `tests/test_tracker_regenerate.py::test_second_run_is_identical` runs `regenerate` twice and asserts equal bytes.
- `tests/test_tracker_regenerate.py::test_no_adapter_writes_nothing` calls `regenerate(None, …)`. It asserts `NoAdapterError` and asserts that the temp tree has the same hashes before and after.
- Existing (E3 slice 12 adds a file, so 03 item 11 applies): `tests/test_shared_manifest.py`, `tests/test_script_references.py`, and `tests/test_plugin_manifests.py` pass.

Evidence goes in `.cobuilder/rubrics/beads-storage/evidence/slice-12/`.

## Test Plan

The E3 items below map to the numbered test plan in `03-program-design.md`.

1. Projector golden (03 item 2): `project(corpus)` equals `expected-index.json`. E1 slice 1 owns this test. E3 slice 10 re-runs it after the projector gains the entity rules.
2. Viewer byte compare (03 item 8): `tests/test_viewer_build.py` passes after slices 10 and 12. The viewer source does not change.
3. Regenerate golden (03 item 10): `tests/test_tracker_regenerate.py::test_output_equals_golden`, owned by slice 12.
4. Refusal with no adapter (03 item 5 and item 6): `tests/test_tracker_regenerate.py::test_no_adapter_writes_nothing`, owned by slice 12.
5. Manifest and reference tests (03 item 11): `tests/test_shared_manifest.py`, `tests/test_script_references.py`, and `tests/test_plugin_manifests.py` run after slice 12 adds a file. Slices 10 and 11 add tests but no shipped file, so they run these tests as a regression check.
6. Zero-file-read spy (03 least-confident #5): `tests/test_tracker_read_spy.py`, owned by slice 11. It checks the adapter path only.
7. Slice 10 parity (03 least-confident #4): manual, recorded as slice 10 evidence. Not a suite test.
8. Slice 11 parity: manual, recorded as slice 11 evidence. Not a suite test.

Each slice runs `uv run pytest tests -q` once in the main session after all E3 work lands. Workers do not run it.

## Risks & Open Questions

1. **Volatile keys in `data/index.json`.** If `build_index.py` writes a timestamp or a git HEAD value, the before and after files differ on every run. Slice 10 records those keys in evidence and compares every other byte. The rubric must accept this rule. Decision needed: confirm that the volatile key list is acceptable before slice 10 runs.
2. **Parity is manual (03 least-confident #4).** Slice 10 and slice 11 parity checks are not suite tests. ADR-0040 bars tests from reading the live `docs/plans` tree. The evidence files are the only record. A later change can break parity without a failing test.
3. **The zero-read measure checks the adapter path only (03 least-confident #5).** The spy in `tests/test_tracker_read_spy.py` shows that the port calls open no plan file. It does not show that an agent avoids reads. Agent behavior needs a separate behavioral check, which E4 owns.
4. **Existing live-read tests (conflict with ADR-0040).** `tests/test_verify_gate.py` reads `docs/plans/cobuilder-family/` directly (near lines 250 and 261 of that file). ADR-0040 bars tests from reading the live plans tree. E3 leaves that file unchanged, because its scope excludes it. Decision needed: rewrite those cases against a fixture in a later slice, or keep them and record an exception.
5. **`goal.json` names `next-ready` for readers.** The `goal.json` goal says readers switch to `next-ready`. ADR-0040 limits `next-ready` to build resumption. The E3 readers do not call `next-ready`, except in the spy test. Decision needed: confirm that the readers stay off `next-ready`, and that `goal.json` changes in E4.
6. **Regenerate entry point.** The port contract names `regenerate_status_files(program)`. The module signature takes `plans_dir`, so the port method must find the directory from its config. Decision: keep the module function and let the port method delegate. Recommend this path, because `plans_dir` belongs to the files layout, not to the record.
7. **Readers call Python, not the CLI.** `03-program-design.md` does not state how the readers reach the port. This design has them import from `shared/`. Decision: confirm the import path, which keeps the CLI for agents and scripts that run outside Python.
8. **Regenerate writes to the plans tree.** `regenerate` writes files, not port records. A caller that passes the files adapter reads and writes the same tree. Decision: allow it in E3, and refuse only the `None` case. Recommend that E3 keep this rule, and that E4 slice 14 check it.
9. **E2 clone check and E3 ordering.** The `04-slices.md` row for E2 says the Dolt-in-git clone check "gates this epic". It names E2 as that epic. `03-program-design.md` least-confident #1 says a failed E2 slice 9 keeps E2 open. Neither source says E3 waits on E2 slice 9. This design lets E3 proceed without it. Decision needed: confirm that E3 does not wait on E2 slice 9.
10. **Projector order.** Golden comparisons depend on entity order. A change to iteration order breaks every golden test at once. Slices 10 and 11 sort entities by `id` before they compare.
11. **ADR-0040 `set_pull_request_state` lacks a `ref` key.** The E3 readers use `list_pull_requests` and the `pr` kind. They do not call `set_pull_request_state`. The gap belongs to E4. Noted here for the signature list.
