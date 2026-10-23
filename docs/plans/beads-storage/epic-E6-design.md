# Epic Technical Solution Design: E6, Formula-driven slice loop on beads

Feature: beads-storage
Epic ID: E6
Status: proposed. The slices E6-1 to E6-6 are local numbers, and they are not yet in `04-slices.md`.

## Decisions and results

The engineer decided these five points. Do not reopen them.

1. E6 is a new epic in the `beads-storage` goal. It has this design document.
2. `tracker.yaml` gets the key `wisps: true|false`. When the key is absent, it means true for the beads adapter and false for the files and fake adapters. The config loader checks it as it checks `sync`.
3. Three port operations use the formula only when `wisps` is true:
   - New `start-slice-loop <slice-id>` installs the formula into `.beads/formulas/slice-loop.formula.toml` when it is missing, and cooks when needed. It pours ONE molecule for the slice. The call is idempotent. The molecule is found again through `bd list --metadata-field slice=<bd id>`. It is linked by `bd update <root> --set-metadata slice=<slice bd id>`.
   - `record-attempt` also adds an ephemeral wisp child of the slice molecule.
   - `set-slice-state <id> closed` squashes the molecule with `--keep-children` and a `--summary` built from the recorded attempts. Then it closes the root.
4. When `wisps` is false, by key or by adapter default, `start-slice-loop` exits 4. The message names the key `wisps`, and the adapter makes no bd call. `record-attempt` and `set-slice-state` keep their current behavior without the formula.
5. `slice-loop.md` states that the formula path depends on the config file.

The engineer also chose default-on for beads. Every beads repo gets the cost of four or more rows per slice at once. The rollback is `wisps: false`.

The decision record is ADR-0043. It amends ADR-0040 and refers to ADR-0042.

## Challenge

This is design stage 4. Each risk cites an ADR. The evidence lines come from the spike on bd 1.3.0 in `/tmp/e6-spike.md`. The numbers in brackets are the spike sections.

1. **Wisps never sync (ADR-0042, ADR-0040).** A wisp for each attempt is local to one machine. Evidence: "Wisps did NOT arrive. `bd mol wisp list` in clone 2: `No wisps found`" [1]. The durable attempt history stays in the slice envelope and in the `--summary` of the squash digest, which syncs. Evidence: "the digest and the closed steps arrived in clone 2 after `bd sync`. The kept attempt wisps did not arrive" [5].
2. **Each pour makes a new molecule (ADR-0040).** Poured molecules sync, so a duplicate spreads to every clone. Idempotence is mandatory. Evidence: "Pour has no idempotency. Each `bd mol pour` makes a new molecule (4 issues). Two pours for one slice give two roots with the same metadata" [2].
3. **`bd mol pour` has no `--parent` (ADR-0031).** Evidence: "`bd mol pour --parent`: exit 1, `Error: unknown flag: --parent`" [2]. The link is `bd update <root> --set-metadata slice=<bd id>`, and the lookup is `--metadata-field`. A crash between the pour and the metadata write leaves an unlinked root. The step titles `RED <slice id>` find it [2].
4. **bd never commits or syncs the formula file (ADR-0042).** Evidence: "`.beads/formulas/` did not arrive in clone 2" and "`bd sync`/`bd dolt push` do not carry it" [1, 4]. Each clone needs its own copy. `tracker.py prepare` and `start-slice-loop` both install it. The name must end in `.formula.toml` [4].
5. **Poured rows are foreign (ADR-0031).** Evidence: "No `cb` key, so `_is_cb_row` is False and the adapter treats all four rows as foreign" and `doctor_details()` gave `foreign_issues: 4` [3]. The foreign count rises by four or more for each slice: the root, three steps, and one digest. Slice E6-3 adds a separate count of formula rows, so `doctor` shows foreign rows and formula rows apart. A script must never write a `cb` key on these rows. Evidence: a `cb` dict without `v: 1` raised `AdapterError` on every read [3].
6. **`bd mol` exits 0 for a bogus subcommand (ADR-0040).** Evidence: "`bd mol bogus` also exits 0 and prints the mol help" [6]. The probe is `bd mol seed slice-loop`, which exits 1 when bd lacks the formula or the group [6].
7. **A failed probe is an adapter fault, not a bad argument (ADR-0040).** When `wisps` is true on beads and the probe fails, the adapter raises `AdapterError`, and the CLI exits 3. Exit 4 is only for the false key. The caller must not read exit 3 as a request to turn the key off.
8. **Default-on costs every beads repo at once (ADR-0031).** Each slice adds four or more rows, and a digest. The engineer chose this. The rollback is `wisps: false`.
9. **The name `wisps` is too narrow.** It covers formulas, molecules, and wisps. This is a naming gap. It is recorded, and it is not fixed here.
10. **The list limit (ADR-0031).** `LIST_ARGS` has the bd default of 50 rows [3]. Four or more rows per slice make a hidden `cb` row more likely. This risk exists today, and E6 makes it worse. See Risks.

### Alternatives

| Option | Rejected because |
|---|---|
| No formula at all, E5 file only | The file stays unused. The loop gets no molecule, no wisp, and no digest. |
| One new operation only, `start-slice-loop` | The attempts and the close do not touch the molecule. It never records a result and never closes. |
| Wisps as the only attempt record | A wisp never syncs. A second machine or a restart loses the attempts. |

## Scope and Intent

E6 connects the E5 formula to the port. It adds one config key, one port operation, and a formula path inside two existing operations. It changes the beads adapter, the config loader, the CLI, and the notes. It changes no record shape.

Out of scope: the Linear and Jira adapters, the viewer, and a change of `LIST_ARGS`. A fix of the 50 row limit is a separate decision.

E6 starts after E5 closes. ADR-0040 sets the port. E6 adds one operation to it. ADR-0031 sets the beads mapping, and E6 adds no kind to it. ADR-0042 sets the `sync` key, and E6 adds `wisps` beside it.

## Files Touched

New files:

- `tests/test_tracker_beads_wisps.py`: the `start-slice-loop`, attempt wisp, and squash cases (E6-4, E6-5).
- `tests/test_tracker_wisps_config.py`: the key default and the refusal (E6-2).
- `tests/fixtures/tracker/beads/transcripts/*.json`: one transcript for each new bd call. E6 adds files only.

Modified files:

- `shared/tracker-adapter-beads.md`: the spike notes (E6-1) and the formula path (E6-4, E6-5).
- `shared/tracker_port/config.py`: reads `wisps` (E6-2).
- `shared/tracker_port/port.py`: adds `start_slice_loop` (E6-2, E6-4).
- `shared/tracker_port/fake.py`, `files.py`: raise the refusal (E6-2, E6-4).
- `shared/tracker_port/beads.py`, `bd_runner.py`: install, probe, pour, link, wisp, squash (E6-3 to E6-5).
- `shared/tracker.py`: adds the subcommand `start-slice-loop` and `prepare` installs the formula (E6-3, E6-4).
- `shared/tracker-usage.md`: the moment row and the `wisps` key (E6-6).
- `plugins/implement/skills/build/references/slice-loop.md`: the formula path and its config dependency (E6-6).
- `plugins/implement/commands/install.md`: one note (E6-6).
- `plugins/implement/hooks/` reminder text: one line about `start-slice-loop` (E6-6).

Not touched: `record.py`, `projector.py`, and the E1 contract cases. A formula row never enters a record.

## Types & Signatures

Config key, in `.cobuilder/tracker.yaml`:

```yaml
wisps: true   # true | false. Absent: true for beads, false for files and fake.
```

Port operation and loader:

```python
def start_slice_loop(self, id: str) -> TrackerRecord: ...   # returns the slice record
def load_adapter(config_path, repo_root, state_file=None) -> TrackerPort | None: ...  # reads wisps
```

CLI:

```
uv run shared/tracker.py start-slice-loop <slice-id>
```

Adapter helpers in `bd_runner.py`:

```python
def probe_argv() -> list[str]: ...                          # bd mol seed slice-loop
def pour_argv(slice_id: str) -> list[str]: ...              # bd mol pour slice-loop --var slice_id=... --json
def link_argv(root: str, slice_bd_id: str) -> list[str]: ...  # bd update <root> --set-metadata slice=<id> --json
def find_molecule_argv(slice_bd_id: str) -> list[str]: ... # bd list --json --all --metadata-field slice=<id> -n 0
def attempt_wisp_argv(root: str, title: str) -> list[str]: ...  # bd create <title> --ephemeral --parent <root> --json
def squash_argv(root: str, summary: str) -> list[str]: ...  # bd mol squash <root> --keep-children --summary ... --json
```

Error kinds and exit codes:

| Case | Error | Exit |
|---|---|---|
| `wisps` false, `start-slice-loop` | refusal that names the key `wisps`, no bd call | 4 |
| `wisps` true on beads, probe fails | `AdapterError` with the bd stderr text | 3 |
| `wisps` is not a boolean | `AdapterError` from the loader | 3 |
| No adapter configured | `NoAdapterError` | 2 |
| Slice not found | existing error | as today |

## Slice Decomposition

The numbers E6-1 to E6-6 are local to this epic. The engineer assigns the global numbers when the rows move to `04-slices.md`.

| Slice | Name | Depends on | Files | Ends with |
|---|---|---|---|---|
| E6-1 | Spike notes into the adapter notes | E5-5 | `shared/tracker-adapter-beads.md` | The notes hold each spike finding with its command and result |
| E6-2 | The `wisps` key and the refusal | E6-1 | `config.py`, `port.py`, `fake.py`, `files.py`, `tracker.py`, `test_tracker_wisps_config.py` | The key defaults by adapter, and `start-slice-loop` on a false key exits 4 with no bd call |
| E6-3 | Formula install, probe, formula-row count | E6-2 | `beads.py`, `bd_runner.py`, `tracker.py`, transcripts | `prepare` installs the formula. `doctor` runs the probe and counts formula rows apart from foreign rows |
| E6-4 | `start-slice-loop` on fake and beads | E6-3 | `beads.py`, `bd_runner.py`, `fake.py`, `test_tracker_beads_wisps.py` | One molecule for each slice, a second call finds it, and the root carries `slice` |
| E6-5 | Attempt wisp and squash on close | E6-4 | `beads.py`, `bd_runner.py`, `test_tracker_beads_wisps.py` | `record-attempt` adds a wisp, and a close squashes with a summary and closes the root |
| E6-6 | Docs, reminder, usage, install note | E6-5 | `slice-loop.md`, `tracker-usage.md`, hook reminder, `install.md` | The docs name the key and the config dependency, and `tracker.py --help` lists the operation |

### Slice E6-1: spike notes

Input: `/tmp/e6-spike.md`.

Assertions: the notes list the six spike areas: sync, link, foreign rows, formula location, squash, and failure modes. Each finding names its command and its exit code.

Pass conditions: the notes state the bd version, 1.3.0. No code changes in this slice.

### Slice E6-2: the `wisps` key and the refusal

Input: the config loader and the three adapters.

Assertions: with no key, beads reads true, and files and fake read false. A non-boolean value raises `AdapterError`. `start-slice-loop` on a false key exits 4, names `wisps`, and runs no bd call.

Pass conditions: the test replaces `BdRunner` with a runner that fails on any call, and the refusal test passes. The CLI lists the subcommand.

### Slice E6-3: install, probe, formula-row count

Input: the formula file and the failure table of the spike.

Assertions: `prepare` copies the formula to `.beads/formulas/slice-loop.formula.toml` when it is missing, and keeps an existing copy. The probe is `bd mol seed slice-loop`. On a failed probe with `wisps` true, the adapter raises `AdapterError`. `doctor` reports the formula rows in a separate count.

Pass conditions: a transcript test shows the probe argv. The doctor test shows that a root, three steps, and a digest count as formula rows, and that other rows without a `cb` key stay foreign.

### Slice E6-4: `start-slice-loop`

Input: a slice record and a workspace with the formula.

Assertions: the first call pours one molecule and sets `slice=<slice bd id>` on the root. A second call finds the molecule through `--metadata-field` and pours nothing. An unlinked root from a crash is found by the step title and linked. No row gets a `cb` key. On the fake adapter with `wisps` true, the call returns the slice record and keeps its state.

Pass conditions: the live test counts the roots for the slice after two calls and finds one. It skips without `bd`.

### Slice E6-5: attempt wisp and squash on close

Input: a slice with a molecule.

Assertions: `record-attempt` writes the envelope as today and adds one ephemeral child of the molecule. The close builds a summary from the recorded attempts, with each score and note. It runs `bd mol squash <root> --keep-children --summary <text> --json`, and then closes the root. With no molecule, the close behaves as before. With `wisps` false, both operations behave as before.

Pass conditions: the live test shows a digest whose description holds the summary, and a second clone that reads the digest after `bd sync`. The attempt wisps are not expected in the second clone.

### Slice E6-6: docs, reminder, usage, install note

Input: the existing `slice-loop.md`, the usage guide, the reminder, and `install.md`.

Assertions: `slice-loop.md` says that the formula path needs the config file and the `wisps` key. The usage guide adds the key and the moment row. The reminder names the operation. The install note says that default-on adds rows and that `wisps: false` is the rollback.

Pass conditions: every tracker.py operation that a doc names is a subcommand in `tracker.py --help`. The docs name no bd command outside the adapter notes.

## Test Plan

- E6-1: no suite test. The evidence is the notes.
- E6-2: a unit test of the loader and the CLI over the fake adapter. It needs no `bd`.
- E6-3: a transcript test for the probe and the install, and a doctor test over recorded rows.
- E6-4, E6-5: a live test in a scratch workspace. It skips without `bd`. A recorded transcript covers each argv.
- E6-6: the existing reference checks in `tests/` run unchanged.
- The main session runs `uv run pytest tests -q` once, after all edits.

## Risks & Open Questions

1. **The list limit of 50 rows.** `LIST_ARGS` has no `-n 0`. Four or more rows per slice make a hidden `cb` row more likely. The find call in E6-4 passes `-n 0`. A caller that omits `--limit` can still miss rows. Open: the engineer decides if `LIST_ARGS` gets `-n 0` in a separate change.
2. **Two machines pour at once.** Pours sync, and each pour makes a new molecule. Two machines that start the same slice before a sync make two roots with the same `slice` value. Open: the find call must pick one root, for example the oldest, and the doctor must report a duplicate.
3. **bd versions below 1.3.0.** The spike ran on 1.3.0 only. An older bd without the `mol` group is not observed. The probe fails and gives exit 3 with the bd text. The notes pin 1.3.0.
4. **Default-on cost.** Every beads repo gets four or more rows per slice. The engineer chose it. The rollback is `wisps: false`.
5. **The name `wisps`.** It covers formulas, molecules, and wisps. Noted, not fixed.
6. **The root may stay open.** In the spike, the root stayed open with open wisp children. The close in E6-5 closes the root itself, and does not rely on auto-close.
7. **A crash between pour and link.** E6-4 handles it by the step title. Open: the title holds the slice id as the E5 formula writes it. A change of the formula title breaks the recovery.
8. **Wisps are local.** A second machine does not see the attempts of the first. The envelope and the digest summary are the record.
