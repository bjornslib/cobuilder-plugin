# Contracts: linear-tracker-adapter

Every entry below is a prediction from ADR-0048. No code exists yet. The
live smoke test may change an entry.

The design touches two public surfaces. The first is the config file
`.cobuilder/tracker.yaml`. The second is the output of `shared/tracker.py`.
It also adds durable state in Linear: the envelope attachment.

## Endpoints

### The config of the adapter

`.cobuilder/tracker.yaml` names the adapter and its settings.

| Key | Meaning |
|---|---|
| `adapter` | `linear` |
| `team` | The Linear team key, for example `ENG`. Required. |
| `project` | The Linear project that holds the issues of the repo. Optional. When set, a read covers only that project. |
| `states` | A map to four workflow state names: `open`, `in_progress`, `closed` (type completed), and `skipped` (type canceled). `prepare` checks that each name exists in the team. |
| `users` | A map from a GitHub login to a Linear user id. An unmapped login makes a claim fail with exit 4. |

The key comes from the environment variable `LINEAR_API_KEY`. The file holds
no key. The adapter ignores the `sync` key. With no `sync` key, the hooks of
`implement` start no worker.

### The output of `tracker.py`

The CLI gains no operation. It gains one optional output key.

| Operation | Change |
|---|---|
| `sync` | When the adapter sets `plan_changes`, the JSON payload carries `plan_changes`: a list of `{id, field, was, now}` entries. It is the same pattern as `conflicts` for a seed, and the edit sits in `tracker.py` only. The usage reference tells agents to run `sync` at session start. |
| `prepare` | Checks the key, the team, the `states` map, and the labels. It creates a missing label. |
| `doctor` | Adds `requests_left` and `reset_at` from the last rate-limit headers, and the count of unplanned issues. It lists slices that a person closed without proof, and each held claim with its claimant and age. It warns when the team sets `autoCloseChildIssues` or `autoClosePeriod`, if the key can read the team. |

Exit codes stay as they are. A missing key, a rate-limit answer, and a
network failure exit with 3. A bad `states` map exits with 3. An unmapped
login exits with 4.

### The behavior of each port operation

| Operation | Linear behavior |
|---|---|
| `list-programs`, `list-epics`, `list-slices`, `list-pull-requests`, `all_records` | One paged read with `includeArchived` true. The records come from the envelope attachments. A slice reads as `closed` only with proof (see the closed rule). An issue with no envelope returns as an unplanned record. |
| `get-slice` | A read of one issue by id. |
| `next-ready` | The client rule of ADR-0048, for a slice, an epic, or a program. It never returns a pull request or an unplanned issue. |
| `claim-slice`, `claim-next` | The claim rule: refuse a held slice, write the claim attachment first, rank by server time with a nonce tie-break, and let only the winner write the assignee. The claim ends when the slice leaves `in_progress`. A stale claim is deleted before the new claim. |
| `set-program-stage` | Creates the program issue and its envelope when none exists and a plans folder is given. Otherwise it sets `stage`. The program lifecycle follows `program_lifecycle` in `program_state.py`, and the adapter moves the workflow state on a change. |
| `set-gate-value` | Sets the gate key in the program envelope. The attachment title shows the gate dates. |
| `set-epic-state` | Moves the epic workflow state and sets `branch` when given. The program lifecycle then follows its epics. |
| `set-slice-state` | Moves the slice workflow state through the `states` map, and sets the score and attempts in the envelope. The state `open` removes every claim attachment and clears the assignee. This is the release of a crashed claim. |
| `record-attempt` | Sets the score and attempts, and posts one dated comment. |
| `add-note` | Posts one comment on the issue. |
| `escalate` | Sets `escalated` and the score, and posts one comment. The workflow state stays. |
| `skip-slice` | Sets `outcome` and `reason`, and moves the slice to the `skipped` state (type canceled). |
| `open-pull-request` | Creates an issue with the envelope kind `pr` and a `related` relation to each epic. It never blocks. |
| `set-pull-request-state` | Moves the pull request issue to completed on a merge, and to open otherwise. |
| `sync` | Compares the plan fields, posts one comment for each changed issue, and sets `plan_changes`. It pushes nothing and starts no worker. |
| `prepare` | Checks the key, the team, and the `states` map. It creates a missing label and returns `changed`. |
| `seed-from-files` | Creates the missing issues. Linear wins after the first seed, and a differing plan field is a conflict. |
| `regenerate-status-files` | The existing generic function. It skips an unplanned record. |
| `migrate-mapping`, `repair-status` | `migrate-mapping` returns the empty report of the fake adapter. `repair-status` refuses, as the `files` adapter does. |
| `capabilities`, `doctor` | `rich_envelope` is true. `native_ready`, `atomic_claim`, and `offline_read` are false. `doctor` adds the unplanned count, the unproven closes, the held claims with their age, and the rate-limit values. |

### The requests to Linear

All calls use one GraphQL endpoint over HTTPS with the key in the
`Authorization` header. The adapter uses the standard library only.

| Need | Request |
|---|---|
| Full read | One paged query of `issues` with `includeArchived` true and a filter on the team or project. Each node returns title, description, workflow state `type` and name, parent id, assignee id, relations, and the attachments whose URL starts with `cobuilder://`. The page is 50 until the smoke test finds the maximum. |
| Read by id | One query of one issue with the same fields. |
| Write the envelope | `attachmentCreate` or an update with the URL as the key. |
| Move the state | `issueUpdate` with the state id from the `states` map. |
| Claim | `attachmentCreate` for the claim, one query of the claim attachments, and `issueUpdate` for the assignee by the winner only. |
| Relations | `issueRelationCreate` with the type `blocks` between consecutive items, and `related` for a pull request. |

## Data models

### The closed rule

The adapter maps the Linear workflow state type to the lifecycle, then applies the proof.

| Linear type | Envelope | Lifecycle |
|---|---|---|
| completed | `score` of 0.90 or more | `closed` |
| completed | no score, or a lower score | `open` |
| canceled | `outcome` is `skipped` | `closed` |
| canceled | any other | `open` |

An epic reads as `closed` only when all its slices read as `closed`. The adapter never moves the Linear state back. `sync` reports the difference in `plan_changes`.

### The envelope attachment

One attachment on each CoBuilder issue.

| Field | Value |
|---|---|
| `url` | `cobuilder://<repo>/<id>`. It is the idempotent key. |
| `title` | A short line for people: the state word, the score, and the attempts. A program issue shows the stage and the gate dates. |
| `metadata.v` | `1` |
| `metadata.kind` | `program`, `epic`, `slice`, or `pr` |
| `metadata.id` | The CoBuilder id |
| `metadata.envelope` | The whole envelope as one JSON string, so a list of paths round-trips |
| `metadata.seen` | The plan fields as last seen, as one JSON string: title, description hash, parent id, sorted blocker ids, workflow state type, and assignee id |

The metadata size limit is not verified. The smoke test finds it.

### The claim attachment

| Field | Value |
|---|---|
| `url` | `cobuilder://<repo>/<id>#claim-<nonce>` |
| `metadata.claimant` | The GitHub login of the claimant |
| `metadata.nonce` | A random value of the session |

The earliest server creation time wins, and a tie goes to the lower nonce. A loser deletes its attachment. The adapter deletes the winner's attachment when the slice leaves `in_progress`.

### The seen values

`metadata.seen` holds each plan field of the issue as last seen. A write by
CoBuilder updates only the fields that it writes. A claim updates the
assignee, and a state change updates the type. A human edit of any other
field stays visible until `sync` compares it. `sync` posts one comment, then
refreshes the seen values. The comment is the durable record.

### The unplanned record

An issue in scope with no envelope attachment returns as a record with the
id `linear:<identifier>`, the kind that its depth in the tree gives, and the
envelope `{state: "unplanned"}`. It has no `n`, so `projector.py` and `regenerate.py` skip it. It is never ready. A seed that links a plan row to the issue creates its
envelope.
