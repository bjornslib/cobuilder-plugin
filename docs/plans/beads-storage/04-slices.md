# Slices: beads-storage

Gate 4a for the whole program. The slices cover five epics, E1 to E5. Slice numbers run 1 to 22 across the program. Epic E5 is a proposal until the engineer approves it. The epic designs for E2 to E4 come later, at their own Gate 4 run. Gate 4b and 4c stay pending.

Test command for each slice: `uv run pytest tests -q`. Run it once after the implementation, not in each slice.

Rubrics path: `.cobuilder/rubrics/beads-storage/`.

## What makes a slice here

Each slice ends in one thing that a test asserts or a reader sees. A slice never says "add the types" or "add the adapter". Each slice crosses the layers it needs, from the command to the stored state. The ladder inside an epic runs from the simplest observable end to the next one. E1 slice 1 is the tracer bullet. It proves the seam with the fake adapter, the projector, and one contract case.

## Program slices

| | Epic | Slice | Ends with | Score | State |
|---|---|---|---|---|---|
| | **`beads-storage/E1` — The tracker port.** The neutral record, the port, one projector, the fake and read-only files adapters, the `tracker.py` command over them, the usage reference, and the backfill reference. Every test reads checked-in fixtures. | | | | |
| 1 | `beads-storage/E1` | **Tracer bullet: fake adapter and golden index** | A test loads the fixture corpus through the fake adapter, matches `expected-index.json`, and one next-ready case passes. | 1 (attempt 1) | done |
| 2 | `beads-storage/E1` | **Full contract suite on the fake adapter** | Contract cases 1 to 6 pass on the fake adapter, and a write with no configured adapter exits 2. | 1 (attempt 2) | done |
| 3 | `beads-storage/E1` | **Files adapter reads the plans tree and backfill dry run** | The files adapter lists the miniature plans tree and projects it to the same index shape as the fake corpus with no `bd` on the path, and every state write it receives exits 2. The backfill dry run on the fake adapter lists the creates, the list equals a checked-in file, and a second run creates nothing. The reference `shared/tracker-backfill.md` names each of its seven steps. | 1 (attempt 1) | done |
| 4 | `beads-storage/E1` | **Command prints JSON and exit codes** | `shared/tracker.py list-programs` prints the corpus as JSON, and the CLI test shows exit codes 0, 2, 3, and 4. A spy shows zero opens of `docs/plans` during `list-programs` and `next-ready`. With `--state-file`, a write in one call shows in the next call. | 0.92 (attempt 1) | done |
| 5 | `beads-storage/E1` | **Usage reference matches the command** | A reader runs each example in `shared/tracker-usage.md` and gets the output that the reference shows. | 1 (attempt 3) | done |
| | **`beads-storage/E2` — The beads adapter.** The beads adapter, the `seed-from-files` dry run, the `bd init` consent step, the Dolt-in-git clone check that gates this epic, and the beads notes. | | | | |
| 6 | `beads-storage/E2` | **Beads reads match the fake adapter** | The beads adapter maps the recorded `bd list --json` transcript to the same records as the fake corpus, the read cases pass, and contract case 7 (projector parity) passes. | 1 (attempt 2) | done |
| 7 | `beads-storage/E2` | **Beads writes on recorded transcripts** | The beads write cases pass on recorded transcripts, including the claim read-back and the `metadata.cb` value round trip. Closing slice n makes slice n+1 the answer of `next-ready`. | 1 (attempt 5) | done |
| 8 | `beads-storage/E2` | **Beads dry run matches the backfill file** | The beads adapter implements `seed-from-files`. On the recorded transcripts, its dry run lists the same creates as the checked-in file of slice 3. | 1 (attempt 2) | done |
| 9 | `beads-storage/E2` | **Fresh clone initializes, syncs, and seeds** | After explicit consent, the first publish runs `bd sync -y`, one `bd dolt push`, and `bd sync`, which exits 0. A fresh git clone runs `bd init --skip-agents --skip-hooks` and `bd sync` and sees the state. The backfill's write step then seeds the miniature plans tree there. A second run creates nothing, and the `bd list --json` count equals the dry-run count. The command output is pasted into the slice evidence. | 1 (attempt 1) | done |
| | **`beads-storage/E3` — The read model.** The build, the gate check, the builds view, and the status-file writer read through the port and the projector. | | | | |
| 10 | `beads-storage/E3` | **Bundle index unchanged after the port** | `build_index.py` writes the same `data/index.json` for this repo as before the change, and the viewer `index.html` is byte equal. | 1 (attempt 3) | done |
| 11 | `beads-storage/E3` | **Gate check and builds view read the port** | `verify_gate.py` and `build_builds_view.py` return the same result for every plan under `docs/plans` as before the change. | 1 (attempt 3) | done |
| 12 | `beads-storage/E3` | **Status files regenerate from records** | Regenerating the fixture corpus writes `00-status.md` and `04-slices.md` files that equal their golden files. | 1 (attempt 1) | done |
| | **`beads-storage/E4` — The write model.** The four main skills write state through the command, the goal file loses its epic state fields, and a test guards the docs. | | | | |
| 13 | `beads-storage/E4` | **Implement writes slice state** | A fixture slice run writes its claim, attempts, score, and state through `tracker.py`, and the status file shows the new score. | 0.97 (attempt 1) | done |
| 14 | `beads-storage/E4` | **Architect writes gate values** | A fixture program records each gate value and the program stage through `tracker.py`, and the status file shows each approval date. | 0.95 (attempt 1) | done |
| 15 | `beads-storage/E4` | **Pull request blocks two epics** | A pull request record blocks two fixture epics until its state is set to merged, and then both epics show as ready. | 0.93 (attempt 1) | done |
| 16 | `beads-storage/E4` | **Goal file drops epic state fields** | `goal.json` holds no `branch`, `pr`, or `state` key after the migration, and the artifact view lists the same epics. | 0.97 (attempt 1) | done |
| 17 | `beads-storage/E4` | **Docs test guards the port and install asks first** | `tests/test_tracker_docs.py` passes on this repo, and it fails when a `bd` call appears outside `shared/tracker_port/`. The install command runs the backfill dry run after adapter config and asks for consent before any write. | 0.97 (attempt 1) | done |
| | **`beads-storage/E5` — Beads-native features.** Atomic claim, native ready, a pull request gate, and the slice-loop formula. It starts after E4. The engineer chose options A and B of `epic-E5-design.md`. | | | | |
| 18 | `beads-storage/E5` | **Spike: claim flags, exit codes, lease expiry** | The beads notes list each flag set, exit code, and lease result, with the command that produced it. | 1 (attempt 1) | done |
| 19 | `beads-storage/E5` | **Atomic claim** | Contract case 3 passes on beads with one write, and eight concurrent claims give one winner. | 1 (attempt 1) | done |
| 20 | `beads-storage/E5` | **Native ready, with parity** | Ready parity holds for each kind on the recorded corpus, and contract cases 1 and 2 pass on beads. | 0.92 (attempt 1) | done |
| 21 | `beads-storage/E5` | **Pull request gate** | The gate resolves when the pull request merges, and the slice 15 test stays green. | 1 (attempt 1) | done |
| 22 | `beads-storage/E5` | **Slice-loop formula** | The formula cooks and pours, a failed attempt adds a wisp, and squash with `--keep-children` keeps the attempt history. | 1 (attempt 1) | done |

## Escalation and order

- Each epic runs in order, E1 then E2 then E3 then E4 then E5. E2 does not start until E1 slice 5 closes. E3 does not start until E1 slice 5 closes, because the read model runs on the files and fake adapters. E4 does not start until E3 slice 12 closes. The Dolt clone check of E2 slice 9 gates the close of E2 and of the program. A failure of that check returns the decision to the engineer.
- Plugin version bumps land in the first E4 slice of each plugin: implement at slice 13, architect at slice 14, pr at slice 15, artifact at slice 16, and cobuilder-full-lifecycle at slice 17. `plugin.json` and `marketplace.json` change together. The `implement:start` pointer to the backfill reference lands in slice 13.
- An escalation goes to `## Escalated` in `00-status.md`, as the build skill directs.
