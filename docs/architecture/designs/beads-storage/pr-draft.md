# envisioned PR: beads-storage

## Summary

A tracker port in `shared/tracker/` sits between CoBuilder and the task system (ADR-0040). Beads v1.3.0 is the first adapter and the master of programs, epics, slices, and pull requests (ADR-0031). The proposed central store is Dolt-in-git (`refs/dolt/data`), synced with `bd sync`. The cloud clone case is not verified. Every other record stays a file.

## Motivation

Slice state, scores, and attempts live in markdown tables today, and epic joins are hand-kept. Work runs on a local machine, in cloud sessions, and with a team, so the backlog and the program states drift apart. The engineer also does not want CoBuilder coupled to beads, because Linear and Jira may follow. The goal has two cases. A fresh session finds a program and its stage with one `list-programs` call and zero file reads. A session that resumes a build finds the next slice with one `next-ready` call and zero file reads. On beads, that second call is `bd ready`. A test must show both.

## Changes

1. **The port.** `shared/tracker/` holds the neutral `TrackerRecord` (with an `assignee`, a GitHub login) and the `TrackerPort`. The port has `next_ready(kind="slice", under=None)`, `sync`, `claim_slice`, `escalate`, `open_pull_request`, `set_pull_request_state`, and `capabilities()`. The directory also holds the one projector, a `fake` adapter, a read-only `files` adapter, and one contract test for every adapter. The fake adapter loads checked-in fixtures from `tests/fixtures/tracker/`. E1 ships alone, and its projector matches `data/index.json` offline.
2. **The beads adapter and the seed.** `shared/beads_seed.py` seeds programs, epics, slices, and pull request issues by `external_ref`, and only creates. It covers every plan with a `04-slices.md` and the status-only plan `skill-collision-fix`. It runs `bd init --skip-agents --skip-hooks`, writes the gate scalars, and derives its counts at run time. The cloud clone smoke check gates E2.
3. **The read model.** `build_index.py`, `build_builds_view.py`, and `verify_gate.py` read through the port and the projector. The stateful file sections generate from the tracker. The viewer and `data/index.json` keep their shapes.
4. **The write model.** The implement and architect procedures and scripts write state only through the port, and every state write needs a configured adapter. A pull request is its own issue (`cb.kind = pr`, `external_ref gh-<n>`) that blocks each epic it holds. A human closes it at the merge, until `gh:pr` automation lands. Gates 1 to 4, Gate 2b, and 4a to 4c are flat scalar fields on the program issue. `goal.json` `epics[]` stops carrying `branch`, `pr`, and `state`.
5. **One config file** names the adapter. The proposed name is `.cobuilder/tracker.yaml`.
6. **The tracker CLI and the shared reference.** `shared/tracker.py` is the one command that agents call. It has one subcommand for each port operation and `doctor`. It prints JSON, and it exits 2 when it has no adapter. `shared/tracker-usage.md` teaches it. E1 builds both over the fake and files adapters. E2 writes the beads adapter notes. E3 switches the readers to `next-ready`. E4 adds a "Workflow state" section to the `SKILL.md` of architect, implement, pr, and artifact.

## Out of scope

- The Linear and Jira adapters. Each is a later program, `tracker-linear` or `tracker-jira`, and starts with a live-account smoke test of the unknown rows in the exploration note.
- The thread ledger, the Hindsight initiative pages, ADR issues, options, review, and maintenance records, the `gh:pr` automation, and any viewer change.

## Open and unverified

- A cloud session that holds only a git clone, running `bd init` and `bd sync` against `refs/dolt/data`, is not verified. The smoke check must pass before E2 closes.
- Whether `bd claim` is atomic is not verified. No tracker gives a verified atomic claim.
- The Linear and Jira rows of the exploration note need live accounts. How Linear and Jira resolve a GitHub login to a user is not verified.
- The port has no snapshot. A Linear or Jira adapter may cache inside itself, and the later programs decide.
- A pull request issue shows in `bd ready` until a human closes it, so consumers filter on `metadata.cb.kind`.
- `scripts/export-agent-skills.sh` now copies `shared/` and rewrites its paths, so a harness other than Claude Code can receive the reference and the CLI. It needs `uv`, and no other harness has run the copy.
- A gate that does not apply may store the value `n/a`. This is a leaning, and ADR-0031 lists it as not decided.

## Test plan

- Run one contract test suite against every adapter. It checks that `next_ready` skips pull request and deferred items, and that it returns the right records for each kind and for `under`. When `atomic_claim` is false, it checks that `claim_slice` reads back the assignee. It also checks that the envelope round trip compares values, runs the capability-gated paths, and blocks two epics with one pull request issue.
- Feed the fake adapter from the checked-in fixtures in `tests/fixtures/tracker/`: one program with gate scalars, three epics, three slices, and one pull request record. The projector test compares the golden `expected-index.json` value by value. A miniature `docs/plans` tree feeds the files adapter. No test reads the live repo's plans.
- Project a record list from the fake adapter and one from beads, and assert the same index. Project the files adapter alone against the current index, offline.
- Seed a repo copy and compare projected counts with the current index.
- Round-trip one envelope through `bd create`, `bd update`, `bd export`, and `bd list --json`, and compare every value and every list item.
- Close slice n and assert `bd ready` names slice n+1. Run `next_ready` with the file sources removed, and assert one call names the next slice.
- Assert that a write with no configured adapter fails, and that no script outside `shared/tracker/` calls `bd`.
- Create one pull request issue that blocks two epics, and assert `bd ready` hides both until `bd close`.
- Write the gate scalars on a program issue and assert `bd show` returns them unchanged.
- Run `bd sync` from a second clone and assert it sees the same programs, epics, and slices.
- Byte-compare the viewer `index.html`, and assert that no `goal.json` `epics[]` carries `branch`, `pr`, or `state`.
- Run `tracker.py` over the fake adapter: stdout holds JSON, a write with no adapter exits 2, and bad arguments exit 4.
- Run the proposed `tests/test_tracker_docs.py`. The reference exists, and the four `SKILL.md` files name it. Every `tracker.py` operation in a document is a listed subcommand. Only the beads notes name `bd`, and the reference is in `AUTHORING_REFERENCES`.
- Run the full existing suite. The index byte-comparison test covers the read model.
