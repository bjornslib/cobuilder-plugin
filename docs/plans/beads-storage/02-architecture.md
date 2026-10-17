# Architecture: beads-storage

## Fit

The program adds one seam between the workflow scripts and the task system. ADR-0040 decides the seam. The seam has five parts.

- `shared/tracker_port/` (new package). It holds the neutral `TrackerRecord`, the `TrackerPort` protocol, the one `Projector`, and three adapters: `fake` and `files` in E1, and `beads` in E2.
- `shared/tracker.py` (new file). It is the one command that agents call. It parses arguments, calls the port, and prints JSON.
- `shared/tracker-usage.md` and `shared/tracker-adapter-beads.md` (new reference files). They teach the command and the beads mapping.
- `shared/beads_seed.py` (new file). It seeds a beads store from the files of `docs/plans`.
- The readers that exist today. `shared/build_index.py`, `shared/slice_table.py`, `shared/gate_status.py`, `plugins/implement/scripts/verify_gate.py`, and `plugins/artifact/scripts/build_builds_view.py` read through the port and the projector after E3. `shared/slice_table.py` stays as the parser that the `files` adapter uses.

The four main skills of architect, implement, pr, and artifact gain a "Workflow state" section that names `shared/tracker.py`. The `implement` plugin keeps its existing scripts. This design adds no new plugin and no MCP server, which follows CLAUDE.md principle 5.

## Endpoints

None. This program adds no HTTP endpoint and no route. The viewer keeps its existing `data/index.json` contract. The viewer source does not change.

## Data

**Neutral record.** `TrackerRecord` has these fields: `id`, `kind` (`program`, `epic`, `slice`, `pr`), `parent`, `blocked_by`, `lifecycle` (`open`, `in_progress`, `closed`), `assignee` (a GitHub login), `envelope`, and `external_ref`.

**Envelope.** The envelope holds scalars, paths, and lists of paths. On beads it sits under `metadata.cb`, with a version key `v`. A flat-slot adapter encodes a list as a JSON string. A slice envelope holds the score, the attempt count, and the paths of its evidence. A program envelope holds the gate fields (`gate1` to `gate4c`) and the view route of each gate.

**Record kinds.** `types.custom = program` is the only custom type on beads. Epics use the `epic` type. Slices use the `task` type. Pull request records use the `task` type, with `cb.kind = pr`. The `kind` field tells the three task-type records apart.

**Fixtures.** The tests read only checked-in fixtures under `tests/fixtures/tracker/`:

- `corpus/` holds one program, three epics, one pull request record that blocks two epics, one deferred epic, and three slices in a ladder.
- `expected-index.json` holds the golden projection of `corpus/`.
- `plans/` holds a miniature `docs/plans` tree for the `files` adapter.
- A recorded `bd` JSON transcript holds the output of `bd list --json` for the beads adapter tests.

**Derived output.** `data/index.json` stays derived. The projector writes it, and no adapter writes it.

## Flow

1. A reader calls `shared/tracker.py <operation>`. The command reads the config file and selects one adapter.
2. The adapter maps the tracker's own records to `TrackerRecord` values.
3. For a read, the projector turns the records into entities and joins. The command prints the result as JSON on stdout.
4. For a write, the adapter sends the change to the tracker. When `atomic_claim` is false, the adapter reads the assignee back and checks the claimant.
5. With no configured adapter, every write exits 2. Bad arguments exit 4. An adapter error exits 3.
6. At session end, `tracker.py sync` and `tracker.py regenerate-status-files` write the state lines of the status files. The status files stay readable without the tracker.

## External

- **bd** (beads, version 1.3.0, the version that the design tested). Only `shared/tracker_port/` calls it. The beads adapter runs `bd init --skip-agents --skip-hooks` after explicit consent (E2).
- **Dolt in git.** The store syncs through `refs/dolt/data`. A cloud session that holds only a git clone must run `bd init` and `bd sync` with no error before E2 closes. The check is not verified yet, so E2 slice 9 runs it.
- **gh.** Pull request facts stay on GitHub (ADR-0029). The `pr` record holds only the link and the blocking state.
- **Linear and Jira.** These adapters are later programs (`tracker-linear`, `tracker-jira`). This design does not build them. The port keeps the capability flags that they need.
- **Config file.** `.cobuilder/tracker.yaml` names the adapter and its settings. This design confirms the name as its decision. The design adds no environment variable.
