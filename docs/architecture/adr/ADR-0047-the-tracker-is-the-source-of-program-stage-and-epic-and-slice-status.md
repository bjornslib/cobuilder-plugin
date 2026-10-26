---
title: "ADR-0047 — the tracker is the source of program stage and of epic and slice status"
status: active
type: architecture
last_verified: 2026-10-25
owner: bjornslib
id: ADR-0047
source_pr: null
name: "the tracker is the source of program stage and of epic and slice status"
state: decided
groups: [data-model, workflow]
approved_by: ""
problem: "A design keeps its stage in goal.json, and the tracker keeps a second stage on the program record. Eleven designs have a goal stage and a tracker program with no stage. Thirty-seven open epics sit under designs that are finished or superseded. The Work board reads the file, so it shows a stage that no tracker write can change."
decision: "The tracker program record is the primary source of the stage, and the tracker lifecycle is the source of epic and slice status. Design mode creates the program record at stage 0 through set-program-stage, and it writes every later stage only through the tracker. goal.json loses the stage field, and the files adapter keeps a legacy read as the fallback. The index takes the stage, the status, the next ready slice, and the pull request records from the tracker with one record read. A one-time operation repair-status closes the stale records. This amends ADR-0031 and ADR-0040."
maps_to:
  context: tracker-port
  modules: [shared/build_index.py, shared/tracker_port/reader.py, shared/tracker_port/port.py, shared/tracker_port/beads_writes.py, shared/tracker_port/repair_status.py, shared/tracker.py, plugins/artifact/viewer/src/data/bundle.ts]
  rule: "A program stage is written only through tracker.py when a tracker is configured. A repair never closes a record of a design at approved, review, backlog, or decided. A repair reads no GitHub, and it reads a pull request only from a tracker record or from the built index."
forces:
  - "ADR-0031 says the beads issue holds the state and wins over any file. ADR-0040 rule (a) forbids a hand edit of state in goal.json. The field stage in goal.json still holds state, and design mode still writes it."
  - "set-program-stage refuses a program that the tracker does not hold. A new design has no program record until Gate 3 seeds one, so the file was the only home of an early stage."
  - "The tracker holds 31 programs. Sixteen hold no stage. Eleven of those have a design with a goal stage, and five have no design and no stage."
  - "Thirty-seven open epics belong to designs at implemented or superseded. A closed program with open epics reads as unfinished work on the board."
  - "A close by stage is wrong for a design that was marked implemented too early. The design cobuilder-memory says implemented, and two of its three epics are in backlog with open slices."
  - "ADR-0029 makes the pull request content that GitHub holds. The port reads no GitHub, so a repair cannot ask GitHub whether a pull request merged."
  - "The index build makes four bd list calls today and takes about four seconds. One call that reads every record, and one ready call, fit inside that time."
  - "A second machine that creates a program before it syncs makes two rows with one cb id. A write then changes one row and a read shows the other."
alternatives:
  - option: "Keep goal.json as the source and mirror the stage into the tracker"
    rejected_because: "A mirror has two writers and no winner. The two values already differ for eleven designs, and ADR-0031 already says the tracker wins."
  - option: "Change only the index so it prefers the tracker stage, and leave design mode writing goal.json"
    rejected_because: "The tracker holds no stage for a new design, so the index falls back to the file at once. The field stays the real source, and the strip step has no reason to exist."
  - option: "Add a new operation create-program for stage 0"
    rejected_because: "It adds a port method, a CLI operation, and a branch to every design mode run. The call set-program-stage with a plans directory creates the record once, and a second call only sets the stage."
  - option: "Fold the repair into seed-from-files"
    rejected_because: "The seed only creates records from files. A close by stage and by pull request evidence needs the index and the pull request records, which the seed does not read."
  - option: "Let the repair ask GitHub with gh pr list for each epic branch"
    rejected_because: "ADR-0029 and the port rule forbid a GitHub read in the port. The built index already holds the answer that the build resolved."
  - option: "Strip goal.json stage inside the bundle migration ladder"
    rejected_because: "A migration must succeed with no tracker, and a strip must first check that the tracker holds the stage. The ladder cannot read a live tracker."
delivers:
  capability: "One tracker read gives the stage, the status, the next ready slice, and the pull request state of every design, and the Work board shows them."
  benefit: "A stage write changes the board at once. A finished design stops showing open epics. The next slice is on the card."
  beneficiary: [developer, implement-worker, reviewer]
  enables: ["A card that shows the next ready slice and the pull request state", "A later gate that reads the stage from the tracker only"]
provenance: authored
history:
  - { state: decided, date: 2026-10-25, by: engineer, note: "Decided in session: the tracker is the primary source of stage and status, design mode creates the program record at stage 0, goal.json loses the stage field with a legacy fallback, and the Work board and a one-time repair follow." }
related_decisions:
  - { type: amends, target: ADR-0031 }
  - { type: amends, target: ADR-0040 }
  - { type: is-related-to, target: ADR-0044 }
  - { type: is-related-to, target: ADR-0029 }
  - { type: is-related-to, target: ADR-0034 }
  - { type: is-related-to, target: ADR-0018 }
related:
  - "docs/plans/beads-storage/epic-E8-design.md"
  - "shared/tracker-usage.md"
---

# ADR-0047 — the tracker is the source of program stage and of epic and slice status

## Context

E4 moved the epic fields `branch`, `pr`, and `state` out of goal.json and into the tracker. The field `stage` stayed. Design mode still writes it, and `build_index.py` still reads it. So the Work board lane comes from a file, and the tracker holds a second value that no reader uses.

The spike of E8 gave these facts. The full evidence is in `/tmp/e8-spike.md` and in the E8 design.

- The tracker holds 31 programs, 116 epics, 146 slices, and two pull request records. Sixteen programs hold no stage. Eleven of them belong to a design that has a goal stage. No design has a goal stage and a tracker stage that differ.
- Thirty-four open epics belong to a design at implemented or superseded, and the repair rules accept them. Three more epics belong to a design at implemented, and the repair rules hold them. Two open epics of a design at approved have a merged pull request in the index.
- `set-program-stage` on a program that the tracker does not hold exits 4. A `create_record` of a program with the stage and the texts works.
- A second create that skips the guard gives two rows with one cb id. A `set_program_stage` then wrote the first row, and `list_programs` read the second row.
- The index build ends with a traceback when bd cannot be read. It makes four bd list calls, and they take about four seconds.

## Decision

1. **Source.** The program record in the tracker holds the stage. The lifecycle of an epic and of a slice in the tracker is its status. A file stage is a legacy fallback and no more.
2. **Create at stage 0.** The call `set-program-stage <program> <stage> [--plans-dir DIR]` creates the program record when the tracker holds none, and only when `--plans-dir` is given and the file `<DIR>/../architecture/designs/<program>/goal.json` exists. The record gets the stage, the `title`, the outcome as `description`, and the done-when list as `acceptance_criteria`. These are the texts that the seed gives. Without the flag, a missing program still exits 4. A second call on a held record only sets the stage.
3. **Write only through the tracker.** Design mode, the odyssey merge step, and generate mode write the stage through `set-program-stage`. Exit 2 means that no tracker is configured, and the procedure then writes `stage` into goal.json as the legacy fallback. Exit 3 stops the procedure and writes nothing to goal.json.
4. **Schema.** The field `stage` leaves the goal.json schema in `design-mode.md`. It stays legal as a legacy field. The check against `DESIGN_STAGES` runs on the resolved value, whichever source gave it.
5. **Index.** `design.stage` takes the tracker value, then the legacy goal value, and then it fails with a named message. The index also gets the join `tracker` and the join `design_tracker`. They hold the source of each stage, the next ready slice, and the pull request records of each design. A tracker value and a goal value that differ give a warning, and the tracker wins.
6. **Status words.** A closed epic reads `completed`. When the design stage is `implemented`, each epic that is not closed also reads `completed`. When the stage is `superseded`, each epic that is not closed reads `superseded`. The slice word `in_progress` is new. The slice word never follows the design stage.
7. **One read.** The port gets the operation `all_records()`. It returns every program, epic, slice, and pull request record from one bd read. The index build makes that one read and one ready call, and no other tracker call.
8. **Board.** Each card shows the lane, the closed slices over the total, the closed epics over the total, the next ready slice, and the state of each pull request record. A pull request chip names its state, and the merge icon appears for a merged record only.
9. **Repair.** The new operation `repair-status [--dry-run] [--plans-dir DIR] [--index PATH]` stamps a missing stage from the legacy goal stage, and it closes the epics and slices of a design at superseded. It closes the epics of a design at implemented, except an epic that shows no work. It closes an epic of a design with no stage when a pull request record or the index shows a merged pull request. It never closes a record of a design at approved, review, backlog, or decided. It lists each record with its rule, it makes one sync, it is idempotent, and a dry run writes nothing.
10. **Strip.** The script `shared/strip_goal_stage.py` removes `stage` from a goal.json only when the tracker program holds the same stage. It reports every other file and leaves it. It is not part of the bundle migration ladder.
11. **Duplicates.** A write that finds two rows with one cb id refuses and names both bd ids. `doctor` lists the duplicates.

## Obsolete after this ADR

- ADR-0031: the line that the stateful `epics[]` keys leave goal.json in E4 is incomplete, because the key `stage` also leaves. The moment row "Gate 3 passes, the design seeds a program" is true only for a program that stage 0 did not already create.
- ADR-0040: the moment row "A design is decided or approved" gains the first moment, "Design stage 0 names the design", and it calls `set-program-stage` with `--plans-dir`. The port gains `all_records` and the optional operation `repair_status`.
- `design-mode.md`: sections 3, 10.1, and 12, in the places that say design mode writes `goal.stage`. The example in section 12 also shows `branch`, `pr`, and `state` in `epics[]`, which E4 removed.
- The odyssey `SKILL.md`: the lines that roll `goal.stage` after a merge, and the line that reads `goal.stage` to find candidate designs.
- `CLAUDE.md`: the rule that `goal.stage` must be one of `DESIGN_STAGES`. The rule now covers the resolved stage.

## Consequences

- A stage write through the tracker changes the board after the next index build. No file edit is needed.
- A repo with no tracker config keeps the old path. The files adapter reads the legacy stage, and design mode writes it. The board shows no next ready slice and no pull request record there.
- A new design has a program record at stage 0. The Gate 3 seed skips the held program and creates the epics and the slices.
- The index build fails when the tracker cannot be read and a design has no legacy stage. The message names the cause. The viewer keeps the last committed index.
- The strip is safe to run in any order, because it checks the tracker first. It must run after `repair-status` stamps the eleven missing stages.
- The pull request chip on a card comes from the tracker pull request records. The tracker holds two of them today, so most cards show none until `open-pull-request` runs for each pull request.
- A design marked implemented too early shows all epics as completed until a person fixes the stage. The repair lists such a design under its holds.
