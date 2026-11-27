// Snapshot of .cobuilder-architect/self/data/index.json at 902f202. Prototype data only.
window.BOARD = {
 "gitHead": "902f202afe49dd6b94e4947cd9602c99ab33f16b",
 "stages": [
  "backlog",
  "decided",
  "approved",
  "review",
  "implemented",
  "superseded"
 ],
 "stageLanes": [
  {
   "key": "decision",
   "label": "Needs a decision",
   "stages": [
    "backlog",
    "decided"
   ]
  },
  {
   "key": "build",
   "label": "Ready to build",
   "stages": [
    "approved"
   ]
  },
  {
   "key": "review",
   "label": "In review",
   "stages": [
    "review"
   ]
  },
  {
   "key": "shipped",
   "label": "Shipped",
   "stages": [
    "implemented"
   ]
  },
  {
   "key": "superseded",
   "label": "Superseded",
   "stages": [
    "superseded"
   ]
  }
 ],
 "statusColumns": [
  {
   "key": "planned",
   "label": "Planned"
  },
  {
   "key": "in_progress",
   "label": "In progress"
  },
  {
   "key": "done",
   "label": "Done"
  }
 ],
 "programs": [
  {
   "id": "beads-storage",
   "name": "beads-storage",
   "stage": "approved",
   "outcome": "A tracker port sits between CoBuilder and the task system, and beads is its first adapter. Programs, epics, slices, and pull requests live in one proposed central store, which no test verifies yet. The same data/index.json serves the viewer, and one next-ready call answers what is next.",
   "nextReady": null,
   "pullRequests": [
    {
     "ref": "pr-43",
     "number": 43,
     "state": "merged",
     "epics": [
      "beads-storage/E3",
      "beads-storage/E2",
      "beads-storage/E4",
      "beads-storage/E1"
     ]
    },
    {
     "ref": "pr-50",
     "number": 50,
     "state": "merged",
     "epics": [
      "beads-storage/E5"
     ]
    },
    {
     "ref": "pr-51",
     "number": 51,
     "state": "merged",
     "epics": [
      "beads-storage/E7"
     ]
    },
    {
     "ref": "pr-52",
     "number": 52,
     "state": "merged",
     "epics": [
      "beads-storage/E8"
     ]
    }
   ],
   "epics": [
    {
     "id": "beads-storage/E1",
     "epicId": "E1",
     "status": "completed",
     "col": "done",
     "branch": "design/beads-storage/tracker-port",
     "pr": null,
     "note": null,
     "slices": [
      {
       "id": "beads-storage/1",
       "n": 1,
       "title": "Tracer bullet: fake adapter and golden index",
       "endsWith": "A test loads the fixture corpus through the fake adapter, matches `expected-index.json`, and one next-ready case passes.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "beads-storage/2",
       "n": 2,
       "title": "Full contract suite on the fake adapter",
       "endsWith": "Contract cases 1 to 6 pass on the fake adapter, and a write with no configured adapter exits 2.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 2
      },
      {
       "id": "beads-storage/3",
       "n": 3,
       "title": "Files adapter reads the plans tree and backfill dry run",
       "endsWith": "The files adapter lists the miniature plans tree and projects it to the same index shape as the fake corpus with no `bd` on the path, and every state write it receives exits 2. The backfill dry run on the fake adapter lists the creates, the list equals a checked-in file, and a second run creates nothing. The reference `shared/tracker-backfill.md` names each of its seven steps.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "beads-storage/4",
       "n": 4,
       "title": "Command prints JSON and exit codes",
       "endsWith": "`shared/tracker.py list-programs` prints the corpus as JSON, and the CLI test shows exit codes 0, 2, 3, and 4. A spy shows zero opens of `docs/plans` during `list-programs` and `next-ready`. With `--state-file`, a write in one call shows in the next call.",
       "state": "completed",
       "col": "done",
       "score": "0.92",
       "attempts": 1
      },
      {
       "id": "beads-storage/5",
       "n": 5,
       "title": "Usage reference matches the command",
       "endsWith": "A reader runs each example in `shared/tracker-usage.md` and gets the output that the reference shows.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 3
      }
     ]
    },
    {
     "id": "beads-storage/E2",
     "epicId": "E2",
     "status": "completed",
     "col": "done",
     "branch": "design/beads-storage/tracker-port",
     "pr": null,
     "note": null,
     "slices": [
      {
       "id": "beads-storage/6",
       "n": 6,
       "title": "Beads reads match the fake adapter",
       "endsWith": "The beads adapter maps the recorded `bd list --json` transcript to the same records as the fake corpus, the read cases pass, and contract case 7 (projector parity) passes.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 2
      },
      {
       "id": "beads-storage/7",
       "n": 7,
       "title": "Beads writes on recorded transcripts",
       "endsWith": "The beads write cases pass on recorded transcripts, including the claim read-back and the `metadata.cb` value round trip. Closing slice n makes slice n+1 the answer of `next-ready`.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 5
      },
      {
       "id": "beads-storage/8",
       "n": 8,
       "title": "Beads dry run matches the backfill file",
       "endsWith": "The beads adapter implements `seed-from-files`. On the recorded transcripts, its dry run lists the same creates as the checked-in file of slice 3.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 2
      },
      {
       "id": "beads-storage/9",
       "n": 9,
       "title": "Fresh clone initializes, syncs, and seeds",
       "endsWith": "After explicit consent, the first publish runs `bd sync -y`, one `bd dolt push`, and `bd sync`, which exits 0. A fresh git clone runs `bd init --skip-agents --skip-hooks` and `bd sync` and sees the state. The backfill's write step then seeds the miniature plans tree there. A second run creates nothing, and the `bd list --json` count equals the dry-run count. The command output is pasted into the slice evidence.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    },
    {
     "id": "beads-storage/E3",
     "epicId": "E3",
     "status": "completed",
     "col": "done",
     "branch": "design/beads-storage/tracker-port",
     "pr": null,
     "note": null,
     "slices": [
      {
       "id": "beads-storage/10",
       "n": 10,
       "title": "Bundle index unchanged after the port",
       "endsWith": "`build_index.py` writes the same `data/index.json` for this repo as before the change, and the viewer `index.html` is byte equal.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 3
      },
      {
       "id": "beads-storage/11",
       "n": 11,
       "title": "Gate check and builds view read the port",
       "endsWith": "`verify_gate.py` and `build_builds_view.py` return the same result for every plan under `docs/plans` as before the change.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 3
      },
      {
       "id": "beads-storage/12",
       "n": 12,
       "title": "Status files regenerate from records",
       "endsWith": "Regenerating the fixture corpus writes `00-status.md` and `04-slices.md` files that equal their golden files.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    },
    {
     "id": "beads-storage/E4",
     "epicId": "E4",
     "status": "completed",
     "col": "done",
     "branch": "design/beads-storage/tracker-port",
     "pr": null,
     "note": null,
     "slices": [
      {
       "id": "beads-storage/13",
       "n": 13,
       "title": "Implement writes slice state",
       "endsWith": "A fixture slice run writes its claim, attempts, score, and state through `tracker.py`, and the status file shows the new score.",
       "state": "completed",
       "col": "done",
       "score": "0.97",
       "attempts": 1
      },
      {
       "id": "beads-storage/14",
       "n": 14,
       "title": "Architect writes gate values",
       "endsWith": "A fixture program records each gate value and the program stage through `tracker.py`, and the status file shows each approval date.",
       "state": "completed",
       "col": "done",
       "score": "0.95",
       "attempts": 1
      },
      {
       "id": "beads-storage/15",
       "n": 15,
       "title": "Pull request blocks two epics",
       "endsWith": "A pull request record blocks two fixture epics until its state is set to merged, and then both epics show as ready.",
       "state": "completed",
       "col": "done",
       "score": "0.93",
       "attempts": 1
      },
      {
       "id": "beads-storage/16",
       "n": 16,
       "title": "Goal file drops epic state fields",
       "endsWith": "`goal.json` holds no `branch`, `pr`, or `state` key after the migration, and the artifact view lists the same epics.",
       "state": "completed",
       "col": "done",
       "score": "0.97",
       "attempts": 1
      },
      {
       "id": "beads-storage/17",
       "n": 17,
       "title": "Docs test guards the port and install asks first",
       "endsWith": "`tests/test_tracker_docs.py` passes on this repo, and it fails when a `bd` call appears outside `shared/tracker_port/`. The install command runs the backfill dry run after adapter config and asks for consent before any write.",
       "state": "completed",
       "col": "done",
       "score": "0.97",
       "attempts": 1
      }
     ]
    },
    {
     "id": "beads-storage/E5",
     "epicId": "E5",
     "status": "completed",
     "col": "done",
     "branch": "feature/beads-native-e5",
     "pr": null,
     "note": null,
     "slices": [
      {
       "id": "beads-storage/18",
       "n": 18,
       "title": "Spike: claim flags, exit codes, lease expiry",
       "endsWith": "The beads notes list each flag set, exit code, and lease result, with the command that produced it.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "beads-storage/19",
       "n": 19,
       "title": "Atomic claim",
       "endsWith": "Contract case 3 passes on beads with one write, and eight concurrent claims give one winner.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "beads-storage/20",
       "n": 20,
       "title": "Native ready, with parity",
       "endsWith": "Ready parity holds for each kind on the recorded corpus, and contract cases 1 and 2 pass on beads.",
       "state": "completed",
       "col": "done",
       "score": "0.92",
       "attempts": 1
      },
      {
       "id": "beads-storage/21",
       "n": 21,
       "title": "Pull request gate",
       "endsWith": "The gate resolves when the pull request merges, and the slice 15 test stays green.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "beads-storage/22",
       "n": 22,
       "title": "Slice-loop formula",
       "endsWith": "The formula cooks and pours, a failed attempt adds a wisp, and squash with `--keep-children` keeps the attempt history.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    },
    {
     "id": "beads-storage/E6",
     "epicId": "E6",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": null,
     "slices": []
    },
    {
     "id": "beads-storage/E7",
     "epicId": "E7",
     "status": "completed",
     "col": "done",
     "branch": "feature/beads-mapping",
     "pr": null,
     "note": null,
     "slices": [
      {
       "id": "beads-storage/23",
       "n": 23,
       "title": "Spike notes into the adapter notes",
       "endsWith": "The notes hold each spike finding with its command and exit code",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "beads-storage/24",
       "n": 24,
       "title": "Type, title, label, and text mapping",
       "endsWith": "A created issue has the new type, the name as title, the label, and the text fields. A read returns them. `prepare` sets no custom type.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 2
      },
      {
       "id": "beads-storage/25",
       "n": 25,
       "title": "Hierarchy and ordering edges",
       "endsWith": "A seed gives the epic chain and the slice chain, and the deferred epic gets a native defer date",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "beads-storage/26",
       "n": 26,
       "title": "Pull request as a milestone with `tracks`",
       "endsWith": "A PR holds its epics by `tracks` and blocks nothing. No gate remains.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "beads-storage/27",
       "n": 27,
       "title": "Native ready for slices, with parity",
       "endsWith": "`next_ready(\"slice\", under)` runs `bd ready`. `native_ready` is true. The parity test holds on the corpus.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "beads-storage/28",
       "n": 28,
       "title": "`claim-next`",
       "endsWith": "One call claims the first ready slice. Nothing ready gives `null` and exit 0.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "beads-storage/29",
       "n": 29,
       "title": "`migrate-mapping` with dry run",
       "endsWith": "A legacy scratch tracker converts in one sync. A dry run writes nothing. A second run changes nothing.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "beads-storage/30",
       "n": 30,
       "title": "Docs, install, usage",
       "endsWith": "The docs name the two operations and the migration. `tracker.py --help` lists them.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 2
      }
     ]
    },
    {
     "id": "beads-storage/E8",
     "epicId": "E8",
     "status": "completed",
     "col": "done",
     "branch": "feature/work-board-alignment",
     "pr": null,
     "note": null,
     "slices": [
      {
       "id": "beads-storage/31",
       "n": 31,
       "title": "Spike notes into the adapter notes",
       "endsWith": "The notes hold each spike finding with its command and exit code",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "beads-storage/32",
       "n": 32,
       "title": "The tracker creates the program record, and design mode says so",
       "endsWith": "`set-program-stage --plans-dir` creates a missing record. A write refuses on a duplicate.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "beads-storage/33",
       "n": 33,
       "title": "The index reads the stage from the tracker, with a fallback",
       "endsWith": "`design.stage` comes from the tracker, then from the file. The build makes at most three bd calls.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "beads-storage/34",
       "n": 34,
       "title": "The strip step and the schema change",
       "endsWith": "Design mode writes no `goal.stage` when a tracker exists. The strip script passes its tests.",
       "state": "completed",
       "col": "done",
       "score": "0.97",
       "attempts": 1
      },
      {
       "id": "beads-storage/35",
       "n": 35,
       "title": "Epic and slice status on the board",
       "endsWith": "The words follow the table. `done` counts `completed` epics.",
       "state": "completed",
       "col": "done",
       "score": "0.95",
       "attempts": 1
      },
      {
       "id": "beads-storage/36",
       "n": 36,
       "title": "Next ready and pull request state on the board",
       "endsWith": "A card shows the next ready slice and the state of each pull request record.",
       "state": "completed",
       "col": "done",
       "score": "0.90",
       "attempts": 1
      },
      {
       "id": "beads-storage/37",
       "n": 37,
       "title": "`repair-status` with a dry run",
       "endsWith": "A scratch tracker repairs in one sync. A dry run writes nothing. A second run changes nothing.",
       "state": "completed",
       "col": "done",
       "score": "0.95",
       "attempts": 1
      },
      {
       "id": "beads-storage/38",
       "n": 38,
       "title": "Live repair, docs, and install",
       "endsWith": "The three live steps run in order. The docs name the new operations and the strip.",
       "state": "completed",
       "col": "done",
       "score": "0.97",
       "attempts": 1
      }
     ]
    }
   ],
   "looseSlices": []
  },
  {
   "id": "book-index-tiering",
   "name": "book-index-tiering",
   "stage": "review",
   "outcome": "book-index.md offers nano, mini, and full tiers for all 14 vendored books, with a 3-nano-minimum judgment-gated escalation rule; Review/Maintenance's mandatory 14-file security corpus load gets the same cheap-signal-before-expensive-read shape, opposite default bias, no vendoring.",
   "nextReady": null,
   "pullRequests": [],
   "epics": [
    {
     "id": "book-index-tiering/E1",
     "epicId": "E1",
     "status": "open",
     "col": "in_progress",
     "branch": "design/book-index-tiering",
     "pr": 16,
     "note": null,
     "slices": []
    }
   ],
   "looseSlices": []
  },
  {
   "id": "build-workflow-polish",
   "name": "build-workflow-polish",
   "stage": "superseded",
   "outcome": "An engineer running architect:design into implement:start never loses the handoff, 04-slices.md is always written in the shape verify_gate.py actually parses, a validated slice is committed without an extra prompt, and the bundle viewer borrows the tab-based Diagram / Data flow / Data types layout a colleague prototyped.",
   "nextReady": null,
   "pullRequests": [],
   "epics": [
    {
     "id": "build-workflow-polish/E1",
     "epicId": "E1",
     "status": "completed",
     "col": "done",
     "branch": null,
     "pr": null,
     "note": "Stage 7 in architect's references/design-mode.md ends design mode after creating the first branch, with no pointer to what runs next. Add one line after the branch is created: 'Design mode's work ends here. To build this design's epics, run /implement:start.' Do not have design mode invoke implement:start itself \u2014 architecture modes are self-only in scope, and implement already owns Gate 1's design-record lookup (build/SKILL.md's 'Optional: design mode record' section). This is a one-line prose addition to a mode-governing reference file, so it still needs the Gate-selection exception's behavioral rubric, not a skip.",
     "slices": []
    },
    {
     "id": "build-workflow-polish/E2",
     "epicId": "E2",
     "status": "completed",
     "col": "done",
     "branch": null,
     "pr": null,
     "note": "04-slices.md's Gate 4a instructions in build/SKILL.md describe the table only through the worked example, and never say the table must match shared/slice_table.py's exact column shape (six columns: #, Epic, Slice, Ends with, Score, State, with the epic-header row's precise empty-cell pattern) or point to that module as the source of truth. Add an explicit sentence and a link, so an authoring session does not freehand a table shape verify_gate.py silently fails to parse. Consider also having verify_gate.py surface parse_table()'s `unparsed` list by name when it is non-empty, instead of only reporting downstream symptoms like a missing epic.",
     "slices": []
    },
    {
     "id": "build-workflow-polish/E3",
     "epicId": "E3",
     "status": "completed",
     "col": "done",
     "branch": null,
     "pr": null,
     "note": "build/SKILL.md's 'After each slice' section (the four numbered steps following the red-green-validate loop) records the score and asks 'Proceed to the next slice, or adjust direction?' but never commits. In practice this produces a spurious 'want to commit this checkpoint first?' prompt after every slice instead of an automatic commit. Change step 2 (or add a step) so that once VALIDATE scores a slice at or above 0.90, the orchestrator commits the slice's changes to git immediately, before asking whether to proceed \u2014 no confirmation question for the commit itself, only for what comes after. A score below threshold still routes through the existing gap decision tree in references/validation-scoring.md, and does not commit. Below-threshold slices accepted with reservations after three attempts should also commit, since that path already represents a final accepted state, not a pending one.",
     "slices": []
    },
    {
     "id": "build-workflow-polish/E4",
     "epicId": "E4",
     "status": "completed",
     "col": "done",
     "branch": null,
     "pr": null,
     "note": "A colleague's scratch artifact (/private/tmp/.../diagram-viewer.html, session-local, not part of this repo) uses a top-of-panel tab switcher across three views \u2014 Diagram, Data flow, Data types \u2014 instead of stacking them, plus a right-hand info rail. Evaluate adopting the same top-tab pattern for viewer/index.html's per-PR diagram levels (currently level 1/2/3 switching, per ADR-0020's viewer/src/ plan), and separately evaluate narrowing the left-hand navigation rail so it takes less width once tabs handle top-level switching. This touches only the viewer, so it can run through architect:design on its own without waiting on E1-E3.",
     "slices": []
    }
   ],
   "looseSlices": []
  },
  {
   "id": "cobuilder-implement",
   "name": "cobuilder-implement",
   "stage": "approved",
   "outcome": "The architecture design produced by cobuilder-architect carries directly into implementation: its intent is decomposed into testable epics, and each epic ships as vertical slices that an independent validator scores at 0.90 or better before the next one starts.",
   "nextReady": null,
   "pullRequests": [],
   "epics": [
    {
     "id": "cobuilder-implement/E1",
     "epicId": "E1",
     "status": "merged",
     "col": "done",
     "branch": "design/design-mode",
     "pr": 11,
     "note": "Shares a branch and a pull request with the design-mode design. See ADR-0013: a branch may carry more than one design.",
     "slices": []
    },
    {
     "id": "cobuilder-implement/E2",
     "epicId": "E2",
     "status": "merged",
     "col": "done",
     "branch": "docs/post-pr11-cleanup",
     "pr": 12,
     "note": "Gate 4b is enforced instead of merely specified. The per-epic technical solution design already exists in SKILL.md section 4b, with a six-section template, and five downstream files reference the artifact. Nothing checks that it was written. Checked on 2026-08-24: zero epic-<id>-design.md files exist, and six epics shipped without one. Four failures allow that. Gate 4's only exit check counts rubrics, so a Gate 4 that skips 4b still passes. slice-loop.js builds the epic-design path and never checks the file exists, so the red and green agents are told to read a file that is absent and quietly fall back to 03-program-design.md. rubric-authoring.md tells the author to update the technical design first, and nobody checks that either. No test asserts the artifact. The root cause is that 4b is the only Gate 4 sub-step whose output nothing downstream mechanically requires: the loop cannot score without rubrics or iterate without a slice plan, but it can read an absent design. This epic adds the exit check, the existence guard in the workflow, a test, and sub-step tracking in 00-status.md so an approved Gate 4 cannot hide a missing 4b. Raised 2026-08-22, re-scoped 2026-08-24 from 'write the process' to 'enforce the process' after reading the skill.",
     "slices": []
    }
   ],
   "looseSlices": []
  },
  {
   "id": "cobuilder-memory",
   "name": "cobuilder-memory",
   "stage": "implemented",
   "outcome": "plugins/cobuilder-memory installs from this marketplace and gives the main agent the consult tool. Haiku writes the recall query, picks a knowledge page, and writes reflect questions, all through the Hindsight MCP tools. Design and build call the tool, and a pane shows each run.",
   "nextReady": null,
   "pullRequests": [],
   "epics": [
    {
     "id": "cobuilder-memory/E1",
     "epicId": "E1",
     "status": "completed",
     "col": "done",
     "branch": "design/cobuilder-memory",
     "pr": 40,
     "note": null,
     "slices": [
      {
       "id": "cobuilder-memory/1",
       "n": 1,
       "title": "Tracer bullet: the installed plugin proves each Hindsight MCP tool and answers consult",
       "endsWith": "A session started with `--plugin-dir plugins/cobuilder-memory` lists `mcp__cobuilder-memory__consult`, and `claude plugin validate .` accepts the marketplace with its new entry. From the loaded plugin, `/memory-check` returns `ok` for `recall`, `search_knowledge_base`, `get_knowledge_page`, and `reflect`. The evidence records one reflect's time and what the engine does past its MCP timeout. A consult call returns the judging rules first, then the header, the Need line, and the recall records, with this session's own transcript dropped. With no `hindsight` server that has these tools, the run names what to set up. `claude plugin validate`, `claude plugin test`, and `uv run pytest tests -q` pass. The tests cover the amended install rule, the marketplace entry, the matching versions, and the `shared` symlink.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "cobuilder-memory/2",
       "n": 2,
       "title": "A knowledge page joins the run",
       "endsWith": "`search_knowledge_base` runs beside recall. Haiku's second call may pick one page, and `get_knowledge_page` reads it. The result shows its name, update date, and body. The run never shows a page whose snippet or body is empty or reads \"Generating content...\". The module refuses a page id that the search did not return.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "cobuilder-memory/3",
       "n": 3,
       "title": "Reflect questions written from the records",
       "endsWith": "Haiku writes a context and up to three reflect questions. Each names an ADR id or term of the kept records. The page read and the `reflect` calls run side by side through `$.mcp.call`. A reflect that fails or times out writes its reason. The other answers still show.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "cobuilder-memory/4",
       "n": 4,
       "title": "The memory pane shows each run",
       "endsWith": "The pane `memory-run`, titled `\ud83e\udde0 CoBuilder Memory: Hindsight Run`, matches the approved Gate 2b design. It opens before the first Haiku call. While a run works, it shows each step and each Hindsight call with its state and counts, and the elapsed time. When the run ends, it shows the records, the page, and each reflect answer or its failure. `/memory-recall` opens it at any width, and a tool run opens it unasked from 144 columns.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "cobuilder-memory/5",
       "n": 5,
       "title": "Design and build call the consult tool at fixed steps",
       "endsWith": "Design stage 1 and implement Gate 1 call the consult tool when the session lists it. Otherwise they state that it is absent. The implement skill holds no H1 to H5 checkpoint. A blind agent given design stage 1 calls the consult tool before it drafts the hypothesis.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "cobuilder-memory/6",
       "n": 6,
       "title": "One install command sets up the family, with the Hindsight allow rules",
       "endsWith": "`/cobuilder-full-lifecycle:install` runs the habit-hooks setup that `/implement:install` ran, the glossary check, and a new Hindsight step. `/implement:install` hands over to it. The coach check stays in `implement` as its own mode, because only `implement` can resolve its script path. The Hindsight step finds the allow rules that the session needs and `~/.claude/settings.json` lacks. It asks once, and it adds them only after a yes. A test checks that each Hindsight tool that cobuilder-memory calls, and the retain tool of the slice note, appears in the setup skill. A blind agent adds only the missing rules after a yes, and adds none after a no.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "cobuilder-memory/7",
       "n": 7,
       "title": "The value check in two repos",
       "endsWith": "One design question in this repo and one in think-with-ai each get a run. Each run returns a dated record that the main agent uses or rejects with a reason. The evidence file holds both transcripts. CLAUDE.md, README.md, and DDD-VOCABULARY.md name six plugins, and ADR-0025's history names ADR-0039.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "cobuilder-memory/8",
       "n": 8,
       "title": "The agent's focus steers the recall query",
       "endsWith": "`consult` takes an optional `focus` string. Haiku reads three inputs in a fixed order of authority: the focus sets the topic, the session end gives the concrete names, and the person's stored prompts add context only. The session end is the last six messages with text, after injected hook blocks are removed, and at most 12,000 characters. The result and the pane show the focus, or state that none was given. Design stage 1 and Gate 1 pass a focus. A live run whose focus and last prompt name different topics writes a Recall line on the focus.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    },
    {
     "id": "cobuilder-memory/E2",
     "epicId": "E2",
     "status": "completed",
     "col": "done",
     "branch": null,
     "pr": null,
     "note": null,
     "slices": [
      {
       "id": "cobuilder-memory/9",
       "n": 9,
       "title": "A Jev gate decides every n tool calls",
       "endsWith": "Every n tool calls, one Jev `noul` question judges whether a consult would help. Above the threshold, the plugin starts a run. A measured sample sets n, the threshold, the latency, and the cost.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    },
    {
     "id": "cobuilder-memory/E3",
     "epicId": "E3",
     "status": "completed",
     "col": "done",
     "branch": null,
     "pr": null,
     "note": null,
     "slices": [
      {
       "id": "cobuilder-memory/10",
       "n": 10,
       "title": "Stub: the pane lists every Hindsight call of the session",
       "endsWith": "The memory pane lists each Hindsight call of the session. It marks the plugin's own runs apart. Sources: the agent's `mcp__hindsight__` calls, `diag.jsonl`, and the audit log.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    }
   ],
   "looseSlices": []
  },
  {
   "id": "cobuilder-viewer",
   "name": "cobuilder-viewer",
   "stage": "review",
   "outcome": "A reader opens the bundle on three goal-shaped surfaces, built as TypeScript and React and compiled to one file. FlightDeck, the surface that replaces the Pull requests tab, shows a single pull request at today's parity, or lets the reviewer select several open pull requests to get a validated merge-path recommendation and a narrative for that set.",
   "nextReady": "cobuilder-viewer/1",
   "pullRequests": [],
   "epics": [
    {
     "id": "cobuilder-viewer/E1",
     "epicId": "E1",
     "status": "open",
     "col": "in_progress",
     "branch": "design/cobuilder-viewer/work-prototype",
     "pr": null,
     "note": "Carried from react-viewer E1 unchanged. Must land before any bundled build, or publishing breaks silently. It stays in the narrowed scope because the markers live inside the committed index.html, and E2 changes how that file is produced. This epic is the regression guard on a shipped mode: publishing must keep working while the build underneath it changes.",
     "slices": [
      {
       "id": "cobuilder-viewer/1",
       "n": 1,
       "title": "Tracer bullet: a publish survives a marker rename",
       "endsWith": "The exporter matches the built file's named markers, and a real publish of the current viewer still succeeds after the marker names move",
       "state": "planned",
       "col": "planned",
       "score": "\u2014",
       "attempts": 0
      }
     ]
    },
    {
     "id": "cobuilder-viewer/E2",
     "epicId": "E2",
     "status": "open",
     "col": "in_progress",
     "branch": "design/cobuilder-viewer/work-prototype",
     "pr": null,
     "note": "Carried from react-viewer E2 unchanged. Vite plus vite-plugin-singlefile, a lockfile, and a pinned Node version. Starts with a spike: byte-equal rebuild across two machines, size with React inlined, and whether a Claude Artifact renders a Mermaid block React injects after page load.",
     "slices": [
      {
       "id": "cobuilder-viewer/2",
       "n": 2,
       "title": "Two builds produce the same bytes",
       "endsWith": "Two builds from the same lockfile on the same machine produce the same bytes, so the byte-equal guard is possible at all",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "cobuilder-viewer/3",
       "n": 3,
       "title": "The build owns the committed file",
       "endsWith": "The build reproduces `plugins/artifact/viewer/index.html` byte for byte, and one edited byte makes the rebuild test fail",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    },
    {
     "id": "cobuilder-viewer/E3",
     "epicId": "E3",
     "status": "open",
     "col": "in_progress",
     "branch": "design/cobuilder-viewer/work-prototype",
     "pr": null,
     "note": "Carried from react-viewer E3, extended per ADR-0027's answer to Q13. Define the placeholder type and a trivial compile-time exhaustiveness check now, in this epic, not retrofitted when E7 starts.",
     "slices": [
      {
       "id": "cobuilder-viewer/4",
       "n": 4,
       "title": "One typed model reads the bundle",
       "endsWith": "A level renders from `index.json` with no join derived in a component, and a field renamed on `PullRequest` and not on `OpenPullRequest` fails the type check",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    },
    {
     "id": "cobuilder-viewer/E4",
     "epicId": "E4",
     "status": "open",
     "col": "in_progress",
     "branch": "design/cobuilder-viewer/work-prototype",
     "pr": 21,
     "note": "New in round 2, at the engineer's direction. Prototype each surface in detail before committing to the build. review-flight-deck already used that discipline twice for FlightDeck: flightdeck-prototype.html, then flightdeck-hindsight-fork.html against real multi-author data. react-viewer's own 2026-09-07 prototype proved the Work board's shape, and it was never committed. This epic repeats that work and keeps the artifact, at docs/architecture/designs/cobuilder-viewer/prototypes/work-prototype.html. The engineer chose one pull request for the design, so all eighteen epics share one branch, design/cobuilder-viewer/work-prototype. Work starts here, because the three prototypes come before any React build.",
     "slices": [
      {
       "id": "cobuilder-viewer/5",
       "n": 5,
       "title": "The Work prototype, reviewed",
       "endsWith": "The Work surface itself, the ported shell, reads this repository's own records, and the engineer approved it rather than naming a change",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    },
    {
     "id": "cobuilder-viewer/E5",
     "epicId": "E5",
     "status": "open",
     "col": "in_progress",
     "branch": "design/cobuilder-viewer/work-prototype",
     "pr": null,
     "note": "Carried from react-viewer E4, with one vocabulary change. The level-and-section model replaced the lens model, per ADR-0028: a level is a sequence of sections, one section on screen at a time on a horizontal track, and the box owns the scroll rather than the pane. react-viewer's lens list described navigation rather than content, and it contradicted itself: every place that named the lenses listed six (intent, problem and solution, architecture, risks and verdict, build, pull requests), while three places said seven, including this epic's outcome. No seventh lens was ever named, and nothing renders a lens now. This design's five rows are Intent, Problem & Solution, Architecture, Epics, and Rubrics, and each one states its own sections. The engineer approved the rail's two groups on 2026-09-25. They land with the change's account, and not ahead of it. The criterion that survives from that outcome is the sparse record: a design whose records are goal.json only must render. Seven designs in this repository carry one, and they are the fixture for it. E4's prototype is the reference and the approval gate for this epic, not the uncommitted 2026-09-07 prototype. E4 shipped as a React application under plugins/artifact/viewer/src/variations/sections-e/, not as the static HTML file round 2's note asked for. The engineer decided where the content of the two removed rows goes, on 2026-09-25. The envisioned pull request lives on the program's Intent row, beside the change that opened. It is this design's own draft of the pull request it will open. This work's own pull-request list stays unbuilt, because the Epics row already carries each epic, its state, and its pull request. A second enumeration would state the same facts twice, so that is the reason and not an omission. The open set stays deferred with the multi-pull-request epics, E11 to E13, where it already lives. The release status stays out of the build, and the prototype alone keeps it. The engineer said the build should not carry it yet, no slice owns it, and nothing schedules it.",
     "slices": [
      {
       "id": "cobuilder-viewer/8",
       "n": 8,
       "title": "The section model",
       "endsWith": "One box is on screen, the strip, the pager bar, and the two arrow keys move one index, and the pane reports no scroll at all",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "cobuilder-viewer/9",
       "n": 9,
       "title": "The level's progress",
       "endsWith": "The strip reads 0 at the first section's top, 25 percent at its bottom, 50 on the second, 100 on the last, and never decreases on a forward walk",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "cobuilder-viewer/10",
       "n": 10,
       "title": "Every level renders its own sections",
       "endsWith": "A reader walks Intent, Problem & Solution, Architecture, Epics, and Rubrics, and each row renders its sections",
       "state": "planned",
       "col": "planned",
       "score": "\u2014",
       "attempts": 0
      },
      {
       "id": "cobuilder-viewer/11",
       "n": 11,
       "title": "The diagram tiles open their drawing",
       "endsWith": "A tile shows the drawing's miniature scaled to its box, a press opens it whole with zoom from 50 to 400 percent, Escape and the backdrop close it, and a failed render shows the authored source",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "cobuilder-viewer/12",
       "n": 12,
       "title": "A record opens in the Sheet",
       "endsWith": "Pressing a decision, a boundary rule, or an epic's design opens the whole record, and a part link scrolls the record and moves focus to that heading",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "cobuilder-viewer/13",
       "n": 13,
       "title": "A goal.json-only design renders",
       "endsWith": "One of the eight sparse designs shows every level it can fill, and the rail gates the levels it cannot",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    },
    {
     "id": "cobuilder-viewer/E6",
     "epicId": "E6",
     "status": "open",
     "col": "in_progress",
     "branch": "design/cobuilder-viewer/work-prototype",
     "pr": null,
     "note": "New in round 2, at the engineer's direction. review-flight-deck's own flightdeck-prototype.html and flightdeck-hindsight-fork.html prototyped multi-pull-request mode in detail against real data, and this epic reuses both rather than rebuilding either half. The engineer read the prototype again on 2026-09-25, as one work item read through two accounts. That reading fixed the shape this epic exists for. The rail groups its rows under Build and Review, and a press crosses between the accounts on a section of the same name. The account mark is a word and a glyph with no fill. The engineer removed the third group, Deploy, and the mode switch with it. The prototype is a React variation under plugins/artifact/viewer/src/variations/flightdeck/, served at its own dev entry, and not the static HTML file round 2's note named. E5's note records the four content decisions that removal raised. One of the four falls here: the release status stays out of the build and in this epic's prototype alone. No slice owns it, and nothing schedules it.",
     "slices": [
      {
       "id": "cobuilder-viewer/14",
       "n": 14,
       "title": "The FlightDeck prototype, reviewed",
       "endsWith": "One work item renders as two accounts, the change's account at parity, and the engineer approves it",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    },
    {
     "id": "cobuilder-viewer/E7",
     "epicId": "E7",
     "status": "open",
     "col": "in_progress",
     "branch": "design/cobuilder-viewer/work-prototype",
     "pr": null,
     "note": "Carried from react-viewer E5, renamed from 'Flight deck' to FlightDeck's single-pull-request mode, and re-cut on 2026-09-25 into the change's account. A work item and the pull request its own epics carry are two accounts of one surface: E5 renders the program's account, and this epic renders the change's, which the rail reaches under its Review group. Parity covers the four narration levels, diagrams, scene art, narration audio, the diff, and the intent and assessment sheet. The joins rail is gone with the re-cut. The decisions a change landed read in its own Architecture row. The epics that carry it read in the Build group's Epics and Rubrics rows. Ships before E10, because E10 depends on the typed PullRequest shape this epic exercises first.",
     "slices": [
      {
       "id": "cobuilder-viewer/15",
       "n": 15,
       "title": "The change's account renders",
       "endsWith": "A reader of a work item reads the change's Intent, Problem & Solution, Architecture, and File Diffs sections, each from that pull request's own records, at parity with today's viewer",
       "state": "completed",
       "col": "done",
       "score": "0.92",
       "attempts": 3
      },
      {
       "id": "cobuilder-viewer/16",
       "n": 16,
       "title": "The rail reads two accounts, each at its own address",
       "endsWith": "The rail groups its rows under Build and Review, `#/<work>/pull-requests/<pr>` opens the change's Intent section, one appended segment selects a named section, the row that opens the reader's address reads current, and the rail's fold and its arrow walk obey one convention",
       "state": "planned",
       "col": "planned",
       "score": "0.83",
       "attempts": 3
      },
      {
       "id": "cobuilder-viewer/17",
       "n": 17,
       "title": "The account mark, and the jump across",
       "endsWith": "Every section of both accounts carries its account's mark, a word and a glyph with no fill, and a press moves from one account's section to the other account's same-named section",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    },
    {
     "id": "cobuilder-viewer/E8",
     "epicId": "E8",
     "status": "open",
     "col": "in_progress",
     "branch": "design/cobuilder-viewer/work-prototype",
     "pr": null,
     "note": "New in round 2, at the engineer's direction. Unlike Work and FlightDeck, this surface has no prior prototype. Commits to docs/architecture/designs/cobuilder-viewer/prototypes/reference-prototype.html. Deferred on 2026-09-22, when the engineer narrowed the scope to the Work surface and FlightDeck at parity. Left the build; not deleted and not renumbered.",
     "slices": []
    },
    {
     "id": "cobuilder-viewer/E9",
     "epicId": "E9",
     "status": "open",
     "col": "in_progress",
     "branch": "design/cobuilder-viewer/work-prototype",
     "pr": null,
     "note": "Carried from react-viewer E6 unchanged. tests/test_viewer_modes.py asserts the five data-mode buttons. That test changes with this epic, and the change is the point, not a regression. Deferred on 2026-09-22, when the engineer narrowed the scope to the Work surface and FlightDeck at parity. Left the build; not deleted and not renumbered.",
     "slices": []
    },
    {
     "id": "cobuilder-viewer/E10",
     "epicId": "E10",
     "status": "open",
     "col": "in_progress",
     "branch": "design/cobuilder-viewer/work-prototype",
     "pr": null,
     "note": "Carried from review-flight-deck F0 unchanged. When this design measured it, 8 of 12 pull requests in this repository carried no intent block. Deferred on 2026-09-22, when the engineer narrowed the scope to the Work surface and FlightDeck at parity. Left the build; not deleted and not renumbered.",
     "slices": []
    },
    {
     "id": "cobuilder-viewer/E11",
     "epicId": "E11",
     "status": "open",
     "col": "in_progress",
     "branch": "design/cobuilder-viewer/work-prototype",
     "pr": null,
     "note": "Carried from review-flight-deck F1. This epic also settles the open-pull-request entity question (Q13) for the record index, so no separate inflight-record-store epic duplicates it. The mode reads the auto-merge split from the team's own rules, and this design does not define them. Deferred on 2026-09-22, when the engineer narrowed the scope to the Work surface and FlightDeck at parity. Left the build; not deleted and not renumbered.",
     "slices": []
    },
    {
     "id": "cobuilder-viewer/E12",
     "epicId": "E12",
     "status": "open",
     "col": "in_progress",
     "branch": "design/cobuilder-viewer/work-prototype",
     "pr": null,
     "note": "Merges review-flight-deck F2 and F3 into one epic, per ADR-0027's rejection of a live-in-browser or GitHub-Action mechanism. It must classify the three non-authored conflict shapes: a shared generated file, a hot file, and identical content added on both sides. A route that fails the replay stays, and the failure becomes its reason for losing. Deferred on 2026-09-22, when the engineer narrowed the scope to the Work surface and FlightDeck at parity. Left the build; not deleted and not renumbered.",
     "slices": []
    },
    {
     "id": "cobuilder-viewer/E13",
     "epicId": "E13",
     "status": "open",
     "col": "in_progress",
     "branch": "design/cobuilder-viewer/work-prototype",
     "pr": null,
     "note": "Merges review-flight-deck F4 and F5. flightdeck-hindsight-fork.html, and E6's composed prototype, are the reference layout. Deferred on 2026-09-22, when the engineer narrowed the scope to the Work surface and FlightDeck at parity. Left the build; not deleted and not renumbered.",
     "slices": []
    },
    {
     "id": "cobuilder-viewer/E14",
     "epicId": "E14",
     "status": "open",
     "col": "in_progress",
     "branch": "design/cobuilder-viewer/work-prototype",
     "pr": null,
     "note": "New in this merge, from the challenge gate's adoption of the auditor and 3am-on-call diverge candidates. The proposal line must record the exact ancestor SHA and per-step simulation inputs a later replay needs, which is new schema work neither source design carried. Deferred on 2026-09-22, when the engineer narrowed the scope to the Work surface and FlightDeck at parity. Left the build; not deleted and not renumbered.",
     "slices": []
    },
    {
     "id": "cobuilder-viewer/E15",
     "epicId": "E15",
     "status": "open",
     "col": "in_progress",
     "branch": "design/cobuilder-viewer/work-prototype",
     "pr": null,
     "note": "Carried from review-flight-deck F6 unchanged. ADR-0027 records the decision, folding ADR-0026 forward. The first epic in this design that writes to a remote. Deferred on 2026-09-22, when the engineer narrowed the scope to the Work surface and FlightDeck at parity. Left the build; not deleted and not renumbered.",
     "slices": []
    },
    {
     "id": "cobuilder-viewer/E16",
     "epicId": "E16",
     "status": "open",
     "col": "in_progress",
     "branch": "design/cobuilder-viewer/work-prototype",
     "pr": null,
     "note": "Carried from react-viewer E7 unchanged. Closes the loop on E1. Measures the real budget with React inlined, and settles the Mermaid question the abort condition names. Deferred on 2026-09-22, when the engineer narrowed the scope to the Work surface and FlightDeck at parity. Left the build; not deleted and not renumbered.",
     "slices": []
    },
    {
     "id": "cobuilder-viewer/E17",
     "epicId": "E17",
     "status": "open",
     "col": "in_progress",
     "branch": "design/cobuilder-viewer/work-prototype",
     "pr": null,
     "note": "Carried from react-viewer E8 unchanged. build-workflow-polish stays superseded through this design now, not directly through react-viewer. Deferred on 2026-09-22, when the engineer narrowed the scope to the Work surface and FlightDeck at parity. Left the build; not deleted and not renumbered.",
     "slices": []
    },
    {
     "id": "cobuilder-viewer/E18",
     "epicId": "E18",
     "status": "open",
     "col": "in_progress",
     "branch": "design/cobuilder-viewer/work-prototype",
     "pr": null,
     "note": "Carried from react-viewer E9 unchanged. Settles ADR-0019's anchoring under React, which owns the DOM the anchor walk uses. Deferred on 2026-09-22, when the engineer narrowed the scope to the Work surface and FlightDeck at parity. Left the build; not deleted and not renumbered.",
     "slices": []
    },
    {
     "id": "cobuilder-viewer/E19",
     "epicId": "E19",
     "status": "open",
     "col": "in_progress",
     "branch": "design/cobuilder-viewer/work-prototype",
     "pr": null,
     "note": "New in round 3, when the engineer narrowed the scope to the Work surface and FlightDeck at parity. The shell had no landing surface before it: a reader arrived on a route that named a work item, and nothing listed the bundle's designs. The board lists them, says what each one holds, and opens one.",
     "slices": [
      {
       "id": "cobuilder-viewer/6",
       "n": 6,
       "title": "The shell lands on the bundle's designs",
       "endsWith": "Opening the viewer with no work item named shows every design as a row, each row stating its stage and the records it holds, and no error state",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "cobuilder-viewer/7",
       "n": 7,
       "title": "A row opens the item's Work surface",
       "endsWith": "Pressing a row lands on that item's Work surface at its first level, with the route naming the item",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "cobuilder-viewer/18",
       "n": 18,
       "title": "A pull request with no design is a row of its own",
       "endsWith": "A pull request with no design reads as a row of its own, its status is its own state, and the tabs filter by status",
       "state": "completed",
       "col": "done",
       "score": "0.90",
       "attempts": 1
      }
     ]
    }
   ],
   "looseSlices": []
  },
  {
   "id": "design-mode",
   "name": "design-mode",
   "stage": "implemented",
   "outcome": "An engineer can design a change with the plugin before writing it, and the resulting intent, ADR, and diagrams carry through to the pull request that implements it.",
   "nextReady": null,
   "pullRequests": [],
   "epics": [
    {
     "id": "design-mode/E1",
     "epicId": "E1",
     "status": "completed",
     "col": "done",
     "branch": "design/design-mode",
     "pr": 11,
     "note": "Design mode as a pre-code interview and challenge gate. Shares a branch and a pull request with the cobuilder-implement design. See ADR-0013: a branch may carry more than one design.",
     "slices": []
    }
   ],
   "looseSlices": []
  },
  {
   "id": "gate-doc-surfacing",
   "name": "gate-doc-surfacing",
   "stage": "decided",
   "outcome": "Gate documents (03-program-design.md, epic-<id>-design.md) are readable from the viewer's Builds view, not just from docs/plans/ or a one-off Artifact publish.",
   "nextReady": null,
   "pullRequests": [],
   "epics": [
    {
     "id": "gate-doc-surfacing/E1",
     "epicId": "E1",
     "status": "open",
     "col": "in_progress",
     "branch": "design/gate-doc-surfacing",
     "pr": 19,
     "note": "shared/build_index.py: add PROGRAM_DESIGN_FIELDS and EPIC_DESIGN_FIELDS projection tuples plus project_program_design/project_epic_design, following the project_fields(source, fields) pattern used by project_goal/project_intent/project_assessment. Parse docs/plans/<slug>/03-program-design.md and epic-<id>-design.md; emit program_design and epic_design entities into data/index.json. Extend feature_gates join entries with a doc reference where one exists.",
     "slices": [
      {
       "id": "gate-doc-surfacing/1",
       "n": 1,
       "title": "Tracer bullet: constants and empty entity lists",
       "endsWith": "`data/index.json` carries `program_design` and `epic_design` keys (empty lists when no gate docs exist yet)",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "gate-doc-surfacing/2",
       "n": 2,
       "title": "Real parsing: project Gate 3 and Gate 4b docs",
       "endsWith": "A repo with a `03-program-design.md` and an `epic-*-design.md` produces populated `program_design`/`epic_design` entities, and `joins.feature_gates[slug][3].doc` points at the projected id",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "gate-doc-surfacing/3",
       "n": 3,
       "title": "Edge cases: missing files, malformed epic id, no plans dir",
       "endsWith": "A plan directory with no gate docs, and a repo with no `docs/plans/` at all, both still produce a clean index build with empty (not missing) entity keys",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    },
    {
     "id": "gate-doc-surfacing/E2",
     "epicId": "E2",
     "status": "open",
     "col": "in_progress",
     "branch": "design/gate-doc-surfacing",
     "pr": 19,
     "note": "plugins/artifact/viewer/index.html: make gate-rail-grid cards (renderBuildsMainContent, ~line 3249) clickable, opening a gate-doc sheet modeled on openAdrSheet. Add a design-doc chip to renderEpicCard (~line 3282) for epics with an epic_design entity.",
     "slices": [
      {
       "id": "gate-doc-surfacing/4",
       "n": 4,
       "title": "Tracer bullet: clickable Gate Rail card opens an empty sheet",
       "endsWith": "Clicking a Gate Rail card with a `doc` opens a sheet showing the gate's title and an empty body; a card with no `doc` stays non-interactive",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "gate-doc-surfacing/5",
       "n": 5,
       "title": "Real content: render the gate doc body, add the epic chip",
       "endsWith": "The sheet renders `body_md` through the existing `renderMarkdown()`; an epic card with a `design_doc` shows a chip that opens the same sheet scoped to that epic",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "gate-doc-surfacing/6",
       "n": 6,
       "title": "Edge cases: no entity, mutual exclusivity with other sheets",
       "endsWith": "A Gate Rail card whose gate has no matching doc opens nothing; opening the gate-doc sheet closes any open ADR/assessment/comments sheet, and vice versa",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    }
   ],
   "looseSlices": []
  },
  {
   "id": "gate-state-resolution",
   "name": "gate-state-resolution",
   "stage": "approved",
   "outcome": "A gate line reads as approved, as not applicable, or as open in both Builds views, and a view opens only a document that the plan holds.",
   "nextReady": null,
   "pullRequests": [],
   "epics": [
    {
     "id": "gate-state-resolution/E1",
     "epicId": "E1",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": "Teach both Builds views the three meanings of a gate state. `is_resolved(state)` in `plugins/artifact/scripts/build_builds_view.py` holds the test, and `current_doc()` receives the document map filtered to the files the plan holds, so a returned document always exists. The static page gains the `na` treatment and stops printing the text `undefined` for a Gate 2b document. The viewer rail gains the `is-na` card class, the `na` pill class, the words \"Not applicable\", and a header count of approved gates. Slices 1 and 2.",
     "slices": [
      {
       "id": "gate-state-resolution/1",
       "n": 1,
       "title": "Tracer bullet: the static page resolves the state and the document",
       "endsWith": "`skill-collision-fix` opens on a document it holds, or on no document and a stated reason. A plan that holds `interaction-design.md` draws a rail button labelled \"Interaction design\". An `n/a` gate carries the closed treatment.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "gate-state-resolution/2",
       "n": 2,
       "title": "Real content and edge cases: the viewer rail resolves the state and the count",
       "endsWith": "The viewer rail describes an `n/a` gate as \"Not applicable\" and paints it apart from a planned gate. The rail header reads the approved count out of the total. An approved gate and the current gate keep their present treatment.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    }
   ],
   "looseSlices": []
  },
  {
   "id": "habit-smells",
   "name": "habit-smells",
   "stage": "decided",
   "outcome": "Review and maintenance reports carry a classified Mechanical smells section from habit-sensors, maintenance trends the pairs of smell and file against the previous report, and verify_bundle warns when the last scan is missing or stale.",
   "nextReady": null,
   "pullRequests": [],
   "epics": [
    {
     "id": "habit-smells/E1",
     "epicId": "E1",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": null,
     "slices": [
      {
       "id": "habit-smells/1",
       "n": 1,
       "title": "Tracer bullet and whole epic: `habit_smells.py`, the `habit.smells` gate key, and the scan tests",
       "endsWith": "The script writes `habit-smells.json` from a stub `habit-sensors`, records an incomplete run and a missing tool, and prints a summary. `verify_bundle.py` reports `habit.smells` as `ok`, `stale`, or nothing. `tests/test_habit_smells.py` covers it.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    },
    {
     "id": "habit-smells/E2",
     "epicId": "E2",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": null,
     "slices": [
      {
       "id": "habit-smells/2",
       "n": 2,
       "title": "Tracer bullet and whole epic: the review mode section and the wiring tests",
       "endsWith": "`SKILL.md` \"### Review Mode\" puts a habit-hooks step before the reports. A blind agent given the file runs the script, then writes `## Mechanical smells` into both reports with the P1 rules, the top-10 cap, the incomplete-run rule, and the unavailable rule, and names the tool and the branch base. A wiring test fails when the prose drops the call or a rule.",
       "state": "completed",
       "col": "done",
       "score": "0.90",
       "attempts": 2
      }
     ]
    },
    {
     "id": "habit-smells/E3",
     "epicId": "E3",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": null,
     "slices": [
      {
       "id": "habit-smells/3",
       "n": 3,
       "title": "Tracer bullet and whole epic: the maintenance mode pair diff, its wiring tests, and the commands",
       "endsWith": "`SKILL.md` \"### Maintenance Mode\" runs the same script, tags each pair NEW, ESCALATED, STABLE, or RESOLVED against the prior report's Mechanical smells section, and feeds the pairs into the trend report. A wiring test fails when the prose drops the tags, the diff, or the step. `commands/review.md` and `commands/maintenance.md` name the step. A blind agent follows the order.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    }
   ],
   "looseSlices": []
  },
  {
   "id": "implementation-conformance",
   "name": "implementation-conformance",
   "stage": "backlog",
   "outcome": "A reviewer of a pull request reads which of the program's targets the change met and where it did something different, in what the generating or the reviewing agent writes. The agent reached those targets from the program's own records rather than from the diff.",
   "nextReady": null,
   "pullRequests": [],
   "epics": [
    {
     "id": "implementation-conformance/E1",
     "epicId": "E1",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": "The join resolves from a change to the program that produced it, and the resolved path is recorded once. Two paths disagree today. epic_to_pull_request in the record index resolves 32 epics across 6 designs. intent.design is set on 4 of the 17 timeline entries and names 3 designs. plugin-split, design-mode, and cobuilder-implement resolve through an epic, and no timeline entry names them. A check that trusts intent.design alone therefore skips them silently. This epic decides the authoritative path, or the precedence between both, and writes the resolution where the check reads it. It is the tracer bullet: it is useful alone, it needs no change to the program's records, and the rest of the work cannot attach until it exists.",
     "slices": []
    },
    {
     "id": "implementation-conformance/E2",
     "epicId": "E2",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": "A program's target becomes a record a check can cite. Today an epic's promise is prose, because 73 epic entities carry 0 outcome values and 72 note values. The rubrics are worse: 47 rubric files under 6 plan directories are reachable by no entity, and the plan slug is not the design name. The nearest projection is the slice, where 45 of 45 carry an ends_with and a score, and that is the rubric's result rather than its criteria. ADR-0030 leaves three shapes open and gives the choice to this epic. A design can fill epics[].outcome and hold itself to a testable criterion. The index can project each rubric as its own entity. Or the check can adopt the slice's ends_with and score as the target and say so. The last shape is the cheapest and the least faithful, so this epic must record which shape it chose and why.",
     "slices": []
    },
    {
     "id": "implementation-conformance/E3",
     "epicId": "E3",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": "Both agents read the program's records, and the read is recorded. interview-guide.md section 2 already says that a set intent.design makes the design's intent block the hypothesis, and that the five design topics need no re-interview. review-mode.md section 7 already says to measure per epic against that epic's slice of the design. Neither instruction has a consumer, and nothing records that either read happened. This epic attaches the read to both stages: generate mode's pre stage, beside the interview it already runs, and review mode's post stage, beside the drift array it already writes. Each agent reads the design's intent, its problem and its solution, its architecture level, its epic list, and its slice rubrics. It reaches them through E1's resolved join and measures against the epic from E2. The read must survive a sparse program, because 7 of the 15 designs carry a goal.json only, and it must record which of the program's records it found and which it did not.",
     "slices": []
    },
    {
     "id": "implementation-conformance/E4",
     "epicId": "E4",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": "The difference is stated where a reader finds it. The check must reach the output and not only a computed field, and story-mode.md already says the author's account and the code's account can disagree. This epic owns the words and the placement: one entry per difference in the assessment the pull request carries, and the same difference stated in the narrative a reader reads, at the altitude each level already uses. It also owns the single sentence a pull request that belongs to no program writes, because a statement that says nothing must not read as a clean result. review-mode.md section 7 keeps the four existing drift kinds drawn from the pull request's own intent, so this epic adds a separate record rather than a fifth kind, or it says why the array is the right home after all. It also owns the rendered review, so the difference survives into render_review.py's output.",
     "slices": []
    }
   ],
   "looseSlices": []
  },
  {
   "id": "inflight-record-store",
   "name": "inflight-record-store",
   "stage": "backlog",
   "outcome": "A reader on the main branch sees every piece of in-flight work across all open pull requests, and no pull request owner hits a merge conflict caused by that view.",
   "nextReady": null,
   "pullRequests": [],
   "epics": [
    {
     "id": "inflight-record-store/E1",
     "epicId": "E1",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": "Open pull requests become entities. collect_pull_requests() merges gh pr list --state all metadata over the narrated story.json entities. An open pull request gets an entity with state: \"open\" and a narrated: false flag. This removes the placeholder in refine_epic_status(). It reads metadata only, checks out no branch, and creates no conflict. This is the tracer bullet, and it is useful on its own. It does not depend on E2, E3, or E4, and can ship alone.",
     "slices": []
    },
    {
     "id": "inflight-record-store/E2",
     "epicId": "E2",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": "A record store with a merge strategy. One file per record, append-only, with a defined resolution rule for a concurrent write. Modelled on beads. This epic decides the storage shape and nothing else.",
     "slices": []
    },
    {
     "id": "inflight-record-store/E3",
     "epicId": "E3",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": "Cross-branch collection without a conflict. Records written by a session on a branch reach the shared view without any branch writing a shared generated file.",
     "slices": []
    },
    {
     "id": "inflight-record-store/E4",
     "epicId": "E4",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": "The active-work view. The viewer renders in-flight work beside merged history, so a reader sees one timeline rather than two.",
     "slices": []
    }
   ],
   "looseSlices": []
  },
  {
   "id": "interaction-design-gate",
   "name": "interaction-design-gate",
   "stage": "decided",
   "outcome": "A session that builds a user interface writes an interaction design specification before implementation starts, and a browser check inside the slice loop catches the defects that specification exists to prevent.",
   "nextReady": null,
   "pullRequests": [],
   "epics": [
    {
     "id": "interaction-design-gate/E1",
     "epicId": "E1",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": "Vendor the skill into `plugins/implement/skills/design-to-code/` and trim it from five steps to three. Step 1 goes because Gate 1 `01-product.md` already holds the product intent, and Step 4 goes because the slice loop owns code. The four concepts the gate depends on, initial state plus timer arming, transitions on state change, visibility gating, and declared defaults, reach the specification through the rewritten template, the JSONC schema, and the implementation rules. Slices 1 and 2.",
     "slices": [
      {
       "id": "interaction-design-gate/1",
       "n": 1,
       "title": "Tracer bullet: the skill skeleton and its file set",
       "endsWith": "`plugins/implement/skills/design-to-code/SKILL.md` exists, its frontmatter parses, its overview names three steps, and every relative path it cites resolves inside the directory. The three product-brief files are absent.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "interaction-design-gate/2",
       "n": 2,
       "title": "Real content and edge cases: the four concepts reach the spec, and the empty paths stay cheap",
       "endsWith": "The state table carries an initial-state column and a timer-arming column, `4.1 Transition Table` carries a trigger, a guard and a reset, `3.3 Visibility Gating` names the condition, and `2.3 Declared Defaults` names the default, with a matching `references/jsonc-schema.md` key for each. A feature with no front end has a stated one-line path, no file cites a deleted template, and no file calls a product brief a PRD or a brief.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    },
    {
     "id": "interaction-design-gate/E2",
     "epicId": "E2",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": "Add Gate 2b to the build workflow. A tracked line in `00-status.md` between Gate 2 and Gate 3, a `## Gate 2b` section in `build/SKILL.md`, the `2b` line in the status template, the resume rule that keeps Gate 3 from starting early, and the two consumption rules that let `rubric-authoring.md` and `slice-loop.md` read the artifacts. Slices 3 and 4.",
     "slices": [
      {
       "id": "interaction-design-gate/3",
       "n": 3,
       "title": "Tracer bullet: the gate line and its section",
       "endsWith": "`plugins/implement/skills/build/SKILL.md` carries a `## Gate 2b` section after the Gate 2 section, and the `00-status.md` template carries a `2b` line between the Gate 2 and Gate 3 lines.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "interaction-design-gate/4",
       "n": 4,
       "title": "Real content and edge cases: the three paths, the two consumers, and the returned session",
       "endsWith": "The skill states all three paths (no front end, a front end, an earlier approval). `rubric-authoring.md` names both artifacts as derivation sources, and `slice-loop.md` requires RED to read both and VALIDATE's front-end criteria to name a browser check. The resume rule names Gate 2b, so a returned session does not skip it, `commands/start.md` lists the two new artifacts, and `plugin.json` reads 0.2.0.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    },
    {
     "id": "interaction-design-gate/E3",
     "epicId": "E3",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": "Make the gate mechanical rather than remembered. A `2b` group in `verify_gate.py`, a `2b` label in both gate-line regexes, `GATE_DOCS[\"2b\"]`, an `interaction_design` entity in the index, and the Builds view rail. Three call sites assume the last gate is number 4, so this epic is larger than it looks. It is the epic to cut. Slices 5 to 7.",
     "slices": [
      {
       "id": "interaction-design-gate/5",
       "n": 5,
       "title": "Tracer bullet: the 2b group in `verify_gate.py`",
       "endsWith": "`verify_gate.py --plan docs/plans/interaction-design-gate` prints a `2b` block, reports `n/a` for this plan, and exits 0 for the 2b group. A plan with a pending 2b line exits non-zero.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "interaction-design-gate/6",
       "n": 6,
       "title": "Real content: the index and the Builds view rail",
       "endsWith": "`data/index.json` carries an `interaction_design` array, `joins.feature_gates` carries the 2b entry, and the Builds view rail shows a 2b card whose document opens in the existing gate-doc sheet.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "interaction-design-gate/7",
       "n": 7,
       "title": "Edge cases: the three integer-only assumptions",
       "endsWith": "`resolve_feature_gates()` writes a string `n`, `viewer/index.html` no longer compares `g.n` to the literal `4`, and `current_doc()` treats an `n/a` gate as done. `cobuilder-family` and `gate-doc-surfacing` still report `Overall: OK`.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    }
   ],
   "looseSlices": []
  },
  {
   "id": "lean-bundle-diffs",
   "name": "lean-bundle-diffs",
   "stage": "backlog",
   "outcome": "A fresh clone of this repo is not weighed down by every merged PR's full diff text, and the viewer still shows a diff for any PR a reader opens.",
   "nextReady": null,
   "pullRequests": [],
   "epics": [
    {
     "id": "lean-bundle-diffs/E1",
     "epicId": "E1",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": "Decide the replacement shape: the viewer reads a diff by running git diff against the PR's recorded commit SHAs at serve time (view mode already runs from inside the repo), versus keeping diffs-pr{N}.js exactly as it is today but gitignoring it, regenerating it from git on demand the way exports/branch-*/diff.json already works for generate mode. Either removes the committed weight; they differ in whether a served bundle still needs a live git checkout next to it. Update 2026-10-13: the user directed the gitignore half of the second shape as a packaging fix for the Claude Plugin directory's 5 MiB per-file cap. The committed diffs-pr{N}.js files are gone, and .gitignore holds the pattern. The serve-time question stays open: extract_diffs.py still rewrites data/manifest.js together with its files, so a future pr:baseline can name a new PR in diff_prs while git does not carry its file. Settle this epic before the next pr:baseline lands a diff_prs entry.",
     "slices": []
    },
    {
     "id": "lean-bundle-diffs/E2",
     "epicId": "E2",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": "Whichever shape E1 picks, implement it in extract_diffs.py and, if the viewer starts requesting diffs at view time instead of reading a static file, in artifact's serve_bundle.py. Update verify_bundle.py's expectations accordingly. Update 2026-10-13: verify_bundle.py now reports the diffs key and does not gate on it, so a clone without the files passes. extract_diffs.py itself is unchanged.",
     "slices": []
    },
    {
     "id": "lean-bundle-diffs/E3",
     "epicId": "E3",
     "status": "completed",
     "col": "done",
     "branch": null,
     "pr": null,
     "note": "Migrate the existing committed bundles (self, and the two fixture bundles) so history stops growing: remove the checked-in diffs-pr{N}.js files, or move them under .gitignore, per E1's decision. This does not touch story.json's authored fields, so it is a bundle-file change, not a schema migration. Update 2026-10-13: done for the self bundle, under the user's direction, to pass the plugin directory's 5 MiB cap. The ten diffs-pr{N}.js files are removed and .gitignore carries .cobuilder-architect/self/data/diffs-pr*.js. The two fixture bundles keep their diff files (0.4 MB and 1.3 MB, under the cap), because fixtures are committed test data. Story.json holds no diff fields, so no migration ran.",
     "slices": []
    }
   ],
   "looseSlices": []
  },
  {
   "id": "linear-tracker-adapter",
   "name": "linear-tracker-adapter",
   "stage": "decided",
   "outcome": "A repo sets adapter: linear in .cobuilder/tracker.yaml and every tracker.py operation works against Linear. People plan epics and slices in Linear, and CoBuilder builds from that plan and writes progress back. Beads stays unchanged.",
   "nextReady": null,
   "pullRequests": [],
   "epics": [
    {
     "id": "linear-tracker-adapter/E1",
     "epicId": "E1",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": null,
     "slices": []
    },
    {
     "id": "linear-tracker-adapter/E2",
     "epicId": "E2",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": null,
     "slices": []
    },
    {
     "id": "linear-tracker-adapter/E3",
     "epicId": "E3",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": null,
     "slices": []
    },
    {
     "id": "linear-tracker-adapter/E4",
     "epicId": "E4",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": null,
     "slices": []
    },
    {
     "id": "linear-tracker-adapter/E5",
     "epicId": "E5",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": null,
     "slices": []
    },
    {
     "id": "linear-tracker-adapter/E6",
     "epicId": "E6",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": null,
     "slices": []
    },
    {
     "id": "linear-tracker-adapter/E7",
     "epicId": "E7",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": null,
     "slices": []
    }
   ],
   "looseSlices": []
  },
  {
   "id": "maintainable-viewer",
   "name": "maintainable-viewer",
   "stage": "superseded",
   "outcome": "An engineer changes one view mode of the bundle viewer by opening one file of a few hundred lines, and the file that ships is still one self-contained HTML page that publishes as an Artifact unchanged.",
   "nextReady": null,
   "pullRequests": [],
   "epics": [
    {
     "id": "maintainable-viewer/E1",
     "epicId": "E1",
     "status": "completed",
     "col": "done",
     "branch": null,
     "pr": null,
     "note": "The build exists and is guarded. build_viewer.py concatenates ordered parts under viewer/src/ into the committed viewer/index.html, and a test rebuilds from the parts and fails on any difference. The first split is mechanical only, cut at the file's own 35 banner comments, with no line rewritten. This epic is the tracer bullet: it proves or disproves that the single IIFE separates by concatenation alone, which is the abort condition the whole design rests on.",
     "slices": []
    },
    {
     "id": "maintainable-viewer/E2",
     "epicId": "E2",
     "status": "completed",
     "col": "done",
     "branch": null,
     "pr": null,
     "note": "The exporter seam becomes declared. export_artifact.py stops matching incidental literals and matches named markers the parts emit deliberately. Today it hard-errors with not-found-verbatim when a literal moves, so the publish pipeline breaks silently under any refactor until somebody publishes. This must land before the parts are rewritten, not after, or every later epic risks breaking publishing without a test noticing.",
     "slices": []
    },
    {
     "id": "maintainable-viewer/E3",
     "epicId": "E3",
     "status": "completed",
     "col": "done",
     "branch": null,
     "pr": null,
     "note": "One definition per fragment. A template layer replaces the 45 innerHTML string blocks, and the rail-item, empty-card, and empty-detail fragments collapse from 4, 16, and 18 copies to one each. The viewer uses no template element today, so the mechanism is a design choice this epic makes and does not inherit.",
     "slices": []
    },
    {
     "id": "maintainable-viewer/E4",
     "epicId": "E4",
     "status": "completed",
     "col": "done",
     "branch": null,
     "pr": null,
     "note": "Each mode owns its own part. The five view modes stop interleaving: the 50 scattered mode-predicate calls collapse into one registry, and renderContextsMainContent, renderBuildsMainContent, and renderMainContent stop being three functions of over 200 lines that live beside each other. Adding a sixth mode becomes one new part plus one registry entry.",
     "slices": []
    }
   ],
   "looseSlices": []
  },
  {
   "id": "mechanical-smells",
   "name": "mechanical-smells",
   "stage": "decided",
   "outcome": "The viewer reports no habit-hooks finding apart from the recorded residuals and the recorded kept why-comments, and the findings outside the viewer sit in one named epic that a later pass cuts into slices.",
   "nextReady": null,
   "pullRequests": [
    {
     "ref": "55",
     "number": 55,
     "state": "open",
     "epics": [
      "mechanical-smells/E1"
     ]
    }
   ],
   "epics": [
    {
     "id": "mechanical-smells/E1",
     "epicId": "E1",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": null,
     "slices": [
      {
       "id": "mechanical-smells/1",
       "n": 1,
       "title": "Tracer bullet: the logic layer",
       "endsWith": "`habit-sensors` reports no finding for those five files. The viewer tests pass, the exported names of `model.ts` and the data layer match the list taken before the slice, and the committed `index.html` rebuilds byte-identically.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "mechanical-smells/2",
       "n": 2,
       "title": "The atoms and sections: split `shell/atoms.tsx`, `shell/sections.tsx`, and the three `shell/panels/*` files",
       "endsWith": "`habit-sensors` reports no finding for those five files. The seven section renderers and the atom vocabulary import from their old files, and the section tests pass.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "mechanical-smells/3",
       "n": 3,
       "title": "The change surface: split the five `shell/change/*` files, `shell/DiagramTiles.tsx`, and `shell/Pager.tsx`, and fix the `react-hooks/exhaustive-deps` finding",
       "endsWith": "`habit-sensors` reports no finding for those seven files, the change-view tests pass, and the diagram tiles still render.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "mechanical-smells/4",
       "n": 4,
       "title": "The shell and chrome: split `ShellApp`, the sheet, the drawer, the rail, the top bar, the hooks, the work board, and the long tail of 17 files. Fix the `jsx-a11y/media-has-caption` finding and the 2 non-null assertions in `shell/App.tsx`",
       "endsWith": "`habit-sensors` reports no finding for those 17 files, `ShellApp` and `Theme` still export from `shell/App.tsx`, and the full viewer suite and the build pass.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 2
      },
      {
       "id": "mechanical-smells/5",
       "n": 5,
       "title": "The viewer test files: split large `describe` blocks by concern in the 20 `*.test.*` files. Remove the 2 `any`, the 10 non-null assertions, and the 8 duplicate imports",
       "endsWith": "`habit-sensors` reports no finding for the 20 test files, apart from each recorded 13-to-30-line callback. The test count and every assertion stay the same, and the suite passes.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "mechanical-smells/6",
       "n": 6,
       "title": "The comments in viewer source: review each of the 658 flagged comments in 42 files. Delete it, or keep it reworded when it explains why",
       "endsWith": "`habit-sensors` reports no `non-essential-comment` finding for the 42 source files. A reviewer sample of at least 20 deleted comments finds no more than one that explained why.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "mechanical-smells/7",
       "n": 7,
       "title": "The comments in viewer tests: review each of the 422 flagged comments in 20 files, with the same rule",
       "endsWith": "`habit-sensors` reports no `non-essential-comment` finding for the 20 test files, and the reviewer sample meets the same limit. The viewer then reports no finding apart from the recorded residual.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    },
    {
     "id": "mechanical-smells/E2",
     "epicId": "E2",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": null,
     "slices": []
    }
   ],
   "looseSlices": []
  },
  {
   "id": "nexus-borrowings",
   "name": "nexus-borrowings",
   "stage": "implemented",
   "outcome": "A design drafted in design mode carries its runtime structure. The design directory holds a runtime architecture diagram as a named diagram slot beside the three narrative levels, a contracts file when the design touches a public interface, and stage 6 runs a draft review subagent that validates against a blind rubric and re-explores alternatives before the engineer reads.",
   "nextReady": null,
   "pullRequests": [],
   "epics": [
    {
     "id": "nexus-borrowings/E1",
     "epicId": "E1",
     "status": "completed",
     "col": "done",
     "branch": "design/nexus-borrowings/runtime-arch-diagram",
     "pr": null,
     "note": "All eight slices built in one pass on design/nexus-borrowings/runtime-arch-diagram (2026-10-01): contract, validator, build_index projections, viewer tile + contracts section, stage-6 spawn, contracts artifact, vocabulary bootstrap + mode surfaces, implement guards + bumps. Behavioral rubrics score on the first real design runs.",
     "slices": [
      {
       "id": "nexus-borrowings/1",
       "n": 1,
       "title": "The SVG contract and its validator",
       "endsWith": "`plugins/architect/skills/architecture/references/runtime-architecture-diagram.md` exists and `shared/skills/mermaid/references/architecture-diagram.md` is gone. `uv run plugins/architect/scripts/check_design_svg.py` passes this design's `runtime-architecture.svg` and fails each broken fixture for its own check; a long-text fixture only warns. `tests/test_design_svg.py` passes",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "nexus-borrowings/2",
       "n": 2,
       "title": "build_index compiles the named slot and the contracts file",
       "endsWith": "`compile_design_diagrams` reads `runtime-architecture.svg` \u2192 `record[\"diagrams\"][\"runtime\"]` and `attach_authored_file` stamps `contracts`; a fixture design without either file omits both keys with no error. `tests/test_build_index.py` passes",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "nexus-borrowings/3",
       "n": 3,
       "title": "Viewer renders the runtime tile and the contracts section",
       "endsWith": "`architectureTileLevels` returns `[\"runtime\",\"3\"]` when the named key is present; the overview still leads the design. The `runtime` value renders as inline SVG, never through the mermaid renderer. `ContractsSection` hides on absence. Viewer tests pass",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    },
    {
     "id": "nexus-borrowings/E2",
     "epicId": "E2",
     "status": "completed",
     "col": "done",
     "branch": "design/nexus-borrowings/runtime-arch-diagram",
     "pr": null,
     "note": "All eight slices built in one pass on design/nexus-borrowings/runtime-arch-diagram (2026-10-01): contract, validator, build_index projections, viewer tile + contracts section, stage-6 spawn, contracts artifact, vocabulary bootstrap + mode surfaces, implement guards + bumps. Behavioral rubrics score on the first real design runs.",
     "slices": [
      {
       "id": "nexus-borrowings/4",
       "n": 4,
       "title": "Stage 6 spawns the validate-and-re-explore reviewer",
       "endsWith": "`design-mode.md` \u00a76 holds the spawn block: blind rubric derived from `goal.json` + `intent.json` before reading the draft, re-explore seeded with the final draft, findings are classified predictions the engineer adjudicates, endorsed survivors reach `intent.alternatives` only through the stage-4 record (ADR-0035), spawn model `glm-5.3-flash:cloud`, `min_work.draft_review_run` set on a returned round. `build/SKILL.md` Gate 2 grounding line untouched by E2",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    },
    {
     "id": "nexus-borrowings/E3",
     "epicId": "E3",
     "status": "completed",
     "col": "done",
     "branch": "design/nexus-borrowings/runtime-arch-diagram",
     "pr": null,
     "note": "All eight slices built in one pass on design/nexus-borrowings/runtime-arch-diagram (2026-10-01): contract, validator, build_index projections, viewer tile + contracts section, stage-6 spawn, contracts artifact, vocabulary bootstrap + mode surfaces, implement guards + bumps. Behavioral rubrics score on the first real design runs.",
     "slices": [
      {
       "id": "nexus-borrowings/5",
       "n": 5,
       "title": "contracts.md becomes a stage-5 artifact with a stated skip rule",
       "endsWith": "`design-mode.md` \u00a75 carries the authoring + show-before-write rule and the skip rule; the artifacts-before-write list includes it; the viewer's `ContractsSection` is grounded in slice 3. `build/SKILL.md` Gate 2/3 grounds in `contracts.md` when a design record exists",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    },
    {
     "id": "nexus-borrowings/E4",
     "epicId": "E4",
     "status": "completed",
     "col": "done",
     "branch": "design/nexus-borrowings/runtime-arch-diagram",
     "pr": null,
     "note": "All eight slices built in one pass on design/nexus-borrowings/runtime-arch-diagram (2026-10-01): contract, validator, build_index projections, viewer tile + contracts section, stage-6 spawn, contracts artifact, vocabulary bootstrap + mode surfaces, implement guards + bumps. Behavioral rubrics score on the first real design runs.",
     "slices": [
      {
       "id": "nexus-borrowings/6",
       "n": 6,
       "title": "The bootstrap reference and the design stage-1 fallback",
       "endsWith": "`references/vocabulary-bootstrap.md` exists (districts \u2192 grill \u2192 write; corpus cites only principles/ddd + scenarios/architecture_ddd; scenarios/ddd is README-only and named as such). `design-mode.md` stage 1 carries the symmetric fallback and the consent flow. `DDD-VOCABULARY.md` keeps the new terms",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "nexus-borrowings/7",
       "n": 7,
       "title": "Options and review surface the check",
       "endsWith": "`options-mode.md` stage 1 checks the glossary and the report notes absence; the stage-6 hand-off offers the bootstrap. `SKILL.md` review section reports absence as a `P1` finding and offers the bootstrap at run end",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "nexus-borrowings/8",
       "n": 8,
       "title": "Implement notices, the vocabulary agent guard, and the bumps",
       "endsWith": "`implement:start`/`install`/`debug` surface the existence notice; `implement:vocabulary` step 0 returns `FINDINGS` with one `[UNDEFINED]` bootstrap item on a missing file, never a silent `CLEAN`. Marketplace bumps: architect 0.7.0, implement 0.4.0, artifact 0.7.0. Self-bundle rebuilt: `uv run shared/build_index.py` exits 0 and records `diagrams[\"runtime\"]` + `contracts` for nexus-borrowings; full pytest green",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    }
   ],
   "looseSlices": []
  },
  {
   "id": "options-mode",
   "name": "options-mode",
   "stage": "implemented",
   "outcome": "An engineer runs /architect:options and gets one self-contained HTML report of inquiries about the flow, the technology, and the gaps of the whole system, with alternatives and diagrams. The engineer pastes the decisions text into /architect:design.",
   "nextReady": null,
   "pullRequests": [],
   "epics": [
    {
     "id": "options-mode/E1",
     "epicId": "E1",
     "status": "completed",
     "col": "done",
     "branch": "design/options-mode",
     "pr": null,
     "note": "One epic. Four slices: the mode and its command, the report template and validator, the manifests and glossary and counts, and one real run of the mode.",
     "slices": [
      {
       "id": "options-mode/1",
       "n": 1,
       "title": "Tracer bullet: the command and the skill declare a seventh mode",
       "endsWith": "`plugins/architect/commands/options.md` dispatches `Skill(\"architecture\", args=\"options $ARGUMENTS\")`. `SKILL.md` carries `### Options Mode` and `references/options-mode.md` holds the seven-stage procedure. `tests/test_commands.py` asserts seven modes and that the architect command files equal them, and it passes",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "options-mode/2",
       "n": 2,
       "title": "The report template and the validator",
       "endsWith": "`references/reports/options-report-TEMPLATE.html` exists. `uv run plugins/architect/scripts/check_options_report.py <template>` exits 0. Each broken fixture under `tests/fixtures/options_report/` exits 1 for its own check. A long SVG text only warns. `tests/test_options_report.py` passes",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "options-mode/3",
       "n": 3,
       "title": "Manifests, glossary, and mode counts",
       "endsWith": "`DDD-VOCABULARY.md` has an `Inquiry` entry. `plugin.json` reads `0.7.0`. Both manifests and the docs name seven modes and list `/architect:options`. `uv run --with pytest pytest tests/ -q` passes with no new failure",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "options-mode/4",
       "n": 4,
       "title": "One real run of the mode",
       "endsWith": "A fresh agent follows `SKILL.md` and `options-mode.md` with `--non-interactive` on this repo. It writes one report under `docs/architecture/options/<name>/`. The validator exits 0 on it. The run edits nothing outside that folder",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    }
   ],
   "looseSlices": []
  },
  {
   "id": "plugin-split",
   "name": "plugin-split",
   "stage": "implemented",
   "outcome": "A user installs one stage of the architecture lifecycle without the other three, and four independently-installed plugins write into one bundle without a stale copy destroying authored or paid content.",
   "nextReady": null,
   "pullRequests": [],
   "epics": [
    {
     "id": "plugin-split/E1",
     "epicId": "E1",
     "status": "completed",
     "col": "done",
     "branch": "design/design-mode",
     "pr": 11,
     "note": "One plugin becomes five. The whole packaging split: the mode renames inside today's single plugin, the deleted duplicate explore-design command, the 33 cross-pillar references, the five manifests, and the two ports. The rename is a rotation, not a split: odyssey submit becomes cobuilder-pr:generate, and the old odyssey generate, which narrates merged history, becomes cobuilder-pr:review. Four slices.",
     "slices": [
      {
       "id": "cobuilder-family/4",
       "n": 4,
       "title": "Renames inside today's single plugin",
       "endsWith": "Six architecture modes, `explore-design` deleted, `submit` renamed to `generate`, and the old `generate` renamed to `review`",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 2
      },
      {
       "id": "cobuilder-family/5",
       "n": 5,
       "title": "The 33 cross-pillar references are fixed",
       "endsWith": "The grep regression test passes while the repo is still one plugin",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 3
      },
      {
       "id": "cobuilder-family/6",
       "n": 6,
       "title": "Five plugins, five manifests",
       "endsWith": "`claude plugin validate` passes on each, and the family installs",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "cobuilder-family/7",
       "n": 7,
       "title": "The two ports land",
       "endsWith": "`cobuilder-implement` renamed and shipped, `collaborate-with-user` folded in, the orientation skill written",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    },
    {
     "id": "plugin-split/E2",
     "epicId": "E2",
     "status": "completed",
     "col": "done",
     "branch": "design/design-mode",
     "pr": 11,
     "note": "Shared code survives an install. Prove the marketplace symlink dereference, then vendor the four bundle modules and the two shared skills. One slice, because it is a spike whose result decides whether the rest of the design stands. goal.json.abort_if names its failure.",
     "slices": [
      {
       "id": "cobuilder-family/1",
       "n": 1,
       "title": "Tracer bullet: two plugins, one shared module",
       "endsWith": "Two throwaway plugins install from a local marketplace and both resolve the shared module from their own cache",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    },
    {
     "id": "plugin-split/E3",
     "epicId": "E3",
     "status": "completed",
     "col": "done",
     "branch": "design/design-mode",
     "pr": 11,
     "note": "The seam is version-safe. require_compatible(), min_reader_schema, the generators map, bundle format 3, and schema 1.3, so two plugins at different versions cannot corrupt one bundle. Two slices.",
     "slices": [
      {
       "id": "cobuilder-family/2",
       "n": 2,
       "title": "The compatibility gate exists",
       "endsWith": "`require_compatible()` and `stamp_generator()` pass their tests, called by nothing yet",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "cobuilder-family/3",
       "n": 3,
       "title": "The gate is wired and the bundle migrates",
       "endsWith": "Format 3, `min_reader_schema`, the generators map, every writer gated",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    },
    {
     "id": "plugin-split/E4",
     "epicId": "E4",
     "status": "completed",
     "col": "done",
     "branch": "design/design-mode",
     "pr": 11,
     "note": "The record index. build_index.py replaces the two projection scripts, emits every entity with a stable id, and resolves every join including an ADR to its pull request. Two slices.",
     "slices": [
      {
       "id": "cobuilder-family/8",
       "n": 8,
       "title": "The index holds the entities",
       "endsWith": "`build_index.py` emits every entity, and the two scripts it replaces are gone",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "cobuilder-family/9",
       "n": 9,
       "title": "The index resolves the joins",
       "endsWith": "`adr_to_pull_request`, `slice_to_epic`, `district_uncovered`, and freshness",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    },
    {
     "id": "plugin-split/E5",
     "epicId": "E5",
     "status": "completed",
     "col": "done",
     "branch": "design/design-mode",
     "pr": 11,
     "note": "One lifecycle surface. The Decisions, Contexts, and Builds modes, the Backlog lane, and moving generated pages out of the foreign directory into the bundle. Two slices (10, 11).",
     "slices": [
      {
       "id": "cobuilder-family/10",
       "n": 10,
       "title": "The Decisions and Contexts modes",
       "endsWith": "A person browses every decision and every context, with the anchor distinction visible",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "cobuilder-family/11",
       "n": 11,
       "title": "The Builds mode and the Backlog lane",
       "endsWith": "Gates driven by the status document, the Backlog lane computed from the index, pages moved into the bundle",
       "state": "completed",
       "col": "done",
       "score": "0.92",
       "attempts": 1
      }
     ]
    },
    {
     "id": "plugin-split/E6",
     "epicId": "E6",
     "status": "completed",
     "col": "done",
     "branch": "design/design-mode",
     "pr": 11,
     "note": "The reply channel. The append-only ledger and its projection, the anchor computed from the live DOM, the write endpoint, and the background wake command. Three slices (12, 13, 14).",
     "slices": [
      {
       "id": "cobuilder-family/12",
       "n": 12,
       "title": "The ledger and its projection",
       "endsWith": "Append, fold, and project, with no server involved",
       "state": "completed",
       "col": "done",
       "score": "0.92",
       "attempts": 1
      },
      {
       "id": "cobuilder-family/13",
       "n": 13,
       "title": "The anchor and the write endpoint",
       "endsWith": "Click to anchor a sentence, `POST /feedback` appends, the drawer keeps the text in view",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "cobuilder-family/14",
       "n": 14,
       "title": "The wake command and the whole loop",
       "endsWith": "The background command blocks and returns new threads, and the loop runs once end to end",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    },
    {
     "id": "plugin-split/E7",
     "epicId": "E7",
     "status": "completed",
     "col": "done",
     "branch": null,
     "pr": null,
     "note": "Threads read as conversations. The drawer renders a reply under the comment it answers. Deferred past E6 on purpose: E6 ships the record shape, so this epic adds no migration and carries no slice yet.",
     "slices": []
    },
    {
     "id": "plugin-split/E8",
     "epicId": "E8",
     "status": "completed",
     "col": "done",
     "branch": "rename-plugins-drop-cobuilder-prefix",
     "pr": 17,
     "note": "The cobuilder- prefix drops from the four non-umbrella plugins named in E1's table (cobuilder-architect, cobuilder-pr, cobuilder-artifact, cobuilder-implement become architect, pr, artifact, implement), since it duplicates the marketplace repo's own name. cobuilder-full-lifecycle keeps its prefix, being the umbrella the repo's own name already carries. Merged as PR #17, then a same-epic follow-up (uncommitted at the time this entry was written) fixes a second-order bug the rename introduced: two of the four renamed plugins (implement, artifact) already shipped a skill folder named after themselves, and once the plugin took that same name too, Skill() resolution inside Claude Code broke -- reproduced directly, not environment-specific. Fixed by renaming the colliding skill folders (implement's skill to build, its command to start; artifact's skill to cobuilder-artifacts) and, for consistency, cobuilder-full-lifecycle's orientation skill to cobuilder-full. See ADR-0016's addendum.",
     "slices": []
    }
   ],
   "looseSlices": []
  },
  {
   "id": "react-viewer",
   "name": "react-viewer",
   "stage": "superseded",
   "outcome": "A reader opens the bundle on three goal-shaped surfaces instead of five record-type tabs, an engineer changes one surface by opening one typed React component, and the file that ships is still one self-contained HTML page that publishes as an Artifact unchanged.",
   "nextReady": null,
   "pullRequests": [],
   "epics": [
    {
     "id": "react-viewer/E1",
     "epicId": "E1",
     "status": "completed",
     "col": "done",
     "branch": null,
     "pr": null,
     "note": "The exporter rewrites the viewer by verbatim string replacement today and hard-errors when a literal moves. A bundled build moves every literal, so this seam must become explicit before any build lands.",
     "slices": []
    },
    {
     "id": "react-viewer/E2",
     "epicId": "E2",
     "status": "completed",
     "col": "done",
     "branch": null,
     "pr": null,
     "note": "Vite plus vite-plugin-singlefile, a lockfile, and a pinned Node version. This epic starts with a spike, at the engineer's direction: publish one throwaway bundled page and measure the byte-equal rebuild across two machines, the size with React inlined, and whether a Claude Artifact renders a Mermaid block that React injects after page load. Two of the three abort conditions are settled by that spike, before five epics of work depend on the answer.",
     "slices": []
    },
    {
     "id": "react-viewer/E3",
     "epicId": "E3",
     "status": "completed",
     "col": "done",
     "branch": null,
     "pr": null,
     "note": "The viewer resolves joins by hand in each render path today. index.json already computed them. This epic makes the index the source and the types the contract.",
     "slices": []
    },
    {
     "id": "react-viewer/E4",
     "epicId": "E4",
     "status": "completed",
     "col": "done",
     "branch": null,
     "pr": null,
     "note": "The prototype of 2026-09-07 is the reference for this surface.",
     "slices": []
    },
    {
     "id": "react-viewer/E5",
     "epicId": "E5",
     "status": "completed",
     "col": "done",
     "branch": null,
     "pr": null,
     "note": "Parity covers the four levels, diagrams, scene art, narration audio, the diff, and the intent and assessment sheet.",
     "slices": []
    },
    {
     "id": "react-viewer/E6",
     "epicId": "E6",
     "status": "completed",
     "col": "done",
     "branch": null,
     "pr": null,
     "note": "tests/test_viewer_modes.py asserts the five data-mode buttons. That test changes with this epic, and the change is the point, not a regression.",
     "slices": []
    },
    {
     "id": "react-viewer/E7",
     "epicId": "E7",
     "status": "completed",
     "col": "done",
     "branch": null,
     "pr": null,
     "note": "Closes the loop on E1. Measures the real budget with React inlined, and settles the Mermaid question the third abort condition names.",
     "slices": []
    },
    {
     "id": "react-viewer/E8",
     "epicId": "E8",
     "status": "completed",
     "col": "done",
     "branch": null,
     "pr": null,
     "note": "build-workflow-polish is superseded by this design at the engineer's direction. Its E4, the tab-based viewer layout, is absorbed by E4 and E5 here. Its other three epics are not viewer work and would be lost silently: E1 adds the pointer from design mode stage 7 to /implement:start, E2 states the six-column slice-table shape that shared/slice_table.py parses, and E3 commits an accepted slice without a second prompt. They are carried here so the supersede is safe.",
     "slices": []
    },
    {
     "id": "react-viewer/E9",
     "epicId": "E9",
     "status": "completed",
     "col": "done",
     "branch": null,
     "pr": null,
     "note": "The comment mechanism does not work today, and the engineer confirmed it on 2026-09-07. Three causes, all verified in the tree. First, LEDGER_AVAILABLE at viewer/index.html line 1399 tests only whether fetch exists in the browser, which is always true, so it never tells a reviewer that no ledger server is listening. Second, a failed POST falls back to localStorage and shows 'Will sync when server is reachable', although nothing syncs: no code reads that key back. Third, a published Artifact cannot reach any server, because the Artifact CSP blocks fetch, so every comment left where review actually happens is written to one browser's localStorage and lost. This epic also settles ADR-0019's anchoring under React, which owns the DOM the anchor walk uses. The transport is decided: the served viewer keeps POST /feedback under --allow-write, and the published Artifact marks comments read-only and exports them for paste-back through the copy-as-markdown path that already exists. The Artifact platform's own storage is rejected, because it would make the published page behave differently from the served one, which is the split ADR-0001 exists to prevent.",
     "slices": []
    }
   ],
   "looseSlices": []
  },
  {
   "id": "review-flight-deck",
   "name": "review-flight-deck",
   "stage": "superseded",
   "outcome": "On every pull request change, the flightdeck simulates possible paths to close the whole open set, replays the best one or two with real git, and shows the reviewer one validated path. The reviewer reads what they would have when it is done, then what each pull request adds, then whether the merges hold.",
   "nextReady": null,
   "pullRequests": [],
   "epics": [
    {
     "id": "review-flight-deck/F0",
     "epicId": "F0",
     "status": "completed",
     "col": "done",
     "branch": "design/review-flight-deck",
     "pr": null,
     "note": "New in round 4. It closes the gap the prototype had to show as a warning: 8 of 12 pull requests in this repository carry no intent block. Reuses generate mode whole, and adds only the check for an existing description.",
     "slices": []
    },
    {
     "id": "review-flight-deck/F1",
     "epicId": "F1",
     "status": "completed",
     "col": "done",
     "branch": "design/review-flight-deck",
     "pr": null,
     "note": "The same work as the first epic of the inflight-record-store design. Build it once, in shared code. The auto-merge split is read from the team's own rules, and this design does not define them.",
     "slices": []
    },
    {
     "id": "review-flight-deck/F2",
     "epicId": "F2",
     "status": "completed",
     "col": "done",
     "branch": "design/review-flight-deck",
     "pr": null,
     "note": "divergent-exploration.md already generates competing options in isolation and criticises them in a separate pass. The baseline is load-bearing: simulating against the default branch inverts the order whenever an open pull request restructures the tree.",
     "slices": []
    },
    {
     "id": "review-flight-deck/F3",
     "epicId": "F3",
     "status": "completed",
     "col": "done",
     "branch": "design/review-flight-deck",
     "pr": null,
     "note": "New in round 4, and the step that makes the recommendation something to stand behind. Read-only against a scratch worktree. A route that fails the replay is kept, with the failure as its reason for losing. Systems that precompute mergeable slices may already do this part, so keep the interface narrow enough to swap one in. It must also classify what it cannot merge. A superseded branch and an unresolvable conflict are different findings and get different treatments in the layout.",
     "slices": []
    },
    {
     "id": "review-flight-deck/F4",
     "epicId": "F4",
     "status": "completed",
     "col": "done",
     "branch": "design/review-flight-deck",
     "pr": null,
     "note": "Round 5 fixed the register. State the outcome first, then the contributions, and never lead with the mechanics. The engineer's worked example: perform the renames and restructuring across the repository, which merges without conflict, then incorporate the new viewer into the resulting structure and naming conventions.",
     "slices": []
    },
    {
     "id": "review-flight-deck/F5",
     "epicId": "F5",
     "status": "completed",
     "col": "done",
     "branch": "design/review-flight-deck",
     "pr": null,
     "note": "Reuses the existing view modes, the level rail, and the ledger from ADR-0019. flightdeck-prototype.html is the reference layout.",
     "slices": []
    },
    {
     "id": "review-flight-deck/F6",
     "epicId": "F6",
     "status": "completed",
     "col": "done",
     "branch": "design/review-flight-deck",
     "pr": null,
     "note": "New in round 6, and the first epic in this design that writes to a remote. ADR-0026 records the decision. The integration branch per bundle is what makes a path abandonable: delete N branches and the default branch never saw any of it. The default branch receives one pull request, from the last bundle's branch.",
     "slices": []
    }
   ],
   "looseSlices": []
  },
  {
   "id": "review-link",
   "name": "review-link",
   "stage": "backlog",
   "outcome": "Each time a workflow asks the user to approve a document, the user gets a checked link to that document's page in the viewer before the question.",
   "nextReady": null,
   "pullRequests": [],
   "epics": [
    {
     "id": "review-link/E1",
     "epicId": "E1",
     "status": "no-pull-request",
     "col": "in_progress",
     "branch": "design/review-link/E1",
     "pr": null,
     "note": "A viewer link for each document under review. Slice 1 adds review_link.py and a --route argument to View mode. Slice 2 projects the Gate 1 and Gate 2 documents and adds the plan page under the Build level. Slice 3 adds the Present for review procedure to every presentation point, and the link check to verify_gate.py.",
     "slices": [
      {
       "id": "review-link/1",
       "n": 1,
       "title": "Tracer bullet: review_link.py prints a checked deep link",
       "endsWith": "`uv run plugins/artifact/scripts/review_link.py --hub <hub> --route '#/<work>/build/epics'` prints the link after an HTTP 200, and exits 1 for an unknown work id or a dead server. View mode takes `--route`. `tests/test_review_link.py` passes against a real temporary server",
       "state": "completed",
       "col": "done",
       "score": "0.92",
       "attempts": 1
      },
      {
       "id": "review-link/2",
       "n": 2,
       "title": "Plan documents in the index and a plan page in the viewer",
       "endsWith": "`data/index.json` carries `product_doc` and `architecture_doc` entities. `#/<work>/build/plan` renders the three plan documents with gate names, and an empty state for an absent one. The committed viewer is rebuilt. Pytest and vitest pass",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "review-link/3",
       "n": 3,
       "title": "Present for review procedure and the link check",
       "endsWith": "Every presentation point names Present for review before its question. `verify_gate.py` fails an APPROVED line dated on or after 2026-09-28 with no link. This plan's own gate lines carry links",
       "state": "completed",
       "col": "done",
       "score": "0.92",
       "attempts": 1
      }
     ]
    }
   ],
   "looseSlices": []
  },
  {
   "id": "slice-agents-and-vocabulary",
   "name": "slice-agents-and-vocabulary",
   "stage": "decided",
   "outcome": "A slice built with /implement:start gets structural coaching while GREEN writes, and a vocabulary verdict beside its score, against one root glossary that design mode keeps current.",
   "nextReady": null,
   "pullRequests": [],
   "epics": [
    {
     "id": "slice-agents-and-vocabulary/E1",
     "epicId": "E1",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": "ADR-0025 narrows the install-surface rule so implement may ship agents and hooks. Slice 1.",
     "slices": [
      {
       "id": "slice-agents-and-vocabulary/1",
       "n": 1,
       "title": "Tracer bullet and whole epic: ADR-0025, the packaging test, and the CLAUDE.md rule",
       "endsWith": "ADR-0025 exists. `test_plugin_manifests.py` passes with an `agents/` and `hooks/` directory in `implement` and fails for any other plugin. `CLAUDE.md` states the narrowed rule and cites ADR-0025.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    },
    {
     "id": "slice-agents-and-vocabulary/E2",
     "epicId": "E2",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": "RED, GREEN, and VALIDATE as plugin agents, spawned by name. Slices 2 and 3.",
     "slices": [
      {
       "id": "slice-agents-and-vocabulary/2",
       "n": 2,
       "title": "Tracer bullet: three agent files that parse",
       "endsWith": "`plugins/implement/agents/{red,green,validate}.md` exist, parse, carry `name` and `description`, and use no ignored field.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "slice-agents-and-vocabulary/3",
       "n": 3,
       "title": "Real content: the prompts move and both loop paths spawn by name",
       "endsWith": "Each agent body holds its role prompt, scope contract, and blind rule. `slice-loop.md` and `slice-loop.js` spawn `implement:red`, `implement:green`, and `implement:validate` and no longer paste the prompts.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    },
    {
     "id": "slice-agents-and-vocabulary/E3",
     "epicId": "E3",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": "A required PostToolUse hook runs habit-hooks for GREEN only, with credit to habit-hooks. Slices 4 and 5.",
     "slices": [
      {
       "id": "slice-agents-and-vocabulary/4",
       "n": 4,
       "title": "Tracer bullet: the hook fires for GREEN only",
       "endsWith": "`hooks/hooks.json` registers `habit_coach.py` on `Write|Edit`. The script returns `additionalContext` for a GREEN payload with findings and nothing for any other agent.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      },
      {
       "id": "slice-agents-and-vocabulary/5",
       "n": 5,
       "title": "Edge cases, requirement, and credit",
       "endsWith": "Exit 2, a missing binary, and a missing `file_path` each behave as designed. The build skill stops before slice 1 when `habit-hooks --version` fails. `NOTICE.md` credits habit-hooks. `plugin.json` reads 0.3.0.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    },
    {
     "id": "slice-agents-and-vocabulary/E4",
     "epicId": "E4",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": "DDD-VOCABULARY.md, the vocabulary agent, design mode read and write, and the CLAUDE.md table move. Slices 6 to 8.",
     "slices": [
      {
       "id": "slice-agents-and-vocabulary/6",
       "n": 6,
       "title": "Tracer bullet: the glossary file and its format",
       "endsWith": "`DDD-VOCABULARY.md` exists with every canvas term, in the entry shape, and each canvas term links to its entry.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 2
      },
      {
       "id": "slice-agents-and-vocabulary/7",
       "n": 7,
       "title": "Real content: the vocabulary agent and design mode",
       "endsWith": "`implement:vocabulary` exists and runs beside VALIDATE in both loop paths. `design-mode.md` reads the glossary in stage 1 and writes it in stage 5.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 2
      },
      {
       "id": "slice-agents-and-vocabulary/8",
       "n": 8,
       "title": "Move: the CLAUDE.md table goes to the glossary",
       "endsWith": "Every term from the `CLAUDE.md` Vocabulary table is in `DDD-VOCABULARY.md`. `CLAUDE.md` holds a pointer, not the table.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 2
      }
     ]
    }
   ],
   "looseSlices": []
  },
  {
   "id": "ubiquitous-language",
   "name": "ubiquitous-language",
   "stage": "backlog",
   "outcome": "One term means one thing across every plugin, skill, design, and ADR in the repo, and a new or colliding term cannot reach a merged pull request undetected.",
   "nextReady": null,
   "pullRequests": [],
   "epics": [
    {
     "id": "ubiquitous-language/E1",
     "epicId": "E1",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": "One language record, and it is the tracer bullet. docs/architecture/language.md becomes the single source of truth for a term, its owning context, its meaning, and what it must not be confused with. It is seeded from CLAUDE.md's existing Vocabulary table and from cobuilder-packaging's canvas section 3. shared/build_index.py projects it into the record index, so the viewer can render it. This epic is independently shippable and does not depend on E2 through E5.",
     "slices": []
    },
    {
     "id": "ubiquitous-language/E2",
     "epicId": "E2",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": "Design mode gains a language stage. A design that introduces a new term must declare it or reuse an existing entry from the language record. A collision with an existing term becomes a challenge-stage finding. This fits design mode's existing no-citation-no-challenge rule, because the language record gives the challenge stage something concrete to cite.",
     "slices": []
    },
    {
     "id": "ubiquitous-language/E3",
     "epicId": "E3",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": "The mechanical consumer, in cobuilder-implement. A Gate 4b technical solution design that names a concept absent from the language record fails the gate. This epic is what stops the whole program from rotting the way canvas section 3 did. E1 and E2 without E3 are documentation waiting to go stale.",
     "slices": []
    },
    {
     "id": "ubiquitous-language/E4",
     "epicId": "E4",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": "A verifier that exits non-zero. A script finds a term used in a design or an ADR and absent from the language record, and fails the check. It is modeled on plugins/cobuilder-implement/scripts/verify_gate.py, which exits non-zero on any failed Gate 4 sub-step. The honest open question is that deciding what counts as a term mechanically, rather than by judgement, is the hard part of this epic and may need its own exploration.",
     "slices": []
    },
    {
     "id": "ubiquitous-language/E5",
     "epicId": "E5",
     "status": "unstarted",
     "col": "planned",
     "branch": null,
     "pr": null,
     "note": "Repair the existing drift. Refresh cobuilder-packaging's canvas section 3 and its boundary.yaml public_interface against the shipped five-plugin tree, delete the now-false homonym comment, and reconcile the two glossaries into E1's record.",
     "slices": []
    }
   ],
   "looseSlices": []
  },
  {
   "id": "work-drawer",
   "name": "work-drawer",
   "stage": "decided",
   "outcome": "The Work board stops being a page the reader travels to and becomes a drawer over whatever Build or Review surface they were reading: one press on the Work icon opens a vaul drawer at sixty percent of the viewport, holding the bundle's work on a kanban of five collapsible lanes \u2014 needs a decision, ready to build, in review, shipped, superseded \u2014 behind a state filter and an incremental search. Decision records and unfinished pull requests are held out of the board by rule. A search that resolves to exactly one work item reads that item's record in the detail pane without a second press, and the arrow keys walk both the rows and the filter strip.",
   "nextReady": null,
   "pullRequests": [],
   "epics": [
    {
     "id": "work-drawer/E1",
     "epicId": "E1",
     "status": "open",
     "col": "in_progress",
     "branch": "design/work-drawer",
     "pr": null,
     "note": "One pull request. The engineer chose one pull request for the design, so the epic carries the branch alone. The prototypes stay under src/variations/ as the reference arrangement while the drawer is the prototype surface; the port that replaces shell/Board.tsx's full-page board is this design's next epic and is deliberately not in this one, so the shipped board never regresses while the drawer is under review.",
     "slices": [
      {
       "id": "work-drawer/1",
       "n": 1,
       "title": "The search owns the result set: the needle drives the filter, the focus, and the self-read",
       "endsWith": "In Chrome with real key events: pressing `/` from any row moves the caret into the field; typing `gate` resets the filter to All, refines the rows, and marks each hit; a needle that resolves to one work item selects it and opens the pane with no second press, and a second character that widens the set past one clears it. The repository's typecheck, tests, and build hold.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    },
    {
     "id": "work-drawer/E2",
     "epicId": "E2",
     "status": "open",
     "col": "in_progress",
     "branch": "design/work-drawer",
     "pr": null,
     "note": "The second epic of the same pull request: the renames, the header's counts, and the chip walk.",
     "slices": [
      {
       "id": "work-drawer/2",
       "n": 2,
       "title": "Labels and the filter walk: the renames, the header line, and the chip walk",
       "endsWith": "The drawer's header carries the title, the design count, and the shown count, and no held-out text; the pane's buttons read \"Open work item\" and \"Close\"; pressing `\u2190`/`\u2192` while the strip holds the focus moves the active chip through the lanes' vocabulary and stops at the ends. The repository's typecheck, tests, and build hold.",
       "state": "completed",
       "col": "done",
       "score": "1.00",
       "attempts": 1
      }
     ]
    }
   ],
   "looseSlices": []
  }
 ]
};
