---
# --- doc-gardener required frontmatter ---
title: "ADR-0048 — A Linear adapter keeps the plan in Linear and the state in attachments"
status: active
type: architecture
last_verified: 2026-11-02
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0048
source_pr: null
name: "A Linear adapter keeps the plan in Linear and the state in attachments"
state: decided
groups: [data-model, implement, architect]
approved_by: ""
problem: "A team that plans in Linear cannot use CoBuilder, because the tracker port has only the beads adapter for real state. People want to plan the backlog, epics, and slices in Linear and watch progress there. CoBuilder must build from that plan and write progress back."
decision: "A linear adapter in shared/tracker_port/ implements the TrackerPort over the Linear GraphQL API. A repo that sets adapter: linear uses no beads. People own the plan fields in Linear. The adapter keeps the CoBuilder state in one attachment on each issue and moves the workflow state. A claim is a write plus a read-back. The envelope keeps each plan field as last seen, which finds the changes that people make in Linear. The beads files stay unchanged."
maps_to:
  context: shared
  modules: [shared/tracker_port, shared/tracker.py, shared/tracker-usage.md, shared/tracker-adapter-linear.md, plugins/cobuilder-full-lifecycle/skills/cobuilder-setup, docs/architecture/contexts/shared/boundary.yaml]
  rule: "An adapter that calls a network API runs only inside shared/tracker_port/<name>*.py. It reads its key from an environment variable and stores no key in the repo. It reports offline_read false, and atomic_claim false when the tracker has no compare-and-set. People own the plan fields, and the adapter never overwrites a plan field after the first seed."
forces:
  - "The engineer wants one adapter for each repo, so a Linear repo needs no beads, no bd binary, and no Dolt remote."
  - "People plan in Linear and watch there. Slice state, score, attempts, gate dates, program stage, and pull request records must show in Linear."
  - "CoBuilder must notice the changes that people make in Linear. ADR-0016 forbids a server, and the SessionStart hook of ADR-0041 uses no network, so no webhook receiver can run."
  - "Linear has no compare-and-set on the assignee. ADR-0040 allows atomic_claim false, with a claim that writes and reads back."
  - "Linear attachment metadata takes only strings and numbers. The envelope rule of ADR-0031 allows a list of paths."
  - "The API allows 2,500 requests and 3,000,000 complexity points an hour with an API key. One query may not pass 10,000 points."
  - "The plan files still exist. seed-from-files loads them and regenerate-status-files writes state lines back, and both work through the port."
  - "Four Linear behaviors are unverified and need a live workspace. The engineer has none yet."
alternatives:
  - option: "Keep the state in a git ref beside Linear, as event files"
    rejected_because: "Scores, gates, and pull request records would not show in Linear. Cloud sessions would push a custom ref that no test verifies. The engineer chose one store."
  - option: "Keep a signed, hash-chained ledger and use Linear as a witness"
    rejected_because: "Cloud sessions hold no signing key. Refusing next_ready without a signed close would also change the port for every adapter."
  - option: "Make Linear comments the source of truth and replay them on each read"
    rejected_because: "Every read replays all comments, people can edit or delete a comment, and machine comments clutter the issues that people read."
  - option: "Keep all state in one JSON file in git, joined by issue id"
    rejected_because: "Two laptops that claim one slice collide on one file, and a cloud clone sees stale state. A failed page could mark the whole backlog closed."
  - option: "Keep beads as the store and mirror it to Linear, or sync both ways"
    rejected_because: "A mirror gives no planning in Linear. Two-way sync needs a conflict rule, and the bd bridge drops the envelope (ADR-0040). The engineer chose one adapter."
delivers:
  capability: "A repo sets adapter: linear and every tracker.py operation works against Linear. People plan in Linear, and CoBuilder builds from the plan and shows progress there."
  benefit: "A team that already uses Linear starts with CoBuilder and installs no beads. The port proves its seam with a second real adapter."
  beneficiary: [developer, implement-worker]
  enables: ["A Jira adapter on the same pattern", "Planning and watching of a build inside Linear"]
provenance: authored
history:
  - { state: decided, date: 2026-11-02, by: engineer, note: "Decided in session: Linear as a store with one adapter for each repo, state as attachments on the issue, planning in Linear in both directions, and all four facts visible in Linear. The engineer accepted the attribution and timing limits. A re-seed lets Linear win, and a Linear-born slice lists as unplanned. The review of the whole design is open." }
  - { state: decided, date: 2026-11-02, by: engineer, note: "Draft review round 1 found gaps in the plan hash, the claim, ready, the unplanned record, the state words, and the install step. The engineer chose to repair them inside the approach, with a seen value for each plan field, shared code that skips unplanned records, and linear in the install step. The note on which files the no-diff check covers stays open." }
  - { state: decided, date: 2026-11-03, by: engineer, note: "Draft review round 2 found six gaps: a close by hand or by automation skipped the gate, archived issues dropped out of the read, rich_envelope was false by mistake, a crashed claim had no stated release, and the first slice waited on a workspace. The design repairs each inside the approach. A close needs proof in the envelope, the read sets includeArchived, rich_envelope is true, set-slice-state open releases a claim, and the build order puts the live test third." }
related_decisions:
  - { type: depends-on, target: ADR-0040 }
  - { type: is-related-to, target: ADR-0031 }
  - { type: is-related-to, target: ADR-0044 }
  - { type: is-related-to, target: ADR-0047 }
  - { type: is-related-to, target: ADR-0042 }
related:
  - "docs/architecture/designs/linear-tracker-adapter/goal.json"
  - "docs/architecture/designs/beads-storage/tracker-port-exploration.md"
  - "docs/architecture/contexts/shared/boundary.yaml"
---

# ADR-0048 — A Linear adapter keeps the plan in Linear and the state in attachments

## Context

ADR-0040 put a tracker port between CoBuilder and the task system. Beads is the only adapter that holds real state. ADR-0040 named Linear as a later program. The exploration note of 2026-10-17 listed what such an adapter must handle.

The engineer now wants Linear beside beads. A repo uses one of the two. People who use Linear plan the backlog, the epics, and the slices there. They also watch progress there. CoBuilder must read the plan from Linear, build from it, and write progress back. CoBuilder must also notice what people change in Linear.

The beads adapter reads the whole list on each call. That read is local and free. A Linear read costs requests. The docs give a default page of 50 and no maximum. The author estimates 20 to 25 complexity points for each issue with nested fields. Then 265 issues need about 6 requests, and the hourly limits allow about 400 full reads. The smoke test must confirm this.

Four Linear behaviors from the exploration note are unverified: the order of two claim attachments, a repeated create with one key, a three-level sub-issue chain, and the map of a GitHub login to a Linear user. The design adds two unknowns: the page size with its complexity, and how a plan row names an existing issue. The engineer has no Linear workspace yet, so the build order puts the live test third.

## Options considered

1. **Linear as the one store, with the state in attachments.** Chosen.
2. **The state in a git ref beside Linear.** Rejected. Scores, gates, and pull request records would not show in Linear. Cloud sessions would push a custom ref that no test verifies.
3. **A signed, hash-chained ledger with Linear as a witness.** Rejected. Cloud sessions hold no signing key, and the refusal rule would change `next_ready` for every adapter.
4. **Linear comments as the truth.** Rejected. Each read replays all comments, and people can edit or delete them.
5. **One JSON file in git.** Rejected. Two laptops collide on one file, and a failed page could close the backlog.
6. **Beads as the store with a mirror or a two-way sync.** Rejected. A mirror gives no planning in Linear, and the bd bridge drops the envelope.

## Decision

The `linear` adapter lives in `shared/tracker_port/linear*.py`. Each file stays near 200 lines. `config.py` names it. It uses the standard library for HTTP and reads the key from `LINEAR_API_KEY`. The key never enters the repo.

**Mapping.**

| CoBuilder kind | Linear object |
|---|---|
| program | A top-level issue |
| epic | A sub-issue of the program issue |
| slice | A sub-issue of an epic |
| pull request | An issue that relates to each epic it holds. It never blocks. |

Consecutive slices of an epic, and consecutive epics of a program, have a `blocks` relation. The fallback for the program is a Linear project, if the three-level chain fails the smoke test.

**Lifecycle.** The workflow state `type` gives the lifecycle, because the port knows only `open`, `in_progress`, and `closed`. The types triage, backlog, and unstarted read as `open`. The type started reads as `in_progress`. The types completed and canceled read as `closed`. The envelope holds the rest: score, attempts, `outcome`, `reason`, and `escalated`. A `states` map in `tracker.yaml` names four workflow states: `open`, `in_progress`, `closed` (type completed), and `skipped` (type canceled). A skipped slice moves to the skipped state. `prepare` checks that the four states exist.

**Closed needs proof.** A person can drag a slice to Done, and a Linear automation can close issues. The adapter reads a slice as `closed` only with proof in the envelope. A completed slice needs a score of 0.90 or more, as principle 8 requires. A canceled slice needs the outcome `skipped`. Any other completed or canceled slice reads as `open`, and `sync` reports it in `plan_changes`. An epic reads as `closed` only when all its slices read as `closed`. So a close by hand never unblocks the next slice. The envelope wins over the Linear state. The adapter never moves the Linear state back.

**Envelope.** One attachment on each issue holds the envelope. Its URL is `cobuilder://<repo>/<id>`, and the URL is the idempotent key. The envelope is one JSON string in the metadata, so a list of paths round-trips. The attachment title and subtitle show the lifecycle, score, attempts, and outcome. A program issue shows its gate dates and stage the same way.

**Ready.** The client computes ready for a slice. The slice is open and unclaimed, and each of its blockers is closed. Its parent epic must also have no open blocker, because ADR-0044 treats a child of a blocked parent as blocked. A pull request or an unplanned issue is never ready.

**Claim.** `claim_slice` refuses a slice that already has a claim, as beads does. It writes a claim attachment with a nonce and then reads all claim attachments of the issue. The earliest server time wins, and a tie goes to the lower nonce. Only the winner writes the assignee. A loser deletes its attachment and gets a refusal, and `claim_next` then takes the next ready slice. The adapter deletes the claim attachment when the slice leaves `in_progress`. It reports `atomic_claim` false.

**Release.** `set-slice-state <id> open` removes every claim attachment of the slice and clears the assignee, whatever the old state. A claim attachment on a slice that is not in progress, and older than two minutes, is a stale claim. `claim_slice` deletes a stale claim before it claims. `doctor` lists each held claim with its claimant and age. The adapter note names this release path.

**Reads.** One paged query sets `includeArchived` true, because Linear archives closed issues and its published schema shows that the query skips archived issues by default. It returns the issues of the configured project with their parent, relations, assignee, workflow state, and attachments. A read by id uses one request. A rate-limit answer raises an adapter error that names the reset time.

**Capabilities.** The adapter reports `rich_envelope` true, because the JSON string round-trips in full, as in every other adapter. It reports `native_ready`, `atomic_claim`, and `offline_read` false.

**Team settings.** A Linear team can close a parent when all its children close, close children when a parent closes, close stale issues as canceled, and archive closed issues. The team fields are `autoCloseParentIssues`, `autoCloseChildIssues`, `autoClosePeriod`, and `autoArchivePeriod`. The proof rule keeps the gate safe under all four settings. `doctor` warns when `autoCloseChildIssues` is on or `autoClosePeriod` is set, if the key can read the team. The adapter note lists the recommended settings.

**Plan changes.** The envelope keeps each plan field as last seen: title, the hash of the description, parent id, sorted blocker ids, workflow state type, and assignee id. A write by CoBuilder updates only the seen fields that it writes. A claim updates the assignee, and a state change updates the type. `sync` compares each field, posts one comment on a changed issue, and refreshes the seen fields. It sets `plan_changes` with the field, the old value, and the new value. The comment is the durable record, so a lost output loses nothing. `tracker.py` prints `plan_changes` when set, as it prints `conflicts` for a seed, and no protocol change is needed. The usage reference tells agents to run `sync` at session start in a Linear repo.

**Two authors.** `seed-from-files` creates the Linear issues that do not exist. After the first seed, Linear wins. A later seed fills only missing records and reports a plan field that differs as a conflict. An issue that a person creates has no envelope. It lists as unplanned and is never ready. A gate that writes its plan row and rubric then links it. An unplanned issue has no `n`, so `projector.py` and `regenerate.py` skip a record with the state `unplanned`. `list-slices` still returns it, and `doctor` counts it.

**Files.** `regenerate-status-files` and `seed-from-files` keep working through the port. The optional port `migrate_mapping` returns the empty report of the fake adapter, because the migrate contract cases need a report. `repair_status` refuses, as in the `files` adapter. `contracts.md` lists the Linear behavior of each port operation.

**Identity.** A `users` map in `tracker.yaml` maps a GitHub login to a Linear user. Agent writes show in Linear under the owner of the API key.

**Out of scope.** The beads files, a Jira adapter, a move of beads state, any server or webhook receiver, two adapters in one repo, and Linear cycles and roadmaps.

**Install.** `cobuilder-setup` offers `linear` beside `beads` and `files`. It asks for the team and the project, checks the key, and asks the engineer to approve `prepare`. `tests/test_install_tracker_config.py` changes with it. This is the fourth step of the build order.

**Build order.** No early step waits for a Linear workspace. First, the adapter runs over a fake Linear client, and the shared contract test passes. Second, the boundary record, the usage reference, the adapter note, and the change to principle 7 land. This includes the `linear*.py` entries in `docs/architecture/contexts/shared/boundary.yaml`. Third, the smoke test runs in a test workspace when one exists. It checks the four unverified behaviors and the archived read, and it decides the abort rules. The default test run skips it. Fourth, the install step offers `linear`, so no install offers an adapter that no live test has passed. The gates decide the slice cut. If the smoke test aborts the design, the team keeps the first two steps as unused code. The engineer accepts that cost.

**Rule change.** CLAUDE.md principle 7 allows two outside actions, both on GitHub. The second build step amends it to add the API call of the configured tracker adapter. The engineer approves that edit at review.

## Consequences

- **Positive:** a Linear repo needs no beads, no `bd`, and no Dolt remote. People plan and watch in Linear. The port gets a second real adapter, and the contract test runs against it.
- **Constraint introduced:** an adapter that calls a network API runs only inside `shared/tracker_port/<name>*.py`. It reads its key from an environment variable and stores no key in the repo. It reports `offline_read` false, and `atomic_claim` false when the tracker has no compare-and-set. People own the plan fields, and the adapter never overwrites a plan field after the first seed.
- **Shared changes:** `projector.py` and `regenerate.py` skip an unplanned record. `tracker.py` prints `plan_changes`. `cobuilder-setup` offers `linear`, and its test changes. None of these touches a beads file.
- **Negative / accepted:** a claim is not exact, and a short double-claim window stays open. Agent writes show under the owner of the API key. A change that a person makes mid-call shows at the next call. Every session, including a cloud session, needs `LINEAR_API_KEY`. The hourly limits cap the number of full reads. A read grows with the archived history of the project.

## Value delivered

- **New capability:** a repo sets `adapter: linear`, and every `tracker.py` operation works against Linear.
- **Benefit:** a team that already uses Linear starts with CoBuilder and installs no beads. The port proves its seam with a second real adapter.
- **Beneficiary:** developer, implement-worker.

## Maps to

Context `shared`, modules `shared/tracker_port`, `shared/tracker.py`, `shared/tracker-usage.md`, and `shared/tracker-adapter-linear.md`. See the boundary rule of the `tracker-port` module and the canvas of the `shared` context.
