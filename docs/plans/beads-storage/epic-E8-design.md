# Epic Technical Solution Design: E8, The tracker is the source of stage and status

Feature: beads-storage
Epic ID: E8
Status: proposed. The slices E8-1 to E8-8 are local numbers. After the engineer approves this design, they become the global slices 31 to 38 in `04-slices.md`. That file is not edited now. E6 stays unbuilt and unapproved. The section "How E8 meets E6 and E7" says what E8 needs from them.

## Decisions and results

The engineer decided these six points. Do not reopen them.

1. **Primary source.** The tracker is the primary source of the stage of a program, and of the status of an epic and of a slice.
2. **Design mode.** Design mode creates the program record in the tracker at stage 0. The record carries the title and the outcome from `goal.json`. From then on, design mode writes the stage only through the tracker. `goal.json` loses the field `stage`. The schema in section 12 of `design-mode.md`, the validation in `build_index.py`, and the `DESIGN_STAGES` check change to match. A repo with no tracker config uses the files adapter. That adapter still reads a legacy `stage` from `goal.json`, so the field stays legal as the fallback. Design mode never writes it when a tracker exists. A one-time strip removes `stage` from the existing files after the tracker holds it.
3. **Index.** `data/index.json` takes `design.stage` from the tracker program record. It falls back to the legacy `goal.stage` only when the tracker has no record. It takes the status of an epic and of a slice from the tracker lifecycle.
4. **Work board.** Each card shows the lane from the tracker stage, the closed slices over the total, the closed epics over the total, the next ready slice from the native ready of the tracker, and the pull request state from the tracker `pr` records. The drawer must not say `merged` without evidence. A first fix landed in commit 5d52d2c, and E8 keeps it.
5. **Repair.** A one-time bulk operation closes the finished records and stamps the missing stages. The evidence for a merged pull request must not come from a GitHub read inside the port, as ADR-0029 forbids.
6. **ADR.** ADR-0047 amends ADR-0031 and ADR-0040. It says that design mode no longer writes `goal.stage`.

### Choices of the designer, open for review

The engineer asked the designer to choose and to justify these seven points.

| # | Choice | Why | Cost |
|---|---|---|---|
| A | **`set-program-stage` creates the record.** The call is `set-program-stage <program> <stage> [--plans-dir DIR]`. The record is created when the tracker holds none and `--plans-dir` is given. A new operation `create-program` is rejected. | It is the smaller change. The port gets one optional argument and no new method. Design mode calls one operation at every stage, so it never asks whether the record exists. A second call only sets the stage, so the call is idempotent. | The creation depends on a flag. Without `--plans-dir` a missing program still exits 4, so a typo cannot create a program. |
| B | **The creation reads `goal.json` itself.** The adapter reads `<DIR>/../architecture/designs/<program>/goal.json` through `program_texts`, the function that the seed already uses. The CLI takes no `--title` and no `--outcome`. | The title and the outcome cannot drift from the file, because no agent copies them. | The call fails with exit 4 when that file does not exist. |
| C | **`repair-status` is its own operation.** It is not an option of `seed-from-files`. | The seed only creates, and its evidence is the plan files. The repair needs the stage, the pull request records, and the built index. A third kind of evidence in the seed would break its one rule. | One more operation, one more CLI entry, and one more optional port method. |
| D | **The strip is a script.** It is `shared/strip_goal_stage.py`. It is not a step of the bundle migration ladder. | A migration must succeed with no tracker. The strip must first check that the tracker holds the same stage. The ladder cannot read a live tracker, and a skipped step must not stamp the bundle format. | The strip does not run by itself. The install and usage docs name it. |
| E | **The repair trusts the stage the engineer set.** No hold exists for an epic of an `implemented` design that shows no work. The engineer stated that such designs are implemented, so the repair closes their open epics and slices. | The first design had a hold for this case. The engineer overruled it on 2026-10-26 for `cobuilder-memory`. | The repair closes every open epic of an `implemented` or `superseded` design. A wrong stage closes unbuilt work, so the engineer reads the dry run first. |
| F | **One record read.** The port gets `all_records()`. The index build makes one read and one ready call. | The build makes four `bd list` calls today, and each takes about 0.8 seconds [S16]. Four more calls would nearly double the time. | A new method on the port, with a contract test. |
| G | **An unreadable tracker gives a named failure, or the legacy stage.** The build does not reuse the stage of the last index. | `build_index.py` never merges and never authors. A reuse of old data would break that rule. | After the strip, a build on a machine with no readable tracker fails. The viewer then keeps the last committed index. |

### Spike facts

The spike read the live tracker (read only) and ran one write test in a scratch tracker. It ran on bd 1.3.0. The full log is `/tmp/e8-spike.md`. The S numbers below are the sections of that file.

| # | Fact | Evidence |
|---|---|---|
| 1 | The tracker holds 31 programs, 116 epics, 146 slices, and 2 pull request records. Both records are open. The mapping is native. | S1, S2 |
| 2 | 25 designs have a `goal.json`. 11 of them have a goal stage and a tracker program with no stage. No design has two different stage values. 5 tracker programs have no design and no stage. | S2 |
| 3 | By the stage of the design that the epic id prefix names, 37 open epics sit under `implemented` or `superseded` designs. The repair closes 34 and holds 3. It closes no slice, because the 2 open slices belong to held epics. | S3 |
| 4 | 2 open epics of the design `cobuilder-implement`, at `approved`, have a merged pull request in the index. The repair holds them. The rule for a merged pull request fires on 0 epics. | S3 |
| 5 | The index takes `design.stage` from `goal.stage` at `build_index.py` line 534. `apply_epic_lifecycle` already maps `closed` to `completed`. The slice state has only `completed` and `planned`. | S4, S5 |
| 6 | The readers of `goal.stage` are listed in S6. The writers are `design-mode.md`, the architect `SKILL.md`, and the odyssey `SKILL.md`. | S6, S7 |
| 7 | `set_program_stage` on a missing program exits 4. A `create_record` of a program with the stage and the texts works. | S9 |
| 8 | A second create that skips the guard gives two rows with one cb id. `set_program_stage` wrote the first row. `list_programs` read the second row. | S9, S10 |
| 9 | `build_index.py` ends with a traceback and exit 1 when bd cannot be read. | S11 |
| 10 | One `next-ready --kind slice` call gives every ready slice. It took 1.3 to 1.7 seconds. | S8 |
| 11 | The index build makes four `bd list` calls. They take 3.9 seconds. One `list`, and one `list` and `ready` for the next-ready call, take about 2.1 seconds. | S16 |
| 12 | The drawer row draws the green merge icon for each pull request number of the epic join, merged or not. The join holds open pull requests. | S13 |
| 13 | No production code calls `is_stale`. | S12 |
| 14 | The next free ADR number is 0047. | S15 |

## Challenge

This is design stage 4. Each risk cites an ADR. The evidence lines come from `/tmp/e8-spike.md`.

1. **Migration of `goal.stage` (ADR-0031, ADR-0040).** 11 designs have a goal stage and a program with no tracker stage [S2]. A strip before the stamp loses the lane of those 11 designs. The strip script therefore removes a stage only when the tracker holds the same value. The order is fixed: `repair-status` stamps the stage, then the build shows no drift warning, then the strip runs. A dry run of each step lists its changes first.
2. **Readers that break (ADR-0018).** The readers are `build_index.py` lines 338 and 534, `design_records.py` lines 50 and 115, `test_sparse_design_corpus.py` line 241, and `SparseDesign.test.tsx` line 180. The writers are `design-mode.md`, the architect `SKILL.md`, and the odyssey `SKILL.md` [S6]. Each one has a slice in this design. `verify_bundle.py` reads the index, so it does not change.
3. **A repo with no tracker config (ADR-0040).** The files adapter refuses `set_program_stage` [S7]. The call exits 2. Design mode then writes the legacy `stage` into `goal.json`, and the index reads it as the fallback. `joins.tracker.read` is false. The board shows the lane and the counts from the files. It shows no next ready slice and no pull request record, because the files adapter computes neither.
4. **A design created before a tracker exists (ADR-0031).** `seed-from-files` already takes the stage of a plan program from the legacy `goal.json` [S7]. A design with no plan has no program record. `repair-status` creates that record from the design, in the same run as the stamps. The spike found no such design in this repo today [S2], but a second repo may hold one.
5. **Two machines create the same program (ADR-0042, ADR-0031).** bd accepts a duplicate external ref, and the adapter guard sees only its own store [S9]. The result is two rows with one cb id. A write changes the first row, and a read shows the second row, so the write is invisible [S9, S10]. E8 adds three guards. A write that finds two rows refuses and names both bd ids. `doctor` lists the duplicates. Design mode runs `tracker.py sync` before and after the creation. `repair-status` reports a duplicate and writes nothing for it. A person closes the extra row.
6. **The viewer lane when the tracker is offline (ADR-0018, ADR-0001).** The build crashes today when bd cannot be read [S11]. After E8 the build catches the failure. While a design has a legacy goal stage, the build warns and uses that stage. After the strip, the design has no stage, so the build fails with a named message, and it writes no index. The viewer is a static page. It keeps the last committed index, so the lane on screen does not change. The build never reuses the old stage, because it never merges (choice G).
7. **False positives of the bulk repair (ADR-0029, ADR-0040).** The spike found two real cases. `cobuilder-memory` says `implemented`, and its epics E2 and E3 are in `backlog` with open slices. `plugin-split/E7` is `planned` with no branch and no pull request [S3]. A close by stage alone would close unbuilt work. Rule R1 holds these three epics (choice E). The 2 epics of `cobuilder-implement` have a merged pull request, but their design is `approved`. The rule "never close a live design" holds them [S3]. The pull request evidence comes only from a tracker record and from the built index, so the port reads no GitHub (ADR-0029). The plan: take a `bd export` snapshot outside the repo, run `--dry-run`, read the list, and run once on one machine.
8. **The index build time (ADR-0018).** The build makes four `bd list` calls and takes 3.9 seconds [S16]. A call for each program and for the ready queue would add 30 or more calls. The design uses one `all_records()` read and one ready call. The ready call returns every ready slice, and the build groups them by design [S8]. A test counts the bd calls of one build. The count must not exceed three.
9. **The index does not see a tracker change (ADR-0018).** No hash covers the tracker, but no production code calls `is_stale` either [S13]. The rule "rebuild the index after every tracker write" already stands in `slice-loop.md` and in `design-mode.md` section 1. E8 adds one line for the stage write in section 10.1.
10. **Stage and program lifecycle (ADR-0031).** `set-program-stage` already closes the program at `implemented` and `superseded`. A stamp from the legacy stage can close a program. That is correct, because the stage said so. The stamp writes the stage and the lifecycle in one update, as the existing `set_program_stage` does.
11. **The pull request chip loses history (ADR-0029).** The tracker holds 2 pull request records, and the story file holds 17 pull requests [S2, S4]. After E8 a card shows a pull request only when a tracker record tracks one of its epics. The old numbers in the epic envelope stay visible in the detail pane as the epic `pr` field. E8 does not create a record for a past pull request. ADR-0029 keeps that content on GitHub.
12. **A new status word reaches the viewer (ADR-0018).** The viewer type `EpicState` has no word `superseded`, and the slice state has no `in_progress`. The viewer reads both words as plain strings, so an unknown word shows as text. The type gets both words in E8-5.

### Alternatives

| Option | Rejected because |
|---|---|
| Keep `goal.stage` as the source and mirror it into the tracker | A mirror has two writers and no winner. The values already differ for 11 designs [S2]. |
| Change only the index, so that it prefers the tracker stage | A new design has no tracker stage. The index falls back to the file at once, and the file stays the real source. |
| A new operation `create-program` | It adds a port method and a CLI entry, and it adds a branch to every design mode run (choice A). |
| Repair as an option of `seed-from-files` | The seed only creates, and it does not read the index or the pull request records (choice C). |
| The repair calls `gh pr list` | ADR-0029 and the port rule forbid it. The index already holds the resolved answer. |
| Close every epic of an `implemented` design, with no guard | It would close `cobuilder-memory/E2` and `E3`, which are unbuilt [S3]. |
| The build reuses the stage of the last index when the tracker is unreadable | It makes the build a merge of old and new data (choice G). |
| The strip inside the bundle migration ladder | The ladder cannot read a live tracker (choice D). |

## Scope and Intent

E8 makes the tracker the one source of the program stage and of the status of epics and slices. It changes five things. Design mode creates the program record at stage 0 and writes the stage through the tracker. The index reads the stage, the status, the next ready slice, and the pull request records from the tracker with one read. `goal.json` loses the field `stage`. The Work board shows the result on each card. The new operation `repair-status` brings the existing records in line, once.

Out of scope: E6 (the formula path), the Linear and Jira adapters, a record for a past pull request, a merge of duplicate rows, the claim operations, and the rewrite of `04-slices.md`. The gates of the program scalars stay as they are. The files adapter stays read only.

E8 starts after E7. ADR-0047 holds the decision. It amends ADR-0031 and ADR-0040.

### How E8 meets E6 and E7

| Point | E8 | E6 and E7 |
|---|---|---|
| Native ready | E8 calls `next_ready("slice")` once at build time. | E7 made it native (`bd ready -t task --label cb`). E8 adds no ready rule. |
| Epic order | The board reads the next ready slice of the first open epic. | E7 chains the epics, so only one epic of a design has ready slices. |
| Pull request record | The card reads the `tracks` field. | E7 made the record a milestone with `tracks`. |
| Formula rows | They carry no `cb` block and no label, so `all_records()` never returns them. | E6 stays unbuilt. |
| `doctor` | E8-2 adds the field `duplicates`. | E6-3 adds a count of formula rows. Both edit `doctor_details`. The second slice to land merges the two. |

## Files Touched

New files:

- `shared/strip_goal_stage.py`: the one-time strip (E8-4). A PEP 723 script.
- `shared/tracker_port/repair_status.py`: the planner `plan_repair` and the result types (E8-7).
- `tests/test_tracker_program_create.py`: the creation call on the fake and on the beads replay (E8-2).
- `tests/test_tracker_duplicate_program.py`: the duplicate guard and the `doctor` field (E8-2).
- `tests/test_tracker_all_records.py`: the single read, on the contract fixtures and on a counting runner (E8-3).
- `tests/test_build_index_tracker_stage.py`: the stage order, the failure messages, the drift warning, and the unreadable tracker (E8-3).
- `tests/test_strip_goal_stage.py`: the dry run, the guard, and the second run (E8-4).
- `tests/test_build_index_status_words.py`: the epic and slice words (E8-5).
- `tests/test_build_index_design_tracker.py`: the join `design_tracker`, the next ready slice, and the pull request records (E8-6).
- `tests/test_tracker_repair_status.py`: every rule, every hold, the dry run, and the second run (E8-7).
- `tests/test_tracker_repair_status_real.py`: one run in a scratch tracker. It skips without `bd` (E8-7).
- `tests/fixtures/tracker/stage/`: a corpus with a tracker stage, a legacy stage, and no stage.
- `tests/fixtures/tracker/repair/`: a corpus with a superseded design, an implemented design, a held epic, a live design with a merged pull request, a plan with no design, and a duplicate. It also holds a small index file with `epic_status`.

Modified files:

- `shared/tracker-adapter-beads.md`: the spike notes (E8-1), the creation and the duplicate guard (E8-2).
- `shared/tracker_port/port.py`: the argument `plans_dir`, `all_records`, and the optional `StatusRepairPort` (E8-2, E8-3, E8-7).
- `shared/tracker_port/plan_program.py`: `new_program_record` (E8-2).
- `shared/tracker_port/beads_writes.py`: `set_program_stage` creates a missing record (E8-2).
- `shared/tracker_port/beads.py`: the duplicate guard in `_find_row`, `doctor_details`, and `all_records` (E8-2, E8-3).
- `shared/tracker_port/fake.py`, `fake_support.py`: the same three changes for the fake adapter (E8-2, E8-3, E8-7).
- `shared/tracker_port/files.py`: `all_records` stays, and `repair_status` joins the refused operations (E8-7).
- `shared/tracker_port/cli_operations.py`: `--plans-dir` on `set-program-stage`, and the entry `repair-status` (E8-2, E8-7).
- `shared/tracker_port/reader.py`: `TrackerSnapshot` and `snapshot`. `epic_records` and `slice_records` read from the snapshot (E8-3).
- `shared/tracker_port/projector.py`: the slice word `in_progress` (E8-5).
- `shared/tracker_port/beads_seed.py`: no code change. A test shows that a seed skips a held program (E8-2).
- `shared/build_index.py`: the stage order, the failure messages, `GOAL_FIELDS`, the status words, the joins `tracker` and `design_tracker`, and the schema version 1.5 (E8-3, E8-5, E8-6).
- `shared/_bundle_meta.py`: the comment above `DESIGN_STAGES` (E8-3).
- `plugins/artifact/viewer/src/data/types.ts`, `bundle.ts`, `joins.ts`: the new words, the new joins, and the new row fields (E8-5, E8-6).
- `plugins/artifact/viewer/src/shell/WorkDrawer.tsx`, `workDeck.ts`: the card and the detail pane (E8-5, E8-6).
- `plugins/artifact/viewer/src/components/work/DesignCard.tsx`: the same counts for the card of the older board (E8-6).
- `plugins/artifact/viewer/index.html` and `.cobuilder-architect/self/viewer/index.html`: the rebuilt viewer (E8-6).
- `tests/test_build_index.py`: lines 865 to 873 (the failure text) and the stage cases from line 886 (E8-3).
- `tests/test_sparse_design_corpus.py`: lines 236 to 244. A design with no goal stage must read `stage_source` tracker (E8-4).
- `plugins/artifact/viewer/src/shell/*.test.tsx`: the rows that pass `done`, and the cases for the new row fields (E8-5, E8-6).
- `shared/tracker-usage.md`: the moment table rows "Design decided" and "Program done", a new first moment, the paragraph on `set-program-stage`, and `repair-status` (E8-2, E8-8).
- `plugins/pr/skills/odyssey/SKILL.md`: line 628 and lines 797 to 799 (E8-4).
- `plugins/architect/skills/architecture/SKILL.md`: lines 107 to 111 (E8-4).
- `CLAUDE.md`: line 259 (E8-4).
- `plugins/implement/commands/install.md`: the order of the three live steps (E8-8).
- `.claude-plugin/marketplace.json` and each `plugin.json` of a plugin that changes: the version (E8-8).
- `docs/architecture/designs/beads-storage/goal.json`: the E8 entry, the done-when items, and ADR-0047.

Not touched by the build: `04-slices.md` (until approval), `00-status.md`, the rubrics, and the manifest.

### Exact edits to `design-mode.md`

The file is `plugins/architect/skills/architecture/references/design-mode.md`. E8-2 makes edits 1 and 2. E8-4 makes edits 3 to 8. Line numbers are those of today.

1. **Lines 56 to 58 (section 3).** After the sentence "Write it into `goal.outcome` and `goal.done_when`.", add this paragraph. "When `goal.json` holds `name`, `title`, and `outcome`, run `tracker.py sync`. Then run `tracker.py set-program-stage <name> backlog --plans-dir docs/plans`. This creates the program record. Run `tracker.py sync` again. Exit 2 means that no tracker is configured. In that case write `"stage": "backlog"` into `goal.json`."
2. **Line 424 (section 10.1, item 2).** Replace the item with: "When the engineer decides or approves the design, run `tracker.py set-program-stage <program> <stage> --plans-dir docs/plans`. The stage is one of the stages in the table in section 12. Exit 2 means no tracker is configured, so write `stage` into `goal.json`. Exit 3 means stop and tell the engineer. Never write `stage` into `goal.json` after an exit 0."
3. **Lines 68 to 72 (section 3).** Replace "show the match and its `goal.stage`" with "show the match and its stage, read with `tracker.py list-programs`". Replace "A superseded design gets `stage: "superseded"` and a pointer to the new name." with "Run `tracker.py set-program-stage <old name> superseded` for the old design, and add a pointer to the new name."
4. **Line 455 (section 12).** Replace "Do not keep `branch` as a scalar. The join lives on `epics`." with "`goal.json` holds no workflow state. The tracker holds the stage of the program, and the branch, the pull request, and the state of each epic."
5. **Lines 473 to 480 (section 12, example).** Replace the two entries with `{"id": "E1", "slug": "guest-checkout", "outcome": "<testable criterion>"}` and `{"id": "E2", "slug": "saved-cards", "outcome": "<...>"}`. E4 removed `branch`, `pr`, and `state`, and the example still shows them.
6. **Line 481 (section 12, example).** Delete the line `"stage": "approved",`.
7. **Lines 498 to 500 (section 12).** Replace the paragraph with: "The program stage lives in the tracker and takes one of six values. The Work board reads exactly these (`_bundle_meta.DESIGN_STAGES`). `build_index.py` rejects a stage with any other value, and it rejects a design with no stage, because such a design shows in no lane. A legacy `stage` in `goal.json` is the fallback for a repo with no tracker."
8. **Lines 511 to 513 (section 12).** Replace "Do not write it into `goal.stage`." with "Do not write it as the program stage."

The same edit as edit 3 applies to `plugins/architect/skills/architecture/SKILL.md` lines 107 to 111.

## Types & Signatures

Port changes:

```python
def set_program_stage(self, program: str, stage: str, plans_dir: Path | None = None) -> TrackerRecord: ...
# A held program: set the stage. A missing program with plans_dir and a goal.json: create it.
# A missing program otherwise: ArgumentError (exit 4).
def all_records(self) -> list[TrackerRecord]: ...
# Every program, epic, slice, and pull request record, from ONE read.

class StatusRepairPort(Protocol):
    def repair_status(
        self, dry_run: bool = False, plans_dir: Path | None = None, index: Path | None = None
    ) -> dict[str, Any]: ...
```

The new program record:

```python
# shared/tracker_port/plan_program.py
def new_program_record(plans_dir: Path, program: str, stage: str) -> TrackerRecord: ...
# envelope {"stage": stage}, external_ref program, lifecycle program_lifecycle(stage, ()),
# and the texts of program_texts(plans_dir, program).
```

The reader:

```python
# shared/tracker_port/reader.py
@dataclass
class TrackerSnapshot:
    adapter: str                          # "beads", "fake", "files", or "none"
    read: bool                            # False when the tracker could not be read
    error: str | None                     # the AdapterError text when read is False
    records: list[TrackerRecord]
    conflicts: list[dict]
    ready: list[TrackerRecord] | None     # None when the adapter computes no ready work

def snapshot(repo_root: Path) -> TrackerSnapshot: ...
```

CLI:

```
uv run shared/tracker.py set-program-stage <program> <stage> [--plans-dir DIR]
uv run shared/tracker.py repair-status [--dry-run] [--plans-dir DIR] [--index PATH]
uv run shared/strip_goal_stage.py [--repo DIR] [--dry-run]
```

The result of `repair-status`:

```json
{
  "checked": {"stage": true, "pr_records": true, "index": true},
  "changes": [
    {"id": "react-viewer/E1", "kind": "epic", "action": "close", "rule": "stage-closes",
     "detail": "design react-viewer is at superseded, from the tracker"}
  ],
  "holds": [
    {"id": "cobuilder-memory/E2", "kind": "epic", "action": "hold", "rule": "implemented-without-work",
     "detail": "state backlog, no branch, no pull request, 1 open slice"}
  ],
  "unresolved": [
    {"id": "coach-reaches-green", "kind": "program", "action": "report", "rule": "no-design-no-stage",
     "detail": "3 open epics"}
  ],
  "unchecked": []
}
```

The rules of `repair-status`:

| Rule name | Action | When it applies |
|---|---|---|
| `stamp-from-goal` | `stamp` | The program holds no stage, and the legacy `goal.json` of its design has one. The stamp also sets the lifecycle, as `set-program-stage` does. |
| `create-from-design` | `create` | A design has a `goal.json` and no program record. The adapter creates the record with `new_program_record`. |
| `stage-closes` | `close` | The design of the epic is at `superseded`. Or it is at `implemented`, and the epic shows work. The epic closes, and each open slice of it closes. |
| `pr-record-merged` | `close` | The design has no stage, and a closed pull request record tracks the epic. |
| `index-merged-pr` | `close` | The design has no stage, and `joins.epic_status` of the given index says `merged`. |
| `implemented-without-work` | `hold` | The design is at `implemented`. The epic state is `backlog` or `planned`, and it has no `branch` and no `pr`. |
| `live-stage-with-merged-pr` | `hold` | The design is at `approved`, `review`, `backlog`, or `decided`, and merged pull request evidence exists. |
| `no-design-no-stage` | `report` | A program has no design and no stage, or a design has no stage anywhere. |
| `duplicate-id` | `report` | Two rows hold one cb id. The repair writes nothing for it. |
| `no-pr-evidence` | `unchecked` | The design has no stage, the epic has a branch, and neither a record nor the index shows a pull request. |

The stage of an epic is the stage of the design named by its id prefix, as in `plugin-split/E1`. The adapter reads the tracker stage first and the legacy stage second. The legacy read needs `--plans-dir`.

The index gets two new joins and a new schema version:

```json
"joins": {
  "tracker": {"adapter": "beads", "read": true},
  "design_tracker": {
    "beads-storage": {
      "stage_source": "tracker",
      "next_ready": "beads-storage/31",
      "pull_requests": [
        {"ref": "pr-43", "number": 43, "state": "open", "epics": ["beads-storage/E1", "beads-storage/E2"]}
      ]
    }
  }
}
```

- `design_tracker` holds one entry for each design. `stage_source` is `tracker` or `goal`.
- `next_ready` is a slice entity id, or `null`. The build sets it to `null` for a design at `implemented` or `superseded`, and it adds a warning when bd lists a ready slice there. The files adapter gives `null` for every design.
- A pull request record gives `ref` from its id, `number` from `external_ref` (`gh-43`), and `state` `open` or `merged` from its lifecycle. The `epics` list holds the epic ids that the record tracks and that belong to the design.
- When the tracker cannot be read, `tracker.read` is false, every `stage_source` is `goal`, and the other two fields are empty.
- `INDEX_SCHEMA_VERSION` becomes `1.5`. The viewer reads both joins with a default, so an older index still loads.

The status words of `joins.epic_status`:

| Epic lifecycle | Design stage | Word |
|---|---|---|
| `closed` | any | `completed` |
| not `closed` | `implemented` | `completed` |
| not `closed` | `superseded` | `superseded` |
| `in_progress` | other | `in_progress` |
| `open` | other | the pull request join word, as today |

The slice word comes from the slice lifecycle only: `closed` gives `completed`, `in_progress` gives `in_progress`, and `open` gives `planned`.

The viewer:

```ts
export interface TrackerPullRequest { ref: string; number: number | null; state: "open" | "merged"; epics: string[]; }
export interface DesignTracker { stage_source: "tracker" | "goal"; next_ready: string | null; pull_requests: TrackerPullRequest[]; }
// Joins gains: tracker?: { adapter: string; read: boolean }; design_tracker?: Record<string, DesignTracker>
// DesignRow gains:
//   slicesDone: number; slicesTotal: number;   // slice state completed, over the slices joined to the design
//   nextReady: SliceEntity | null;
//   trackerPullRequests: TrackerPullRequest[];
//   stageSource: "tracker" | "goal"; trackerRead: boolean;
// DesignRow.done counts the epics whose word is completed. DONE_STATES loses "merged".
```

Results and errors:

| Case | Result | Exit |
|---|---|---|
| `set-program-stage`, program held | the record with the new stage | 0 |
| `set-program-stage`, no record, `--plans-dir` given, `goal.json` exists | the new record, with stage, title, and texts | 0 |
| `set-program-stage`, no record, no `--plans-dir` | `ArgumentError`: no record with that id | 4 |
| `set-program-stage`, no record, no `goal.json` | `ArgumentError` that names the missing file | 4 |
| `set-program-stage`, files adapter | `NoAdapterError` | 2 |
| A write finds two rows with one cb id | `AdapterError` that names both bd ids | 3 |
| `repair-status --dry-run` | the result lists, no write, no sync | 0 |
| `repair-status` | the result lists, one sync after the writes | 0 |
| `repair-status`, second run | `changes` empty, and the report lists repeat | 0 |
| `repair-status --index` names no file | `ArgumentError` | 4 |
| `repair-status`, files adapter | `NoAdapterError` | 2 |
| `strip_goal_stage.py`, the tracker holds the same stage | the key `stage` leaves the file | 0 |
| `strip_goal_stage.py`, no tracker, no program, or another stage | the file stays and the report names the reason | 0 |

## Slice Decomposition

The numbers E8-1 to E8-8 are local to this epic. In `04-slices.md` they become the global slices 31 to 38, in the same order.

| Slice | Name | Depends on | Files | Ends with |
|---|---|---|---|---|
| E8-1 | Spike notes into the adapter notes | E7-8 | `shared/tracker-adapter-beads.md` | The notes hold each spike finding with its command and exit code |
| E8-2 | The tracker creates the program record, and design mode says so | E8-1 | `port.py`, `plan_program.py`, `beads_writes.py`, `beads.py`, `fake.py`, `fake_support.py`, `cli_operations.py`, `tracker-usage.md`, `design-mode.md` (edits 1 and 2), tests | `set-program-stage --plans-dir` creates a missing record. A write refuses on a duplicate. |
| E8-3 | The index reads the stage from the tracker, with a fallback | E8-2 | `port.py`, `beads.py`, `fake.py`, `reader.py`, `build_index.py`, `_bundle_meta.py`, tests, fixtures | `design.stage` comes from the tracker, then from the file. The build makes at most three bd calls. |
| E8-4 | The strip step and the schema change | E8-3 | `strip_goal_stage.py`, `design-mode.md` (edits 3 to 8), architect and odyssey `SKILL.md`, `CLAUDE.md`, tests | Design mode writes no `goal.stage` when a tracker exists. The strip script passes its tests. |
| E8-5 | Epic and slice status on the board | E8-3 | `build_index.py`, `projector.py`, viewer `types.ts`, `bundle.ts`, `WorkDrawer.tsx`, tests | The words follow the table. `done` counts `completed` epics. |
| E8-6 | Next ready and pull request state on the board | E8-5 | `build_index.py`, `reader.py`, viewer `bundle.ts`, `joins.ts`, `WorkDrawer.tsx`, `DesignCard.tsx`, `workDeck.ts`, `index.html`, tests | A card shows the next ready slice and the state of each pull request record. |
| E8-7 | `repair-status` with a dry run | E8-3 | `repair_status.py`, `port.py`, `beads.py`, `fake.py`, `files.py`, `cli_operations.py`, tests, fixtures | A scratch tracker repairs in one sync. A dry run writes nothing. A second run changes nothing. |
| E8-8 | Live repair, docs, and install | E8-4, E8-6, E8-7 | `tracker-usage.md`, `tracker-adapter-beads.md`, `install.md`, manifests | The three live steps run in order. The docs name the new operations and the strip. |

### Slice E8-1: spike notes

Input: `/tmp/e8-spike.md`.

Assertions: the notes hold a new section, "Program stage in the tracker". It holds these findings, each with its command and exit code: the counts and the drift, the write to a missing program (exit 4), the create of a program with the texts, the duplicate rows with the invisible write, the bd call count and timing of the index build, and the ready call. The notes also record the manual cleanup of a duplicate: close the newer row with `bd close <bd id> --force`, then sync. The notes state bd 1.3.0.

Pass conditions: no code changes in this slice. `prose_budget.py` and `ste-lint.py` pass on the notes.

### Slice E8-2: the tracker creates the program record, and design mode says so

Input: spike facts 7 and 8, choices A and B, and the existing `create_record` and `program_texts`.

Assertions:
- `set_program_stage(program, stage, plans_dir)` on a held program behaves as today. On a missing program with `plans_dir` and an existing `goal.json`, it calls `create_record(new_program_record(...))`. The record holds the stage, the title, the outcome as `description`, the done-when list as `acceptance_criteria`, `external_ref` equal to the program id, and the lifecycle of `program_lifecycle(stage, ())`. A closing stage closes the new record, as `create_record` does today.
- A missing program with no `plans_dir` exits 4 with the existing message. A missing `goal.json` exits 4 and names the path.
- The fake adapter follows the same rules. The files adapter still refuses.
- The CLI takes `--plans-dir` on `set-program-stage`.
- `_find_row` raises `AdapterError` when two rows hold the cb id, and the text names both bd ids. `doctor` lists the cb ids that have two rows in a field `duplicates`.
- A `seed-from-files` over a plan whose program the tracker holds creates the epics and the slices, and it creates no second program.
- `design-mode.md` gets edits 1 and 2. Section 12 still lists `goal.stage` until E8-4.

Pass conditions: a replay test shows the whole argv of the create. A contract case runs on the fake and on the replay: create, set, and set again, with one record at the end. A scratch test with a real `bd` makes a second row by a raw create, and then checks that the write refuses. The grep check finds no `bd` call outside `shared/tracker_port/`.

### Slice E8-3: the index reads the stage from the tracker, with a fallback

Input: the stage order in the table below, spike facts 5, 9, and 11, and choices F and G.

| Case | Result |
|---|---|
| The tracker holds a program with a valid stage | `design.stage` is that stage, and `stage_source` is `tracker`. |
| The tracker has no program, or a program with no stage, and `goal.json` has a valid stage | The stage is the goal stage, and `stage_source` is `goal`. |
| Both hold a valid stage and the values differ | The tracker wins, and the build adds a warning that names both values. |
| Either source holds a value outside `DESIGN_STAGES` | A failure that names the source and the value. |
| No source holds a stage | A failure that names the design and the call `tracker.py set-program-stage <design> backlog --plans-dir docs/plans`. |
| The tracker cannot be read | A warning that holds the error text. Each design uses its goal stage. A design with none gets a failure that says the tracker is unreadable. |

Assertions:
- `all_records()` exists on the port. The beads adapter implements it with one `bd list`. The fake and files adapters return their records. `reader._all_records` calls it for every adapter.
- `reader.snapshot(repo)` returns a `TrackerSnapshot`. It catches `AdapterError`. It runs `next_ready("slice")` once for a non-files adapter, and it sets `ready` to `None` for the files adapter.
- `build_index.py` reads one snapshot per build, and passes it to `collect_designs`, `collect_slices`, and `resolve_joins`. The old calls `reader.epic_records` and `reader.slice_records` stay for the other readers, and they use `all_records()` too.
- `project_goal` no longer requires `stage`. `GOAL_FIELDS` keeps `stage` for the field order.
- The comment above `DESIGN_STAGES` names the resolved stage.

Pass conditions: a counting runner shows at most three bd calls for one build, and the E8 spike shows four today [S16]. The cases in the table above each have a test on the fake adapter with a corpus under `tests/fixtures/tracker/stage/`. The existing stage tests in `test_build_index.py` pass with the new failure text.

### Slice E8-4: the strip step and the schema change

Input: spike facts 2 and 6, choice D, and the exact edits 3 to 8.

Assertions:
- `strip_goal_stage.py` reads each `docs/architecture/designs/*/goal.json`. It removes `stage` only when the tracker program of that design holds the same value. It never reads the files adapter as a tracker. With no tracker it exits 0 and reports each file as `kept: no tracker`.
- The report lists three groups: `stripped`, `kept` with the reason (`no program`, `no stage`, or `differs`), and `no stage field`.
- The script keeps the key order and the indent of the file, and it writes nothing in a dry run. A second run strips nothing.
- Edits 3 to 8 land in `design-mode.md`. The same edit lands in the architect `SKILL.md`.
- The odyssey `SKILL.md` line 628 reads the stage with `tracker.py list-programs`. Lines 797 to 799 call `tracker.py set-program-stage <design> implemented` or `approved`, with the same exit 2 fallback.
- `CLAUDE.md` line 259 says that the resolved stage must be one of `DESIGN_STAGES`.
- `test_sparse_design_corpus.py` accepts a design with no goal stage when `stage_source` is `tracker`.

Pass conditions: the strip test uses a fake tracker with three designs: same stage, other stage, and no program. Only the first loses the key. The doc checks of `tests/` pass. `ste-lint.py` passes on the edited docs.

### Slice E8-5: epic and slice status on the board

Input: the status word table, spike fact 5, and the viewer files.

Assertions:
- `apply_epic_lifecycle` follows the table. It takes the resolved design stage as a second input. A closed epic reads `completed` for every stage. The commit 5d52d2c already gave that word, and a test pins it.
- `projector.slice_entities` gives `in_progress` for a slice whose lifecycle is `in_progress`.
- The viewer type `EpicState` gains `superseded`. `DONE_STATES` loses `merged` and holds `completed` only. `DesignRow.done` counts the epics whose word is `completed`.
- The detail pane and the deck row read the same count. The card text says "closed", as in "3 of 5 epics closed".
- The drawer text never says `merged` for a number that the join gave. This slice removes the green merge icon from the deck row. E8-6 adds the chip that replaces it.

Pass conditions: a build over a fixture with one design at each stage gives the words of the table. The viewer tests pass with the new `done`. A snapshot of the board rows for the fixture bundle shows the `superseded` word and the `completed` word.

### Slice E8-6: next ready and pull request state on the board

Input: the index shape for `design_tracker`, spike facts 10 and 12, and choice F.

Assertions:
- `build_index.py` fills `design_tracker` from the snapshot. It groups the ready slices by design through `slice_to_epic` and the epic entity. For each design it takes the first ready slice in the order of the epic id and then `n`.
- The pull request records give the chips. A record belongs to a design when it tracks one of the epics of that design.
- `designRows` adds the five new fields. `resolvedJoinsOf` gets two answers: `designTracker(designId)` and `trackerRead()`. No file outside `src/data/` reads a join table.
- The deck row shows `slicesDone/slicesTotal`, the epic meter, the next ready slice (id and title, one line), and one chip for each pull request. A chip reads `#43 open` or `#43 merged`. The merge icon shows for `merged` only.
- When `trackerRead` is false, the card shows no next ready slice and no chip, and the drawer footer says that the tracker was not read. With the files adapter the footer says that next ready needs a tracker.
- The detail pane lists the pull request records with their states. The footer sentence about merged pull requests changes to say that a card shows the pull requests that the tracker holds.
- The shipped `workDeck.ts` blurb of the lane `shipped` says "The tracker holds the stage implemented."
- E8-6 greps for readers of `DesignRow.pullRequests`. It removes the field when no reader remains.

Pass conditions: a build test over the fake adapter gives `next_ready` for a design with a ready slice, `null` for a design at `implemented`, and `null` for every design with the files adapter. A viewer test renders a card with an open and a merged record and checks the icon. `npm run build` writes the new `index.html` in both places, and `tests/test_viewer_build.py` passes. The build test counts at most three bd calls.

### Slice E8-7: `repair-status` with a dry run

Input: spike facts 2, 3, 4, and 8, choices C and E, and the rules table.

Assertions:
- `plan_repair(records, legacy_stages, merged)` is a pure function. It takes the records, the legacy stage of each design, and the merged evidence. It returns `changes`, `holds`, `unresolved`, and `unchecked`.
- The evidence for a merged pull request comes from two places only: a closed pull request record that tracks the epic, and `joins.epic_status[epic] == "merged"` in the file that `--index` names. No code in `shared/tracker_port/` calls `gh`.
- The beads and fake adapters implement `repair_status`. A live run sets `_batching`, makes the writes, and publishes once. A dry run makes no write and no sync.
- A stamp or a create uses the same code path as `set_program_stage`. A close uses `close --force` on a bd row, and the fake adapter sets the lifecycle.
- A design at `approved`, `review`, `backlog`, or `decided` never gets a close, whatever the evidence says.
- Every record in the result carries its rule name. The second run returns an empty `changes`.
- The files adapter refuses the operation. `tracker.py repair-status` appears in `--help`.

Pass conditions: the fixture corpus covers each rule and each hold. A dry run leaves the fake state file unchanged. A second run gives an empty `changes`. A scratch tracker test repairs a corpus, runs again, and finds no change. A replay test covers an interrupted run: it stops after the stamps and resumes. A contract case checks the dry run on both adapters.

### Slice E8-8: live repair, docs, and install

Input: the docs, the install command, and the three live steps below.

Assertions:
- `tracker-usage.md` adds the first moment "A design is named" with `set-program-stage <program> backlog --plans-dir <dir>`, and the moment "Records of finished designs are stale" with `repair-status`. It states the strip and its order.
- `tracker-adapter-beads.md` states the creation, the duplicate guard, `all_records`, and the repair rules.
- `install.md` says that an existing tracker needs the three steps in this order: a snapshot with `bd export`, `repair-status --dry-run` and then `repair-status`, and `strip_goal_stage.py --dry-run` and then `strip_goal_stage.py`.
- The version of each changed plugin rises in `plugin.json` and in `marketplace.json`.

Pass conditions: every `tracker.py` operation that a doc names is a subcommand in `tracker.py --help`. The docs name no bd command outside the adapter notes. `build_index.py` runs, and `prose_budget.py` and `ste-lint.py` pass.

The live steps are manual, and no test reads the live tracker. The engineer runs them in this order on this repo and then on think-with-ai:

1. Take a snapshot with `bd export` to a file outside the repo.
2. Run `uv run shared/tracker.py repair-status --dry-run --plans-dir docs/plans --index .cobuilder-architect/self/data/index.json` and read the list.
3. Decide the held cases (see Risks 1 and 2). Run the same command without `--dry-run`. Run `tracker.py sync`.
4. Rebuild the index. Check that no design shows a `stage drift` warning and that every `stage_source` reads `tracker`.
5. Run `uv run shared/strip_goal_stage.py --dry-run`, read the list, and run it without `--dry-run`.
6. Rebuild the index again. Check that the stage of each design is the same as before step 3, except for the stages that the engineer changed.

## Test Plan

- E8-1: no suite test. The evidence is the notes.
- E8-2: replay tests of the create argv. A contract case on the fake and on the replay. One live test in a scratch tracker for the duplicate guard. The live test skips without `bd`.
- E8-3: the six cases of the stage table on the fake adapter. A counting-runner test for the three bd calls. A test of the unreadable tracker with a runner that raises `AdapterError`. A contract test for `all_records` on the fake, the files, and the beads replay.
- E8-4: the strip test with three designs, a dry run, and a second run. The sparse design corpus test with a design that has no goal stage.
- E8-5: the status word test over a fixture with one design at each stage. The viewer tests for `done` and for the new words.
- E8-6: the build test for `design_tracker`. The viewer tests for the chips and the footer. The viewer build test.
- E8-7: the rule test over the repair fixture. The dry run, second run, and interrupted run tests. One live test in a scratch tracker.
- E8-8: the existing doc checks run unchanged.
- Each slice runs its own test files. The main session runs `uv run pytest tests -q` and the viewer tests once, after all edits.
- The engineer runs the live steps by hand. The repair, the strip, and the rebuild are not part of any test.

## Risks & Open Questions

1. **`cobuilder-memory` says `implemented` too early.** Its epics E2 and E3 are in `backlog` with open slices [S3]. The repair holds both. Until the engineer fixes the stage, the board shows all three epics as `completed`, because stage `implemented` makes each open epic read `completed`. Recommended: set the stage of `cobuilder-memory` to `approved` before E8-8 step 3. The engineer decides. With no answer, the repair holds the two epics and the board keeps the false reading.
2. **`plugin-split/E7` is `planned` with no branch and no pull request.** The repair holds it. Open: the engineer says if E7 was dropped, folded into another epic, or never built. A dropped epic should close by hand with `set-epic-state`.
3. **`cobuilder-implement` is at `approved`, and its two epics have a merged pull request (#11 and #12).** The rule "never close a live design" holds them. Open: the engineer decides if the stage should be `implemented`. If so, the next repair closes the epics by rule `stage-closes`. The decision text asked for both rules, so the designer put the stage rule above the pull request rule.
4. **Rule R1 holds three epics that the decision text would close.** The decision said the repair closes every epic of an `implemented` design. Choice E adds a guard. The engineer may remove the guard, and the repair then closes 37 epics. The cost is two unbuilt epics of `cobuilder-memory`.
5. **The merged-pull-request rule fires on no epic today.** Only the two open pull request records exist, and every other merged epic sits in a design that has a stage. The rule protects a future design with no stage. Open: the engineer may prefer to drop it. It costs one function.
6. **Nine open epics in three plan-only programs have no stage.** They are in `coach-reaches-green`, `describe-boundaries`, and `level-page-restructure` [S3]. The repair reports them and changes nothing. Open: the engineer says if each program needs a design, or if its epics close.
7. **A card shows few pull requests.** The tracker holds 2 pull request records [S2]. The board loses the join guess, which holds 46 epic-to-pull-request entries in the index today. Recommended: run `open-pull-request` for the live pull requests at `generate`, as ADR-0040 already says. A past pull request needs no record, because ADR-0029 keeps its content on GitHub.
8. **A build with no readable tracker fails after the strip.** Choice G fixes this behavior. Open: the engineer decides if a cloud session should build with a stage taken from the last index. The designer recommends no, because the build never merges.
9. **The strip does not run by itself.** A repo that never runs it keeps `goal.stage` as a harmless fallback. The tracker wins on every read, and the build warns when the values differ.
10. **The tracker has no stage for an old design until the stamp runs.** Between E8-3 and E8-8 the board reads the file for 11 designs. That is the fallback, and it gives the same lanes as today.
11. **Duplicate rows need a human.** E8 refuses writes and reports the rows. It does not merge them. A merge operation is out of scope.
12. **`repair-status` takes two optional inputs.** Without `--plans-dir` it reads no legacy stage, so it stamps nothing and closes only by the tracker stage. Without `--index` the index rule is off. The result field `checked` says which inputs it used.
13. **The program count differs from the request.** The request named 12 plan-only programs. The spike found 11 programs to stamp and 5 programs with no design and no stage [S2]. The live tracker moves, because other sessions seed programs.
14. **No test reads the live tracker or the live plans.** The fixtures in `tests/fixtures/tracker/stage/` and `tests/fixtures/tracker/repair/` hold the corpora. The numbers in this document come from the spike.
