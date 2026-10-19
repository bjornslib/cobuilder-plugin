# Status: beads-storage

- Gate 1 — Product: APPROVED 2026-10-17 (delegated: the engineer asked for the whole program design and will review it at hand-over)
  view: http://localhost:62583/active/viewer/#/beads-storage/build/plan/product
- Gate 2 — Architecture: APPROVED 2026-10-17 (delegated: the engineer asked for the whole program design and will review it at hand-over)
  view: http://localhost:62583/active/viewer/#/beads-storage/build/plan/architecture
- Gate 2b — Interaction design: n/a (no UI) — Screens: "no UI"
- Gate 3 — Program Design: APPROVED 2026-10-17 (delegated: the engineer asked for the whole program design and will review it at hand-over)
  view: http://localhost:62583/active/viewer/#/beads-storage/build/plan/program
- Gate 4 — Slice plan, epic designs, and rubrics: APPROVED 2026-10-17 (delegated: the engineer asked for the whole program design and will review it at hand-over)
  view: http://localhost:62583/active/viewer/#/beads-storage/build/epics
  - 4a Slice plan: APPROVED 2026-10-17 (delegated: the engineer asked for the whole program design and will review it at hand-over)
    view: http://localhost:62583/active/viewer/#/beads-storage/build/epics
  - 4b Epic technical solution designs: APPROVED 2026-10-17 (delegated: the engineer asked for the whole program design and will review it at hand-over)
  - 4c Blind rubrics: APPROVED 2026-10-17 (delegated: the engineer asked for the whole program design and will review it at hand-over)

Design mode: beads-storage
Memory (Gate 1): consulted 2026-10-17
Memory (before Gate 3, or Gate 2): consulted 2026-10-17

Initial checks, 2026-10-17:
- DDD-VOCABULARY.md exists at the repository root. Vocabulary checks run against it.
- habit-hooks is installed.
- This repository has no `.beads/` tracker yet. E1 needs none, because E1 builds the port over the fake and files adapters.
- The design record has four epics: tracker-port (E1), beads-adapter (E2), read-model (E3), write-model (E4). This build starts with E1 on branch `design/beads-storage/tracker-port`.
- The session lists no `mcp__cobuilder-memory__consult` tool. The engineer asked for the memory workflow, so I ran `recall` on bank `coding-agent-cobuilder-plugin` by hand, with the consult focus: what the project decided about beads, a tracker port, slice state, shared reference files, and the export script. I judged the records that the recall returned.
  - Rejected as stale: the record that calls ADR-0031 "proposed, not yet settled". The ADR is now decided and has four amendments.
  - Rejected as no new evidence: the records of the 2026-09-28 and 2026-09-29 sessions that designed the `metadata.cb` envelope. The ADR holds them.
  - Used as a lead, and checked: an agent claim that `slice-loop.md` accepts a slice below 0.90 after three attempts. ADR-0012 says a slice below 0.90 escalates after three attempts, and `slice-loop.md` has no line that accepts a lower score. The claim is not confirmed, so I did not use it.
  - Second call, before Gate 2 and Gate 3, focus: module splits, test rules, and conventions for a new Python module under `shared/`. Records used as leads, and each is checked against the repo before it enters `03-program-design.md`: plugin scripts are PEP 723 and import shared modules; plugin scripts state Python 3.10 or later and the dev environment is 3.11; a version change goes in both `plugin.json` and `marketplace.json`; `tests/test_plugin_manifests.py` requires the `shared` symlink; a program of more than one epic runs through the slice-loop workflow script. Rejected: the records about the viewer, the memory pane and the Hindsight hooks, because they name no shared Python module rule.
  - The recall found no record about a tracker port, Linear, Jira, or the export script. This design has no prior art in memory.

## Slices

- [x] Slice 1 — Tracer bullet: fake adapter and golden index   score: 1.00   note: retained
- [x] Slice 2 — Full contract suite on the fake adapter   score: 1.00   note: retained
- [x] Slice 3 — Files adapter reads the plans tree and backfill dry run   score: 1.00   note: retained
- [x] Slice 4 — Command prints JSON and exit codes   score: 0.92   note: retained
- [x] Slice 5 — Usage reference matches the command   score: 1.00   note: retained
- [x] Slice 6 — Beads reads match the fake adapter   score: 1.00   note: retained
- [x] Slice 7 — Beads writes on recorded transcripts   score: 1.00 (attempt 5, after escalation)   note: retained
- [x] Slice 8 — Beads dry run matches the backfill file   score: 1.00   note: retained
- [x] Slice 9 — Fresh clone initializes, syncs, and seeds   score: 1.00   note: retained
- [ ] Slice 10 — Bundle index unchanged after the port   score: —   note: —
- [ ] Slice 11 — Gate check and builds view read the port   score: —   note: —
- [ ] Slice 12 — Status files regenerate from records   score: —   note: —
- [ ] Slice 13 — Implement writes slice state   score: —   note: —
- [ ] Slice 14 — Architect writes gate values   score: —   note: —
- [ ] Slice 15 — Pull request blocks two epics   score: —   note: —
- [ ] Slice 16 — Goal file drops epic state fields   score: —   note: —
- [ ] Slice 17 — Docs test guards the port and install asks first   score: —   note: —

- [ ] Slice 18 — Spike: claim flags, exit codes, lease expiry   score: —   note: —
- [ ] Slice 19 — Atomic claim   score: —   note: —
- [ ] Slice 20 — Native ready, with parity   score: —   note: —
- [ ] Slice 21 — Pull request gate   score: —   note: —
- [ ] Slice 22 — Slice-loop formula   score: —   note: —

## Escalated

- Slice 7 (Beads writes on recorded transcripts): failed three attempts (0.67), then the follow-up on 2026-10-19 deleted three unused transcripts and added a real-bd create round trip and a repair test. The rubric then matched the real test names. Attempt 5 scored 1.00. Caveat: the round trip reads back through `list --json`, not `show --json`.

## Notes for a fresh session

- The state in this file is written by hand until E4 lands. After E4, `tracker.py` generates the state lines.
- The build plan covers the whole program, E1 to E4, in 17 slices. All gates carry a delegated approval, so the engineer reviews them at hand-over, and a change request reopens the gate it names.
- Slices 13 to 16 edit prose that steers an agent. The blind pass of Gate 4c runs in each of those slices, once the prose exists.
- The test baseline before slice 1 is 794 passed and 1 skipped.
- Plan amended 2026-10-17 by the engineer. Backfill is an agent workflow in `shared/tracker-backfill.md`.
- The seed script is dropped. The port operation `seed-from-files` replaces it.
