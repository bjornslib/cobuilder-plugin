# envisioned PR: linear-tracker-adapter

## Summary

A `linear` adapter in `shared/tracker_port/` implements the tracker port over the Linear GraphQL API (ADR-0048). A repo that sets `adapter: linear` in `.cobuilder/tracker.yaml` uses no beads. People plan the backlog, epics, and slices in Linear. CoBuilder builds from that plan and writes the state back as one attachment on each issue. The beads files stay unchanged.

## Motivation

Only beads holds real state today. A team that plans in Linear would install beads, `bd`, and a Dolt remote to use CoBuilder, and the Linear board would show none of the progress. ADR-0040 made the port so a second adapter could follow.

## Changes

1. **The adapter.** `shared/tracker_port/linear*.py` has five files: `linear.py` (the port methods and writes), `linear_client.py` (GraphQL, paging, limits), `linear_rows.py` (the record map and the seen values), `linear_claim.py`, and `linear_seed.py`. Each file stays near 200 lines. `config.py` names the adapter and reads the `team`, `project`, `states` (four names), and `users` keys.
2. **The mapping.** A program is a top-level issue. An epic is its sub-issue, and a slice is a sub-issue of an epic. A pull request is an issue that relates to its epics. The workflow state type gives the lifecycle, and a close counts only with proof in the envelope: a score of 0.90 or more, or the outcome skipped.
3. **The envelope.** One attachment on each issue holds the envelope as a JSON string. Its title shows the state word, score, and attempts.
4. **The claim.** A claim attachment comes first, and the earliest server time wins, with a nonce tie-break. Only the winner writes the assignee. The claim ends when the slice leaves in progress. `set-slice-state open` releases a stale claim, and `doctor` lists held claims. The adapter reports `atomic_claim` false and `rich_envelope` true.
5. **Plan changes.** The envelope keeps each plan field as last seen. A CoBuilder write updates only the fields it writes. `sync` posts a comment and sets `plan_changes` with the field, old value, and new value. `tracker.py` prints it, as it prints `conflicts` for a seed.
6. **The files.** `seed-from-files` creates missing issues, and Linear wins after the first seed. `regenerate-status-files` keeps writing the state lines.
7. **Shared code.** `projector.py` and `regenerate.py` skip an unplanned record. Ready also checks the open blockers of the epic.
8. **The install step.** `cobuilder-setup` offers `linear`, asks for the team and project, checks the key, and asks approval before `prepare`. Its test changes.
9. **The boundary record.** The `linear*.py` files join the `tracker-port` members in `docs/architecture/contexts/shared/boundary.yaml`.
10. **The docs.** `shared/tracker-adapter-linear.md` is the adapter note. `shared/tracker-usage.md` lists the Linear config keys. The second build step amends CLAUDE.md principle 7 after the engineer approves.
11. **The build order.** The adapter runs over a fake Linear first. The docs and the rule change follow. The live smoke test runs third, and the install offer comes fourth. No early step needs a workspace.

## Out of scope

- Any change to the beads adapter or its tests.
- A Jira adapter, which stays a later program.
- Moving existing beads state into Linear.
- A server, a webhook receiver, or any long-running process.
- Two adapters in one repo, and Linear cycles and roadmaps.
- The plan row, rubric, and design of a slice that a person creates in Linear. The gates write them.

## Open and unverified

- Four behaviors from the exploration note are unverified, and two more unknowns follow. The first four are below.
- The order of two claim attachments on one issue is not verified.
- A repeated `issueCreate` with one client id, and a repeated attachment create with one URL, are not verified.
- A three-level sub-issue chain is not verified. The fallback is a Linear project for the program.
- How a GitHub login maps to a Linear user is not verified.
- The maximum page size and the real complexity of a page with nested attachments are not verified.
- How a plan row names an existing Linear issue is undecided.
- Whether a read by id returns an archived issue, and whether the key can read the team automation settings, are not verified.
- Which files the beads no-diff check covers is not settled. `config.py` and the shared contract suite also change. This stays a note.

## Test plan

- Run the shared contract test suite against the linear adapter over a fake in-memory Linear.
- Round-trip an envelope with scalars, a path, and a list of paths, and compare every value.
- Count the requests of a full read of 265 issues, and assert no more than 8.
- Race two claim attachments in the fake, and assert that the earlier server time wins.
- Reorder, rename, and re-parent issues in the fake, and assert that `sync` reports each in `plan_changes`. Write through CoBuilder and assert no plan change.
- Seed twice, and assert that the second run changes nothing and reports a differing plan field as a conflict.
- Create an issue in the fake with no envelope, and assert it lists as unplanned and is never ready.
- Assert that the beads files and the beads tests show no diff and no new failure.
- Assert that ready skips a slice whose epic has an open blocker, and that a claim attachment ends when the slice leaves in progress.
- Assert that the projector and `regenerate-status-files` skip an unplanned issue without error.
- Run the install test with `linear` as a third choice.
- Assert that a grep finds no Linear API call outside `shared/tracker_port/linear*.py` and no key in the repo.
- Move a slice to Done in the fake with no score, and assert that it reads as open and the next slice stays blocked.
- Archive a closed slice in the fake, and assert that a full read returns it and ready counts it as closed.
- Leave a claim, run `set-slice-state open`, and assert that the claim and assignee are gone.
- Run a live smoke test in a test workspace for the unverified rows. Mark it so the default run skips it.
