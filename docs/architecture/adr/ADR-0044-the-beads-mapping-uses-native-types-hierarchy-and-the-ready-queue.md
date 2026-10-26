---
title: "ADR-0044 — the beads mapping uses native types, hierarchy, and the ready queue"
status: active
type: architecture
last_verified: 2026-10-24
owner: bjornslib
id: ADR-0044
source_pr: null
name: "the beads mapping uses native types, hierarchy, and the ready queue"
state: decided
groups: [data-model, workflow]
approved_by: ""
problem: "The beads adapter hides structure. A program has a custom type, a title copies the cb id, and a pull request blocks its epics. bd then hides the slices from bd ready, so the adapter computes ready itself."
decision: "A program is a native feature, an epic is an epic, a slice is a task, and a pull request is a milestone that tracks its epics with a non-blocking edge. Blocks edges order the slices and the epics. The title holds the human name. Slice readiness comes from bd ready, and the new operation claim-next claims through it. A one-time migrate-mapping operation converts existing trackers. This amends ADR-0031 and ADR-0040."
maps_to:
  context: tracker-port
  modules: [shared/tracker_port/beads.py, shared/tracker_port/beads_rows.py, shared/tracker_port/beads_writes.py, shared/tracker_port/beads_pull_requests.py, shared/tracker_port/bd_runner.py, shared/tracker.py]
  rule: "Only shared/tracker_port/ calls bd. A pull request never blocks an epic or a slice. Every cb row carries the label cb, and a claim through bd ready always filters on it."
forces:
  - "A child of a blocked parent is blocked in bd. A pull request that blocks an epic hides every slice of that epic from bd ready."
  - "bd ready lists every ready task, also a task that another tool made. A claim with no filter can claim a foreign task."
  - "bd 1.3.0 has the built-in types feature and milestone. The custom type program is not needed."
  - "The title of each row copies the cb id, which external_ref and metadata.cb.id already hold. ADR-0031 already maps names, outcomes, and done-when text to native fields."
  - "Live trackers hold 322 issues in the old mapping. A new mapping needs a one-time migration."
alternatives:
  - option: "Keep the E5 mapping, and compute ready in the adapter"
    rejected_because: "The pull request block hides the slices from bd ready. The adapter must then repeat bd logic, and the parity check can never pass."
  - option: "Make the pull request a plain task that tracks its epics"
    rejected_because: "A task pull request shows in the task frontier of bd ready and in the claim queue. A milestone does not."
  - option: "Keep the E5-4 gh:pr gate on the epic"
    rejected_because: "A gate that blocks an epic hides the slices of that epic in the same way as the blocking edge."
  - option: "A new custom type merge-request for the pull request"
    rejected_because: "bd 1.3.0 refuses the name. The built-in milestone fits."
delivers:
  capability: "bd ready and the claim operation answer from the native hierarchy and edges, with no hidden structure in metadata.cb."
  benefit: "One bd call gives the slice that an agent may start, and one call claims it. The bd list shows human names."
  beneficiary: [developer, implement-worker]
  enables: ["A later gate that blocks only a later dependent epic", "A formula row model that uses native parents"]
provenance: authored
history:
  - { state: decided, date: 2026-10-24, by: engineer, note: "Decided in session: the mapping, the ordering edges, native ready for slices, claim-next, and migrate-mapping. The title rule is recommended and stays open for the engineer at review." }
  - { state: decided, date: 2026-10-24, by: engineer, note: "Decided in session: claim-next also sets the parent epic in_progress. The record is read back from the bd row fields, and a lookup by cb id uses bd list --external-ref." }
related_decisions:
  - { type: amends, target: ADR-0031 }
  - { type: amends, target: ADR-0040 }
  - { type: is-related-to, target: ADR-0042 }
  - { type: is-related-to, target: ADR-0043 }
related:
  - "docs/plans/beads-storage/epic-E7-design.md"
  - "shared/tracker-adapter-beads.md"
---

# ADR-0044 — the beads mapping uses native types, hierarchy, and the ready queue

## Context

E1 to E6 map a program to a custom type, and they copy the cb id into the title. A pull request is a task that blocks its epics, and a `gh:pr` gate does the same. In E5-3 the parity check of `bd ready` failed because of these edges. The adapter now computes ready itself, and `native_ready` is false.

A spike on bd 1.3.0 gave the facts below. The evidence is in `/tmp/e7-spike.md` and in the E7 design.

- A tree of feature, epic, and task with `--parent` and `blocks` edges gives `bd ready -t task` exactly the slice frontier.
- A pull request milestone with a `tracks` edge hides no slice. A plain blocker hides all slices of the epic.
- `bd update --type` retypes an existing issue, and `bd dep rm` removes an edge. Both exit 0.
- `bd ready -t task --claim` claims one task, and it prints `[]` with exit 0 when no task is ready.
- `bd ready -t task` also lists a task that has no cb block. The label filter `--label cb` removes it.

## Decision

1. **Types.** A program is a `feature`. An epic is an `epic`, and it is a child of the feature. A slice is a `task`, and it is a child of its epic. A pull request is a `milestone`. The custom type `program` and the step `types.custom` in `prepare` go away.
2. **Edges.** The slices of one epic are ordered by `blocks` edges between consecutive slices. The epics of one program are ordered by `blocks` edges between consecutive epics. A pull request has one `tracks` edge to each epic it holds. No blocking edge runs from a pull request to an epic, and no `gh:pr` gate blocks an epic. A later gate may block only a later dependent epic.
3. **Ready.** `next_ready` for the kind `slice` runs `bd ready -t task --label cb [--parent <epic or program>] --json --limit 0`. `native_ready` is true when the parity test holds on the corpus. The adapter keeps a small rule for the kinds `epic` and `program`.
4. **Claim.** The new port operation `claim-next [--under <epic or program>] <claimant>` runs `bd ready -t task --label cb --claim --actor <claimant> [--parent X]`. An empty list from bd gives an empty result, not an error. `claim-slice` stays. In the same sync, `claim-next` also runs `bd update <epic> --status in_progress` for the parent epic of the claimed slice, and it skips that write when the epic is already `in_progress` or `closed`.
5. **Names.** Recommended, and open for the engineer at review: the title holds the human name from the plan or design source. The cb id stays in `external_ref` and in `metadata.cb.id`. The alternative is `<cb id> — <name>`. The seed also fills `description`, `acceptance_criteria`, and `design` from the files where they exist. Every cb row gets the label `cb`.
6. **Migration.** The new operation `migrate-mapping [--dry-run]` converts an existing tracker in one run. It is idempotent and it ends with one sync. A dry run lists each change and writes nothing.
7. **Replaced decisions.** This ADR replaces the E5-3 decision that `native_ready` stays false, and the E5-4 decision that a `gh:pr` gate mirrors the pull request block.
8. **Read back through bd.** The record fields `title`, `description`, `acceptance_criteria`, `design`, and `tracks` are read from the bd row fields of the same names and from the dependencies of type `tracks`. A lookup by cb id runs `bd list --external-ref <cb id>`. So `external_ref` is set on create, on seed, and on migrate. It is the cb id for a program, an epic, a slice, and a design record. It stays `gh-<n>` for a pull request, as the code sets it today.

## Obsolete after this ADR

- E5 design, section "Decisions and results": the `native_ready` bullet and the gate bullet.
- E5 design, slices E5-3 and E5-4, and the transcripts `ready-bd-corpus.json`, `ready-bd-molecule.json` (the ready claim only), and the gate transcripts.
- Adapter notes: "Custom issue types", step 2 of "Setup on the first machine", "Pull request issues", "E5-3: native ready does not reach parity", "E5-4: pull request gates", and the failure row for `invalid issue type: program`.
- ADR-0031: the `program` row of the schema mapping, the line on `types.custom`, the `PullRequest` row, and the amendment text that says a pull request blocks each epic.
- ADR-0040: the text that `open_pull_request` blocks each epic, the pull request rules of the ready definition, contract case 5, and the corpus line with the pull request that blocks two epics.
- `goal.json` of beads-storage: the done-when item on the pull request block and the abort-if item on a second custom type.

## Consequences

- The slices of a pull-request epic stay ready. The adapter no longer needs to repeat bd logic for slices.
- Each epic now has an ordering edge to the epic before it. A plan whose epics could run in parallel becomes serial. The engineer chose this.
- A pull request no longer holds an epic. The epic closes through `set-epic-state`, and the merge only closes the milestone.
- A tracker in the old mapping gives a wrong ready frontier. So `next-ready` and `claim-next` refuse on such a tracker, and the message names `migrate-mapping`. `doctor` reports the mapping as `legacy` or `native`.
- The record gains `title`, `description`, `acceptance_criteria`, and `design`, and the pull request record gains `tracks`. The projector shapes do not change, and the epic `blocked_by` joins are new.
- The label `cb` is the one hidden filter. A row without it never reaches a claim.
- bd 1.3.0 is the only checked version. A later bd needs a new spike.
