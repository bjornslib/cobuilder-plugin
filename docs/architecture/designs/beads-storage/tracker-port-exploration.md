# Exploration: a tracker port between CoBuilder and the task system

Date: 2026-10-17. Status: decided by the engineer on 2026-10-17. Option A, inside the `beads-storage` program, with the Linear and Jira adapters as later programs. Input to the `beads-storage` design.

## Why

ADR-0031 binds CoBuilder to beads. The engineer wants a layer between CoBuilder and the task system. Linear and Jira connectors may follow. This note answers three questions.

1. How does CoBuilder integrate with different task systems?
2. What abstraction connects to them?
3. How do the results map to the CoBuilder data structures?

## What the code needs today

A scan of `shared/`, `plugins/*/scripts`, and the command and reference prose found the following. No script writes workflow state. Agents write state by editing `00-status.md`, `04-slices.md`, and `goal.json` by hand. Twelve readers parse those files. The main readers are `build_index.py`, `slice_table.py`, `gate_status.py`, `verify_gate.py`, and `build_builds_view.py`. The scan was a grep, not a full read of every file.

The smallest operation set that covers every reader and writer:

| Kind | Operations |
|---|---|
| Read | list programs, epics, slices, gates, pull requests. Get one slice. Name the next ready slice |
| Write | set program stage, gate value, epic state, slice state (state, score, attempts). Claim a slice for a claimant (a GitHub login). Record an attempt. Escalate. Add a note. Open a pull request record for epics, and set its state. Sync with the central store (added after draft review round 1) |
| Project | regenerate the state lines of the status files from the tracker. Seed from files |

## What the three trackers offer

Verified means that I read the vendor page, the schema, the `bd` source, or ran the tool on 2026-10-17. Unknown means the primary source is silent and a smoke test with a live account must settle it. Sources: the Linear public schema and docs, the Atlassian REST v3 reference, and the beads fork source at `/Users/theb/Documents/Windsurf/beads_fork` (HEAD `49e4470c0`).

| Need | Beads | Linear | Jira Cloud |
|---|---|---|---|
| Custom data on an issue | `metadata` JSON, any well-formed value. Verified in a scratch tracker | Attachment `metadata`: key-value, values are a string or a number only. Verified | Issue property: any non-empty JSON value, key 255 bytes. The value limit reads "32768 characters" in one place and "32768 bytes" in another. Use the lower limit. Unknown: the key scope |
| Parent and child | `--parent`. Verified | `Issue.parent`, no depth limit in the schema. Verified. Depth on a live site: unknown | Set the parent by an edit after create. Create-time parent for a standard issue is not documented. Verified with gaps |
| Blocks | `blocks` edge. Verified | `issueRelationCreate(issueId: A, relatedIssueId: B, type: blocks)` means A blocks B. Verified. Reading the blockers of an issue: client side | `POST /issueLink` returns no body. The Blocks type has inward "Blocked by" and outward "Blocks". Read the link back with `fields=issuelinks`. Verified. Names on a live site: confirm |
| Ready query | `bd ready`. Verified | Filter on the state type plus `hasBlockedByRelations: {eq: false}`. The filter tests that a blocker exists, not that the blocker is open, so the client checks the blocker state. Verified | No ready function in JQL. `linkedWorkItems(KEY, "is blocked by")` gives the blockers of one key. The client computes ready. Verified as a negative |
| Program type above epic | Custom type `program`. Verified | `Project`, `Initiative`, and `ProjectMilestone` types exist. An issue belongs to one project. Which type fits a program: a design choice, not tested | Levels above epic need Premium or Enterprise. Verified |
| Idempotent external key | `external_ref`. Verified | An attachment URL on one issue is an idempotent key. `issueCreate` takes a client UUID `id`, but a repeated create with the same id is not documented. Verified with a gap | Unknown: the reference does not say whether a repeated issue link is tolerated, and a repeated issue create is also unknown. Both need a live site |
| Atomic claim | `bd claim`. Listed in the tool inventory, not run | A plain `assigneeId` write. No compare-and-set field in the schema. A race: unknown. Verified as a negative | `PUT /issue/{key}/assignee` takes an account id only. No ETag, no version. A race: unknown. Verified as a negative |
| Status words | `open`, `in_progress`, `closed` | `WorkflowState.type` is a string: triage, backlog, unstarted, started, completed, canceled, duplicate. Several states can share one type. There is no `WorkflowStateType` enum. Verified | Status categories. Transitions set the status. Not checked in this round |
| Read the corpus | `bd list --json`, one call | Cursor pages of 50. About six pages for 300 issues. API key limits: 2,500 requests and 3,000,000 complexity points an hour. Nested attachment lists can pass the 10,000-point query cap, so read them in separate calls. Verified from docs | Not checked in this round |
| Offline read | Local Dolt database | Network and token. An adapter may cache | Network and token. An adapter may cache |

## What the `bd` bridges do

I read the beads fork source and the 1.3.0 binary help. I ran no sync, because a sync needs a live account. The code answers these questions.

| Question | Jira bridge | Linear bridge |
|---|---|---|
| Does a push send `metadata.cb`? | No. The field mapper reads title, description, type, priority, labels, and custom fields (`internal/jira/fieldmapper.go:190-237`) | No (`internal/linear/fieldmapper.go:79-91`) |
| Does a pull keep `metadata.cb`? | No. A pull that changes any mapped field replaces the metadata column with `{source_system, jira_type}` (`internal/jira/tracker.go:429-434`, `internal/storage/issueops/update.go:439-444`). A pull of equal content skips the write | Mostly. It replaces the column only for an issue with a project milestone (`internal/linear/tracker.go:764-769`) |
| How does it find an issue it synced? | `external_ref` = the Jira URL plus the key. A change of `jira.url` breaks the match | `external_ref` = the canonical URL |
| Parent and blocks | A pull sets no parent and no dependencies. A push sends no parent | A pull maps the parent always. It maps relations only with `--relations`. A push sends the parent only on a full sync |

A push never sends the envelope, and a Jira pull replaces it. A Linear pull replaces it only for an issue with a project milestone. This settles Option B: a bridge cannot hold the CoBuilder state, because the push drops the envelope.

## Findings

1. **Two things must be separated.** The work graph (parent, blocks, lifecycle, claim) is native in every tracker. The state envelope (score, attempts, gates, branch) needs a custom-data slot, and the slot differs in each tracker.
2. **A flat slot changes the envelope.** Linear metadata takes only a string or a number. The envelope rule allows a list of paths (`cb.evidence`). A Linear adapter must encode a list as a JSON string. A smaller option is one path field per attempt.
3. **Status words differ.** ADR-0031 already maps the full state word into the envelope and keeps the tracker status as a three-value lifecycle: open, in progress, closed. That rule transfers to Linear and Jira without change.
4. **The network breaks one goal rule.** `goal.json` says the index rebuild must not need the network. The engineer accepted this on 2026-10-17 for Linear and Jira. The port contract has no snapshot. A Linear or Jira adapter may call the API directly or cache inside the adapter. Linear allows 2,500 requests an hour, and 300 issues need about six pages of 50. The later `tracker-linear` and `tracker-jira` programs decide the cache. The `offline_read` flag tells a caller whether the rebuild can run with no network.
5. **The seam sits in two places.** The adapter fetches and writes. One shared projector turns neutral records into the CoBuilder entities and joins. Today that projection is spread over the twelve readers.
6. **No tracker gives an atomic claim.** The port reports `atomic_claim` as a capability. When it is false, a claim is a write followed by a read that confirms the claimant.
7. **Ready is computed on Linear and Jira.** The port offers `next_ready(kind="slice", under=None)`. Beads answers the slice call with `bd ready`. The other adapters compute it from the blocks relations and the state.

## Options

### Option A. A port with adapters (CoBuilder owns the seam)

`shared/tracker_port/` holds a neutral record, a port, one adapter for each tracker, and the one projector.

```
CoBuilder readers and writers
        |   (neutral operations)
   TrackerPort  ----  capabilities: native_ready, atomic_claim, rich_envelope, offline
        |
   adapters:  beads (bd CLI)  |  files (read only)  |  fake (memory)  |  linear (GraphQL)  |  jira (REST)
        |
   TrackerRecord list  ->  projector  ->  entities, joins, data/index.json
```

- **Neutral record** `TrackerRecord`: `id`, `kind` (program, epic, slice, pr), `parent`, `blocked_by`, `lifecycle` (open, in progress, closed), `assignee`, `envelope` (scalars, paths, and lists of paths, and a flat slot stores a list as a JSON string), `external_ref`. Draft review round 1 dropped `updated_at` and `comment_count`, because the newest-wins reconcile is gone.
- **Port:** the operations in the table above, plus `capabilities()`.
- **Config:** one file names the adapter, for example `.cobuilder/tracker.yaml`. The file name is a proposal.
- **Contract test:** one test suite runs against every adapter. The fake adapter in memory is the second implementation that proves the seam.
- **Fit:** it follows CLAUDE.md principle 4 (shared code lives in `shared/`) and ADR-0016 (scripts call tools like `git` and `gh`, no MCP server).
- **Cost:** the port must not take the shape of beads. The capability table above is the guard.
- **Risk:** the Linear and Jira rows marked not verified may change the port.

### Option B. Beads only, and use its own bridges for other trackers

CoBuilder keeps talking to `bd`. A team that needs Jira or Linear runs `bd jira sync` or `bd linear sync`.

- **Gain:** no new code in this repo.
- **Cost:** the bridges do not carry `metadata.cb` (see the bridge table). The state would stay in beads and only the title, status, and labels would reach the other tracker. Beads stays mandatory, even for a team that works only in Jira.
- **Verdict:** a read-mostly mirror at best. It cannot be the system of record.

### Option C. Beads direct now, extract the port at the second adapter

- **Gain:** the fastest start.
- **Cost:** every caller then holds `bd` calls. The extraction later rewrites all of them. With no second implementation, the seam is a guess.

### Option D. An MCP server for each tracker

Rejected on the record. ADR-0016 and `CLAUDE.md` principle 5 say no plugin ships an MCP server. The engineer's own MCP tools remain personal tooling.

## Decision

The engineer chose Option A on 2026-10-17, inside the `beads-storage` program. The Linear and Jira adapters become later programs. The port is the first epic. The beads seed, the read model, and the write model build on it.

1. The neutral record, the port, the projector, the fake adapter, and the contract test.
2. The beads adapter and the seed on top of the port.
3. The write model on top of the port.
4. Linear and Jira adapters as later programs. Each starts with a live-account smoke test of its unknown rows.

## What changes in the record

- ADR-0031 narrows from "Beads is the storage layer" to "Beads is the first adapter and holds the mapping". A new ADR records the port.
- `goal.json` outcome, done_when, and the epics change. "bd is required" becomes "a configured tracker adapter is required". The success measure becomes "one `next slice` call". On beads that call is `bd ready`.
- `intent.json` gains the engineer's reason for the port and drops the claim that beads is the only store.
- The runtime diagram, the three mermaid levels, and the glossary gain the new terms.
- Agents get one command surface, `shared/tracker.py`, and one shared reference that teaches it. This was added after the decision. ADR-0040 holds the design.

## Not verified

- A cloud session that holds only a git clone, running `bd init` and `bd sync` against `refs/dolt/data`.
- Jira: the claim race, the property value limit in bytes versus characters, the property key scope, the create-time parent for a standard issue, a repeated issue create, and the rate limits. Each needs a live Jira site.
- Linear: the claim race, a repeated `issueCreate` with the same id, and the sub-issue depth. Each needs a live Linear workspace.
- How Linear and Jira resolve a GitHub login (the claimant) to a user. The adapter config holds a user map, and the resolution is not checked.
- Whether `bd claim` is atomic. I did not run it.
