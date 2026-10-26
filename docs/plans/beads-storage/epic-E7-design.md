# Epic Technical Solution Design: E7, Native beads mapping and bd ready

Feature: beads-storage
Epic ID: E7
Status: proposed. The slices E7-1 to E7-8 are global slices 23 to 30 in `04-slices.md`. E6 stays unbuilt and unapproved. The section "How E7 meets E6" says what each epic needs from the other.

## Decisions and results

The engineer decided these nine points. Do not reopen them.

1. **Types.** A program is the native type `feature`. The custom type `program` and the `types.custom` step in `prepare` go away. An epic is an `epic` and a child of the feature. A slice is a `task` and a child of its epic. A pull request record is a `milestone`. It has the non-blocking dependency `tracks` to each epic it holds. No blocking edge runs from a pull request to an epic. The `gh:pr` gate of E5-4 leaves the epic. A gate may come back later, only to block a LATER dependent epic.
2. **Order.** A `blocks` edge links each pair of consecutive slices. A `blocks` edge links each pair of consecutive epics, so E2 is blocked by E1. Children inherit the order natively.
3. **Ready.** `next_ready` for the kind `slice` runs `bd ready -t task [--parent <epic or program>] --json --limit 0`. `native_ready` becomes true when the parity test holds on the corpus. Epics and programs keep a small adapter rule.
4. **Claim.** A new atomic port operation `claim-next [--under <epic or program>] <claimant>` runs `bd ready -t task --claim --actor <claimant> [--parent X]`. It follows the refusal rules of `claim-slice` (exit 3). Nothing ready gives an empty result, and not an error. `claim-slice` stays.
5. **Names.** The engineer asked for an explanation first. The recommendation is in the next section. It is recommended, and open for the engineer at review.
6. **Migration.** A one-time operation `migrate-mapping [--dry-run]` converts an existing tracker. It retypes the programs, rewrites the titles, drops the pull request blocks edges and the gates, adds the `tracks` edges, and adds the missing `blocks` chains. It is idempotent and it runs one sync. A dry run lists the changes. The live trackers are this repo and think-with-ai, with 322 issues in all.
7. **ADR.** ADR-0044 amends ADR-0031 and ADR-0040. It replaces the E5-3 decision (`native_ready` false) and the E5-4 decision (the epic gate).
8. **Epic start.** `claim-next` ALSO sets the epic of the claimed slice to `in_progress` when it is not yet. This is one extra write in the same sync: the adapter finds the claimed slice's parent epic in the rows that it already read, and it runs `bd update <epic bd id> --status in_progress`. It skips the write when the epic is already `in_progress` or `closed`. The claim and the epic write go out in one publish. The earlier recommendation ("no") is replaced by this decision.
9. **Read back through bd.** `TrackerRecord.title`, `description`, `acceptance_criteria`, `design`, and `tracks` are READ from the bd row: the fields `title`, `description`, `acceptance_criteria`, and `design`, and the dependencies of type `tracks`. The record fields are no longer write-only. A lookup by cb id uses `bd list --external-ref <cb id>` (an exact filter), and not a scan of all rows. So `external_ref` must be set correctly on create, on seed, and on migrate. For a program, an epic, a slice, and a design record the code today sets `external_ref` to the cb id (`plan_program.py`, `plan_records.py`, `design_records.py`), and E7 keeps that. For a pull request the code today sets `external_ref` to `gh-<n>` while the cb id is `pr-<n>` (`beads_pull_requests.py`), and E7 keeps that `gh-<n>` convention: the lookup of `pr-<n>` runs `--external-ref gh-<n>`. `migrate-mapping` sets a missing or wrong `external_ref` with `bd update --external-ref`. The flag `--external-ref` on `bd list` is not yet verified on bd 1.3.0, and E7-1 records it as a spike finding.

### The title rule: recommended, open for the engineer at review

The title of each issue now copies the cb id. That id is already in `external_ref` and in `metadata.cb.id`. No adapter code reads the title today. ADR-0031 already maps the slice `title` to the issue title, and it maps the outcome and the done-when text to native fields. The adapter does not follow that text yet.

| Option | Title of a slice | For | Against |
|---|---|---|---|
| **Recommended: the name** | `Native ready for slices` | `bd list` and `bd show` read as a plan. No duplicate of the id. | A person who searches the title by id finds nothing. The title is not unique. |
| Alternative: id and name | `demo/E7-5 — Native ready for slices` | The id shows in every bd view. | A copy of `external_ref` stays. `bd list --title E7-1` is a substring match and also finds `E7-10`. |

Source of the name. A slice takes `row.name` (the envelope already holds it as `title`). An epic takes the text after the dash in its header cell of `04-slices.md`, or the `title` of its entry in `goal.json`. A program takes the `title` of its `goal.json`, and a plan with no design takes the plan folder name. A pull request takes its ref, such as `pr-101`, because ADR-0029 forbids a read of GitHub.

The seed also fills these native fields, only where a file source has the text. A field with no source stays unset.

| bd field | Slice | Epic | Program |
|---|---|---|---|
| `description` | no source, unset | the `outcome` of the `goal.json` entry | the `outcome` of `goal.json` |
| `acceptance_criteria` | the `Ends with` cell, the slice done-when | no source, unset | the `done_when` list, one line each |
| `design` | no source, unset | the path of `epic-<id>-design.md`, when the file exists | the path of the design folder, when it exists |

### Additions by the designer, open for review

- **The label `cb`.** Every cb row gets the label `cb` on create and on migration. A claim through `bd ready` must filter on it. Evidence: an unfiltered `bd ready -t task --claim` claimed a foreign task [spike L71]. With `--label cb` it claimed the cb slice [spike L72]. Labels were unused, and they are a native field.
- **The legacy refusal.** On a tracker in the old mapping, `next-ready` for slices and `claim-next` refuse with a message that names `migrate-mapping`. `doctor` reports `mapping: legacy` or `mapping: native`.
- **The optional flag `--plans-dir`** on `migrate-mapping`. Names and texts come from the files, and the edges do not. Without it, the migration rewrites slice titles from the envelope and leaves the other titles.

### Spike facts

The spike ran on bd 1.3.0 in scratch trackers under `/tmp`. The repo tracker was not used. The full log is `/tmp/e7-spike.md`. The line numbers below are lines of that file. The first group is the verified fact list that the engineer gave. The second group is new.

| # | Fact | Evidence |
|---|---|---|
| 1 | With feature, epic, and task made by `--parent`, `bd dep add E2 E1`, and `bd dep add S2 S1`, `bd ready -t task --json --limit 0` gives `['E1-1']` only. | L13-21 |
| 2 | `bd ready --parent <epic>` filters the descendants. `--parent <program>` reaches depth 2 and gives `['E1-1']`. | L18-19 |
| 3 | A PR milestone with `tracks` to two epics hides no slice. The old PR task with a plain blocker gives `['gh-101']` and hides every slice. | L17, L46, L51 |
| 4 | `bd update <id> --type feature` works on an existing issue. It exits 0, and `external_ref` and `metadata.cb` stay. | L7-8 |
| 5 | `bd update --type milestone` retypes a PR task. `bd update --type bogus` exits 1. | L9-10 |
| 6 | `bd dep rm <epic> <pr>` exits 0, and a second call also exits 0. | L52 |
| 7 | `bd dep rm <epic> <gate>` exits 0. `bd gate resolve <gate>` exits 0. | L53-55 |
| 8 | The PR row lists `dependencies: [{depends_on_id: <epic>, type: "tracks"}, ...]`. The epic row lists nothing for it. | L23-29 |
| 9 | `bd ready -t task --claim --actor X --json` prints a list with ONE issue, `in_progress`, with the assignee. Exit 0. | L32 |
| 10 | Nothing ready, with `--json`: exit 0, stdout `[]`, empty stderr. Text mode: exit 0 and `No ready work to claim`. | L34-35 |
| 11 | A slice held by another claimant gives bob exit 0 and `[]`. bd skips it, and does not refuse. | L37, L39 |
| 12 | Closing the last slice of an epic closes nothing. The epic stays `in_progress`, and the program stays `open`. | L44 |
| 13 | An in_progress epic keeps its children ready and leaves `bd ready -t epic`. | L42-43 |
| 14 | E2 children appear only after E1 closes. A tracking milestone stays in `bd ready` and hides nothing. | L45-46 |
| 15 | A deferred epic hides its children. Its row has `status: deferred`. | L47 |
| 16 | The adapter has no `deferred` in `STATUS_MAP`, so a read of a deferred row raises `unknown status`. | L48 |
| 17 | `bd ready -t task` lists a foreign task first. Only `--label cb` removes it, also for `--claim`. | L70-72 |
| 18 | A past defer date frees the children, and the status word stays `deferred`. | L78 |
| 19 | `bd update --defer ""` clears a defer date. `bd update --status open` does not. | L74 |
| 20 | `bd list --json --all` and `bd ready` returned all 60 rows of a test store. The 50-row limit of the E6 design did not show. | L83-85 |

## Challenge

This is design stage 4. Each risk cites an ADR. The evidence lines come from `/tmp/e7-spike.md`.

1. **Live data moves (ADR-0031, ADR-0044).** The migration touches 322 issues with about 700 bd calls, and a call can fail half way. Every step reads the held state first and acts only on a difference, so a rerun continues. A run in the scratch tracker converted the old mapping and gave `['E1-1']` from `['gh-101']` [L58-62]. The plan: take a `bd export` snapshot to a file outside the repo, run `--dry-run`, run once on one machine, and run `bd sync` on the others. Restoring from the export is not tested.
2. **Hierarchical ids against cb ids (ADR-0031).** A bd id such as `q-445.1.2` carries the position, and the cb id stays in `metadata.cb.id`. Evidence: ids reach depth 3 [L16]. The adapter maps bd ids to cb ids through the envelope, and E7 adds no id rule. The migration edits issues in place, so no bd id changes. A move of a slice to another epic would change its prefix. [INFERENCE] No flow moves a slice today.
3. **The `tracks` edge is invisible to an older adapter (ADR-0040).** The old adapter reads `type == "blocks"` only [L26]. On a migrated tracker it sees a PR with no epics and an epic that nothing blocks. That is harmless. The reverse is the risk: an old adapter on a machine that did not update keeps writing `dep add <epic> <pr>` and creates a `program`. The old `_create` then runs `prepare` and re-adds the custom type. The new adapter detects each legacy row, and a rerun of `migrate-mapping` repairs it. The plugin version bump in both manifests reaches the other machines.
4. **An in_progress epic leaves the ready list (ADR-0040).** Evidence: `bd ready -t epic` gives `[]` for an in_progress epic, and its slices stay ready [L42-43]. The adapter rule for epics is the same as today: open and unblocked. `claim-next` sets the epic `in_progress` itself (decision 8), so a claimed epic leaves the epic ready list at once, with no extra caller step. A later `set-epic-state in_progress` by a caller changes nothing.
5. **Two machines claim through ready (ADR-0042).** `--claim` is atomic in one store. Eight parallel calls gave one winner (E5-1). Two machines can both claim the same slice before a sync, and the merge outcome is not tested. With `sync: async`, a claim reaches the other machines late. `claim-next` publishes as `claim-slice` does. The gap stays in the notes under "Not verified".
6. **The filter that protects the claim (ADR-0031).** Evidence: an unfiltered claim took a foreign task [L71]. A cb row without the label `cb` is invisible to `claim-next` and to native ready. The seed, `create_record`, and the migration all add the label. A test creates a foreign task and a cb slice, and it asserts that `claim-next` claims the slice.
7. **The PR merge has no blocking edge (ADR-0040, ADR-0029).** Before E7, `next_ready(kind="epic")` showed an epic only after the merge. Now the epic stays ready while its PR is open, and the PR milestone hides nothing [L45-46]. The merge order holds through epic close order. The table of ADR-0040 says: merge, then `set-pull-request-state`, then `set-epic-state closed`. E2 waits for E1 to close, not for the merge. The rule moves from a graph edge to a procedure step. Contract case 5 changes to say so.
8. **The deferred status is new to the adapter (ADR-0031).** A deferred epic has the bd status `deferred` [L47-48]. E7 maps the status `deferred` to the lifecycle `open`. An epic whose envelope holds `deferred` gets `bd update --defer <date>` in the seed and in the migration, so bd hides its slices. A past date frees the slices and keeps the word `deferred` [L78]. The fixture date `2026-11-01` of the corpus passes within days. E7-5 moves it to `2099-12-31`, or the live parity test fails on that day.
9. **bd versions (ADR-0031).** The notes pin bd 1.3.0. The flags `--parent` and `--claim` on `ready`, `--label`, `--type tracks`, and `update --type` are verified on 1.3.0 only. On another bd, an unknown flag gives exit 1, and the adapter raises `AdapterError` (exit 3).
10. **E6 formula rows (ADR-0043).** Poured rows are foreign and have no label `cb`. So the label filter also keeps molecule steps out of `claim-next`. [INFERENCE] A step is a `task`, and E6 did not record its type. The next section covers the rest.
11. **A pull request no longer holds an epic in the record (ADR-0040).** `list_pull_requests` must give the epics from the `tracks` edges. A `tracks` edge to an id that bd did not list (a foreign issue) is skipped, as the gate edges are skipped today.
12. **Epics become serial (ADR-0044).** A plan whose epics could run in parallel now waits in order. The engineer decided it. The order is the header order of `04-slices.md`, or the order of `epics[]` in `goal.json`.

### Alternatives

| Option | Rejected because |
|---|---|
| Keep E5 as built, with `native_ready` false | The PR block hides slices. The adapter keeps its own ready rule, and the parity check can never pass. |
| The PR as a `task` with a `tracks` edge | A task PR shows in the task frontier and in the claim queue. A milestone does not. |
| Keep the `gh:pr` gate on the epic | A gate that blocks an epic hides its slices as the blocker does. |
| A custom type `merge-request` for the PR | bd 1.3.0 refuses the name. The built-in `milestone` fits. |
| `claim-next` with no label filter | It claims a foreign task [L71]. |
| A `claim-next` that reads `bd ready` and then runs `claim-slice` | It makes two calls and loses the atomic claim. The engineer chose one call. |

## Scope and Intent

E7 moves the beads adapter to the native bd vocabulary. It changes the types, the titles and text fields, the edges, the ready rule, and the claim. It adds two port operations, `claim-next` and `migrate-mapping`. It changes the record, the fake adapter, the files adapter, and the corpus fixtures, because the epic order and the PR link are record facts.

Out of scope: E6 (the formula path), the Linear and Jira adapters, the viewer, and the 50-row limit. The gates of the program scalars (Gates 1 to 4) stay as scalar fields on the program issue. A gate for a later dependent epic is not built.

E7 starts after E5-5. ADR-0040 sets the port, and E7 adds two operations. ADR-0031 sets the mapping, and E7 changes five of its rows. ADR-0044 holds the decision.

### How E7 meets E6

E6 stays unbuilt and unapproved. E7 does not wait for it, and it does not change it.

| Point | E7 | E6 |
|---|---|---|
| Formula rows | Foreign rows: no `cb` key and no label `cb`. `claim-next`, native ready, and `migrate-mapping` never read or change them. | A poured root and its steps have no `cb` key (ADR-0043). |
| Link to the slice | E7 uses the parent edge for cb rows. | E6 links the root by `metadata.slice=<bd id>`. The two links do not meet. |
| `doctor` | E7-2 adds the field `mapping`. | E6-3 adds the count of formula rows. Both edit `doctor_details`. The second slice to land merges the two. |
| Config | E7 adds no key. | E6 adds `formulas`. |
| Close | E7 does not change `set-slice-state`. | E6-5 squashes the molecule and closes the root. The squash keeps its own rows. |
| Order | E7 needs E5-5. | E6 needs E5-5. Neither needs the other. |

One check for the engineer when E6 starts: the type of a poured step. If it is `task`, the label filter is the only guard. E6-4 should record the type in its transcript.

## Files Touched

New files:

- `tests/test_tracker_beads_mapping.py`: type, title, label, and text fields on create and on read (E7-2).
- `tests/test_tracker_beads_edges.py`: the epic and slice chains, and the PR `tracks` edges (E7-3, E7-4).
- `tests/test_tracker_beads_native_ready.py`: the parity cases (E7-5). It replaces `test_tracker_beads_ready.py`.
- `tests/test_tracker_claim_next.py`: the argv, the empty result, and the foreign task case (E7-6).
- `tests/test_tracker_migrate_mapping.py`: the dry run, the run, and the second run (E7-7).
- `tests/fixtures/tracker/beads/transcripts/*.json`: one transcript for each new bd call.
- `shared/tracker_port/beads_migrate.py`: the migration steps (E7-7).

Removed files:

- `shared/tracker_port/beads_gates.py` and the gate argv in `bd_runner.py` (E7-4).
- `tests/test_tracker_beads_gate.py`, `tests/test_tracker_beads_gate_real.py`, `tests/test_tracker_beads_ready.py`, and the transcripts that only they read.

Modified files:

- `shared/tracker-adapter-beads.md`: the spike notes (E7-1), the mapping sections (E7-2 to E7-4), and the ready and claim sections (E7-5, E7-6).
- `shared/tracker_port/record.py`: the new record fields (E7-2).
- `shared/tracker_port/beads_rows.py`: `BD_TYPE`, labels, `STATUS_MAP`, the legacy check, and the argv (E7-2, E7-5).
- `shared/tracker_port/beads.py`: the read of title, text fields, and `tracks`, native ready, `native_ready` true, `claim_next`, `doctor_details` (E7-2, E7-5, E7-6).
- `shared/tracker_port/beads_writes.py`: `create_record`, `prepare` (E7-2, E7-3).
- `shared/tracker_port/beads_pull_requests.py`: the milestone and the `tracks` edges (E7-4).
- `shared/tracker_port/bd_runner.py`: the new argv builders (E7-2 to E7-7).
- `shared/tracker_port/beads_seed.py`: the text fields and the label on seed (E7-2, E7-3).
- `shared/tracker_port/plan_records.py`, `plan_epic_rows.py`, `design_records.py`, `slice_table.py`: the epic title, the epic order, and the text fields (E7-2, E7-3).
- `shared/tracker_port/fake.py`, `fake_support.py`, `fake_pull_requests.py`: the record fields, the ready rule, `claim_next`, and `tracks` (E7-3 to E7-6).
- `shared/tracker_port/files.py`, `port.py`, `cli_operations.py`, `projector.py`: the two operations and the joins (E7-4, E7-6, E7-7).
- `tests/fixtures/tracker/corpus/*.json` and `expected-index.json`: epics no longer blocked by the PR, and the new `tracks` field (E7-4).
- `tests/test_tracker_contract.py`, `tests/test_pr_tracker_state.py`, `tests/test_tracker_beads.py`: case 5 and the PR cases (E7-4).
- `shared/tracker-usage.md`, `plugins/implement/skills/build/references/slice-loop.md`, `plugins/implement/commands/install.md`, and the hook reminder text: the two operations (E7-8).
- `docs/architecture/designs/beads-storage/goal.json`: the E7 entry and the done-when items.

Not touched by the build: `04-slices.md`, `00-status.md`, the rubrics, the manifest, and the viewer.

## Types & Signatures

The record:

```python
@dataclass(frozen=True)
class TrackerRecord:
    id: str
    kind: Kind
    parent: str | None
    blocked_by: tuple[str, ...]
    lifecycle: Lifecycle
    assignee: str | None
    envelope: Mapping[str, Scalar | tuple[Scalar, ...]]
    external_ref: str | None
    title: str | None = field(default=None, compare=False)               # read from the bd row `title`
    description: str | None = field(default=None, compare=False)         # read from the bd row `description`
    acceptance_criteria: str | None = field(default=None, compare=False) # read from the bd row `acceptance_criteria`
    design: str | None = field(default=None, compare=False)              # read from the bd row `design`
    tracks: tuple[str, ...] = ()   # kind pr only: the epic ids from the `tracks` dependencies
```

Port operations:

```python
def claim_next(self, claimant: str, under: str | None = None) -> TrackerRecord | None: ...   # None: nothing ready
def migrate_mapping(self, dry_run: bool = False, plans_dir: Path | None = None) -> list[dict[str, str]]: ...
# each change: {"id": <cb id>, "action": <retype|title|text|label|unblock|track|chain|defer|gate>, "detail": <text>}
```

CLI:

```
uv run shared/tracker.py claim-next [--under <epic or program id>] <claimant>
uv run shared/tracker.py migrate-mapping [--dry-run] [--plans-dir DIR]
```

Adapter helpers in `bd_runner.py` and `beads_rows.py`:

```python
BD_TYPE = {"program": "feature", "epic": "epic", "slice": "task", "pr": "milestone"}
CB_LABEL = "cb"
def ready_argv(parent_bd_id: str | None = None) -> list[str]: ...        # bd ready -t task --label cb [--parent X] --json --limit 0
def claim_next_argv(claimant: str, parent_bd_id: str | None = None) -> list[str]: ...  # bd ready -t task --label cb --claim --actor C [--parent X] --json --limit 0
def tracks_argv(pr_bd_id: str, epic_bd_id: str) -> list[str]: ...        # bd dep add <pr> <epic> --type tracks
def dep_rm_argv(issue_bd_id: str, target_bd_id: str) -> list[str]: ...   # bd dep rm <issue> <target>
def retype_argv(bd_id: str, bd_type: str) -> list[str]: ...              # bd update <id> --type <type>
def legacy_reasons(rows: list[dict]) -> list[str]: ...                   # empty list: native mapping
```

Results and errors:

| Case | Result | Exit |
|---|---|---|
| `claim-next`, a slice is ready | the claimed record, `in_progress`, with the assignee | 0 |
| `claim-next`, nothing is ready | `{"ok": true, "result": null}` | 0 |
| `--under` names no record | `ArgumentError` | 4 |
| `--under` names a slice or a PR | `ArgumentError` | 4 |
| bd exits non-zero | `AdapterError`: `claim-next refused: <stderr>` | 3 |
| Legacy mapping | `AdapterError` that names `migrate-mapping` | 3 |
| Files adapter | `NoAdapterError` | 2 |
| bd claimed a row with no `cb` block | `AdapterError` that names the bd id, so a person can release it | 3 |
| The epic of the claimed slice is `open` | one extra `bd update <epic> --status in_progress`, then one publish | 0 |
| The epic is already `in_progress` or `closed` | no epic write | 0 |
| `migrate-mapping --dry-run` | the change list, no write | 0 |
| `migrate-mapping` on a native tracker | an empty list, no write, no sync | 0 |

The create and read mapping:

| Kind | bd type | Parent | Edges | Label |
|---|---|---|---|---|
| program | `feature` | none | none | `cb` |
| epic | `epic` | the program | `blocks` to the epic before it | `cb` |
| slice | `task` | the epic | `blocks` to the slice before it | `cb` |
| pr | `milestone` | none | `tracks` to each epic it holds | `cb` |

Native ready, by kind:

| Kind | Source | Rule |
|---|---|---|
| `slice` | `bd ready -t task --label cb [--parent X]` | bd decides. `under` may be an epic or a program. |
| `epic` | the adapter | open, not deferred, every blocker closed, and the program open and unblocked |
| `program` | the adapter | open, not deferred, every blocker closed |

## Slice Decomposition

The numbers E7-1 to E7-8 are local to this epic. In `04-slices.md` they are the global slices 23 to 30, in the same order.

| Slice | Name | Depends on | Files | Ends with |
|---|---|---|---|---|
| E7-1 | Spike notes into the adapter notes | E5-5 | `shared/tracker-adapter-beads.md` | The notes hold each spike finding with its command and exit code |
| E7-2 | Type, title, label, and text mapping | E7-1 | `record.py`, `beads_rows.py`, `beads.py`, `beads_writes.py`, `beads_seed.py`, `bd_runner.py`, `plan_records.py`, `plan_epic_rows.py`, `design_records.py`, `slice_table.py`, `test_tracker_beads_mapping.py` | A created issue has the new type, the name as title, the label, and the text fields. A read returns them. `prepare` sets no custom type. |
| E7-3 | Hierarchy and ordering edges | E7-2 | `plan_records.py`, `design_records.py`, `beads_writes.py`, `beads_seed.py`, `fake.py`, `projector.py`, `test_tracker_beads_edges.py`, corpus fixtures | A seed gives the epic chain and the slice chain, and the deferred epic gets a native defer date |
| E7-4 | Pull request as a milestone with `tracks` | E7-3 | `beads_pull_requests.py`, `beads_gates.py` (removed), `fake_pull_requests.py`, `record.py`, `projector.py`, `test_tracker_contract.py`, `test_pr_tracker_state.py` | A PR holds its epics by `tracks` and blocks nothing. No gate remains. |
| E7-5 | Native ready for slices, with parity | E7-4 | `beads.py`, `beads_rows.py`, `bd_runner.py`, `fake_support.py`, `test_tracker_beads_native_ready.py`, transcripts | `next_ready("slice", under)` runs `bd ready`. `native_ready` is true. The parity test holds on the corpus. |
| E7-6 | `claim-next` | E7-5 | `beads.py`, `bd_runner.py`, `fake.py`, `files.py`, `port.py`, `cli_operations.py`, `test_tracker_claim_next.py` | One call claims the first ready slice. Nothing ready gives `null` and exit 0. |
| E7-7 | `migrate-mapping` with dry run | E7-6 | `beads_migrate.py`, `beads.py`, `bd_runner.py`, `cli_operations.py`, `fake.py`, `files.py`, `test_tracker_migrate_mapping.py` | A legacy scratch tracker converts in one sync. A dry run writes nothing. A second run changes nothing. |
| E7-8 | Docs, install, usage | E7-7 | `tracker-adapter-beads.md`, `tracker-usage.md`, `slice-loop.md`, `install.md`, hook reminder | The docs name the two operations and the migration. `tracker.py --help` lists them. |

### Slice E7-1: spike notes

Input: `/tmp/e7-spike.md`.

Assertions: the notes hold the eleven spike areas: retype, tree and ready, row shape, claim, lifecycle, dependencies, migration run, timing, foreign tasks, defer dates, and row limits. They also hold the exact filter `bd list --external-ref <id>` on bd 1.3.0: the command, the exit code, and the rows for a known and an unknown ref. Each finding names its command and its exit code. The notes mark the obsolete sections of E5 (see ADR-0044).

Pass conditions: the notes state the bd version 1.3.0. No code changes in this slice.

### Slice E7-2: type, title, label, and text mapping

Input: the mapping table above, and the spike facts 4, 5, 16, 17.

Assertions:
- `BD_TYPE` maps program to `feature` and pr to `milestone`. `create_record` sends `--title <record.title or cb id>`, `--labels cb`, and `--external-ref <record.external_ref>` (the cb id, and `gh-<n>` for a pull request). It sends `--description`, `--acceptance`, and `--design` only for a set field.
- A read fills `title`, `description`, `acceptance_criteria`, and `design` from the row fields of the same names. A lookup of one record by cb id runs `bd list --external-ref <ref> --json --limit 0 --all`, and an unknown ref gives no record.
- The seed and `migrate-mapping` set `external_ref` on every cb row that has none or a wrong one.
- `STATUS_MAP` maps `deferred` to `open`.
- `prepare` sets no custom type, and `_create` no longer retries on `invalid issue type`.
- The seed fills the text fields from the sources in the table of the title rule. A field with no source sends no flag.
- `legacy_reasons` returns a reason for a cb row of type `program`, a pr row of type `task`, and an epic with a `blocks` edge to a pr row.
- `doctor` reports `mapping`.

Pass conditions: replay tests compare the whole argv of each create against new transcripts. A read test shows that a legacy row still reads. The title test uses the recommended rule, so one constant sets the rule if the engineer picks the alternative.

### Slice E7-3: hierarchy and ordering edges

Input: the epic header order of `04-slices.md`, the order of `epics[]` in `goal.json`, and the existing slice chain.

Assertions:
- `_epic_and_slice_records` and `design_records` give each epic `blocked_by` the epic before it. The first epic has none.
- `create_record` sends one `bd dep add` for each `blocked_by`. Epics are created in order, so the target exists.
- The projector emits the epic `blocked_by` joins.
- An epic whose envelope holds `deferred` gets `--defer <date>` on create, and a closed or in_progress epic gets no defer.

Pass conditions: the live test seeds the corpus into a scratch tracker and compares `bd ready -t task --label cb` with the projector frontier. The test runs only with `bd`. The fixture index is regenerated, and the diff lists only the new joins.

### Slice E7-4: pull request as a milestone with `tracks`

Input: the spike facts 3, 6, 7, 8, and the E4 slice 15 test.

Assertions:
- `open_pull_request` creates a `milestone` with the label and `external_ref gh-<n>`, and one `bd dep add <pr> <epic> --type tracks` for each epic. It adds no `blocks` edge and no gate.
- A read gives the PR record `tracks` from the `tracks` dependencies whose target bd listed.
- `set_pull_request_state(ref, merged)` only closes the milestone. The module `beads_gates.py` and its argv are removed.
- The fake adapter follows the same shape. The corpus epics have no PR blocker, and the PR record has `tracks`.
- Contract case 5 says: a PR with `tracks` leaves both epics ready, and a merge changes no ready set.

Pass conditions: a live test opens a PR for two epics and finds both slice frontiers in `bd ready`. The contract test passes on the fake and on the beads replay. The grep check finds no `gate` call in `shared/tracker_port/`.

### Slice E7-5: native ready for slices, with parity

Input: the corpus fixtures after E7-4, and the native ready table.

Assertions:
- `next_ready("slice", under)` runs `ready_argv`. `under` may name an epic or a program, and the adapter maps it to the bd id. The adapter turns each returned row into a cb record through the one list read.
- The adapter refuses on a legacy tracker.
- The shared ready rule of the fake and of the epic kind follows bd: a slice is ready only when each ancestor is unblocked and not deferred. A pull request never counts.
- `Capabilities.native_ready` is true for beads.
- The corpus deferred date moves to `2099-12-31`.

Pass conditions: the live parity test compares the adapter with the projector for the kinds `program`, `epic`, and `slice`, and for `under` an epic and a program. It skips without `bd`. If it fails, `native_ready` stays false and the notes record the difference.

### Slice E7-6: `claim-next`

Input: the spike facts 9 to 11 and 17.

Assertions:
- The adapter reads the rows, maps `under`, runs `claim_next_argv`, and parses the one-item list. An empty list returns `None`.
- It builds the record from the list row, with `in_progress` and the claimant, and then it publishes once.
- After the claim it finds the parent epic of the claimed slice in the same rows. When that epic is not `in_progress` and not `closed`, it runs `bd update <epic bd id> --status in_progress`. It makes no write for an epic that is already `in_progress` or `closed`. The claim and this write go out in one publish.
- A bd failure raises `AdapterError` with the text `claim-next refused`.
- The fake adapter picks the first of `next_ready("slice", under)` and claims it. The files adapter refuses.
- The CLI prints `null` for no result.

Pass conditions: a live test with a foreign task of priority 0 shows that the claim takes the cb slice. A live test shows that the parent epic row reads `in_progress` after the claim, that a second claim under the same epic makes no epic write, and that a closed epic gets no write. A test with eight parallel calls on eight ready slices gives eight different slices. A test with an empty frontier gives `null` and exit 0. The replay checks the argv, including the epic update.

### Slice E7-7: `migrate-mapping` with dry run

Input: the spike facts 4 to 7, 15, 18, 19, and the scratch run of S7.

Assertions: the steps run in this order. Each step acts only on a row that differs.
1. Read all rows with `--limit 0`. Foreign rows are left alone.
2. Retype: a `program` row to `feature`, and a pr row of type `task` to `milestone`.
3. Label and external ref: add `cb` to each cb row without it, and set `external_ref` with `bd update --external-ref` on each cb row where it is missing or differs from the cb id (`gh-<n>` for a pr row).
4. Unblock: for each epic with a `blocks` edge to a pr row, run `bd dep rm`, and then `bd dep add <pr> <epic> --type tracks` when it is missing.
5. Gates: for each id in the PR envelope `gates`, run `bd dep rm` for each epic that depends on it and `bd gate resolve` when the gate is open. Then write the envelope without `gates`.
6. Chains: add the missing `blocks` edge between consecutive epics of one program, ordered by the epic number, and between consecutive slices of one epic, ordered by `n`.
7. Defer: an open epic with an envelope `deferred` date in the future gets `bd update --defer <date>`.
8. Names and texts, only with `--plans-dir`: `title`, `description`, `acceptance_criteria`, and `design` from the files. Without it, a slice title comes from its envelope.
9. Remove `program` from `types.custom`, and keep the other entries.
10. One sync.

A dry run runs steps 1 to 9 as a plan, makes no write and no sync, and returns the list of changes. A second run returns an empty list.

Pass conditions: the live test builds the legacy tracker of S7 in a scratch directory, runs the dry run and checks that no row changed, runs the migration and checks `bd ready -t task --label cb` and the new types, and runs it again and finds no change. A replay test covers an interrupted run: it stops after step 4 and resumes.

### Slice E7-8: docs, install, usage

Input: the notes, the usage guide, `slice-loop.md`, `install.md`, and the hook reminder.

Assertions: the usage guide adds the moment rows for `claim-next` and `migrate-mapping`. `slice-loop.md` names `claim-next` as the way to take the next slice. `install.md` says that an existing tracker needs `migrate-mapping`, and that a snapshot comes first. The notes drop the obsolete sections that ADR-0044 lists.

Pass conditions: every tracker.py operation that a doc names is a subcommand in `tracker.py --help`. The docs name no bd command outside the adapter notes. `build_index.py` runs, and `prose_budget.py` and `ste-lint.py` pass on the changed docs.

## Test Plan

- E7-1: no suite test. The evidence is the notes.
- E7-2: replay tests of each argv over new transcripts, and a read test over a recorded row. No `bd` is needed.
- E7-3, E7-4: the contract test on the fake and on the replay, and one live test in a scratch tracker. The live test skips without `bd`.
- E7-5: the live parity test, and the replay test of `ready_argv`. The parity corpus holds one epic with an open PR, one deferred epic, one in_progress epic, and one program with two ordered epics.
- E7-6: the live tests named above, and the replay test of the claim argv and of the empty result.
- E7-7: the live migration test and the replay test of the interrupted run.
- E7-8: the existing reference checks in `tests/` run unchanged.
- Each slice runs its own test file. The main session runs `uv run pytest tests -q` once, after all edits.
- After E7-7, the engineer runs `migrate-mapping --dry-run` on this repo, and then on think-with-ai. That is a manual check, and no test reads the live tracker.

## Risks & Open Questions

1. **The title rule.** Recommended: the name. The alternative is `<cb id> — <name>`. One constant sets the rule. The engineer decides at review.
2. **Epic order is serial.** The engineer decided it. A plan with parallel epics needs a note in the plan that says so, or a later option to skip an edge. Open: the engineer decides if a header marker may mark an epic as parallel.
3. **Defer dates.** After the date passes, bd frees the slices, and the envelope key still says `deferred` [L78]. The adapter rule for epics then differs from bd. Open: the engineer decides if the adapter reads the date, and treats a past date as not deferred. The fixture date moves to 2099 meanwhile.
4. **The order of `bd ready`.** The spike saw the first created slice first [L33]. [INFERENCE] The order is priority and then creation time. The parity test compares sets, and not the first item.
5. **Two machines.** The claim race between two machines is not tested. See risk 5 of the Challenge.
6. **The migration has no rollback.** The snapshot is the only recovery. The restore from `bd export` is not tested.
7. **The projector output changes.** The epic `blocked_by` joins and the pr `tracks` are new. [INFERENCE] No reader of the projector output uses epic `blocked_by`. E7-3 greps for readers before the change.
8. **bd versions.** Only 1.3.0 is checked. A later bd needs a new spike. The flag `bd list --external-ref` is the first item for E7-1 to check.
9. **`--plans-dir` on `migrate-mapping`.** The engineer asked for `[--dry-run]` only. The optional flag is an addition. Without it, only the slice titles change.
10. **The `description` and `design` sources.** The sources in the table are a proposal. A slice has no description source. Open: the engineer says if a slice description should come from the epic design document.
11. **A PR title.** The title is the ref (`pr-101`). A person may prefer `PR #101`. It follows the title rule.
