# Epic Technical Solution Design: E5, Beads-native features

Feature: beads-storage
Epic ID: E5
Status: built. E5-1 to E5-5 are done. The decisions and results are in the next section.

## Decisions and results

- Options A and B are adopted. Option C is not used.
- The spike corrected an earlier note. `bd update --claim` cannot combine with `--if-assignee`. bd exits 1, not 13. Exit 13 comes only from a guarded plain update. The claim is `bd update <id> --claim --actor <claimant>`, with no `--if-assignee`.
- A lease lasts 5 minutes. An expired lease alone does not free a claim. Only `bd reclaim` frees it. The adapter needs no lease guard.
- `native_ready` stays false. The parity check fails in bd 1.3.0: `bd ready` misses the children of a blocked parent, and it lists the pull request task and the deferred epic. The adapter keeps computing ready. There is no `ready_argv` and no hybrid. The parity evidence is in the transcripts, `tests/test_tracker_beads_ready.py`, and the adapter notes.
- The gate is a mirror that stays beside the pull request blocker. The adapter handles the gate read hazard: `bd list` hides gate rows, and a read skips a `blocks` dependency whose target bd did not list.
- The formula is built. Squash needs `--keep-children` to keep the attempt wisps.

## Proposal for engineer review

This section holds the proposal as the engineer reviewed it. The section above holds the decisions and results. Where the two differ, the section above is correct.

### Goal

Use four Beads features that the E2 adapter does not use yet. The features are atomic claim, native ready, a gate for the pull request merge, and formulas for the slice loop. Each feature needs a check before its flag changes.

### Options

| Option | What it changes | Evidence | Cost |
|---|---|---|---|
| A. Adopt the native features in four slices (E5-1 to E5-4) | Sets `atomic_claim` true with `bd update --claim --if-assignee`. Sets `native_ready` true only after a parity check. Adds a `gh:pr` gate that mirrors the pull request block. | Scratch runs: 8 concurrent claims gave one winner. | Four slices. Touches the E2 adapter and its tests. |
| B. Add a slice-loop formula (E5-5) | Red, green, and validate become formula steps. Each failed attempt becomes a wisp. Squash makes the digest on the slice. | Scratch runs: formulas cook and pour. `close --continue` claims the next step. | One slice. Adds a TOML file and one pointer in E4 slice 13. Squash needs an explicit flag. |
| C. Keep the E2 adapter as it is | No change. The claim keeps the read-back that E2 adds. `native_ready` stays false. | The current contract passes on beads. | No cost. The claim race window stays open until the read-back lands. |

### Recommendation

Decided by the engineer: do both Option A and Option B. Run E5-1 first, because its spike answers the questions that E5-2 to E5-4 need. E5-5 follows after E5-1 to E5-4 close, because it uses the claim and gate results. E5-5 is no longer optional.

### What to drop

- Nothing in E5-5 drops by default. If squash needs a custom digest, the engineer decides in E5-1 how to keep the attempt history.
- The `native_ready` change in E5-3. Keep the flag false. The adapter then computes ready, as E1 does. Drop the change if the parity check finds a difference that Beads cannot close.
- The gate mirror in E5-4. The pull request blocker in ADR-0040 already holds the epics. Drop the gate if it only repeats the blocker.

## Scope and Intent

E5 changes the beads adapter so that it uses four Beads features. The change touches the adapter, its tests, and its notes. The port contract, the CLI, and the skills keep the shape that E4 leaves. E5 adds no subcommand to `shared/tracker.py`.

Out of scope: the Linear and Jira adapters and the viewer. Also out of scope: changes to the port contract in ADR-0040 and to the beads mapping in ADR-0031.

E5 starts after E4 closes. E4 slice 17 is the last program slice. E5-5 changes a file that E4 slice 13 creates or edits, so E5 must wait for E4.

Verified facts. These come from scratch experiments on bd 1.3.0 in this design session. They are not in the test suite.

- Eight concurrent `bd update --claim` calls gave one winner.
- `bd update --claim --if-assignee <login>` does not work. bd refuses the two flags together and exits 1. Exit 13 comes only from a guarded plain update, such as `--status in_progress --assignee <login> --if-assignee <login>`.
- bd has no `bd claim` command.
- `bd ready --mol` lists the molecule root. The adapter must filter that root out.
- The squash command deletes open wisp children by default. Do not rely on the default. Pass `--keep-children`, or write a custom digest.
- Formulas written in TOML cook to protos and pour to molecules.
- `bd close --continue` claims the next step.
- Federation works to a bare Dolt remote once one branch exists on it.

Not verified: lease expiry, timer gates, merge slots, and federation conflicts. E5-1 tests lease expiry. The other three stay out of E5.

## Files Touched

New files:

- `tests/test_tracker_beads_atomic_claim.py`, `tests/test_tracker_beads_claim_real.py` (slow), and `tests/test_tracker_beads_claim.py`. The claim argv, the held claim, and the eight-claim race (E5-2). The slow file needs `-m ''` to run.
- `tests/test_tracker_beads_ready.py`. The ready parity cases (E5-3).
- `tests/test_tracker_beads_gate.py`. The pull request gate case (E5-4).
- `shared/tracker_port/formulas/slice-loop.toml`. The formula (E5-5).
- `tests/test_tracker_beads_formula.py`. The cook, pour, and squash cases (E5-5).
- `tests/fixtures/tracker/beads/transcripts/*.json`. One recorded transcript for each new `bd` case. E2 owns the folder. E5 adds files only, and it changes no existing transcript.

Modified files:

- `shared/tracker_port/beads.py` (E2). Sets the flag values, and adds the claim and gate paths. `native_ready` stays false. E5-2 and E5-4 edit it.
- `shared/tracker_port/bd_runner.py` (E2). Remains the only subprocess call to `bd`. Adds the argument builders for the claim and gate calls (E5-2, E5-4).
- `shared/tracker-adapter-beads.md` (E2). Records the claim flags, the exit codes, the ready rule, the gate, and the spike results (E5-1 to E5-5).
- `tests/test_tracker_beads.py` (E2). Adds one claim case (E5-2) and one gate case (E5-4). It changes no other case.
- `plugins/implement/skills/build/references/slice-loop.md` (E4 slice 13). Adds one pointer to the formula (E5-5 only).

Not touched:

- `shared/tracker_port/record.py`, `port.py`, `projector.py`, `fake.py`, and `files.py` (E1). The record shape and the port contract stay the same.
- `shared/tracker.py` (E1). No new subcommand.
- `shared/tracker-usage.md` (E1). The moment table keeps its rows.
- `tests/test_tracker_contract.py` (E1). Its seven cases run on beads without change.
- `docs/architecture/adr/ADR-0031-*.md` and `ADR-0040-*.md`. An amendment is a separate decision.

## Types & Signatures

E5 adds no public name. The port contract in ADR-0040 and in E1 stays fixed. E5 sets the four values of `Capabilities` in the beads adapter only. E5 adds these private helpers to `bd_runner.py`. E5-1 confirms the exact flag set before E5-2 writes the first helper.

```python
def claim_argv(issue_id: str, claimant: str) -> list[str]: ...
def gate_create_argv(epic_bd_id: str, number: str) -> list[str]: ...
def gate_resolve_argv(gate_id: str) -> list[str]: ...
```

## Slice Decomposition

The numbers E5-1 to E5-5 are local to this epic. The engineer assigns the global numbers when the rows move to `04-slices.md`.

| Slice | Name | Depends on | Files | Ends with |
|---|---|---|---|---|
| E5-1 | Spike: claim flags, exit codes, lease expiry | E4 slice 17 | `shared/tracker-adapter-beads.md`, transcripts | Notes list each flag set, exit code, and lease result, with the command that produced it |
| E5-2 | Atomic claim | E5-1 | `beads.py`, `bd_runner.py`, `test_tracker_beads_atomic_claim.py`, `test_tracker_beads_claim_real.py`, `test_tracker_beads_claim.py` | Contract case 3 passes on beads with one write. Eight concurrent claims give one winner |
| E5-3 | Native ready, with parity | E5-1 | `test_tracker_beads_ready.py`, transcripts, notes | Parity of bd ready fails in bd 1.3.0. The flag stays false, and the evidence is recorded. The adapter matches the projector |
| E5-4 | Pull request gate | E5-3 | `beads.py`, `bd_runner.py`, `test_tracker_beads_gate.py`, `test_tracker_beads.py` | The gate resolves when the pull request merges, and the E4 slice 15 test stays green |
| E5-5 | Slice-loop formula | E5-4, and E4 slice 13 | formula TOML, `test_tracker_beads_formula.py`, `slice-loop.md` | The formula cooks and pours. A failed attempt adds a wisp. Squash with `--keep-children` keeps the attempt history |

### Slice E5-1: spike, claim flags, exit codes, lease expiry

Input: a scratch beads workspace built from the E1 corpus, with no change to the repo.

Assertions: run the claim with and without `--if-assignee`, record the exit code of each case, and record the output of a claim whose lease expires. Save each run as a transcript.

Pass conditions: the notes in `shared/tracker-adapter-beads.md` list every run, and each result states pass or fail. No flag in the adapter changes in this slice.

### Slice E5-2: atomic claim

Input: the claim argument builder and the E1 contract case 3.

Assertions: a claim writes once and stores the claimant. With a different expected assignee, the claim writes nothing, and the adapter reports the conflict as an adapter error (exit 3). The contract case passes with the write-once path.

Pass conditions: the race test shows one winner among eight concurrent claims. The test skips with a reason when `bd` is absent. `Capabilities.atomic_claim` is true for beads only after this slice passes.

### Slice E5-3: native ready, with parity

Input: the ready argument builder and the recorded transcripts of `bd ready` for each kind.

Assertions: the adapter drops the molecule root from the candidates. It applies the pull request rule and the deferred epic rule that bd does not know. Its result equals the E1 result for `program`, `epic`, and `slice`, and for one case with `under`.

Pass conditions: the parity test passes on the recorded transcripts. `Capabilities.native_ready` is true for beads only when this holds. If the parity check fails, the flag stays false, and the notes record the difference.

### Slice E5-4: pull request gate

Input: the pull request record and its two blocked epics, as in E4 slice 15 (`tests/test_pr_tracker_state.py`).

Assertions: `open_pull_request` adds a `gh:pr` gate to each blocked epic. The gate stores the pull request number. `set_pull_request_state(ref, merged)` resolves the gate through `gate_resolve_argv`.

Pass conditions: the gate case passes. The E4 slice 15 test passes without change. A gate that has no stored number stays pending, and the test shows it.

### Slice E5-5: slice-loop formula

Input: the E4 slice 13 procedure in `slice-loop.md`, and the formula TOML.

Assertions: the formula holds the red, green, and validate steps. A failed attempt adds a wisp to the slice. The squash that ends the slice passes `--keep-children`.

Pass conditions: the formula cooks and pours in a scratch workspace. The squash keeps the attempt wisps. `slice-loop.md` gains one pointer to the formula and no copy of its steps.

## Test Plan

- E5-1: no suite test. The evidence is the transcripts and the notes.
- E5-2: the E1 contract cases 1 to 7 run on beads. The race test and the stale claim test are new. Both skip without `bd`.
- E5-3: the parity test reads the recorded transcripts under `tests/fixtures/tracker/beads/transcripts/`. It needs no live `bd`. The live check skips without `bd`.
- E5-4: the gate test reads a recorded transcript. The E4 slice 15 test runs unchanged.
- E5-5: the formula test runs in a scratch workspace. It skips without `bd`.
- Each slice runs its own test file. The main session runs `uv run pytest tests -q` once, after all edits.

## Risks & Open Questions

1. **Lease expiry has no test.** Resolved. The spike observed it: a lease lasts 5 minutes, an expired lease alone does not free a claim, and `bd reclaim` does. The adapter needs no lease guard.
2. **A hybrid ready may not count as native.** Resolved. The parity check fails in bd 1.3.0, so `native_ready` stays false. There is no hybrid and no `ready_argv`. The adapter computes ready.
3. **The gate may repeat the pull request blocker.** Resolved. The adapter keeps the blocker and adds the gate as a mirror. Reads skip the hidden gate rows.
4. **Squash deletes open wisp children by default.** Resolved. The flag `--keep-children` exists in bd 1.3.0, and the slice-loop formula uses it.
5. **The stale claim has no exit code in the contract.** Resolved. A held claim is bd exit 1 with `already claimed by` in stderr. The adapter maps it to `AdapterError`, which the CLI reports as exit 3. No new code was needed.
6. **E5-5 changes an E4 file.** E5 waits for E4, so the pointer in `slice-loop.md` lands on the final E4 text. The engineer confirms that E4 leaves a stable place for the pointer.
7. **Federation conflicts have no test.** E5 does not change federation. The gap stays in the adapter notes.
8. **Beads features may change in later releases.** The notes pin bd 1.3.0. A later release needs a new spike before any flag changes.
